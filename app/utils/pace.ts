/**
 * pace.ts
 * ───────
 * Small helpers for turning noisy phone GPS points into a calmer live pace.
 *
 * This file now uses a simple two-stage model:
 *   1. Internal pace  → faster and more responsive, used to detect real changes.
 *   2. Display pace   → slower and more stable, used by the UI and coaching.
 *
 * We keep the implementation intentionally lightweight:
 *   - rolling GPS window
 *   - spike rejection
 *   - startup calibration gating
 *   - basic confidence checks
 *   - slower smoothing for walking, lighter smoothing for running
 *   - jump limiting so one noisy update cannot create a fake pace leap
 */

// ─── Configuration ───────────────────────────────────────────────────────────

/** Use the last 6 seconds of accepted points for the fast internal estimate. */
export const PACE_WINDOW_MS = 6_000;

/** Ignore jumps above this speed. 6 m/s is about 2:47 /km. */
export const MAX_REASONABLE_SPEED_MPS = 6;

/** Tiny movements are usually GPS wobble, especially when stationary. */
export const MIN_MOVEMENT_METRES = 1.2;

/** Hide pace if the value is clearly not meaningful for this app. */
export const MAX_DISPLAY_PACE_MIN_PER_KM = 30;

/**
 * Startup calibration:
 * do not show pace until we have enough time, distance, and samples.
 */
export const CALIBRATION_MIN_ELAPSED_MS = 10_000;
export const CALIBRATION_MIN_ACCEPTED_DISTANCE_METRES = 20;
export const CALIBRATION_MIN_ACCEPTED_SAMPLES = 6;

/**
 * Confidence gating inside the current rolling window.
 * These are intentionally simple checks so the code stays understandable.
 */
export const CONFIDENCE_MIN_WINDOW_MS = 4_000;
export const CONFIDENCE_MIN_WINDOW_DISTANCE_METRES = 6;
export const CONFIDENCE_MIN_ACCEPTED_SAMPLES = 4;
export const RECENT_REJECTION_BLOCK_MS = 4_000;

/** Treat slower movement more conservatively than running. */
export const SLOW_MOVEMENT_SPEED_MPS = 2.2;
export const MAX_SPEED_RANGE_SLOW_MPS = 0.9;
export const MAX_SPEED_RANGE_RUNNING_MPS = 1.8;

/** Fast internal pace smoothing. */
export const INTERNAL_PACE_ALPHA = 0.65;
export const INTERNAL_FAST_RESPONSE_ALPHA = 0.82;
export const INTERNAL_FAST_RESPONSE_DELTA_MIN_PER_KM = 0.25;

/** Stable display pace smoothing. Walking gets heavier smoothing. */
export const DISPLAY_PACE_ALPHA_SLOW = 0.18;
export const DISPLAY_PACE_ALPHA_RUNNING = 0.32;

/**
 * Per-update jump caps so the displayed pace cannot teleport from one noisy
 * sample. Real changes still come through because the cap is applied once
 * per update, and the internal pace keeps pushing in the same direction.
 */
export const DISPLAY_MAX_STEP_SLOW_MIN_PER_KM = 0.45;
export const DISPLAY_MAX_STEP_RUNNING_MIN_PER_KM = 0.9;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PacePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface PaceWindowStats {
  elapsedMs: number;
  distanceMetres: number;
  acceptedSampleCount: number;
  movingSegmentCount: number;
  averageSpeedMps: number;
  speedRangeMps: number;
}

interface SegmentMetrics {
  distanceMetres: number;
  elapsedMs: number;
  speedMps: number;
}

// ─── Distance helper ─────────────────────────────────────────────────────────

/**
 * Calculates the straight-line distance between two GPS points in metres.
 */
export function haversineMetres(a: PacePoint, b: PacePoint): number {
  const earthRadiusMetres = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLatitude = toRadians(b.latitude - a.latitude);
  const deltaLongitude = toRadians(b.longitude - a.longitude);

  const sinHalfLatitude = Math.sin(deltaLatitude / 2);
  const sinHalfLongitude = Math.sin(deltaLongitude / 2);

  const h =
    sinHalfLatitude * sinHalfLatitude +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      sinHalfLongitude *
      sinHalfLongitude;

  return 2 * earthRadiusMetres * Math.asin(Math.sqrt(h));
}

// ─── Rolling buffer helpers ──────────────────────────────────────────────────

function getSegmentMetrics(previous: PacePoint, next: PacePoint): SegmentMetrics {
  const elapsedMs = next.timestamp - previous.timestamp;

  if (elapsedMs <= 0) {
    return { distanceMetres: 0, elapsedMs: 0, speedMps: 0 };
  }

  const rawDistanceMetres = haversineMetres(previous, next);
  const distanceMetres =
    rawDistanceMetres < MIN_MOVEMENT_METRES ? 0 : rawDistanceMetres;
  const speedMps = distanceMetres / (elapsedMs / 1000);

  return { distanceMetres, elapsedMs, speedMps };
}

/**
 * Adds a new point if the segment looks plausible, then trims the rolling
 * buffer to the most recent window.
 */
export function updatePaceBuffer(
  previousPoints: PacePoint[],
  newPoint: PacePoint
): {
  points: PacePoint[];
  acceptedDistanceMetres: number;
  wasRejectedAsSpike: boolean;
} {
  const lastPoint = previousPoints[previousPoints.length - 1];

  if (!lastPoint) {
    return {
      points: [newPoint],
      acceptedDistanceMetres: 0,
      wasRejectedAsSpike: false,
    };
  }

  const segment = getSegmentMetrics(lastPoint, newPoint);

  if (segment.elapsedMs <= 0 || segment.speedMps > MAX_REASONABLE_SPEED_MPS) {
    return {
      points: previousPoints,
      acceptedDistanceMetres: 0,
      wasRejectedAsSpike: true,
    };
  }

  const points = [...previousPoints, newPoint].filter(
    (point) => newPoint.timestamp - point.timestamp <= PACE_WINDOW_MS
  );

  return {
    points,
    acceptedDistanceMetres: segment.distanceMetres,
    wasRejectedAsSpike: false,
  };
}

// ─── Rolling window analysis ─────────────────────────────────────────────────

/**
 * Summarises the current rolling window so the hook can make simple
 * confidence decisions without re-deriving the same values repeatedly.
 */
export function getPaceWindowStats(points: PacePoint[]): PaceWindowStats {
  if (points.length < 2) {
    return {
      elapsedMs: 0,
      distanceMetres: 0,
      acceptedSampleCount: points.length,
      movingSegmentCount: 0,
      averageSpeedMps: 0,
      speedRangeMps: 0,
    };
  }

  const elapsedMs = points[points.length - 1].timestamp - points[0].timestamp;

  let distanceMetres = 0;
  let movingSegmentCount = 0;
  let minSpeedMps = Number.POSITIVE_INFINITY;
  let maxSpeedMps = 0;

  for (let index = 1; index < points.length; index += 1) {
    const segment = getSegmentMetrics(points[index - 1], points[index]);
    distanceMetres += segment.distanceMetres;

    if (segment.distanceMetres > 0) {
      movingSegmentCount += 1;
      minSpeedMps = Math.min(minSpeedMps, segment.speedMps);
      maxSpeedMps = Math.max(maxSpeedMps, segment.speedMps);
    }
  }

  const averageSpeedMps =
    elapsedMs > 0 ? distanceMetres / (elapsedMs / 1000) : 0;

  return {
    elapsedMs,
    distanceMetres,
    acceptedSampleCount: points.length,
    movingSegmentCount,
    averageSpeedMps,
    speedRangeMps:
      movingSegmentCount >= 2 ? maxSpeedMps - minSpeedMps : 0,
  };
}

// ─── Pace calculations ───────────────────────────────────────────────────────

/**
 * The fast internal pace estimate is based directly on the rolling window.
 * It should react quickly enough to detect true walk/jog pace changes.
 */
export function calculateInternalPaceMinPerKm(
  points: PacePoint[]
): number | null {
  const stats = getPaceWindowStats(points);

  if (stats.elapsedMs <= 0 || stats.distanceMetres <= 0) {
    return null;
  }

  const paceMinPerKm = 1000 / (stats.averageSpeedMps * 60);

  if (!Number.isFinite(paceMinPerKm) || paceMinPerKm > MAX_DISPLAY_PACE_MIN_PER_KM) {
    return null;
  }

  return paceMinPerKm;
}

/**
 * Smooth the fast internal pace lightly so it is responsive but not completely
 * raw. Large sustained changes are allowed to come through faster.
 */
export function smoothInternalPaceMinPerKm(
  previousInternalPace: number | null,
  nextRawPace: number | null
): number | null {
  if (nextRawPace == null) {
    return previousInternalPace;
  }

  if (previousInternalPace == null) {
    return nextRawPace;
  }

  const paceDelta = Math.abs(nextRawPace - previousInternalPace);
  const alpha =
    paceDelta >= INTERNAL_FAST_RESPONSE_DELTA_MIN_PER_KM
      ? INTERNAL_FAST_RESPONSE_ALPHA
      : INTERNAL_PACE_ALPHA;

  return alpha * nextRawPace + (1 - alpha) * previousInternalPace;
}

// ─── Gating helpers ──────────────────────────────────────────────────────────

/**
 * Startup calibration hides pace until there is enough reliable run history.
 * This removes the fake 2:00 /km or 20:00 /km values at the beginning.
 */
export function isPaceCalibrated(params: {
  elapsedMs: number;
  acceptedDistanceMetres: number;
  acceptedSampleCount: number;
}): boolean {
  return (
    params.elapsedMs >= CALIBRATION_MIN_ELAPSED_MS &&
    params.acceptedDistanceMetres >= CALIBRATION_MIN_ACCEPTED_DISTANCE_METRES &&
    params.acceptedSampleCount >= CALIBRATION_MIN_ACCEPTED_SAMPLES
  );
}

/**
 * Confidence gating decides whether the current window is trustworthy enough
 * to update the stable display pace.
 */
export function hasHighPaceConfidence(params: {
  stats: PaceWindowStats;
  currentTimestamp: number;
  lastRejectedAt: number | null;
}): boolean {
  const { stats, currentTimestamp, lastRejectedAt } = params;

  if (stats.elapsedMs < CONFIDENCE_MIN_WINDOW_MS) {
    return false;
  }

  if (stats.distanceMetres < CONFIDENCE_MIN_WINDOW_DISTANCE_METRES) {
    return false;
  }

  if (stats.acceptedSampleCount < CONFIDENCE_MIN_ACCEPTED_SAMPLES) {
    return false;
  }

  if (stats.movingSegmentCount < 2) {
    return false;
  }

  if (
    lastRejectedAt != null &&
    currentTimestamp - lastRejectedAt <= RECENT_REJECTION_BLOCK_MS
  ) {
    return false;
  }

  const isSlowMovement = stats.averageSpeedMps < SLOW_MOVEMENT_SPEED_MPS;
  const maxAllowedSpeedRange = isSlowMovement
    ? MAX_SPEED_RANGE_SLOW_MPS
    : MAX_SPEED_RANGE_RUNNING_MPS;

  return stats.speedRangeMps <= maxAllowedSpeedRange;
}

// ─── Display pace helpers ────────────────────────────────────────────────────

/**
 * Slower movement gets heavier smoothing because phone GPS is noisier there.
 */
export function isSlowMovementSpeed(speedMps: number): boolean {
  return speedMps > 0 && speedMps < SLOW_MOVEMENT_SPEED_MPS;
}

function clampPaceStep(
  previousPace: number,
  targetPace: number,
  maxStep: number
): number {
  const paceDelta = targetPace - previousPace;

  if (Math.abs(paceDelta) <= maxStep) {
    return targetPace;
  }

  return previousPace + Math.sign(paceDelta) * maxStep;
}

/**
 * The displayed pace is the calmer public-facing value.
 *
 * Rules:
 *   - use heavier smoothing for walking/slow movement
 *   - use lighter smoothing for running
 *   - cap the per-update change so one noisy update cannot create a fake jump
 */
export function updateDisplayPaceMinPerKm(params: {
  previousDisplayPace: number | null;
  internalPace: number;
  isSlowMovement: boolean;
}): number {
  const { previousDisplayPace, internalPace, isSlowMovement } = params;

  if (previousDisplayPace == null) {
    return internalPace;
  }

  const alpha = isSlowMovement
    ? DISPLAY_PACE_ALPHA_SLOW
    : DISPLAY_PACE_ALPHA_RUNNING;
  const maxStep = isSlowMovement
    ? DISPLAY_MAX_STEP_SLOW_MIN_PER_KM
    : DISPLAY_MAX_STEP_RUNNING_MIN_PER_KM;

  const smoothedTarget =
    alpha * internalPace + (1 - alpha) * previousDisplayPace;

  return clampPaceStep(previousDisplayPace, smoothedTarget, maxStep);
}
