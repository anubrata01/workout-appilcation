import type { Slug } from "react-native-body-highlighter";

import type { ExerciseCategory } from "../api/workoutApi";
import { MUSCLE_SLUGS } from "./muscleMap";

/** Colour of the muscles an exercise works, and the paler tone for supporting areas. */
export const WORKED_COLOR = "#E53935";
export const SUPPORT_COLOR = "#F4B4B1";

export type MuscleFamily = "chest" | "back" | "shoulders" | "arms" | "legs" | "glutes" | "core" | "cardio" | "full";

const FAMILY_BY_MUSCLE: Record<string, MuscleFamily> = {
  chest: "chest",
  back: "back",
  "lower back": "back",
  traps: "back",
  lats: "back",
  neck: "shoulders",
  shoulders: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  quads: "legs",
  hamstrings: "legs",
  calves: "legs",
  adductors: "legs",
  abductors: "legs",
  glutes: "glutes",
  core: "core",
  abs: "core",
  cardio: "cardio",
  "full body": "full",
};

// Used when the muscle group isn't known (an exercise on the workout screen
// only remembers its name). Checked in order, first match wins.
const NAME_HINTS: [RegExp, MuscleFamily][] = [
  [/tricep|skull|pushdown/i, "arms"],
  [/bench|chest|fly|flye|pec|push[- ]?up|dip/i, "chest"],
  [/row|pull[- ]?up|chin[- ]?up|lat |pulldown|deadlift|shrug|back extension/i, "back"],
  [/shoulder|overhead|lateral raise|front raise|face pull|arnold|military/i, "shoulders"],
  [/curl|forearm|hammer/i, "arms"],
  [/squat|lunge|leg |calf|hamstring|quad|step[- ]?up|hip abduct|hip adduct/i, "legs"],
  [/glute|hip thrust|bridge|kickback/i, "glutes"],
  [/crunch|plank|sit[- ]?up|ab |abs|twist|leg raise|core/i, "core"],
  [/run|walk|cycle|bike|rowing machine|treadmill|jump|swim|elliptical|stair|cardio|hiit/i, "cardio"],
];

/** The family an exercise belongs to: its muscle group when known, else a guess from the name. */
export function muscleFamilyFor(name: string, category?: ExerciseCategory, muscleGroup?: string | null): MuscleFamily {
  if (category === "cardio") return "cardio";
  const fromMuscle = muscleGroup ? FAMILY_BY_MUSCLE[muscleGroup.trim().toLowerCase()] : undefined;
  if (fromMuscle) return fromMuscle;
  const hint = NAME_HINTS.find(([pattern]) => pattern.test(name));
  return hint ? hint[1] : "full";
}

// Regions lit for a family when no specific muscle is known.
const FAMILY_SLUGS: Record<MuscleFamily, Slug[]> = {
  chest: ["chest"],
  back: ["upper-back", "lower-back", "trapezius"],
  shoulders: ["deltoids"],
  arms: ["biceps", "triceps", "forearm"],
  legs: ["quadriceps", "hamstring", "calves"],
  glutes: ["gluteal"],
  core: ["abs", "obliques"],
  cardio: [],
  full: [],
};

const BACK_SLUGS: Slug[] = ["upper-back", "lower-back", "trapezius", "triceps", "hamstring", "gluteal"];

export interface MuscleHighlight {
  /** Which side of the body diagram to draw. */
  side: "front" | "back";
  /** Regions worked, drawn in the strong colour (intensity 2). */
  worked: Slug[];
  /** Regions lightly involved, drawn pale (intensity 1); used for cardio and whole-body moves. */
  support: Slug[];
}

/**
 * Which regions of the anatomical figure to highlight for an exercise. A known
 * muscle group lights exactly that muscle; otherwise the whole family lights
 * up. Cardio and unrecognised moves show the major muscle groups in pale tones
 * rather than claiming a specific muscle.
 */
export function muscleHighlightFor(name: string, category?: ExerciseCategory, muscleGroup?: string | null): MuscleHighlight {
  const family = muscleFamilyFor(name, category, muscleGroup);
  if (family === "cardio" || family === "full") {
    return { side: "front", worked: [], support: ["chest", "abs", "quadriceps", "deltoids", "biceps", "calves"] };
  }
  const exact = muscleGroup ? MUSCLE_SLUGS[muscleGroup.trim().toLowerCase()] : undefined;
  const worked = exact && exact.length > 0 ? exact : FAMILY_SLUGS[family];
  const side = worked.some((slug) => BACK_SLUGS.includes(slug)) && !worked.some((slug) => slug === "biceps" || slug === "chest") ? "back" : "front";
  return { side, worked, support: [] };
}
