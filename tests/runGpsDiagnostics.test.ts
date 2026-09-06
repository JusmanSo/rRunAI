import test from "node:test";
import assert from "node:assert/strict";

import { RunGpsDiagnosticsTracker } from "../app/services/runGpsDiagnostics.ts";

function point(timestamp: number, accuracyMetres = 5) {
  return {
    latitude: 0,
    longitude: 0,
    timestamp,
    accuracyMetres,
  };
}

test("RunGpsDiagnosticsTracker reports sample counts and latest GPS sample details", () => {
  const tracker = new RunGpsDiagnosticsTracker();

  tracker.recordSample(point(1000), "foreground");
  tracker.recordAcceptedSample();
  tracker.recordSample(point(2000, 8), "background");
  tracker.recordAcceptedSample();

  const diagnostics = tracker.getSnapshot();

  assert.equal(diagnostics.latestAccuracyMetres, 8);
  assert.equal(diagnostics.latestSampleTimestamp, 2000);
  assert.equal(diagnostics.acceptedSampleCount, 2);
  assert.equal(diagnostics.rejectedSampleCount, 0);
  assert.equal(diagnostics.foregroundSampleCount, 1);
  assert.equal(diagnostics.backgroundSampleCount, 1);
  assert.equal(diagnostics.inactiveSourceIgnoredSampleCount, 0);
});

test("RunGpsDiagnosticsTracker counts rejected samples by available reason", () => {
  const tracker = new RunGpsDiagnosticsTracker();

  tracker.recordRejectedSample("duplicate");
  tracker.recordRejectedSample("accuracy");
  tracker.recordRejectedSample("spike");
  tracker.recordRejectedSample("gapReset");

  const diagnostics = tracker.getSnapshot();

  assert.equal(diagnostics.rejectedSampleCount, 3);
  assert.equal(diagnostics.rejectionReasons.duplicate, 1);
  assert.equal(diagnostics.rejectionReasons.accuracy, 1);
  assert.equal(diagnostics.rejectionReasons.spike, 1);
  assert.equal(diagnostics.rejectionReasons.gapReset, 1);
});

test("RunGpsDiagnosticsTracker counts live pace returning to calibrating", () => {
  const tracker = new RunGpsDiagnosticsTracker();

  tracker.recordPaceStateChange(null, 6);
  tracker.recordPaceStateChange(6, 5.9);
  tracker.recordPaceStateChange(5.9, null);
  tracker.recordPaceStateChange(null, null);

  assert.equal(tracker.getSnapshot().paceReturnedToCalibratingCount, 1);
});

test("RunGpsDiagnosticsTracker totals active-run background elapsed time", () => {
  const tracker = new RunGpsDiagnosticsTracker();

  tracker.startBackgroundPeriod(1000);
  tracker.startBackgroundPeriod(2000);
  tracker.endBackgroundPeriod(6500);
  tracker.endBackgroundPeriod(8000);
  tracker.startBackgroundPeriod(10_000);
  tracker.endBackgroundPeriod(12_500);

  assert.equal(tracker.getSnapshot().backgroundElapsedMs, 8000);
});

test("RunGpsDiagnosticsTracker counts samples ignored from inactive sources", () => {
  const tracker = new RunGpsDiagnosticsTracker();

  tracker.recordInactiveSourceIgnoredSample();
  tracker.recordInactiveSourceIgnoredSample();

  assert.equal(tracker.getSnapshot().inactiveSourceIgnoredSampleCount, 2);
});
