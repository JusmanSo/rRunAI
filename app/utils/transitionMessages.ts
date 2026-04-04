/**
 * transitionMessages.ts
 * ─────────────────────
 * A small utility that generates detailed, context-aware voice cues
 * when the runner moves from one workout block to the next.
 *
 * ═══════════════════════════════════════════════════════════════════
 * HOW IT WORKS (plain English)
 * ═══════════════════════════════════════════════════════════════════
 *
 * The function receives TWO pieces of information:
 *   1. The FULL list of blocks in the session.
 *   2. The INDEX of the block the runner just entered.
 *
 * From these it can figure out:
 *   • What kind of block just ended (the PREVIOUS block).
 *   • What kind of block is starting now (the CURRENT block).
 *   • If the current block is a "work" block, which work-block number
 *     is it?  (e.g. "Interval 2 of 3")
 *
 * ═══════════════════════════════════════════════════════════════════
 * HOW IT KNOWS WHICH INTERVAL NUMBER IS STARTING
 * ═══════════════════════════════════════════════════════════════════
 *
 * It scans the ENTIRE block list and counts every block whose type
 * is "work".  That gives the TOTAL number of work blocks.
 *
 * Then it counts how many "work" blocks appear at or before the
 * current index.  That gives the CURRENT work-block number.
 *
 * Example — Interval Run:
 *   Index 0: Warm-up       (not work)
 *   Index 1: Interval 1    (work #1)    ← totalWork = 3
 *   Index 2: Recovery      (not work)
 *   Index 3: Interval 2    (work #2)
 *   Index 4: Recovery      (not work)
 *   Index 5: Interval 3    (work #3)
 *   Index 6: Cool-down     (not work)
 *
 *   If the runner just entered index 3, the function counts:
 *     work blocks at index ≤ 3 → index 1 and index 3 → that's 2.
 *     total work blocks → 3.
 *     Message: "Recovery complete. Interval 2 of 3, start now."
 *
 * ═══════════════════════════════════════════════════════════════════
 * EXAMPLE MESSAGES
 * ═══════════════════════════════════════════════════════════════════
 *
 *   Warm-up → Work:       "Warm-up complete. Interval 1 of 3, start now."
 *   Work → Recovery:      "Interval complete. Recover now."
 *   Recovery → Work:      "Recovery complete. Interval 2 of 3, start now."
 *   Work → Cooldown:      "Intervals complete. Begin cool-down."
 *   Cooldown (end):       "Cool-down complete. Great job!"
 *   (Easy Run) Warm-up → Work: "Warm-up complete. Begin your easy run."
 */

import type { WorkoutBlock } from "../types/session";

/**
 * Generate a spoken transition message for the block the runner
 * just entered.
 *
 * @param blocks       The full ordered list of workout blocks.
 * @param newIndex     The index of the block the runner just entered.
 * @returns            A spoken-word string, or null if no cue is needed
 *                     (e.g. the very first block at index 0 — the run
 *                     just started, no transition happened).
 */
export function buildTransitionMessage(
  blocks: WorkoutBlock[],
  newIndex: number
): string | null {
  // ── No transition at the very start of the run ─────────────────────
  // Index 0 means the runner just started — there's no "previous block"
  // to transition FROM, so we stay silent.
  if (newIndex <= 0) return null;

  // ── Identify the previous and current blocks ───────────────────────
  const prevBlock = blocks[newIndex - 1];
  const currBlock = blocks[newIndex];

  // Safety check (should never happen, but just in case).
  if (!prevBlock || !currBlock) return null;

  // ── Count work blocks for numbering ────────────────────────────────
  // totalWorkBlocks = how many "work" blocks exist in the whole session.
  // currentWorkNumber = which work block THIS one is (1-based).
  const totalWorkBlocks = blocks.filter((b) => b.type === "work").length;

  let currentWorkNumber = 0;
  if (currBlock.type === "work") {
    // Count how many work blocks appear at or before this index.
    for (let i = 0; i <= newIndex; i++) {
      if (blocks[i].type === "work") currentWorkNumber++;
    }
  }

  // ── Build the message based on transition type ─────────────────────

  // --- Entering a WORK block ---
  if (currBlock.type === "work") {
    const prefix = describeCompleted(prevBlock);

    // If there's only 1 work block (like an Easy Run), use the label.
    if (totalWorkBlocks === 1) {
      return `${prefix} Begin your ${currBlock.label.toLowerCase()}.`;
    }

    // Multiple work blocks → include numbering.
    return `${prefix} ${currBlock.label.split(" ")[0]} ${currentWorkNumber} of ${totalWorkBlocks}, start now.`;
  }

  // --- Entering a RECOVERY block ---
  if (currBlock.type === "recovery") {
    return `${describeCompleted(prevBlock)} Recover now.`;
  }

  // --- Entering a COOLDOWN block ---
  if (currBlock.type === "cooldown") {
    // If the previous block was a work block, say "Intervals complete"
    // (or "Threshold complete", etc.)
    if (prevBlock.type === "work") {
      const effortName = totalWorkBlocks > 1
        ? `${prevBlock.label.split(" ")[0]}s`   // e.g. "Intervals"
        : prevBlock.label;                       // e.g. "Easy Run"
      return `${effortName} complete. Begin cool-down.`;
    }
    return `${describeCompleted(prevBlock)} Begin cool-down.`;
  }

  // --- Entering a WARMUP block (rare mid-session, but handle it) ---
  if (currBlock.type === "warmup") {
    return "Begin your warm-up.";
  }

  // Fallback — should not reach here.
  return null;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Produces a short phrase describing the block that just ended.
 * Examples:
 *   warmup   → "Warm-up complete."
 *   work     → "Interval complete."  (uses the label's first word)
 *   recovery → "Recovery complete."
 *   cooldown → "Cool-down complete."
 */
function describeCompleted(block: WorkoutBlock): string {
  switch (block.type) {
    case "warmup":
      return "Warm-up complete.";
    case "work":
      // Use the first word of the label (e.g. "Interval" from "Interval 1").
      return `${block.label.split(" ")[0]} complete.`;
    case "recovery":
      return "Recovery complete.";
    case "cooldown":
      return "Cool-down complete.";
    default:
      return "Block complete.";
  }
}
