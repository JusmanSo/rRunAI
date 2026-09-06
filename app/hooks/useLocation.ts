/**
 * useLocation.ts
 * ──────────────
 * Handles GPS tracking for the run screen.
 *
 * The hook now exposes a calmer "display pace" that is safe to use for both
 * UI and coaching. Internally it still keeps a faster pace estimate so real
 * walk/jog changes can come through within a few seconds.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Location from "expo-location";
import {
  getRunLocationSnapshot,
  processRunLocation,
  recordRunEnteredBackground,
  recordRunEnteredForeground,
  resetRunLocationTracking,
  setRunLocationAppState,
  startRunBackgroundLocationUpdates,
  stopRunBackgroundLocationUpdates,
  subscribeRunLocation,
} from "../services/runLocationTracking";
import type { RunLocationDiagnostics } from "../services/runGpsDiagnostics";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LocationData {
  distanceKm: number;
  currentPaceMinPerKm: number | null;
  isTracking: boolean;
  errorMsg: string | null;
  backgroundErrorMsg: string | null;
  diagnostics: RunLocationDiagnostics;
  stopTracking: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export default function useLocation(): LocationData {
  const initialSnapshot = getRunLocationSnapshot();
  const [distanceKm, setDistanceKm] = useState(initialSnapshot.distanceKm);
  const [currentPaceMinPerKm, setCurrentPaceMinPerKm] = useState<number | null>(
    initialSnapshot.currentPaceMinPerKm
  );
  const [diagnostics, setDiagnostics] = useState(initialSnapshot.diagnostics);
  const [isTracking, setIsTracking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [backgroundErrorMsg, setBackgroundErrorMsg] = useState<string | null>(
    null
  );

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasStoppedRef = useRef(false);

  const setLocationAppState = useCallback((appState: AppStateStatus) => {
    if (appState === "active") {
      setRunLocationAppState("active");
      return;
    }

    if (appState === "background") {
      setRunLocationAppState("background");
      return;
    }

    setRunLocationAppState("inactive");
  }, []);

  const stopTracking = useCallback(() => {
    hasStoppedRef.current = true;

    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }

    setIsTracking(false);
    recordRunEnteredForeground();

    stopRunBackgroundLocationUpdates().catch(() => {
      // The run is already ending; failure to unregister should not crash it.
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    resetRunLocationTracking();
    setLocationAppState(appStateRef.current);

    const unsubscribe = subscribeRunLocation((snapshot) => {
      if (!isMounted) return;

      setDistanceKm(snapshot.distanceKm);
      setCurrentPaceMinPerKm(snapshot.currentPaceMinPerKm);
      setDiagnostics(snapshot.diagnostics);
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        const previousAppState = appStateRef.current;
        appStateRef.current = nextAppState;
        setLocationAppState(nextAppState);

        if (previousAppState !== "background" && nextAppState === "background") {
          recordRunEnteredBackground();
          return;
        }

        if (previousAppState === "background" && nextAppState !== "background") {
          recordRunEnteredForeground();
        }
      }
    );

    async function startTracking() {
      let foregroundPermission;

      try {
        foregroundPermission = await Location.requestForegroundPermissionsAsync();
      } catch {
        if (isMounted) {
          setErrorMsg("Location permission could not be requested.");
        }
        return;
      }

      const { status } = foregroundPermission;

      if (status !== "granted") {
        if (isMounted) {
          setErrorMsg("Location permission was denied.");
        }
        return;
      }

      if (!isMounted || hasStoppedRef.current) return;

      let sub: Location.LocationSubscription;

      try {
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
          },
          processRunLocation,
          (reason) => {
            if (isMounted) {
              setErrorMsg(`Location tracking error: ${reason}`);
            }
          }
        );
      } catch {
        if (isMounted) {
          setErrorMsg("GPS tracking could not be started.");
        }
        return;
      }

      if (!isMounted || hasStoppedRef.current) {
        sub.remove();
        return;
      }

      subscriptionRef.current = sub;

      if (isMounted) {
        setIsTracking(true);
      }

      startRunBackgroundLocationUpdates()
        .then((backgroundError) => {
          if (!isMounted || hasStoppedRef.current) {
            stopRunBackgroundLocationUpdates().catch(() => {
              // Cleanup is best effort if the screen disappeared mid-start.
            });
            return;
          }

          if (isMounted) {
            setBackgroundErrorMsg(backgroundError);
          }
        })
        .catch(() => {
          if (isMounted) {
            setBackgroundErrorMsg(
              "Background GPS could not be started; foreground GPS is still active."
            );
          }
        });
    }

    startTracking();

    return () => {
      isMounted = false;
      unsubscribe();
      appStateSubscription.remove();

      if (!hasStoppedRef.current) {
        hasStoppedRef.current = true;

        if (subscriptionRef.current) {
          subscriptionRef.current.remove();
          subscriptionRef.current = null;
        }

        stopRunBackgroundLocationUpdates().catch(() => {
          // Cleanup is best effort during unmount.
        });
        recordRunEnteredForeground();
      }
    };
  }, [setLocationAppState, stopTracking]);

  return {
    distanceKm,
    currentPaceMinPerKm,
    isTracking,
    errorMsg,
    backgroundErrorMsg,
    diagnostics,
    stopTracking,
  };
}
