/**
 * useWorkoutBlocks.ts
 * ───────────────────
 * A custom React hook that acts as the "block engine" for structured workouts.
 *
 * WHAT IT DOES (plain English):
 *   You give it the list of workout blocks and the current elapsed time.
 *   It figures out which block the runner is currently in, how much time
 *   is left in that block, and whether the workout is finished.
 *
 * HOW IT WORKS:
 *   Imagine a Threshold Run with these blocks:
 *
 *     Block 1: Warm-up      — 180s  (ends at second 180)
 *     Block 2: Threshold 1  — 180s  (ends at second 360)
 *     Block 3: Recovery     — 120s  (ends at second 480)
 *     Block 4: Threshold 2  — 180s  (ends at second 660)
 *     Block 5: Cool-down    — 180s  (ends at second 840)
 *
 *   If the elapsed time is 200 seconds, the hook walks through the list:
 *     - Block 1 ends at 180 → 200 > 180, so we're past it.
 *     - Block 2 ends at 360 → 200 < 360, so we're IN this block.
 *     - Time remaining = 360 − 200 = 160 seconds.
 *
 *   If elapsed time is 900 (past all blocks), the workout is "complete".
 *   The runner can keep running in free-run mode.
 *
 * WHAT IT RETURNS:
 *   - activeBlock:       the WorkoutBlock object the runner is currently in
 *   - blockIndex:        which block number (0-based) is active
 *   - blockTimeRemaining: seconds left in the current block
 *   - totalBlocks:       total number of blocks in the session
 *   - isWorkoutComplete: true if the runner has passed all blocks
 *   - didBlockChange:    true if the block index changed since last render
 *                        (useful for triggering future voice cues)
 *
 * WHY "didBlockChange"?
 *   Later we'll want to speak a voice cue like "Start your interval" or
 *   "Recover" at block transitions.  By exposing didBlockChange, the
 *   RunScreen (or a future hook) can easily detect transitions without
 *   duplicating the block-tracking logic.
 */

import { useMemo, useRef } from "react";
import type { WorkoutBlock } from "../types/session";

// ─── Return type ─────────────────────────────────────────────────────────────

export interface BlockProgress {
  /** The block the runner is currently in (or the last block if complete). */
  activeBlock: WorkoutBlock;

  /** Zero-based index of the active block. */
  blockIndex: number;

  /** Seconds remaining in the current block (0 if workout is complete). */
  blockTimeRemaining: number;

  /** Total number of blocks in the session. */
  totalBlocks: number;

  /** True when the runner has passed the end of the last block. */
  isWorkoutComplete: boolean;

  /**
   * True on the exact render where the block index changes.
   * Useful for triggering one-time events (like a future voice cue).
   */
  didBlockChange: boolean;
}

// ─── The Hook ────────────────────────────────────────────────────────────────

/**
 * @param blocks          The ordered list of workout blocks from the session.
 * @param elapsedSeconds  Current elapsed time of the run.
 * @returns               BlockProgress — everything the UI and coaching need.
 */
export default function useWorkoutBlocks(
  blocks: WorkoutBlock[],
  elapsedSeconds: number
): BlockProgress {
  // ── Pre-compute cumulative end times ─────────────────────────────────
  // We only need to do this once because blocks never change mid-run.
  //
  // Example for Threshold Run:
  //   Block 0 (Warm-up 180s)    → endTimes[0] = 180
  //   Block 1 (Threshold 180s)  → endTimes[1] = 360
  //   Block 2 (Recovery 120s)   → endTimes[2] = 480
  //   Block 3 (Threshold 180s)  → endTimes[3] = 660
  //   Block 4 (Cool-down 180s)  → endTimes[4] = 840
  //
  const endTimes = useMemo(() => {
    let cumulative = 0;
    return blocks.map((block) => {
      cumulative += block.durationSec;
      return cumulative;
    });
  }, [blocks]);

  // ── Find the active block ────────────────────────────────────────────
  // Walk through the end times until we find one that is still in the future.
  let blockIndex = 0;
  let isWorkoutComplete = false;

  for (let i = 0; i < endTimes.length; i++) {
    if (elapsedSeconds < endTimes[i]) {
      blockIndex = i;
      break;
    }
    // If we've passed the last block, the workout is complete.
    if (i === endTimes.length - 1) {
      blockIndex = i; // stay on the last block for display
      isWorkoutComplete = true;
    }
  }

  // ── Calculate time remaining in the current block ────────────────────
  let blockTimeRemaining = 0;
  if (!isWorkoutComplete) {
    blockTimeRemaining = endTimes[blockIndex] - elapsedSeconds;
  }

  // ── Detect block transitions ─────────────────────────────────────────
  // We store the previous block index in a ref.  If it differs from the
  // current one, a transition just happened.
  const prevBlockIndex = useRef(0);
  const didBlockChange = blockIndex !== prevBlockIndex.current;
  prevBlockIndex.current = blockIndex;

  // ── Return everything the UI needs ───────────────────────────────────
  return {
    activeBlock: blocks[blockIndex],
    blockIndex,
    blockTimeRemaining,
    totalBlocks: blocks.length,
    isWorkoutComplete,
    didBlockChange,
  };
}
