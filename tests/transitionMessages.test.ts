import test from "node:test";
import assert from "node:assert/strict";

import { buildTransitionMessage } from "../app/utils/transitionMessages.ts";

const easyRunBlocks = [
  { type: "warmup", label: "Warm-up", durationSec: 120 },
  {
    type: "work",
    label: "Easy Run",
    durationSec: 600,
    targetMinPace: 6,
    targetMaxPace: 7,
  },
  { type: "cooldown", label: "Cool-down", durationSec: 120 },
];

const intervalBlocks = [
  { type: "warmup", label: "Warm-up", durationSec: 180 },
  {
    type: "work",
    label: "Interval 1",
    durationSec: 60,
    targetMinPace: 4.33,
    targetMaxPace: 4.58,
  },
  { type: "recovery", label: "Recovery", durationSec: 60 },
  {
    type: "work",
    label: "Interval 2",
    durationSec: 60,
    targetMinPace: 4.33,
    targetMaxPace: 4.58,
  },
  { type: "cooldown", label: "Cool-down", durationSec: 180 },
];

test("buildTransitionMessage stays silent at the start and for invalid indexes", () => {
  assert.equal(buildTransitionMessage(easyRunBlocks, 0), null);
  assert.equal(buildTransitionMessage(easyRunBlocks, -1), null);
  assert.equal(buildTransitionMessage(easyRunBlocks, 99), null);
});

test("buildTransitionMessage describes a single work block transition", () => {
  assert.equal(
    buildTransitionMessage(easyRunBlocks, 1),
    "Warm-up complete. Begin your easy run."
  );
});

test("buildTransitionMessage describes cooldown after a single work block", () => {
  assert.equal(
    buildTransitionMessage(easyRunBlocks, 2),
    "Easy Run complete. Begin cool-down."
  );
});

test("buildTransitionMessage numbers repeated work blocks", () => {
  assert.equal(
    buildTransitionMessage(intervalBlocks, 1),
    "Warm-up complete. Interval 1 of 2, start now."
  );
  assert.equal(
    buildTransitionMessage(intervalBlocks, 3),
    "Recovery complete. Interval 2 of 2, start now."
  );
});

test("buildTransitionMessage handles recovery and cooldown transitions", () => {
  assert.equal(
    buildTransitionMessage(intervalBlocks, 2),
    "Interval complete. Recover now."
  );
  assert.equal(
    buildTransitionMessage(intervalBlocks, 4),
    "Intervals complete. Begin cool-down."
  );
});
