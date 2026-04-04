/**
 * useVoiceCoach.ts
 * ────────────────
 * A custom React hook that speaks coaching messages out loud using
 * the device's text-to-speech engine (via expo-speech).
 *
 * WHAT IT DOES:
 *   You give it the current coaching message (a string or null).
 *   Whenever that message *changes* to a new, non-null value, the hook
 *   speaks it out loud — but only if enough time has passed since the
 *   last spoken message (the "cooldown").
 *
 * WHY A SEPARATE HOOK?
 *   Keeping voice logic out of RunScreen means:
 *     • RunScreen stays focused on layout and data.
 *     • We can tweak voice behaviour (cooldown, pitch, rate) in one
 *       place without touching the screen code.
 *     • We can later swap expo-speech for a more advanced TTS engine
 *       without changing anything else.
 *
 * HOW THE COOLDOWN WORKS:
 *   Imagine the coach evaluates pace every 8 seconds.  If the runner
 *   keeps bouncing between "too fast" and "on target", we don't want
 *   the phone blasting a new message every 8 seconds — that would be
 *   incredibly annoying mid-run.
 *
 *   The cooldown (default 25 seconds) ensures that after the coach
 *   speaks, it stays quiet for at least 25 seconds no matter how many
 *   state changes happen.  If a new message arrives during cooldown,
 *   it is "queued" — meaning we remember it and speak it as soon as
 *   the cooldown expires.
 *
 *   Timeline example (cooldown = 25s):
 *
 *     0s   Coach says "Good pace"        → SPEAK ✓
 *     8s   Coach says "Slow down"        → cooldown active, QUEUE it
 *    16s   Coach says "Good pace" again  → cooldown active, QUEUE it (replaces previous)
 *    25s   Cooldown expires              → SPEAK "Good pace" (the latest queued message)
 *    33s   Coach says "Pick it up"       → cooldown active, QUEUE it
 *    50s   Cooldown expires              → SPEAK "Pick it up"
 *
 * PLATFORM SAFETY:
 *   expo-speech may not work on every platform (e.g. web browsers have
 *   limited support).  Every call to Speech.speak() is wrapped in a
 *   try/catch so the app never crashes — it just stays silent.
 */

import { useEffect, useRef } from "react";
import * as Speech from "expo-speech";

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Minimum number of seconds between two spoken messages.
 * 25 seconds feels natural for running — roughly every city block.
 */
const COOLDOWN_SECONDS = 25;

/**
 * Speech rate.  1.0 is normal speed.
 * Slightly faster (1.05) keeps cues snappy without sounding rushed.
 */
const SPEECH_RATE = 1.05;

/**
 * Speech pitch.  1.0 is the default voice pitch.
 */
const SPEECH_PITCH = 1.0;

// ─── The Hook ────────────────────────────────────────────────────────────────

/**
 * Call this inside RunScreen.  Pass in the current coaching message.
 * The hook handles all speaking, cooldown, and error handling internally.
 *
 * @param message  The coaching message string, or null if no feedback yet.
 *
 * Usage:
 *   useVoiceCoach(coachingMessage);
 *   // That's it — one line in RunScreen.
 */
export default function useVoiceCoach(message: string | null): void {
  // ── Refs (internal state that doesn't trigger re-renders) ──────────────

  /**
   * The last message we actually spoke out loud.
   * We compare new messages against this to avoid repeating the same cue.
   */
  const lastSpokenMessage = useRef<string | null>(null);

  /**
   * Timestamp (in ms) of the last time we spoke.
   * Used to enforce the cooldown period.
   */
  const lastSpokenTime = useRef<number>(0);

  /**
   * If a new message arrives during cooldown, we store it here.
   * When the cooldown expires, a timer fires and speaks this message.
   */
  const pendingMessage = useRef<string | null>(null);

  /**
   * Reference to the pending cooldown timer so we can cancel it
   * if the component unmounts (prevents memory leaks).
   */
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── React to message changes ───────────────────────────────────────────
  useEffect(() => {
    // Nothing to say yet (coach is warming up).
    if (message === null) return;

    // Same message as last time we spoke — don't repeat it.
    if (message === lastSpokenMessage.current) return;

    // ── Check cooldown ─────────────────────────────────────────────────
    const now = Date.now();
    const elapsed = (now - lastSpokenTime.current) / 1000; // seconds

    if (elapsed >= COOLDOWN_SECONDS) {
      // Cooldown has passed — speak immediately.
      speak(message);
      lastSpokenMessage.current = message;
      lastSpokenTime.current = Date.now();
      pendingMessage.current = null;

      // Cancel any pending timer since we just spoke.
      if (cooldownTimer.current) {
        clearTimeout(cooldownTimer.current);
        cooldownTimer.current = null;
      }
    } else {
      // Still in cooldown — queue this message for later.
      pendingMessage.current = message;

      // If there's no timer already waiting, start one.
      // It will fire when the remaining cooldown time expires.
      if (!cooldownTimer.current) {
        const remainingMs = (COOLDOWN_SECONDS - elapsed) * 1000;

        cooldownTimer.current = setTimeout(() => {
          cooldownTimer.current = null;

          // Speak whatever the latest pending message is.
          if (
            pendingMessage.current !== null &&
            pendingMessage.current !== lastSpokenMessage.current
          ) {
            speak(pendingMessage.current);
            lastSpokenMessage.current = pendingMessage.current;
            lastSpokenTime.current = Date.now();
            pendingMessage.current = null;
          }
        }, remainingMs);
      }
    }
  }, [message]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  // When the runner leaves the Run screen (e.g. taps "End Run"),
  // we stop any speech in progress and cancel pending timers.
  useEffect(() => {
    return () => {
      if (cooldownTimer.current) {
        clearTimeout(cooldownTimer.current);
      }
      try {
        Speech.stop();
      } catch {
        // Silently ignore — platform may not support it.
      }
    };
  }, []);
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Safely speaks a message.  Wrapped in try/catch so the app never
 * crashes if the platform doesn't support text-to-speech.
 */
function speak(text: string): void {
  try {
    // Stop any currently playing speech before starting a new one.
    // This prevents overlapping audio if messages arrive quickly.
    Speech.stop();

    Speech.speak(text, {
      language: "en-US",
      rate: SPEECH_RATE,
      pitch: SPEECH_PITCH,
    });
  } catch {
    // Silent failure — the app continues working, just without voice.
    // This is expected on web browsers or simulators without TTS.
  }
}
