/**
 * useLocation.ts
 * ──────────────
 * A custom React hook that handles everything related to GPS tracking:
 *   1. Asks the user for location permission.
 *   2. Starts watching the device's position.
 *   3. Calculates total distance as the runner moves.
 *   4. Cleans up (stops watching) when the component unmounts.
 *
 * WHY A HOOK?
 * Putting GPS logic in its own file keeps RunScreen simple.
 * RunScreen just calls  useLocation()  and gets back the data it needs.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import * as Location from "expo-location";

// ─── Types ───────────────────────────────────────────────────────────────────

/** The shape of data this hook returns to the screen. */
export interface LocationData {
  /** Total distance the runner has covered, in kilometres. */
  distanceKm: number;
  /** Whether we have location permission and are actively tracking. */
  isTracking: boolean;
  /** A human-readable error message, or null if everything is fine. */
  errorMsg: string | null;
}

/** A simple latitude/longitude pair used internally. */
interface LatLng {
  latitude: number;
  longitude: number;
}

// ─── Helper: Haversine distance ──────────────────────────────────────────────

/**
 * Calculates the straight-line distance between two GPS coordinates
 * using the Haversine formula.  Returns the result in **metres**.
 *
 * HOW IT WORKS (simplified):
 *   The Earth is roughly a sphere.  The Haversine formula uses
 *   trigonometry to find the shortest path along the surface
 *   between two latitude/longitude points.
 *
 * @param a  First coordinate  { latitude, longitude }
 * @param b  Second coordinate { latitude, longitude }
 * @returns  Distance in metres
 */
function haversineMetres(a: LatLng, b: LatLng): number {
  const R = 6_371_000; // Earth's radius in metres

  // Convert degrees → radians (multiply by π/180)
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      sinHalfLon *
      sinHalfLon;

  return 2 * R * Math.asin(Math.sqrt(h));
}

// ─── The Hook ────────────────────────────────────────────────────────────────

/**
 * Call this inside a React component to start GPS tracking.
 *
 * Usage:
 *   const { distanceKm, isTracking, errorMsg } = useLocation();
 */
export default function useLocation(): LocationData {
  // ── State that the screen will read ──
  const [distanceKm, setDistanceKm] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Internal refs (not shown on screen, just used for calculations) ──
  // We use refs instead of state for these because we don't need React
  // to re-render every time the previous coordinate changes.
  const lastPosition = useRef<LatLng | null>(null);
  const totalMetres = useRef(0);

  // Keep a reference to the location subscription so we can stop it later.
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // ── Start tracking on mount ──
  useEffect(() => {
    let isMounted = true; // guard against setting state after unmount

    async function startTracking() {
      // Step 1: Ask for permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        if (isMounted) setErrorMsg("Location permission was denied.");
        return;
      }

      // Step 2: Begin watching position
      // - accuracy: High gives us GPS-level precision (good for running).
      // - distanceInterval: 5 means "give me an update every ~5 metres".
      //   This avoids flooding us with tiny, noisy updates.
      // - timeInterval: 1000 means "at most one update per second".
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,   // metres
          timeInterval: 1000,    // milliseconds
        },
        (location) => {
          // This callback fires every time the device has a new position.
          const newPos: LatLng = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          // If we already have a previous position, calculate the distance
          // between the old point and the new point and add it to the total.
          if (lastPosition.current) {
            const delta = haversineMetres(lastPosition.current, newPos);

            // Ignore tiny jumps (< 2 m) — these are usually GPS noise
            // when the runner is standing still.
            if (delta > 2) {
              totalMetres.current += delta;
              if (isMounted) {
                setDistanceKm(totalMetres.current / 1000);
              }
            }
          }

          // Remember this position for the next update.
          lastPosition.current = newPos;
        }
      );

      subscriptionRef.current = sub;
      if (isMounted) setIsTracking(true);
    }

    startTracking();

    // ── Cleanup: stop watching when the screen unmounts ──
    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  return { distanceKm, isTracking, errorMsg };
}
