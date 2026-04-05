/**
 * formatters.ts
 * ─────────────
 * Small helper functions for displaying numbers as runner-friendly strings.
 * Shared by RunScreen and SummaryScreen so the logic lives in one place.
 */

/**
 * Turns a number of seconds into a MM:SS string.
 *
 * Examples:
 *   formatTime(0)   → "00:00"
 *   formatTime(65)  → "01:05"
 *   formatTime(600) → "10:00"
 */
export function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Formats a numeric pace value (minutes per kilometre) as MM:SS.
 *
 * Returns "--:--" when pace is unknown or clearly invalid.
 */
export function formatMinPerKm(paceMinPerKm: number | null | undefined): string {
  if (
    paceMinPerKm == null ||
    !Number.isFinite(paceMinPerKm) ||
    paceMinPerKm <= 0 ||
    paceMinPerKm > 30
  ) {
    return "--:--";
  }

  const wholeMins = Math.floor(paceMinPerKm);
  const rawSecs = Math.round((paceMinPerKm - wholeMins) * 60);

  // Handle values like 5.999 that round up to the next minute cleanly.
  const displayMins = rawSecs === 60 ? wholeMins + 1 : wholeMins;
  const displaySecs = rawSecs === 60 ? 0 : rawSecs;

  return `${String(displayMins).padStart(2, "0")}:${String(displaySecs).padStart(2, "0")}`;
}

/**
 * Calculates average pace (minutes per kilometre) from elapsed time and
 * distance, then returns it as a MM:SS string.
 *
 * If the runner hasn't moved far enough yet (< 0.01 km = 10 metres),
 * we return a placeholder instead of a wildly inaccurate number.
 *
 * HOW PACE WORKS:
 *   Pace = total time (in minutes) ÷ total distance (in km)
 *   A pace of 6:00 /km means it takes 6 minutes to run 1 kilometre.
 *
 * @param elapsedSeconds  How long the run has been going.
 * @param distanceKm      How far the runner has gone (in km).
 * @returns               A string like "5:42" or "--:--" if too early.
 */
export function formatPace(elapsedSeconds: number, distanceKm: number): string {
  // Not enough distance yet — show placeholder
  if (distanceKm < 0.01) {
    return "--:--";
  }

  const elapsedMinutes = elapsedSeconds / 60;
  const paceMinPerKm = elapsedMinutes / distanceKm;

  // If pace is unreasonably slow (> 30 min/km) show placeholder.
  // This catches cases where GPS just started and distance is tiny.
  if (paceMinPerKm > 30) {
    return "--:--";
  }

  return formatMinPerKm(paceMinPerKm);
}
