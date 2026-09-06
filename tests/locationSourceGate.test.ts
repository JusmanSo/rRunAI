import test from "node:test";
import assert from "node:assert/strict";

import { LocationSourceGate } from "../app/services/locationSourceGate.ts";
import { SampleDeduper } from "../app/services/sampleDeduper.ts";

const point = {
  latitude: 0,
  longitude: 0,
  timestamp: 1000,
  accuracyMetres: 5,
};

test("LocationSourceGate accepts foreground and ignores background while active", () => {
  const gate = new LocationSourceGate();
  gate.setAppState("active");

  assert.equal(gate.getActiveSource(), "foreground");
  assert.equal(gate.shouldProcess("foreground"), true);
  assert.equal(gate.shouldProcess("background"), false);
});

test("LocationSourceGate accepts background and ignores foreground while backgrounded", () => {
  const gate = new LocationSourceGate();
  gate.setAppState("background");

  assert.equal(gate.getActiveSource(), "background");
  assert.equal(gate.shouldProcess("background"), true);
  assert.equal(gate.shouldProcess("foreground"), false);
});

test("LocationSourceGate ignores both streams during inactive transitions", () => {
  const gate = new LocationSourceGate();
  gate.setAppState("active");
  assert.equal(gate.shouldProcess("foreground"), true);

  gate.setAppState("inactive");
  assert.equal(gate.getActiveSource(), null);
  assert.equal(gate.shouldProcess("foreground"), false);
  assert.equal(gate.shouldProcess("background"), false);

  gate.setAppState("background");
  assert.equal(gate.shouldProcess("foreground"), false);
  assert.equal(gate.shouldProcess("background"), true);
});

test("SampleDeduper remains a fallback for duplicate points from the active source", () => {
  const deduper = new SampleDeduper();

  assert.equal(deduper.hasSeen(point), false);
  assert.equal(deduper.hasSeen(point), true);
});
