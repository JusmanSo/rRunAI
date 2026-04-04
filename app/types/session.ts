/**
 * session.ts
 * ──────────
 * This file defines what a "session" (workout) looks like in rRunAI,
 * including the new **workout block** system.
 *
 * WHAT IS A WORKOUT BLOCK?
 *   A workout is not one continuous effort.  It is a sequence of "blocks".
 *   Each block has a type (warmup, work, recovery, cooldown), a label the
 *   runner can see, a duration in seconds, and an optional target pace range.
 *
 *   Think of it like a recipe:
 *     Step 1 — Warm-up for 3 minutes (easy pace)
 *     Step 2 — Run hard for 3 minutes (threshold pace)
 *     Step 3 — Recover for 2 minutes (easy pace)
 *     Step 4 — Run hard for 3 minutes (threshold pace)
 *     Step 5 — Cool-down for 3 minutes (easy pace)
 *
 *   The app walks through these blocks one by one based on elapsed time.
 *
 * HOW THE BLOCK ENGINE WORKS (plain English):
 *   1. When the run starts, elapsed time = 0.  The first block is active.
 *   2. Each second, the app adds up the durations of all blocks to figure
 *      out which block the runner is currently in.
 *   3. When the elapsed time passes the end of the last block, the
 *      workout is "complete" — the runner can keep going in free-run mode.
 *   4. If the current block has a target pace range, the coaching engine
 *      uses that range.  If it doesn't (like a warmup), coaching stays quiet.
 */

// ─── Block types ─────────────────────────────────────────────────────────────

/**
 * The four kinds of workout block.
 *   "warmup"   — easy running to get the body ready
 *   "work"     — the main effort (threshold, intervals, easy pace, etc.)
 *   "recovery" — easy jogging between hard efforts
 *   "cooldown" — easy running to wind down after the session
 */
export type BlockType = "warmup" | "work" | "recovery" | "cooldown";

/**
 * One block inside a workout.
 *
 * Example:
 *   { type: "work", label: "Threshold", durationSec: 180,
 *     targetMinPace: 4.83, targetMaxPace: 5.08 }
 */
export interface WorkoutBlock {
  /** What kind of block this is (warmup / work / recovery / cooldown). */
  type: BlockType;

  /** Human-readable label shown on screen (e.g. "Threshold", "Easy"). */
  label: string;

  /** How long this block lasts, in seconds. */
  durationSec: number;

  /**
   * Optional target pace range for this block (min/km).
   * If undefined, the coaching engine stays quiet during this block.
   *
   * REMEMBER: smaller number = faster pace.
   *   targetMinPace = fastest acceptable pace
   *   targetMaxPace = slowest acceptable pace
   */
  targetMinPace?: number;
  targetMaxPace?: number;
}

// ─── The Session type ────────────────────────────────────────────────────────

export interface Session {
  /** A unique identifier for the session (e.g. "easy_run"). */
  id: string;

  /** Human-readable name shown on screen (e.g. "Easy Run"). */
  name: string;

  /** A short description / coaching hint for the runner. */
  description: string;

  /** Approximate duration label (e.g. "14 min"). */
  durationLabel: string;

  /**
   * Session-level target pace window (min/km).
   * Still used as a fallback and for the HomeScreen card display.
   */
  targetMinPace: number;
  targetMaxPace: number;

  /**
   * The ordered list of workout blocks that make up this session.
   * The app walks through them one by one based on elapsed time.
   */
  blocks: WorkoutBlock[];
}

// ─── Helper: compute total duration from blocks ──────────────────────────────

/**
 * Adds up all block durations to produce a human-readable label.
 * Example: blocks totalling 840 seconds → "14 min"
 */
function totalDurationLabel(blocks: WorkoutBlock[]): string {
  const totalSec = blocks.reduce((sum, b) => sum + b.durationSec, 0);
  const mins = Math.round(totalSec / 60);
  return `${mins} min`;
}

// ─── Available sessions ──────────────────────────────────────────────────────

/**
 * EASY RUN
 * ────────
 * A simple continuous run at conversational pace.
 *
 * Blocks:
 *   1. Warm-up   — 2 min  (no pace target, just get moving)
 *   2. Easy Run  — 10 min (target 6:00–7:00 /km)
 *   3. Cool-down — 2 min  (no pace target, wind down)
 */
const EASY_RUN_BLOCKS: WorkoutBlock[] = [
  { type: "warmup",   label: "Warm-up",   durationSec: 2 * 60 },
  { type: "work",     label: "Easy Run",  durationSec: 10 * 60,
    targetMinPace: 6.0, targetMaxPace: 7.0 },
  { type: "cooldown", label: "Cool-down", durationSec: 2 * 60 },
];

/**
 * THRESHOLD RUN
 * ─────────────
 * Two hard blocks at threshold pace with a recovery in between.
 *
 * Blocks:
 *   1. Warm-up     — 3 min
 *   2. Threshold 1 — 3 min  (target 4:50–5:05 /km)
 *   3. Recovery    — 2 min
 *   4. Threshold 2 — 3 min  (target 4:50–5:05 /km)
 *   5. Cool-down   — 3 min
 */
const THRESHOLD_RUN_BLOCKS: WorkoutBlock[] = [
  { type: "warmup",   label: "Warm-up",       durationSec: 3 * 60 },
  { type: "work",     label: "Threshold 1",   durationSec: 3 * 60,
    targetMinPace: 4.83, targetMaxPace: 5.08 },
  { type: "recovery", label: "Recovery",      durationSec: 2 * 60 },
  { type: "work",     label: "Threshold 2",   durationSec: 3 * 60,
    targetMinPace: 4.83, targetMaxPace: 5.08 },
  { type: "cooldown", label: "Cool-down",     durationSec: 3 * 60 },
];

/**
 * INTERVAL RUN
 * ────────────
 * Three fast repeats with recovery jogs in between.
 *
 * Blocks:
 *   1. Warm-up    — 3 min
 *   2. Interval 1 — 1 min  (target 4:20–4:35 /km)
 *   3. Recovery   — 1 min
 *   4. Interval 2 — 1 min  (target 4:20–4:35 /km)
 *   5. Recovery   — 1 min
 *   6. Interval 3 — 1 min  (target 4:20–4:35 /km)
 *   7. Cool-down  — 3 min
 */
const INTERVAL_RUN_BLOCKS: WorkoutBlock[] = [
  { type: "warmup",   label: "Warm-up",      durationSec: 3 * 60 },
  { type: "work",     label: "Interval 1",   durationSec: 1 * 60,
    targetMinPace: 4.33, targetMaxPace: 4.58 },
  { type: "recovery", label: "Recovery",     durationSec: 1 * 60 },
  { type: "work",     label: "Interval 2",   durationSec: 1 * 60,
    targetMinPace: 4.33, targetMaxPace: 4.58 },
  { type: "recovery", label: "Recovery",     durationSec: 1 * 60 },
  { type: "work",     label: "Interval 3",   durationSec: 1 * 60,
    targetMinPace: 4.33, targetMaxPace: 4.58 },
  { type: "cooldown", label: "Cool-down",    durationSec: 3 * 60 },
];

// ─── Session catalogue ───────────────────────────────────────────────────────

export const SESSION_CATALOGUE: Session[] = [
  {
    id: "easy_run",
    name: "Easy Run",
    description: "Keep it conversational pace",
    durationLabel: totalDurationLabel(EASY_RUN_BLOCKS),
    targetMinPace: 6.0,
    targetMaxPace: 7.0,
    blocks: EASY_RUN_BLOCKS,
  },
  {
    id: "threshold_run",
    name: "Threshold Run",
    description: "Comfortably hard — just below race effort",
    durationLabel: totalDurationLabel(THRESHOLD_RUN_BLOCKS),
    targetMinPace: 4.83,
    targetMaxPace: 5.08,
    blocks: THRESHOLD_RUN_BLOCKS,
  },
  {
    id: "interval_run",
    name: "Interval Run",
    description: "Fast repeats with recovery — push the pace",
    durationLabel: totalDurationLabel(INTERVAL_RUN_BLOCKS),
    targetMinPace: 4.33,
    targetMaxPace: 4.58,
    blocks: INTERVAL_RUN_BLOCKS,
  },
];

/**
 * Helper to get today's default session.
 * For MVP we just return the first one (Easy Run).
 */
export function getTodaySession(): Session {
  return SESSION_CATALOGUE[0];
}
