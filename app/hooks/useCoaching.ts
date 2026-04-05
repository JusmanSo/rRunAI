/**
 * useCoaching.ts
 * ──────────────
 * A custom React hook that acts as a simple "coach in your pocket".
 *
 * WHAT IT DOES:
 *   Every few seconds it looks at the runner's current pace and compares
 *   it to a target range.  Based on that comparison it picks one of three
 *   coaching messages:
 *
 *     Too fast  → "Slow down slightly"
 *     Too slow  → "Pick it up a bit"
 *     On target → "Good pace, keep it steady"
 *
 * WHAT CHANGED vs. the previous version:
 *   targetMinPace and targetMaxPace are now **nullable**.
 *   When they are null (e.g. during a warmup or recovery block that has
 *   no pace target), the coach goes quiet — it returns null for both
 *   message and state.  This prevents annoying "slow down" cues when
 *   the runner is supposed to be jogging easy during a recovery.
 *
 * HOW PACE IS EVALUATED:
 *   We compare the latest smoothed rolling pace (min/km) to the
 *   target range for the current workout block.
 *   A *lower* pace number means the runner is *faster*.
 */

import { useState, useEffect, useRef } from "react";

// ─── Configuration ───────────────────────────────────────────────────────────

const EVAL_INTERVAL_SECONDS = 8;
// ─── Types ───────────────────────────────────────────────────────────────────

export type CoachingState = "too_fast" | "too_slow" | "on_target" | null;

export interface CoachingFeedback {
  message: string | null;
  state: CoachingState;
}

// ─── Mapping from state → message ────────────────────────────────────────────

const COACHING_MESSAGES: Record<NonNullable<CoachingState>, string> = {
  too_fast: "Slow down slightly",
  too_slow: "Pick it up a bit",
  on_target: "Good pace, keep it steady",
};

// ─── The Hook ────────────────────────────────────────────────────────────────

/**
 * @param elapsedSeconds    Current elapsed time of the run.
 * @param currentPaceMinPerKm  Current rolling pace from GPS.
 * @param targetMinPace   Fastest acceptable pace (min/km), or null/undefined
 *                        if the current block has no pace target.
 * @param targetMaxPace   Slowest acceptable pace (min/km), or null/undefined
 *                        if the current block has no pace target.
 * @returns               { message, state }
 */
export default function useCoaching(
  elapsedSeconds: number,
  currentPaceMinPerKm: number | null,
  targetMinPace: number | null | undefined,
  targetMaxPace: number | null | undefined
): CoachingFeedback {
  const [currentState, setCurrentState] = useState<CoachingState>(null);
  const lastEvalTime = useRef(0);

  useEffect(() => {
    // ── If no pace target for this block, go quiet ───────────────────
    // This happens during warmup, recovery, or cooldown blocks that
    // don't define a target pace.  We reset to null so the banner
    // shows "Coach warming up…" (or we could show nothing).
    if (targetMinPace == null || targetMaxPace == null) {
      if (currentState !== null) {
        setCurrentState(null);
      }
      return;
    }

    // ── Throttle: only evaluate every EVAL_INTERVAL_SECONDS ──────────
    if (elapsedSeconds - lastEvalTime.current < EVAL_INTERVAL_SECONDS) {
      return;
    }
    lastEvalTime.current = elapsedSeconds;

    // ── Guard: no reliable current pace yet ──────────────────────────
    if (currentPaceMinPerKm == null) {
      return;
    }

    // ── Compare pace to the BLOCK's target window ────────────────────
    let newState: CoachingState;

    if (currentPaceMinPerKm < targetMinPace) {
      newState = "too_fast";
    } else if (currentPaceMinPerKm > targetMaxPace) {
      newState = "too_slow";
    } else {
      newState = "on_target";
    }

    if (newState !== currentState) {
      setCurrentState(newState);
    }
  }, [
    elapsedSeconds,
    currentPaceMinPerKm,
    targetMinPace,
    targetMaxPace,
    currentState,
  ]);

  return {
    message: currentState ? COACHING_MESSAGES[currentState] : null,
    state: currentState,
  };
}
