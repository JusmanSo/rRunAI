/**
 * RunScreen.tsx
 * ─────────────
 * The live run screen — the heart of rRunAI.
 *
 * When the runner arrives here, six systems work together:
 *   1. A timer counts elapsed seconds.
 *   2. useLocation tracks GPS position and distance.
 *   3. useWorkoutBlocks determines which block is active.
 *   4. useCoaching evaluates pace against the current block's target.
 *   5. useVoiceCoach speaks pace-coaching messages aloud.
 *   6. useBlockTransitionVoice speaks cues at block transitions.
 *
 * WHAT CHANGED vs. the previous version:
 *
 *   AUTO-COMPLETION
 *   ───────────────
 *   When the final workout block finishes, the app now:
 *     a) Speaks a final cue: "Workout complete. Nice work."
 *     b) Waits 3 seconds (so the runner hears the cue).
 *     c) Automatically stops the timer and navigates to Summary.
 *
 *   HOW THE APP KNOWS THE WORKOUT IS FINISHED:
 *     The useWorkoutBlocks hook sets `isWorkoutComplete = true` when
 *     the elapsed time passes the end of the last block.  RunScreen
 *     watches this flag in a useEffect.
 *
 *   HOW IT PREVENTS DOUBLE-TRIGGERING:
 *     A ref called `hasFinished` is set to `true` the first time
 *     completion fires.  Every subsequent render sees `hasFinished`
 *     is already `true` and skips the logic entirely.  This means
 *     the cue is spoken exactly once and navigation happens exactly
 *     once — even though React may re-render many times.
 *
 *   HOW THE FINAL CUE IS SPOKEN:
 *     We call Speech.stop() to interrupt any ongoing coaching voice,
 *     then Speech.speak() with the completion message.  After a
 *     3-second delay (setTimeout), we navigate to Summary.  The
 *     delay gives the TTS engine time to finish speaking.
 *
 *   MANUAL END RUN:
 *     The "End Run" button still works at any time.  If the runner
 *     taps it before the workout finishes, it navigates immediately
 *     and sets `hasFinished = true` so auto-completion won't fire.
 *
 *   BLOCK PROGRESS BAR (polished):
 *     Now shows the block type label (e.g. "WARMUP") in a subtle
 *     tag next to the block name for extra clarity.
 */

import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import * as Speech from "expo-speech";

// Custom hooks
import useLocation from "../hooks/useLocation";
import useCoaching from "../hooks/useCoaching";
import useVoiceCoach from "../hooks/useVoiceCoach";
import useWorkoutBlocks from "../hooks/useWorkoutBlocks";
import useBlockTransitionVoice from "../hooks/useBlockTransitionVoice";

// Shared formatting helpers
import { formatTime, formatMinPerKm } from "../utils/formatters";

// Types
import type { CoachingState } from "../hooks/useCoaching";
import type { BlockType } from "../types/session";

type Props = NativeStackScreenProps<RootStackParamList, "Run">;

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * How many seconds to wait after speaking the final cue before
 * navigating to the Summary screen.  This gives the TTS engine
 * time to finish saying "Workout complete. Nice work."
 */
const AUTO_NAV_DELAY_MS = 3000;

export default function RunScreen({ route, navigation }: Props) {
  // ── Read the session from navigation params ────────────────────────────
  const { session } = route.params;

  // ── Timer ──────────────────────────────────────────────────────────────
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── GPS tracking ──────────────────────────────────────────────────────
  const { distanceKm, currentPaceMinPerKm, isTracking, errorMsg } = useLocation();
  const livePaceLabel =
    currentPaceMinPerKm == null
      ? "Calibrating GPS"
      : formatMinPerKm(currentPaceMinPerKm);
  const livePaceUnit = currentPaceMinPerKm == null ? "" : "/km";

  // ── Workout block engine ──────────────────────────────────────────────
  const {
    activeBlock,
    blockIndex,
    blockTimeRemaining,
    totalBlocks,
    isWorkoutComplete,
    didBlockChange,
  } = useWorkoutBlocks(session.blocks, elapsedSeconds);

  // ── Coaching engine ───────────────────────────────────────────────────
  const { message: coachingMessage, state: coachingState } = useCoaching(
    elapsedSeconds,
    currentPaceMinPerKm,
    activeBlock.targetMinPace,
    activeBlock.targetMaxPace
  );

  // ── Voice coaching (pace-based) ───────────────────────────────────────
  useVoiceCoach(coachingMessage);

  // ── Voice coaching (block transitions) ────────────────────────────────
  useBlockTransitionVoice(
    session.blocks,
    blockIndex,
    didBlockChange,
    isWorkoutComplete
  );

  // ══════════════════════════════════════════════════════════════════════
  // AUTO-COMPLETION LOGIC (NEW)
  // ══════════════════════════════════════════════════════════════════════
  //
  // `hasFinished` is a ref (not state) because we never want changing it
  // to trigger a re-render.  It's a simple boolean lock:
  //   false = workout still in progress (or not yet handled)
  //   true  = we already spoke the final cue and started navigation
  //
  // Using a ref instead of state prevents the following problem:
  //   setState(true) → re-render → effect fires again → double navigate
  //
  const hasFinished = useRef(false);

  // Reference to the auto-nav timeout so we can cancel it if the runner
  // manually taps "End Run" before the delay expires.
  const autoNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // ── Guard: only fire once ──────────────────────────────────────
    if (!isWorkoutComplete) return;
    if (hasFinished.current) return;

    // Lock immediately so no future render can enter this block.
    hasFinished.current = true;

    // ── Stop the timer ─────────────────────────────────────────────
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // ── Speak the final completion cue ─────────────────────────────
    // We stop any ongoing speech first so the completion cue is
    // heard clearly and immediately.
    try {
      Speech.stop();
      Speech.speak("Workout complete. Nice work.", {
        language: "en-US",
        rate: 1.0,
        pitch: 1.0,
      });
    } catch {
      // Silent failure — platform may not support TTS.
    }

    // ── Navigate to Summary after a short delay ────────────────────
    // The delay gives the TTS engine time to finish speaking.
    // We capture the current values of elapsedSeconds and distanceKm
    // at the moment of completion.
    const finalElapsed = elapsedSeconds;
    const finalDistance = distanceKm;

    autoNavTimer.current = setTimeout(() => {
      autoNavTimer.current = null;
      navigation.navigate("Summary", {
        elapsedSeconds: finalElapsed,
        distanceKm: finalDistance,
        session,
      });
    }, AUTO_NAV_DELAY_MS);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkoutComplete]);

  // ── Cleanup auto-nav timer on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      if (autoNavTimer.current) {
        clearTimeout(autoNavTimer.current);
      }
    };
  }, []);

  // ── Manual End Run ────────────────────────────────────────────────────
  // Still available at any time.  If the runner taps it before auto-
  // completion fires, we lock `hasFinished` and navigate immediately.
  // If auto-completion already fired, the timer is cancelled.
  const handleEndRun = () => {
    hasFinished.current = true;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (autoNavTimer.current) {
      clearTimeout(autoNavTimer.current);
      autoNavTimer.current = null;
    }

    try {
      Speech.stop();
    } catch {
      // Silent failure.
    }

    navigation.navigate("Summary", { elapsedSeconds, distanceKm, session });
  };

  return (
    <View style={styles.container}>
      {/* Session name badge */}
      <Text style={styles.sessionBadge}>{session.name}</Text>

      {/* GPS status indicator */}
      <Text style={styles.status}>
        {errorMsg
          ? `⚠ ${errorMsg}`
          : isTracking
            ? "GPS Active"
            : "Starting GPS…"}
      </Text>

      {/* Block progress bar */}
      <BlockProgressBar
        blockLabel={activeBlock.label}
        blockType={activeBlock.type}
        blockIndex={blockIndex}
        totalBlocks={totalBlocks}
        timeRemaining={blockTimeRemaining}
        isWorkoutComplete={isWorkoutComplete}
      />

      {/* Live metrics */}
      <View style={styles.metricsRow}>
        <MetricBlock
          label="Pace"
          value={livePaceLabel}
          unit={livePaceUnit}
        />
        <MetricBlock
          label="Distance"
          value={distanceKm.toFixed(2)}
          unit="km"
        />
      </View>

      {/* Elapsed time */}
      <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
      <Text style={styles.timerLabel}>Elapsed Time</Text>

      {/* Coaching feedback banner */}
      <CoachingBanner
        message={coachingMessage}
        state={coachingState}
        isWorkoutComplete={isWorkoutComplete}
      />

      {/* End Run button */}
      <TouchableOpacity
        style={styles.endButton}
        onPress={handleEndRun}
        activeOpacity={0.8}
      >
        <Text style={styles.endButtonText}>End Run</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * BlockProgressBar (polished)
 * ───────────────────────────
 * Shows the runner which workout block they are in, how much time is
 * left, and their progress through the session (e.g. "2 / 5").
 *
 * Now includes a small type tag (e.g. "WARMUP", "WORK") next to the
 * block name for extra clarity.
 */
function BlockProgressBar({
  blockLabel,
  blockType,
  blockIndex,
  totalBlocks,
  timeRemaining,
  isWorkoutComplete,
}: {
  blockLabel: string;
  blockType: BlockType;
  blockIndex: number;
  totalBlocks: number;
  timeRemaining: number;
  isWorkoutComplete: boolean;
}) {
  const dotColor = BLOCK_TYPE_COLORS[blockType];

  if (isWorkoutComplete) {
    return (
      <View style={styles.blockBar}>
        <View style={styles.blockBarLeft}>
          <View style={[styles.blockDot, { backgroundColor: "#00E676" }]} />
          <Text style={styles.blockLabel}>Workout Complete</Text>
        </View>
        <Text style={[styles.blockMeta, { color: "#00E676" }]}>
          {totalBlocks} / {totalBlocks}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.blockBar}>
      {/* Left side: colored dot + block name + type tag */}
      <View style={styles.blockBarLeft}>
        <View style={[styles.blockDot, { backgroundColor: dotColor }]} />
        <Text style={styles.blockLabel}>{blockLabel}</Text>
        <View style={[styles.blockTypeTag, { borderColor: dotColor }]}>
          <Text style={[styles.blockTypeText, { color: dotColor }]}>
            {BLOCK_TYPE_LABELS[blockType]}
          </Text>
        </View>
      </View>

      {/* Right side: time remaining + block counter */}
      <View style={styles.blockBarRight}>
        <Text style={styles.blockTimeRemaining}>
          {formatTime(timeRemaining)}
        </Text>
        <Text style={styles.blockMeta}>
          {blockIndex + 1} / {totalBlocks}
        </Text>
      </View>
    </View>
  );
}

/**
 * Color mapping for block types.
 */
const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  warmup: "#888888",
  work: "#00E676",
  recovery: "#FFD740",
  cooldown: "#64B5F6",
};

/**
 * Human-readable short labels for block types.
 */
const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  warmup: "WARMUP",
  work: "WORK",
  recovery: "RECOVERY",
  cooldown: "COOLDOWN",
};

/**
 * CoachingBanner (updated)
 * Now shows a special message when the workout is complete.
 */
function CoachingBanner({
  message,
  state,
  isWorkoutComplete,
}: {
  message: string | null;
  state: CoachingState;
  isWorkoutComplete: boolean;
}) {
  if (isWorkoutComplete) {
    return (
      <View style={styles.coachingBanner}>
        <Text style={[styles.coachingText, { color: "#00E676" }]}>
          Workout complete. Nice work!
        </Text>
      </View>
    );
  }

  const color = STATE_COLORS[state ?? "waiting"];

  return (
    <View style={styles.coachingBanner}>
      <Text style={[styles.coachingText, { color }]}>
        {message ?? "Coach warming up…"}
      </Text>
    </View>
  );
}

const STATE_COLORS: Record<string, string> = {
  on_target: "#00E676",
  too_slow: "#FFD740",
  too_fast: "#FF5252",
  waiting: "#555555",
};

/**
 * MetricBlock
 */
function MetricBlock({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  const isLongValue = value.length > 8;

  return (
    <View style={styles.metricBlock}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, isLongValue && styles.metricValueLong]}>
        {value}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  sessionBadge: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    backgroundColor: "#1A1A1A",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  status: {
    fontSize: 12,
    color: "#00E676",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // ── Block progress bar ──────────────────────────────────────────────
  blockBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  blockBarLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  blockBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  blockDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  blockLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  blockTimeRemaining: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  blockMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888888",
  },

  // ── Block type tag (NEW) ────────────────────────────────────────────
  blockTypeTag: {
    marginLeft: 8,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  blockTypeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // ── Metrics ─────────────────────────────────────────────────────────
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 40,
  },
  metricBlock: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  metricValueLong: {
    fontSize: 20,
    textAlign: "center",
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: "400",
    color: "#888888",
  },
  timer: {
    fontSize: 64,
    fontWeight: "700",
    color: "#00E676",
    marginBottom: 4,
  },
  timerLabel: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 16,
  },
  coachingBanner: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 28,
  },
  coachingText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  endButton: {
    backgroundColor: "#FF1744",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  endButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
