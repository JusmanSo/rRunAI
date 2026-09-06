import {
  calculateInternalPaceMinPerKm,
  getPaceWindowStats,
  hasHighPaceConfidence,
  isPaceCalibrated,
  isSlowMovementSpeed,
  shouldHoldDisplayPace,
  smoothInternalPaceMinPerKm,
  updateDisplayPaceMinPerKm,
  updatePaceBuffer,
  type PacePoint,
} from "../utils/pace";
import {
  RunGpsDiagnosticsTracker,
  type LocationSampleSource,
  type RunLocationDiagnostics,
} from "./runGpsDiagnostics";
import { SampleDeduper } from "./sampleDeduper";

export interface RunLocationSnapshot {
  distanceKm: number;
  currentPaceMinPerKm: number | null;
  diagnostics: RunLocationDiagnostics;
}

export class RunLocationProcessor {
  private totalMetres = 0;
  private pacePoints: PacePoint[] = [];
  private acceptedSampleCount = 0;
  private firstAcceptedAt: number | null = null;
  private lastRejectedAt: number | null = null;
  private internalPace: number | null = null;
  private displayPace: number | null = null;
  private lastStableDisplayAt: number | null = null;
  private sampleDeduper = new SampleDeduper();
  private diagnostics = new RunGpsDiagnosticsTracker();

  reset() {
    this.totalMetres = 0;
    this.pacePoints = [];
    this.acceptedSampleCount = 0;
    this.firstAcceptedAt = null;
    this.lastRejectedAt = null;
    this.internalPace = null;
    this.displayPace = null;
    this.lastStableDisplayAt = null;
    this.sampleDeduper.reset();
    this.diagnostics.reset();
  }

  getSnapshot(): RunLocationSnapshot {
    return {
      distanceKm: this.totalMetres / 1000,
      currentPaceMinPerKm: this.displayPace,
      diagnostics: this.getDiagnostics(),
    };
  }

  getDiagnostics(): RunLocationDiagnostics {
    return this.diagnostics.getSnapshot();
  }

  startBackgroundPeriod(timestamp: number) {
    this.diagnostics.startBackgroundPeriod(timestamp);
  }

  endBackgroundPeriod(timestamp: number) {
    this.diagnostics.endBackgroundPeriod(timestamp);
  }

  recordInactiveSourceIgnoredSample() {
    this.diagnostics.recordInactiveSourceIgnoredSample();
  }

  processPoint(
    newPoint: PacePoint,
    source: LocationSampleSource = "foreground"
  ): RunLocationSnapshot {
    this.diagnostics.recordSample(newPoint, source);

    if (this.sampleDeduper.hasSeen(newPoint)) {
      this.diagnostics.recordRejectedSample("duplicate");
      return this.getSnapshot();
    }

    const previousDisplayPace = this.displayPace;
    const nextBuffer = updatePaceBuffer(this.pacePoints, newPoint);
    const didAcceptPoint =
      nextBuffer.points[nextBuffer.points.length - 1]?.timestamp ===
      newPoint.timestamp;

    this.pacePoints = nextBuffer.points;

    if (didAcceptPoint) {
      if (this.firstAcceptedAt == null) {
        this.firstAcceptedAt = newPoint.timestamp;
      }

      this.acceptedSampleCount += 1;
      this.diagnostics.recordAcceptedSample();
    }

    if (
      nextBuffer.wasRejectedAsSpike ||
      nextBuffer.wasRejectedForAccuracy ||
      nextBuffer.wasResetForGap
    ) {
      this.lastRejectedAt = newPoint.timestamp;
    }

    if (nextBuffer.wasRejectedAsSpike) {
      this.diagnostics.recordRejectedSample("spike");
    }

    if (nextBuffer.wasRejectedForAccuracy) {
      this.diagnostics.recordRejectedSample("accuracy");
    }

    if (nextBuffer.wasResetForGap) {
      this.diagnostics.recordRejectedSample("gapReset");
    }

    if (nextBuffer.acceptedDistanceMetres > 0) {
      this.totalMetres += nextBuffer.acceptedDistanceMetres;
    }

    const rawInternalPace = calculateInternalPaceMinPerKm(this.pacePoints);
    this.internalPace = smoothInternalPaceMinPerKm(
      this.internalPace,
      rawInternalPace
    );

    const windowStats = getPaceWindowStats(this.pacePoints);
    const trackingElapsedMs =
      this.firstAcceptedAt == null ? 0 : newPoint.timestamp - this.firstAcceptedAt;
    const isCalibrated = isPaceCalibrated({
      elapsedMs: trackingElapsedMs,
      acceptedDistanceMetres: this.totalMetres,
      acceptedSampleCount: this.acceptedSampleCount,
    });
    const hasConfidence =
      isCalibrated &&
      hasHighPaceConfidence({
        stats: windowStats,
        currentTimestamp: newPoint.timestamp,
        lastRejectedAt: this.lastRejectedAt,
      });

    if (hasConfidence && this.internalPace != null) {
      this.displayPace = updateDisplayPaceMinPerKm({
        previousDisplayPace: this.displayPace,
        internalPace: this.internalPace,
        isSlowMovement: isSlowMovementSpeed(windowStats.averageSpeedMps),
      });
      this.lastStableDisplayAt = newPoint.timestamp;
    } else {
      this.displayPace = shouldHoldDisplayPace({
        displayPace: this.displayPace,
        lastStableDisplayAt: this.lastStableDisplayAt,
        currentTimestamp: newPoint.timestamp,
        wasResetForGap: nextBuffer.wasResetForGap,
      })
        ? this.displayPace
        : null;
    }

    this.diagnostics.recordPaceStateChange(previousDisplayPace, this.displayPace);

    return this.getSnapshot();
  }
}
