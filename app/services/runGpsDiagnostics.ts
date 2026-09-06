import type { PacePoint } from "../utils/pace";

export type LocationSampleSource = "foreground" | "background";

export type LocationRejectionReason =
  | "accuracy"
  | "spike"
  | "duplicate"
  | "gapReset";

export interface RunLocationDiagnostics {
  latestAccuracyMetres: number | null;
  latestSampleTimestamp: number | null;
  acceptedSampleCount: number;
  rejectedSampleCount: number;
  rejectionReasons: {
    accuracy: number;
    spike: number;
    duplicate: number;
    gapReset: number;
  };
  foregroundSampleCount: number;
  backgroundSampleCount: number;
  inactiveSourceIgnoredSampleCount: number;
  paceReturnedToCalibratingCount: number;
  backgroundElapsedMs: number;
}

export class RunGpsDiagnosticsTracker {
  private latestAccuracyMetres: number | null = null;
  private latestSampleTimestamp: number | null = null;
  private acceptedSampleCount = 0;
  private rejectedSampleCount = 0;
  private rejectionReasons = {
    accuracy: 0,
    spike: 0,
    duplicate: 0,
    gapReset: 0,
  };
  private foregroundSampleCount = 0;
  private backgroundSampleCount = 0;
  private inactiveSourceIgnoredSampleCount = 0;
  private paceReturnedToCalibratingCount = 0;
  private backgroundElapsedMs = 0;
  private backgroundStartedAt: number | null = null;

  reset() {
    this.latestAccuracyMetres = null;
    this.latestSampleTimestamp = null;
    this.acceptedSampleCount = 0;
    this.rejectedSampleCount = 0;
    this.rejectionReasons = {
      accuracy: 0,
      spike: 0,
      duplicate: 0,
      gapReset: 0,
    };
    this.foregroundSampleCount = 0;
    this.backgroundSampleCount = 0;
    this.inactiveSourceIgnoredSampleCount = 0;
    this.paceReturnedToCalibratingCount = 0;
    this.backgroundElapsedMs = 0;
    this.backgroundStartedAt = null;
  }

  getSnapshot(): RunLocationDiagnostics {
    return {
      latestAccuracyMetres: this.latestAccuracyMetres,
      latestSampleTimestamp: this.latestSampleTimestamp,
      acceptedSampleCount: this.acceptedSampleCount,
      rejectedSampleCount: this.rejectedSampleCount,
      rejectionReasons: { ...this.rejectionReasons },
      foregroundSampleCount: this.foregroundSampleCount,
      backgroundSampleCount: this.backgroundSampleCount,
      inactiveSourceIgnoredSampleCount: this.inactiveSourceIgnoredSampleCount,
      paceReturnedToCalibratingCount: this.paceReturnedToCalibratingCount,
      backgroundElapsedMs: this.backgroundElapsedMs,
    };
  }

  recordSample(point: PacePoint, source: LocationSampleSource) {
    this.latestAccuracyMetres = point.accuracyMetres ?? null;
    this.latestSampleTimestamp = point.timestamp;

    if (source === "background") {
      this.backgroundSampleCount += 1;
    } else {
      this.foregroundSampleCount += 1;
    }
  }

  recordAcceptedSample() {
    this.acceptedSampleCount += 1;
  }

  recordRejectedSample(reason: LocationRejectionReason) {
    this.rejectionReasons[reason] += 1;

    if (reason !== "gapReset") {
      this.rejectedSampleCount += 1;
    }
  }

  recordInactiveSourceIgnoredSample() {
    this.inactiveSourceIgnoredSampleCount += 1;
  }

  recordPaceStateChange(
    previousDisplayPace: number | null,
    nextDisplayPace: number | null
  ) {
    if (previousDisplayPace != null && nextDisplayPace == null) {
      this.paceReturnedToCalibratingCount += 1;
    }
  }

  startBackgroundPeriod(timestamp: number) {
    if (this.backgroundStartedAt == null) {
      this.backgroundStartedAt = timestamp;
    }
  }

  endBackgroundPeriod(timestamp: number) {
    if (this.backgroundStartedAt == null) {
      return;
    }

    this.backgroundElapsedMs += Math.max(0, timestamp - this.backgroundStartedAt);
    this.backgroundStartedAt = null;
  }
}
