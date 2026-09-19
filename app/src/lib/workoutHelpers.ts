import type { ExerciseCategory, SetEntryDTO } from "../api/workoutApi";

interface VolumeSource {
  exercises: { sets: SetEntryDTO[] }[];
}

interface CalorieSource {
  exercises: { category: ExerciseCategory; sets: SetEntryDTO[] }[];
}

/**
 * Formats a Date as YYYY-MM-DD using its LOCAL calendar date — never
 * toISOString(), which converts to UTC first. For any timezone ahead of UTC
 * (e.g. IST, UTC+5:30), local midnight falls on the *previous* UTC calendar
 * day, so toISOString().slice(0,10) silently returns yesterday's date. That
 * was a real bug here: every save/fetch was keyed one day earlier than the
 * date the screen's header actually showed.
 */
export function keyFor(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a "YYYY-MM-DD" string as a LOCAL calendar date. `new Date("YYYY-MM-DD")`
 * parses as UTC midnight per spec — for any timezone behind UTC that rolls
 * back to the previous local day once formatted, the mirror image of the
 * keyFor bug above. Always use this for dates coming back from the API.
 */
export function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dayOffset(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

export function formatDateHeader(d: Date): { day: string; date: string } {
  const day = d.toLocaleDateString("en-US", { weekday: "long" });
  const date = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  return { day, date };
}

/** Same formula as the prototype's estimateCalories, ported unchanged (PRD 5.1, backend schema doc 3). */
export function dayVolume(day: VolumeSource | null | undefined): number {
  if (!day) return 0;
  return day.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.done ? set.weight * set.reps : 0), 0),
    0
  );
}

export function estimateCalories(volume: number): number {
  return Math.round(volume * 0.1 + (volume > 0 ? 90 : 0));
}

/**
 * Rough flat-rate estimate (~8 kcal/min, in the ballpark of moderate-effort
 * cardio) — there's no user bodyweight/heart-rate data to do a real
 * MET-based calculation, so this is deliberately approximate, same spirit
 * as the strength estimateCalories formula above.
 */
export function estimateCardioCalories(totalMinutes: number): number {
  return Math.round(totalMinutes * 8);
}

/** Strength volume + cardio minutes, combined into one total — the one
 * place this split is computed, so SessionScreen/DayRecordCard/HistoryScreen
 * can't drift out of sync with each other on how a day's calories add up. */
export function dayCalories(day: CalorieSource | null | undefined): number {
  if (!day) return 0;
  const cardioMinutes = day.exercises.reduce(
    (sum, ex) =>
      ex.category !== "cardio" ? sum : sum + ex.sets.reduce((s, set) => s + (set.done ? set.duration_minutes : 0), 0),
    0
  );
  return estimateCalories(dayVolume(day)) + estimateCardioCalories(cardioMinutes);
}

/**
 * The actively-ticking session clock — seconds-precision, since that's
 * meaningful while it's actually counting up in front of you. MM:SS under
 * an hour; once it crosses an hour it switches to H:MM:SS rather than
 * rolling minutes past 59, the same way any stopwatch does.
 */
export function formatElapsedClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * A finished/stored duration shown as a summary, not a live clock — no
 * seconds precision needed here. "42m" under an hour, "1h 15m" (or just
 * "1h" exactly on the hour) at or over one, instead of duration always
 * being squeezed into a single minutes number once a session (or a day's
 * summed multi-session total) runs long.
 */
export function formatDurationSummary(totalSeconds: number): string {
  const totalMinutes = Math.round(Math.max(0, totalSeconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** A local wall-clock time from a full ISO timestamp (not a bare date), e.g.
 * "6:00 PM" — for showing when a session actually started/finished, not just
 * how long it took. Unlike keyFor/parseLocalDate above, a full ISO
 * timestamp already carries an explicit UTC offset, so `new Date(iso)`
 * parses it unambiguously; the local-vs-UTC trap those two guard against
 * only applies to bare "YYYY-MM-DD" strings. */
export function formatClockTime(iso: string): string {
  // Pinned to "en-US" deliberately, not the device's own locale (`[]`) — the
  // rest of the app's numbers (reps, weights, durations) are always plain
  // Western digits, and on a device set to a locale with its own numeral
  // system (Bengali, Arabic-indic, etc.) an unpinned toLocaleTimeString
  // would render this one value in different digits than everything next to
  // it. The 12-hour AM/PM shape stays regardless of the pinned locale.
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// A small fixed set of accent-ish colors to cycle through deterministically —
// no longer tag-derived, just enough variety for a PR card's accent dot.
const NAME_ACCENT_PALETTE = ["#FF4519", "#FF6B4A", "#1E9E70", "#B8791A", "#7C6FE0", "#3B9FD9"];

/** A deterministic per-name color, so the same exercise always gets the same accent dot. */
export function colorForExerciseName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return NAME_ACCENT_PALETTE[Math.abs(hash) % NAME_ACCENT_PALETTE.length];
}
