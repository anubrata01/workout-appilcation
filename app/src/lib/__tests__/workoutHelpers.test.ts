import {
  colorForExerciseName,
  dayCalories,
  dayOffset,
  dayVolume,
  estimateCalories,
  estimateCardioCalories,
  formatDateHeader,
  keyFor,
  parseLocalDate,
} from "../workoutHelpers";

describe("keyFor / parseLocalDate", () => {
  // The documented historical bug: toISOString() converts to UTC first, so
  // in any timezone ahead of UTC (IST included), local midnight rolls back
  // to the previous UTC day and a naive toISOString().slice(0,10) silently
  // returns yesterday's date. keyFor must always reflect the LOCAL date,
  // regardless of the runner's timezone.
  it("uses the local calendar date, not the UTC one", () => {
    const d = new Date(2026, 8, 19, 23, 45); // Sep 19 2026, 11:45pm local
    expect(keyFor(d)).toBe("2026-09-19");
  });

  it("pads single-digit months and days", () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(keyFor(d)).toBe("2026-01-05");
  });

  it("round-trips through parseLocalDate without shifting a day", () => {
    const key = "2026-09-19";
    const parsed = parseLocalDate(key);
    expect(keyFor(parsed)).toBe(key);
  });

  it("parseLocalDate never rolls back to the previous day near local midnight", () => {
    // The mirror-image bug: new Date("2026-09-19") parses as UTC midnight,
    // which in a timezone behind UTC formats back as Sep 18.
    const parsed = parseLocalDate("2026-09-19");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8); // 0-indexed: September
    expect(parsed.getDate()).toBe(19);
  });
});

describe("dayOffset", () => {
  it("0 is today at local midnight", () => {
    const today = dayOffset(0);
    const now = new Date();
    expect(keyFor(today)).toBe(keyFor(now));
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
  });

  it("-1 is yesterday, +1 is tomorrow, symmetric around today", () => {
    const yesterday = dayOffset(-1);
    const tomorrow = dayOffset(1);
    const today = dayOffset(0);
    expect(today.getTime() - yesterday.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(tomorrow.getTime() - today.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("formatDateHeader", () => {
  it("returns a weekday name and a human date string", () => {
    const { day, date } = formatDateHeader(new Date(2026, 8, 19)); // Saturday
    expect(day).toBe("Saturday");
    expect(date).toContain("2026");
    expect(date).toContain("Sep");
  });
});

describe("estimateCalories / estimateCardioCalories", () => {
  it("is zero with zero volume, and adds a flat +90 once any volume is logged", () => {
    expect(estimateCalories(0)).toBe(0);
    expect(estimateCalories(100)).toBe(Math.round(100 * 0.1 + 90));
  });

  it("cardio calories scale linearly with minutes at ~8 kcal/min", () => {
    expect(estimateCardioCalories(0)).toBe(0);
    expect(estimateCardioCalories(30)).toBe(240);
  });
});

function set(overrides: Partial<{ weight: number; reps: number; done: boolean; duration_minutes: number }> = {}) {
  return {
    weight: 0,
    reps: 0,
    duration_minutes: 0,
    distance_km: 0,
    rest_seconds: null,
    done: false,
    ...overrides,
  };
}

describe("dayVolume / dayCalories", () => {
  it("is zero for a null/undefined day (no crash on the idle empty state)", () => {
    expect(dayVolume(null)).toBe(0);
    expect(dayVolume(undefined)).toBe(0);
    expect(dayCalories(null)).toBe(0);
  });

  it("only counts sets marked done", () => {
    const day = {
      exercises: [
        { sets: [set({ weight: 60, reps: 8, done: true }), set({ weight: 60, reps: 8, done: false })] },
      ],
    };
    expect(dayVolume(day)).toBe(480); // only the done set counts
  });

  it("sums volume across multiple exercises (the multi-exercise save/read case)", () => {
    const day = {
      exercises: [
        { category: "strength" as const, sets: [set({ weight: 60, reps: 8, done: true })] },
        { category: "strength" as const, sets: [set({ weight: 40, reps: 10, done: true })] },
      ],
    };
    expect(dayVolume(day)).toBe(60 * 8 + 40 * 10);
    expect(dayCalories(day)).toBe(estimateCalories(60 * 8 + 40 * 10));
  });

  it("adds cardio minutes on top of strength volume, using each category's own fields", () => {
    const day = {
      exercises: [
        { category: "strength" as const, sets: [set({ weight: 60, reps: 8, done: true })] },
        { category: "cardio" as const, sets: [set({ duration_minutes: 20, done: true })] },
      ],
    };
    const expected = estimateCalories(480) + estimateCardioCalories(20);
    expect(dayCalories(day)).toBe(expected);
  });
});

describe("colorForExerciseName", () => {
  it("is deterministic for the same name", () => {
    expect(colorForExerciseName("Bench Press")).toBe(colorForExerciseName("Bench Press"));
  });

  it("returns a value from the fixed palette for any name", () => {
    const palette = new Set([
      colorForExerciseName("Bench Press"),
      colorForExerciseName("Squat"),
      colorForExerciseName("Cable Fly"),
      colorForExerciseName("Lat Pulldown"),
      colorForExerciseName("Arnold Press"),
      colorForExerciseName("Hanging Leg Raise"),
    ]);
    // Not asserting exact colors (palette is an implementation detail) —
    // just that it never returns undefined/empty for a real name.
    for (const c of palette) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
