/**
 * useLocation.ts
 * ──────────────
 * Handles GPS tracking for the run screen.
 *
 * The hook now exposes a calmer "display pace" that is safe to use for both
 * UI and coaching. Internally it still keeps a faster pace estimate so real
 * walk/jog changes can come through within a few seconds.
 */

import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import {
  calculateInternalPaceMinPerKm,
  getPaceWindowStats,
  hasHighPaceConfidence,
  isPaceCalibrated,
  isSlowMovementSpeed,
  updateDisplayPaceMinPerKm,
  updatePaceBuffer,
  smoothInternalPaceMinPerKm,
  type PacePoint,
} from "../utils/pace";

// Keep the last stable display pace briefly when confidence dips so the
// screen does not flicker between a pace value and "--:--".
const DISPLAY_PACE_HOLD_MS = 4_000;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LocationData {
  distanceKm: number;
  currentPaceMinPerKm: number | null;
  isTracking: boolean;
  errorMsg: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export default function useLocation(): LocationData {
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentPaceMinPerKm, setCurrentPaceMinPerKm] = useState<number | null>(
    null
  );
  const [isTracking, setIsTracking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalMetres = useRef(0);
  const pacePoints = useRef<PacePoint[]>([]);
  const acceptedSampleCount = useRef(0);
  const firstAcceptedAt = useRef<number | null>(null);
  const lastRejectedAt = useRef<number | null>(null);
  const internalPace = useRef<number | null>(null);
  const displayPace = useRef<number | null>(null);
  const lastStableDisplayAt = useRef<number | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function startTracking() {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        if (isMounted) {
          setErrorMsg("Location permission was denied.");
        }
        return;
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
        },
        (location) => {
          const newPoint: PacePoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
          };

          const nextBuffer = updatePaceBuffer(pacePoints.current, newPoint);
          const didAcceptPoint =
            nextBuffer.points[nextBuffer.points.length - 1]?.timestamp ===
            newPoint.timestamp;

          pacePoints.current = nextBuffer.points;

          if (didAcceptPoint) {
            if (firstAcceptedAt.current == null) {
              firstAcceptedAt.current = newPoint.timestamp;
            }

            acceptedSampleCount.current += 1;
          }

          if (nextBuffer.wasRejectedAsSpike) {
            lastRejectedAt.current = newPoint.timestamp;
          }

          if (nextBuffer.acceptedDistanceMetres > 0) {
            totalMetres.current += nextBuffer.acceptedDistanceMetres;
          }

          // Stage 1: fast internal pace.
          const rawInternalPace = calculateInternalPaceMinPerKm(pacePoints.current);
          internalPace.current = smoothInternalPaceMinPerKm(
            internalPace.current,
            rawInternalPace
          );

          // Stage 2: stable display pace, only updated when calibration and
          // confidence checks say the current signal is trustworthy enough.
          const windowStats = getPaceWindowStats(pacePoints.current);
          const trackingElapsedMs =
            firstAcceptedAt.current == null
              ? 0
              : newPoint.timestamp - firstAcceptedAt.current;
          const isCalibrated = isPaceCalibrated({
            elapsedMs: trackingElapsedMs,
            acceptedDistanceMetres: totalMetres.current,
            acceptedSampleCount: acceptedSampleCount.current,
          });
          const hasConfidence =
            isCalibrated &&
            hasHighPaceConfidence({
              stats: windowStats,
              currentTimestamp: newPoint.timestamp,
              lastRejectedAt: lastRejectedAt.current,
            });

          if (hasConfidence && internalPace.current != null) {
            displayPace.current = updateDisplayPaceMinPerKm({
              previousDisplayPace: displayPace.current,
              internalPace: internalPace.current,
              isSlowMovement: isSlowMovementSpeed(windowStats.averageSpeedMps),
            });
            lastStableDisplayAt.current = newPoint.timestamp;
          } else {
            const canHoldLastStablePace =
              displayPace.current != null &&
              lastStableDisplayAt.current != null &&
              newPoint.timestamp - lastStableDisplayAt.current <= DISPLAY_PACE_HOLD_MS;

            displayPace.current = canHoldLastStablePace
              ? displayPace.current
              : null;
          }

          if (isMounted) {
            setDistanceKm(totalMetres.current / 1000);
            setCurrentPaceMinPerKm(displayPace.current);
          }
        }
      );

      subscriptionRef.current = sub;

      if (isMounted) {
        setIsTracking(true);
      }
    }

    startTracking();

    return () => {
      isMounted = false;

      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  return { distanceKm, currentPaceMinPerKm, isTracking, errorMsg };
}
