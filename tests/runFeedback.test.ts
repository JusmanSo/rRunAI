import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRpe } from "../app/utils/runFeedback.ts";

test("RPE accepts every whole-number rating from 1 through 10", () => {
  for (let value = 1; value <= 10; value++) {
    assert.equal(normalizeRpe(value), value);
  }
});

test("unanswered and cleared RPE remain absent", () => {
  assert.equal(normalizeRpe(undefined), null);
  assert.equal(normalizeRpe(null), null);
});

test("RPE rejects out-of-range, fractional, non-finite and non-number feedback", () => {
  for (const value of [0, -1, 11, 5.5, NaN, Infinity, -Infinity, "5", "", true, {}, []]) {
    assert.equal(normalizeRpe(value), null);
  }
});
