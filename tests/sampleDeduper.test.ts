import test from "node:test";
import assert from "node:assert/strict";

import { SampleDeduper } from "../app/services/sampleDeduper.ts";

function point(latitude: number, longitude: number, timestamp: number) {
  return {
    latitude,
    longitude,
    timestamp,
    accuracyMetres: 5,
  };
}

test("SampleDeduper treats the same timestamp and coordinates as duplicate", () => {
  const deduper = new SampleDeduper();
  const sample = point(60.1, 24.9, 1000);

  assert.equal(deduper.hasSeen(sample), false);
  assert.equal(deduper.hasSeen(sample), true);
});

test("SampleDeduper allows same timestamp with different coordinates", () => {
  const deduper = new SampleDeduper();

  assert.equal(deduper.hasSeen(point(60.1, 24.9, 1000)), false);
  assert.equal(deduper.hasSeen(point(60.1001, 24.9, 1000)), false);
});
