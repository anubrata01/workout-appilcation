import type { SetEntryDTO } from "../api/workoutApi";

interface VolumeSource {
  exercises: { sets: SetEntryDTO[] }[];
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
