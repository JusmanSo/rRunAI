/**
 * useBlockTransitionVoice.ts
 * ──────────────────────────
 * A custom React hook that speaks a detailed voice cue exactly ONCE
 * when the runner transitions from one workout block to the next.
 *
 * ═══════════════════════════════════════════════════════════════════
 * HOW THE APP DETECTS A BLOCK TRANSITION
 * ═══════════════════════════════════════════════════════════════════
 *
 * The useWorkoutBlocks hook already tracks the current block index
 * and exposes a boolean called `didBlockChange`.  That boolean is
 * `true` on the EXACT render where the block index changes (e.g.
 * from 0 to 1).  On the very next render it goes back to `false`.
 *
 * This hook watches `didBlockChange`.  When it flips to `true`:
 *   1. It calls buildTransitionMessage() to generate the right cue.
 *   2. It stops any speech that is currently playing (this prevents
 *      the transition cue from overlapping with a coaching cue).
 *   3. It speaks the transition message using expo-speech.
 *
 * Because `didBlockChange` is only `true` for one render, the
 * message is spoken exactly ONCE per transition — no repeats.
 *
 * ═══════════════════════════════════════════════════════════════════
 * HOW THE VOICE CUE IS TRIGGERED
 * ═══════════════════════════════════════════════════════════════════
 *
 * The hook uses a useEffect that depends on `blockIndex`.
 * Every time `blockIndex` changes, the effect fires and speaks.
 * We use `blockIndex` (not `didBlockChange`) as the dependency
 * because React effects fire when dependencies change value,
 * and blockIndex changes exactly once per transition.
 *
 * ═══════════════════════════════════════════════════════════════════
 * PREVENTING CONFLICT WITH COACHING VOICE
 * ═══════════════════════════════════════════════════════════════════
 *
 * The existing useVoiceCoach hook speaks pace-coaching messages
 * (e.g. "Slow down slightly") with a 25-second cooldown.
 *
 * Transition cues are MORE IMPORTANT than pace cues — the runner
 * needs to know "Start your interval" immediately.  So this hook
 * calls Speech.stop() before speaking, which interrupts any
 * coaching message that might be playing.
 *
 * The coaching hook's cooldown timer will naturally wait and then
 * speak its next message later, so there's no permanent conflict.
 *
 * ═══════════════════════════════════════════════════════════════════
 * WORKOUT COMPLETION
 * ═══════════════════════════════════════════════════════════════════
 *
 * This hook does NOT handle the final "Workout complete" cue.
 * That responsibility belongs to RunScreen's auto-completion logic,
 * which speaks the cue and then navigates to the Summary screen
 * after a short delay.  Keeping completion in RunScreen avoids
 * duplicate announcements and ensures the navigation timer is
 * coordinated in one place.
 *
 * PLATFORM SAFETY:
 *   All speech calls are wrapped in try/catch.  If the platform
 *   doesn't support TTS (like some web browsers), the app stays
 *   silent and continues running normally.
 */

import { useEffect } from "react";
import * as Speech from "expo-speech";
import type { WorkoutBlock } from "../types/session";
import { buildTransitionMessage } from "../utils/transitionMessages";

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Speech rate for transition cues.
 * Slightly slower than coaching cues (1.0 vs 1.05) because these
 * messages are longer and more important — the runner needs to
 * hear every word clearly.
 */
const TRANSITION_SPEECH_RATE = 1.0;

/**
 * Speech pitch for transition cues.
 */
const TRANSITION_SPEECH_PITCH = 1.0;

// ─── The Hook ────────────────────────────────────────────────────────────────

/**
 * Call this inside RunScreen.  It watches for block transitions and
 * speaks the appropriate cue automatically.
 *
 * NOTE: The `isWorkoutComplete` parameter is accepted for API
 * compatibility but is no longer used here.  Workout completion
 * announcements are now handled by RunScreen directly.
 *
 * @param blocks           The full ordered list of workout blocks.
 * @param blockIndex       The current (0-based) block index.
 * @param didBlockChange   True on the render where a transition happened.
 * @param isWorkoutComplete  (unused — kept for API compatibility)
 */
export default function useBlockTransitionVoice(
  blocks: WorkoutBlock[],
  blockIndex: number,
  didBlockChange: boolean,
  _isWorkoutComplete: boolean
): void {
  // ── Speak on block transitions ─────────────────────────────────────
  // We use blockIndex as the dependency.  Every time it changes value,
  // this effect fires exactly once.
  useEffect(() => {
    // Skip the very first render (blockIndex starts at 0, no transition).
    if (!didBlockChange) return;

    // Generate the context-aware message for this transition.
    const message = buildTransitionMessage(blocks, blockIndex);

    if (message) {
      speakTransition(message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockIndex]);

  // ── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch {
        // Silent failure — platform may not support it.
      }
    };
  }, []);
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Speaks a transition message with high priority.
 * Stops any currently playing speech first so the transition cue
 * is heard immediately without overlap.
 */
function speakTransition(text: string): void {
  try {
    // Stop any ongoing coaching speech — transition cues take priority.
    Speech.stop();

    Speech.speak(text, {
      language: "en-US",
      rate: TRANSITION_SPEECH_RATE,
      pitch: TRANSITION_SPEECH_PITCH,
    });
  } catch {
    // Silent failure — the app continues working, just without voice.
  }
}
