import type { Rpe } from "../types/runFeedback";

/** Missing or malformed feedback remains unanswered, never a default score. */
export function normalizeRpe(value: unknown): Rpe | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10
    ? value as Rpe
    : null;
}
