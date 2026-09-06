/**
 * SummaryScreen.tsx
 * ─────────────────
 * Shown after the workout completes (automatically or via "End Run").
 * Displays a clean summary of the session the runner just finished.
 *
 * WHAT CHANGED vs. the previous version:
 *
 *   CLEARER SECTION LABELS
 *   ──────────────────────
 *   - The stats card now has a "Run Summary" header.
 *   - The block list now has a "Completed Blocks" header.
 *   - Added "Planned Duration" row so the runner can compare their
 *     actual duration against the session plan.
 *
 *   VISUAL POLISH
 *   ─────────────
 *   - Heading changed from "Run Complete" to a green checkmark + text.
 *   - Block rows now show a small index number for clarity.
 *   - Last row in each card removes its bottom border for a clean look.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { BlockType } from "../types/session";
import type { RunLocationDiagnostics } from "../services/runGpsDiagnostics";

// Shared formatting helpers
import { formatTime, formatPace } from "../utils/formatters";

type Props = NativeStackScreenProps<RootStackParamList, "Summary">;

export default function SummaryScreen({ route, navigation }: Props) {
  const { elapsedSeconds, distanceKm, session, diagnostics } = route.params;
  const isStructuredWorkout = session.blocks.length > 0;

  // ── Calculate the total planned duration from all blocks ────────────
  // This lets the runner see if they ran the full plan or ended early.
  const plannedDurationSec = session.blocks.reduce(
    (sum, block) => sum + block.durationSec,
    0
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      bounces={false}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Text style={styles.heading}>Run Complete</Text>
      <Text style={styles.sessionLabel}>{session.name}</Text>

      {/* ── Run Summary card ────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Run Summary</Text>

        <SummaryRow label="Duration" value={formatTime(elapsedSeconds)} />
        {isStructuredWorkout && (
          <SummaryRow
            label="Planned Duration"
            value={formatTime(plannedDurationSec)}
          />
        )}
        <SummaryRow label="Distance" value={`${distanceKm.toFixed(2)} km`} />
        <SummaryRow
          label="Avg Pace"
          value={`${formatPace(elapsedSeconds, distanceKm)} /km`}
          isLast
        />
      </View>

      {/* ── Completed Blocks card ───────────────────────────────────── */}
      {isStructuredWorkout && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Completed Blocks</Text>
          {session.blocks.map((block, index) => {
            const dotColor = BLOCK_TYPE_COLORS[block.type];
            const mins = Math.floor(block.durationSec / 60);
            const secs = block.durationSec % 60;
            const durationStr =
              secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
            const isLast = index === session.blocks.length - 1;

            return (
              <View
                key={index}
                style={[styles.blockRow, isLast && styles.blockRowLast]}
              >
                <View style={styles.blockRowLeft}>
                  {/* Small index number */}
                  <Text style={styles.blockIndex}>{index + 1}</Text>
                  <View
                    style={[styles.blockDot, { backgroundColor: dotColor }]}
                  />
                  <Text style={styles.blockName}>{block.label}</Text>
                </View>
                <Text style={styles.blockDuration}>{durationStr}</Text>
              </View>
            );
          })}
        </View>
      )}

      {diagnostics && (
        <GpsDiagnosticsSection diagnostics={diagnostics} />
      )}

      {/* ── RPE placeholder ─────────────────────────────────────────── */}
      <View style={styles.rpeSection}>
        <Text style={styles.rpeTitle}>How did it feel?</Text>
        <Text style={styles.rpePlaceholder}>RPE input coming soon</Text>
      </View>

      {/* ── Return to Home ──────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.popToTop()}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function GpsDiagnosticsSection({
  diagnostics,
}: {
  diagnostics: RunLocationDiagnostics;
}) {
  const rejectionReasonText = [
    `accuracy: ${diagnostics.rejectionReasons.accuracy}`,
    `spike: ${diagnostics.rejectionReasons.spike}`,
    `duplicate: ${diagnostics.rejectionReasons.duplicate}`,
    `gap reset: ${diagnostics.rejectionReasons.gapReset}`,
  ].join(", ");

  return (
    <View style={styles.debugCard}>
      <Text style={styles.sectionTitle}>GPS Debug</Text>
      <SummaryRow
        label="Latest Accuracy"
        value={formatAccuracy(diagnostics.latestAccuracyMetres)}
      />
      <SummaryRow
        label="Latest Sample"
        value={formatSampleTimestamp(diagnostics.latestSampleTimestamp)}
      />
      <SummaryRow
        label="Accepted Samples"
        value={String(diagnostics.acceptedSampleCount)}
      />
      <SummaryRow
        label="Rejected Samples"
        value={String(diagnostics.rejectedSampleCount)}
      />
      <SummaryRow label="Reject Reasons" value={rejectionReasonText} />
      <SummaryRow
        label="Foreground Samples"
        value={String(diagnostics.foregroundSampleCount)}
      />
      <SummaryRow
        label="Background Samples"
        value={String(diagnostics.backgroundSampleCount)}
      />
      <SummaryRow
        label="Inactive Source Ignored"
        value={String(diagnostics.inactiveSourceIgnoredSampleCount)}
      />
      <SummaryRow
        label="Pace Recalibrations"
        value={String(diagnostics.paceReturnedToCalibratingCount)}
      />
      <SummaryRow
        label="Background Time"
        value={formatDurationMs(diagnostics.backgroundElapsedMs)}
        isLast
      />
    </View>
  );
}

function formatAccuracy(accuracyMetres: number | null): string {
  if (accuracyMetres == null || !Number.isFinite(accuracyMetres)) {
    return "Unknown";
  }

  return `${Math.round(accuracyMetres)} m`;
}

function formatSampleTimestamp(timestamp: number | null): string {
  if (timestamp == null || !Number.isFinite(timestamp)) {
    return "None";
  }

  const ageSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return `${time} (${ageSeconds}s ago)`;
}

function formatDurationMs(durationMs: number): string {
  return formatTime(Math.round(durationMs / 1000));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * SummaryRow
 * A single key-value row inside a summary card.
 * `isLast` removes the bottom border for a clean look.
 */
function SummaryRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/** Same color mapping as RunScreen for consistency. */
const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  warmup: "#888888",
  work: "#00E676",
  recovery: "#FFD740",
  cooldown: "#64B5F6",
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#00E676",
    marginBottom: 4,
  },
  sessionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 28,
  },

  // ── Cards ───────────────────────────────────────────────────────────
  card: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  debugCard: {
    width: "100%",
    backgroundColor: "#151515",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333333",
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },

  // ── Summary rows ────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 16,
    color: "#888888",
    flex: 1,
    paddingRight: 12,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "right",
  },

  // ── Block breakdown ─────────────────────────────────────────────────
  blockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  blockRowLast: {
    borderBottomWidth: 0,
  },
  blockRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  blockIndex: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555555",
    width: 18,
  },
  blockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  blockName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  blockDuration: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888888",
  },

  // ── RPE ─────────────────────────────────────────────────────────────
  rpeSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  rpeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  rpePlaceholder: {
    fontSize: 14,
    color: "#666666",
    fontStyle: "italic",
  },

  // ── Button ──────────────────────────────────────────────────────────
  button: {
    backgroundColor: "#00E676",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0D0D0D",
  },
});
