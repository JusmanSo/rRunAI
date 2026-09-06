/**
 * HomeScreen.tsx
 * ──────────────
 * The first screen the runner sees.  It shows today's workout session
 * and lets the runner tap "Start Run" to begin.
 *
 * WHAT CHANGED vs. the previous version:
 *   - Imported the Session type and SESSION_CATALOGUE from types/session.
 *   - Added state to track which session is currently selected.
 *   - The session card now shows the selected session's real name,
 *     duration, description, and target pace range.
 *   - Added small "pill" buttons so the runner can switch between
 *     Easy Run, Threshold Run, and Interval Run.
 *   - "Start Run" now passes the selected session object to RunScreen
 *     via navigation params.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

// Session data
import { SESSION_CATALOGUE, getTodaySession } from "../types/session";
import type { Session } from "../types/session";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

/**
 * Turns a decimal pace number into a MM:SS string for display.
 * Example: 6.0 → "6:00",  4.83 → "4:50"
 */
function paceToString(pace: number): string {
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function HomeScreen({ navigation }: Props) {
  // ── State: which session is selected ───────────────────────────────────
  // Default to "today's session" (Easy Run for now).
  const [selectedSession, setSelectedSession] = useState<Session>(
    getTodaySession()
  );

  return (
    <View style={styles.container}>
      {/* App title */}
      <Text style={styles.title}>rRunAI</Text>

      {/* ── Session picker ────────────────────────────────────────────── */}
      {/* Simple row of pill buttons — one per session type.               */}
      {/* The active pill is highlighted green; the others are dark grey.  */}
      <View style={styles.pickerRow}>
        {SESSION_CATALOGUE.map((session) => {
          const isActive = session.id === selectedSession.id;
          return (
            <TouchableOpacity
              key={session.id}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => setSelectedSession(session)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.pillText, isActive && styles.pillTextActive]}
              >
                {session.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Today's session card ──────────────────────────────────────── */}
      {/* Now driven by the selected session object instead of hardcoded. */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Session</Text>
        <Text style={styles.cardBody}>
          {selectedSession.name} — {selectedSession.durationLabel}
        </Text>
        <Text style={styles.cardHint}>{selectedSession.description}</Text>
        {selectedSession.targetMinPace != null &&
        selectedSession.targetMaxPace != null ? (
          <Text style={styles.cardPace}>
            Target: {paceToString(selectedSession.targetMinPace)} –{" "}
            {paceToString(selectedSession.targetMaxPace)} /km
          </Text>
        ) : (
          <Text style={styles.cardPace}>No pace target</Text>
        )}
      </View>

      {/* ── Start Run button ──────────────────────────────────────────── */}
      {/* Now passes the selected session to the Run screen.              */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Run", { session: selectedSession })}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Start Run</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 28,
  },

  // ── Session picker pills (NEW) ──────────────────────────────────────
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 24,
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
  },
  pillActive: {
    backgroundColor: "#00E676",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888888",
  },
  pillTextActive: {
    color: "#0D0D0D",
  },

  // ── Session card (mostly unchanged, added cardPace) ─────────────────
  card: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 14,
    color: "#AAAAAA",
    marginBottom: 8,
  },
  cardPace: {
    fontSize: 13,
    fontWeight: "600",
    color: "#00E676",
  },

  // ── Start Run button (unchanged) ────────────────────────────────────
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
