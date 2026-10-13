import type { ExtendedBodyPart, Slug } from "react-native-body-highlighter";

import type { MuscleGroupStat } from "../api/workoutApi";

/** Our exercise-library muscle groups -> the body diagram's regions. */
export const MUSCLE_SLUGS: Record<string, Slug[]> = {
  chest: ["chest"],
  shoulders: ["deltoids"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearm"],
  back: ["upper-back"],
  "lower back": ["lower-back"],
  traps: ["trapezius"],
  quads: ["quadriceps"],
  hamstrings: ["hamstring"],
  glutes: ["gluteal"],
  calves: ["calves"],
  core: ["abs", "obliques"],
  adductors: ["adductors"],
  neck: ["neck"],
};

/** Shades from "a little work" to "most worked"; the diagram picks one by intensity (1-based). */
export const HEAT_COLORS = ["#FFD9CC", "#FFB8A1", "#FF8E6E", "#FF6B4A", "#E83A12"] as const;

/**
 * Turns per-muscle set counts into diagram highlights. Intensity is relative
 * to the most-trained muscle in the window (1..5), so the picture shows
 * balance, not absolute volume: the busiest muscle is always the darkest.
 * Groups the diagram has no region for (full body, cardio, other) are skipped.
 */
export function bodyHighlightData(groups: MuscleGroupStat[]): ExtendedBodyPart[] {
  const mapped = groups.filter((g) => g.sets > 0 && MUSCLE_SLUGS[g.muscle_group]);
  const max = Math.max(0, ...mapped.map((g) => g.sets));
  if (max === 0) return [];

  const parts: ExtendedBodyPart[] = [];
  for (const group of mapped) {
    const intensity = Math.max(1, Math.min(HEAT_COLORS.length, Math.ceil((group.sets / max) * HEAT_COLORS.length)));
    for (const slug of MUSCLE_SLUGS[group.muscle_group]) parts.push({ slug, intensity });
  }
  return parts;
}

/** Muscles you've trained least among the ones worth balancing, for a gentle "neglected" hint. */
export const BALANCE_GROUPS = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core"];

export function untrainedGroups(groups: MuscleGroupStat[]): string[] {
  const trained = new Set(groups.filter((g) => g.sets > 0).map((g) => g.muscle_group));
  return BALANCE_GROUPS.filter((g) => !trained.has(g));
}
