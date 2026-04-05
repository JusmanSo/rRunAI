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

import { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";
import {
  calculateWindowPaceMinPerKm,
  smoothPaceMinPerKm,
  updatePaceBuffer,
  type PacePoint,
} from "../utils/pace";

const PACE_STALE_AFTER_MS = 3_000;

// ─── Types ───────────────────────────────────────────────────────────────────

/** The shape of data this hook returns to the screen. */
export interface LocationData {
  /** Total distance the runner has covered, in kilometres. */
  distanceKm: number;
  /** Current rolling pace in minutes per kilometre, or null if unknown. */
  currentPaceMinPerKm: number | null;
  /** Whether we have location permission and are actively tracking. */
  isTracking: boolean;
  /** A human-readable error message, or null if everything is fine. */
  errorMsg: string | null;
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
  const [currentPaceMinPerKm, setCurrentPaceMinPerKm] = useState<number | null>(
    null
  );
  const [isTracking, setIsTracking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Internal refs (not shown on screen, just used for calculations) ──
  // We use refs instead of state for these because we don't need React
  // to re-render every time the previous coordinate changes.
  const totalMetres = useRef(0);
  const pacePoints = useRef<PacePoint[]>([]);
  const smoothedPace = useRef<number | null>(null);
  const lastValidPaceAt = useRef<number | null>(null);

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
      // - timeInterval: 1000 means "aim for about one update per second".
      // - We intentionally do NOT set distanceInterval here. A 5 metre gate
      //   makes pace sluggish at walking and easy-jog speeds because the app
      //   may wait several seconds before receiving the next point.
      //   For this MVP, once-per-second updates give the rolling pace window
      //   enough data to react quickly while keeping battery use reasonable.
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,    // milliseconds
        },
        (location) => {
          // This callback fires every time the device has a new position.
          const newPoint: PacePoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
          };

          // Update the rolling pace buffer first. The utility returns the
          // accepted distance for this segment, so total distance and pace
          // stay in sync and both ignore the same GPS spikes.
          const nextBuffer = updatePaceBuffer(pacePoints.current, newPoint);
          pacePoints.current = nextBuffer.points;

          if (nextBuffer.acceptedDistanceMetres > 0) {
            totalMetres.current += nextBuffer.acceptedDistanceMetres;
          }

          const rawPace = calculateWindowPaceMinPerKm(pacePoints.current);
          let nextSmoothedPace = smoothPaceMinPerKm(smoothedPace.current, rawPace);

          // Keep the last known pace for a very short period when the incoming
          // data is momentarily too noisy or too sparse. This prevents the UI
          // from flashing "--:--" between otherwise healthy GPS updates.
          if (rawPace == null) {
            const hasFreshRecentPace =
              lastValidPaceAt.current != null &&
              newPoint.timestamp - lastValidPaceAt.current <= PACE_STALE_AFTER_MS;

            nextSmoothedPace = hasFreshRecentPace ? smoothedPace.current : null;
          } else {
            lastValidPaceAt.current = newPoint.timestamp;
          }

          smoothedPace.current = nextSmoothedPace;

          if (isMounted) {
            setDistanceKm(totalMetres.current / 1000);
            setCurrentPaceMinPerKm(nextSmoothedPace);
          }
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

  return { distanceKm, currentPaceMinPerKm, isTracking, errorMsg };
}
