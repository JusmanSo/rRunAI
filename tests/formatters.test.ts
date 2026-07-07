import test from "node:test";
import assert from "node:assert/strict";

import {
  formatMinPerKm,
  formatPace,
  formatTime,
} from "../app/utils/formatters.ts";

test("formatTime returns zero-padded minutes and seconds", () => {
  assert.equal(formatTime(0), "00:00");
  assert.equal(formatTime(65), "01:05");
  assert.equal(formatTime(600), "10:00");
});

test("formatMinPerKm formats valid decimal paces", () => {
  assert.equal(formatMinPerKm(6), "06:00");
  assert.equal(formatMinPerKm(4.83), "04:50");
  assert.equal(formatMinPerKm(5.999), "06:00");
});

test("formatMinPerKm hides invalid or unreasonable paces", () => {
  assert.equal(formatMinPerKm(null), "--:--");
  assert.equal(formatMinPerKm(undefined), "--:--");
  assert.equal(formatMinPerKm(0), "--:--");
  assert.equal(formatMinPerKm(Number.POSITIVE_INFINITY), "--:--");
  assert.equal(formatMinPerKm(31), "--:--");
});

test("formatPace calculates average pace from elapsed time and distance", () => {
  assert.equal(formatPace(1800, 5), "06:00");
  assert.equal(formatPace(1500, 5), "05:00");
});

test("formatPace hides pace when distance is too small or pace is too slow", () => {
  assert.equal(formatPace(30, 0), "--:--");
  assert.equal(formatPace(30, 0.009), "--:--");
  assert.equal(formatPace(3600, 1), "--:--");
});
