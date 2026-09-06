import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateInternalPaceMinPerKm,
  getPaceWindowStats,
  hasHighPaceConfidence,
  haversineMetres,
  isPaceCalibrated,
  isSlowMovementSpeed,
  shouldHoldDisplayPace,
  smoothInternalPaceMinPerKm,
  updateDisplayPaceMinPerKm,
  updatePaceBuffer,
} from "../app/utils/pace.ts";

const METRES_PER_DEGREE_AT_EQUATOR = 111_319.49;

function pointAtMetres(eastMetres, timestamp, accuracyMetres = 5) {
  return {
    latitude: 0,
    longitude: eastMetres / METRES_PER_DEGREE_AT_EQUATOR,
    timestamp,
    accuracyMetres,
  };
}

test("haversineMetres calculates straight-line distance in metres", () => {
  assert.equal(haversineMetres(pointAtMetres(0, 0), pointAtMetres(0, 1)), 0);
  assert.ok(
    Math.abs(
      haversineMetres(pointAtMetres(0, 0), pointAtMetres(100, 1)) - 100
    ) < 0.2
  );
});

test("updatePaceBuffer accepts plausible movement and returns accepted distance", () => {
  const first = pointAtMetres(0, 0);
  const second = pointAtMetres(3, 1000);

  const result = updatePaceBuffer([first], second);

  assert.equal(result.points.length, 2);
  assert.equal(result.wasRejectedAsSpike, false);
  assert.equal(result.wasRejectedForAccuracy, false);
  assert.equal(result.wasResetForGap, false);
  assert.ok(result.acceptedDistanceMetres > 2.8);
  assert.ok(result.acceptedDistanceMetres < 3.2);
});

test("updatePaceBuffer rejects poor-accuracy samples before adding movement", () => {
  const first = pointAtMetres(0, 0, 5);
  const poorAccuracy = pointAtMetres(3, 1000, 60);

  const result = updatePaceBuffer([first], poorAccuracy);

  assert.equal(result.points.length, 1);
  assert.equal(result.points[0], first);
  assert.equal(result.acceptedDistanceMetres, 0);
  assert.equal(result.wasRejectedAsSpike, false);
  assert.equal(result.wasRejectedForAccuracy, true);
  assert.equal(result.wasResetForGap, false);
});

test("updatePaceBuffer resets safely across large timestamp gaps", () => {
  const first = pointAtMetres(0, 0);
  const afterGap = pointAtMetres(100, 15_000);

  const result = updatePaceBuffer([first], afterGap);

  assert.deepEqual(result.points, [afterGap]);
  assert.equal(result.acceptedDistanceMetres, 0);
  assert.equal(result.wasRejectedAsSpike, false);
  assert.equal(result.wasRejectedForAccuracy, false);
  assert.equal(result.wasResetForGap, true);
});

test("updatePaceBuffer rejects non-increasing timestamps and implausible spikes", () => {
  const first = pointAtMetres(0, 1000);

  const duplicateTimestamp = updatePaceBuffer([first], pointAtMetres(3, 1000));
  assert.equal(duplicateTimestamp.points.length, 1);
  assert.equal(duplicateTimestamp.acceptedDistanceMetres, 0);
  assert.equal(duplicateTimestamp.wasRejectedAsSpike, true);
  assert.equal(duplicateTimestamp.wasRejectedForAccuracy, false);
  assert.equal(duplicateTimestamp.wasResetForGap, false);

  const spike = updatePaceBuffer([first], pointAtMetres(100, 2000));
  assert.equal(spike.points.length, 1);
  assert.equal(spike.acceptedDistanceMetres, 0);
  assert.equal(spike.wasRejectedAsSpike, true);
  assert.equal(spike.wasRejectedForAccuracy, false);
  assert.equal(spike.wasResetForGap, false);
});

test("updatePaceBuffer does not accumulate meaningful stationary GPS drift", () => {
  const points = [
    pointAtMetres(0, 0),
    pointAtMetres(0.8, 1000),
    pointAtMetres(1.5, 2000),
    pointAtMetres(2.3, 3000),
  ];

  let buffer = [points[0]];
  let acceptedDistanceMetres = 0;

  for (const point of points.slice(1)) {
    const result = updatePaceBuffer(buffer, point);
    buffer = result.points;
    acceptedDistanceMetres += result.acceptedDistanceMetres;
  }

  assert.equal(acceptedDistanceMetres, 0);
});

test("getPaceWindowStats summarizes accepted movement", () => {
  const stats = getPaceWindowStats([
    pointAtMetres(0, 0),
    pointAtMetres(3, 1000),
    pointAtMetres(6, 2000),
  ]);

  assert.equal(stats.elapsedMs, 2000);
  assert.equal(stats.acceptedSampleCount, 3);
  assert.equal(stats.movingSegmentCount, 2);
  assert.ok(stats.distanceMetres > 5.8);
  assert.ok(stats.distanceMetres < 6.2);
  assert.ok(stats.averageSpeedMps > 2.9);
  assert.ok(stats.averageSpeedMps < 3.1);
});

test("calculateInternalPaceMinPerKm returns a rolling pace from average speed", () => {
  const pace = calculateInternalPaceMinPerKm([
    pointAtMetres(0, 0),
    pointAtMetres(100, 30_000),
  ]);

  assert.ok(pace !== null);
  assert.ok(Math.abs(pace - 5) < 0.02);
});

test("calculateInternalPaceMinPerKm hides invalid or stationary windows", () => {
  assert.equal(calculateInternalPaceMinPerKm([pointAtMetres(0, 0)]), null);
  assert.equal(
    calculateInternalPaceMinPerKm([
      pointAtMetres(0, 0),
      pointAtMetres(0.5, 1000),
    ]),
    null
  );
});

test("isPaceCalibrated requires enough time, distance, and samples", () => {
  assert.equal(
    isPaceCalibrated({
      elapsedMs: 0,
      acceptedDistanceMetres: 0,
      acceptedSampleCount: 0,
    }),
    false
  );
  assert.equal(
    isPaceCalibrated({
      elapsedMs: 9000,
      acceptedDistanceMetres: 25,
      acceptedSampleCount: 6,
    }),
    false
  );
  assert.equal(
    isPaceCalibrated({
      elapsedMs: 10_000,
      acceptedDistanceMetres: 20,
      acceptedSampleCount: 6,
    }),
    true
  );
});

test("shouldHoldDisplayPace keeps a stable pace through a brief confidence dip", () => {
  assert.equal(
    shouldHoldDisplayPace({
      displayPace: 5.5,
      lastStableDisplayAt: 10_000,
      currentTimestamp: 18_000,
      wasResetForGap: false,
    }),
    true
  );
});

test("shouldHoldDisplayPace stops holding after prolonged GPS loss or a sample gap", () => {
  assert.equal(
    shouldHoldDisplayPace({
      displayPace: 5.5,
      lastStableDisplayAt: 10_000,
      currentTimestamp: 23_000,
      wasResetForGap: false,
    }),
    false
  );
  assert.equal(
    shouldHoldDisplayPace({
      displayPace: 5.5,
      lastStableDisplayAt: 10_000,
      currentTimestamp: 18_000,
      wasResetForGap: true,
    }),
    false
  );
  assert.equal(
    shouldHoldDisplayPace({
      displayPace: null,
      lastStableDisplayAt: null,
      currentTimestamp: 1000,
      wasResetForGap: false,
    }),
    false
  );
});

test("display pace hold does not change distance or spike filtering behavior", () => {
  const previousPoints = [pointAtMetres(0, 10_000)];
  const spikeResult = updatePaceBuffer(previousPoints, pointAtMetres(100, 11_000));

  assert.equal(spikeResult.points, previousPoints);
  assert.equal(spikeResult.acceptedDistanceMetres, 0);
  assert.equal(spikeResult.wasRejectedAsSpike, true);
  assert.equal(spikeResult.wasRejectedForAccuracy, false);
  assert.equal(spikeResult.wasResetForGap, false);
  assert.equal(
    shouldHoldDisplayPace({
      displayPace: 5.5,
      lastStableDisplayAt: 10_000,
      currentTimestamp: 11_000,
      wasResetForGap: spikeResult.wasResetForGap,
    }),
    true
  );
});

test("hasHighPaceConfidence accepts stable movement and rejects recent spikes", () => {
  const points = [
    pointAtMetres(0, 0),
    pointAtMetres(3, 1000),
    pointAtMetres(6, 2000),
    pointAtMetres(9, 3000),
    pointAtMetres(12, 4000),
  ];
  const stats = getPaceWindowStats(points);

  assert.equal(
    hasHighPaceConfidence({
      stats,
      currentTimestamp: 4000,
      lastRejectedAt: null,
    }),
    true
  );
  assert.equal(
    hasHighPaceConfidence({
      stats,
      currentTimestamp: 4000,
      lastRejectedAt: 1000,
    }),
    false
  );
});

test("pace smoothing keeps internal pace responsive and display pace bounded", () => {
  assert.equal(smoothInternalPaceMinPerKm(null, 6), 6);
  assert.equal(smoothInternalPaceMinPerKm(6, null), 6);
  assert.equal(smoothInternalPaceMinPerKm(6, 5), 5.18);

  assert.equal(
    updateDisplayPaceMinPerKm({
      previousDisplayPace: null,
      internalPace: 6,
      isSlowMovement: false,
    }),
    6
  );
  assert.equal(
    updateDisplayPaceMinPerKm({
      previousDisplayPace: 6,
      internalPace: 5,
      isSlowMovement: false,
    }),
    5.68
  );
  assert.equal(
    updateDisplayPaceMinPerKm({
      previousDisplayPace: 10,
      internalPace: 5,
      isSlowMovement: true,
    }),
    9.55
  );
});

test("isSlowMovementSpeed only marks positive slow movement as slow", () => {
  assert.equal(isSlowMovementSpeed(0), false);
  assert.equal(isSlowMovementSpeed(2), true);
  assert.equal(isSlowMovementSpeed(3), false);
});
