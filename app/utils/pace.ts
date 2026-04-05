/**
 * pace.ts
 * ───────
 * Helpers for calculating a stable "current pace" from recent GPS points.
 *
 * The goal is to keep pace responsive without reacting to every tiny GPS wobble.
 * We do that by:
 *   1. Keeping only a short rolling window of recent points.
 *   2. Ignoring impossible jumps between points.
 *   3. Calculating pace from distance over time inside that window.
 *   4. Applying light exponential smoothing to the final pace value.
 */

// ─── Configuration ───────────────────────────────────────────────────────────

/** Keep the last 6 seconds of accepted GPS points for quicker reactions. */
export const PACE_WINDOW_MS = 6_000;

/**
 * Require a few seconds of history before showing pace.
 * This avoids unrealistically fast readings from only one short segment.
 */
export const MIN_PACE_WINDOW_MS = 3_000;

/**
 * Ignore jumps faster than this.  8 m/s is about 2:05 /km, which is far
 * beyond normal recreational running and usually means the GPS jumped.
 */
export const MAX_REASONABLE_SPEED_MPS = 6;

/**
 * Very tiny movements are usually GPS jitter, especially when standing
 * still. We keep the point, but treat the segment distance as zero.
 */
export const MIN_MOVEMENT_METRES = 1.2;

/** Light smoothing so pace settles quickly without becoming twitchy. */
export const PACE_EMA_ALPHA = 0.42;

/**
 * If the pace meaningfully changes, respond faster for that update instead of
 * waiting for the normal EMA to catch up over several seconds.
 */
export const FAST_RESPONSE_ALPHA = 0.7;
export const FAST_RESPONSE_DELTA_MIN_PER_KM = 0.25;

/** Hide pace if the computed value is clearly not useful. */
export const MAX_DISPLAY_PACE_MIN_PER_KM = 30;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PacePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
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

// ─── Buffer helpers ──────────────────────────────────────────────────────────

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
 * Adds a new point if it looks plausible, then trims the buffer to the last
 * few seconds.  The return value also tells the caller how much accepted
 * distance should count toward total run distance.
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

  if (segment.elapsedMs <= 0) {
    return {
      points: previousPoints,
      acceptedDistanceMetres: 0,
      wasRejectedAsSpike: true,
    };
  }

  if (segment.speedMps > MAX_REASONABLE_SPEED_MPS) {
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

// ─── Pace calculation ────────────────────────────────────────────────────────

/**
 * Converts the rolling GPS buffer into an unsmoothed current pace.
 *
 * We sum the accepted segment distances inside the window and divide by the
 * time between the oldest and newest point.  This makes pace react within a
 * few seconds while staying much steadier than "latest point only".
 */
export function calculateWindowPaceMinPerKm(
  points: PacePoint[]
): number | null {
  if (points.length < 2) {
    return null;
  }

  const elapsedMs = points[points.length - 1].timestamp - points[0].timestamp;

  if (elapsedMs < MIN_PACE_WINDOW_MS) {
    return null;
  }

  let distanceMetres = 0;

  for (let index = 1; index < points.length; index += 1) {
    distanceMetres += getSegmentMetrics(points[index - 1], points[index]).distanceMetres;
  }

  if (distanceMetres <= 0) {
    return null;
  }

  const speedMps = distanceMetres / (elapsedMs / 1000);

  if (speedMps <= 0) {
    return null;
  }

  const paceMinPerKm = 1000 / (speedMps * 60);

  if (!Number.isFinite(paceMinPerKm) || paceMinPerKm > MAX_DISPLAY_PACE_MIN_PER_KM) {
    return null;
  }

  return paceMinPerKm;
}

/**
 * Exponential moving average:
 *   newSmoothed = alpha * current + (1 - alpha) * previous
 *
 * Using a small amount of smoothing removes the remaining jitter but still
 * lets the pace react within the 5-8 second rolling window.
 */
export function smoothPaceMinPerKm(
  previousPace: number | null,
  nextPace: number | null
): number | null {
  if (nextPace == null) {
    return previousPace;
  }

  if (previousPace == null) {
    return nextPace;
  }

  const paceDelta = Math.abs(nextPace - previousPace);
  const alpha =
    paceDelta >= FAST_RESPONSE_DELTA_MIN_PER_KM
      ? FAST_RESPONSE_ALPHA
      : PACE_EMA_ALPHA;

  return alpha * nextPace + (1 - alpha) * previousPace;
}
