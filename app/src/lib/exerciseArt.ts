import type { ExerciseCategory } from "../api/workoutApi";

/** The families of abstract artwork an exercise can get. */
export type ArtGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "glutes"
  | "core"
  | "cardio"
  | "full";

/** Soft tint behind the shapes and the stronger colour of the shapes themselves. */
export const ART_COLORS: Record<ArtGroup, { bg: string; fg: string }> = {
  chest: { bg: "#FFE3DA", fg: "#E8512B" },
  back: { bg: "#DDE7FF", fg: "#3F63D8" },
  shoulders: { bg: "#F6E1FF", fg: "#9A47C9" },
  arms: { bg: "#FFEFC9", fg: "#D68A00" },
  legs: { bg: "#D9F3E4", fg: "#1F9D5C" },
  glutes: { bg: "#FFDDE8", fg: "#D63A72" },
  core: { bg: "#D8F1F5", fg: "#1789A0" },
  cardio: { bg: "#FFE0E0", fg: "#D8333A" },
  full: { bg: "#E8E6E0", fg: "#6B665C" },
};

const GROUP_BY_MUSCLE: Record<string, ArtGroup> = {
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
const NAME_HINTS: [RegExp, ArtGroup][] = [
  [/bench|chest|fly|flye|pec|push[- ]?up|dip/i, "chest"],
  [/row|pull[- ]?up|chin[- ]?up|lat |pulldown|deadlift|shrug|back extension/i, "back"],
  [/shoulder|overhead|lateral raise|front raise|face pull|arnold|military/i, "shoulders"],
  [/curl|tricep|skull|pushdown|forearm|hammer/i, "arms"],
  [/squat|lunge|leg |calf|hamstring|quad|step[- ]?up|hip abduct|hip adduct/i, "legs"],
  [/glute|hip thrust|bridge|kickback/i, "glutes"],
  [/crunch|plank|sit[- ]?up|ab |abs|twist|leg raise|core/i, "core"],
  [/run|walk|cycle|bike|row(er|ing) machine|treadmill|jump|swim|elliptical|stair|cardio|hiit/i, "cardio"],
];

/** Which artwork to draw for an exercise: its muscle group when known, else a guess from the name. */
export function artGroupFor(name: string, category?: ExerciseCategory, muscleGroup?: string | null): ArtGroup {
  if (category === "cardio") return "cardio";
  const fromMuscle = muscleGroup ? GROUP_BY_MUSCLE[muscleGroup.trim().toLowerCase()] : undefined;
  if (fromMuscle) return fromMuscle;
  const hint = NAME_HINTS.find(([pattern]) => pattern.test(name));
  return hint ? hint[1] : "full";
}
