import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import {
  RunLocationProcessor,
  type RunLocationSnapshot,
} from "./runLocationState";
import type {
  LocationSampleSource,
  RunLocationDiagnostics,
} from "./runGpsDiagnostics";
import {
  LocationSourceGate,
  type RunLocationAppState,
} from "./locationSourceGate";
import type { PacePoint } from "../utils/pace";

export const RUN_BACKGROUND_LOCATION_TASK = "rrunai-active-run-location";

type SnapshotListener = (snapshot: RunLocationSnapshot) => void;

type BackgroundLocationTaskData = {
  locations: Location.LocationObject[];
};

const processor = new RunLocationProcessor();
const listeners = new Set<SnapshotListener>();
const sourceGate = new LocationSourceGate();

function toPacePoint(location: Location.LocationObject): PacePoint {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    timestamp: location.timestamp,
    accuracyMetres: location.coords.accuracy,
  };
}

function notify(snapshot: RunLocationSnapshot) {
  listeners.forEach((listener) => listener(snapshot));
}

export function resetRunLocationTracking() {
  processor.reset();
  sourceGate.reset();
  notify(processor.getSnapshot());
}

export function getRunLocationSnapshot(): RunLocationSnapshot {
  return processor.getSnapshot();
}

export function getRunLocationDiagnostics(): RunLocationDiagnostics {
  return processor.getDiagnostics();
}

export function subscribeRunLocation(listener: SnapshotListener): () => void {
  listeners.add(listener);
  listener(processor.getSnapshot());

  return () => {
    listeners.delete(listener);
  };
}

export function processRunLocation(
  location: Location.LocationObject,
  source: LocationSampleSource = "foreground"
): RunLocationSnapshot {
  if (!sourceGate.shouldProcess(source)) {
    processor.recordInactiveSourceIgnoredSample();
    const snapshot = processor.getSnapshot();
    notify(snapshot);
    return snapshot;
  }

  const snapshot = processor.processPoint(toPacePoint(location), source);
  notify(snapshot);
  return snapshot;
}

export function setRunLocationAppState(appState: RunLocationAppState) {
  sourceGate.setAppState(appState);
}

export function recordRunEnteredBackground(timestamp: number = Date.now()) {
  processor.startBackgroundPeriod(timestamp);
  notify(processor.getSnapshot());
}

export function recordRunEnteredForeground(timestamp: number = Date.now()) {
  processor.endBackgroundPeriod(timestamp);
  notify(processor.getSnapshot());
}

export async function startRunBackgroundLocationUpdates(): Promise<string | null> {
  const isTaskManagerAvailable = await TaskManager.isAvailableAsync();

  if (!isTaskManagerAvailable) {
    return "Background GPS is unavailable in this build; foreground GPS is still active.";
  }

  const { status } = await Location.requestBackgroundPermissionsAsync();

  if (status !== "granted") {
    return "Background GPS permission was denied; foreground GPS is still active.";
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    RUN_BACKGROUND_LOCATION_TASK
  );

  if (!hasStarted) {
    await Location.startLocationUpdatesAsync(RUN_BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 1000,
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
  }

  return null;
}

export async function stopRunBackgroundLocationUpdates() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    RUN_BACKGROUND_LOCATION_TASK
  );

  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(RUN_BACKGROUND_LOCATION_TASK);
  }
}

TaskManager.defineTask<BackgroundLocationTaskData>(
  RUN_BACKGROUND_LOCATION_TASK,
  ({ data, error }) => {
    if (error) {
      console.warn("Background location task failed:", error.message);
      return Promise.resolve();
    }

    const locations = data?.locations ?? [];
    locations.forEach((location) => processRunLocation(location, "background"));

    return Promise.resolve();
  }
);
