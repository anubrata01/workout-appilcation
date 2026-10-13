import type { MeasurementDTO, NutritionSummaryDayDTO } from "../../api/nutritionApi";
import type { MuscleGroupStat } from "../../api/workoutApi";
import { setupChecklist } from "../homeChecklist";
import { KIND_LABEL, KIND_UNIT, KINDS, changeOverPeriod, formatReading } from "../measurements";
import { BALANCE_GROUPS, HEAT_COLORS, MUSCLE_SLUGS, bodyHighlightData, untrainedGroups } from "../muscleMap";
import { summariseNutrition } from "../nutritionInsights";

function day(overrides: Partial<NutritionSummaryDayDTO>): NutritionSummaryDayDTO {
  return {
    date: "2026-10-13",
    calories: 0,
    water_ml: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    meal_calories: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
    logged: false,
    ...overrides,
  };
}

describe("summariseNutrition", () => {
  const days = [
    day({ date: "a", logged: true, calories: 2000, protein_g: 100, carbs_g: 200, fat_g: 60, water_ml: 2000, meal_calories: { breakfast: 500, lunch: 800, dinner: 600, snack: 100 } }),
    day({ date: "b", logged: false }), // nothing eaten: must not drag the averages down
    day({ date: "c", logged: true, calories: 1000, protein_g: 50, carbs_g: 100, fat_g: 30, water_ml: 1000, meal_calories: { breakfast: 300, lunch: 300, dinner: 300, snack: 100 } }),
  ];

  it("averages over logged days only", () => {
    const s = summariseNutrition(days);
    expect(s.loggedDays).toBe(2);
    expect(s.average).toEqual({ calories: 1500, protein_g: 75, carbs_g: 150, fat_g: 45 });
    expect(s.averageByMeal).toEqual({ breakfast: 400, lunch: 550, dinner: 450, snack: 100 });
  });

  it("meal shares always sum to exactly 100", () => {
    const s = summariseNutrition(days);
    expect(Object.values(s.mealShare).reduce((a, b) => a + b, 0)).toBe(100);
    expect([36, 37]).toContain(s.mealShare.lunch); // 550 / 1500 = 36.67, a rounding tie with two other meals
    expect(s.mealShare.dinner).toBe(30); // exactly 450 / 1500
  });

  it("shares stay valid for awkward splits that round badly", () => {
    const thirds = [day({ logged: true, calories: 300, meal_calories: { breakfast: 100, lunch: 100, dinner: 100, snack: 0 } })];
    const s = summariseNutrition(thirds);
    const shares = Object.values(s.mealShare);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
    expect(Math.min(...shares)).toBeGreaterThanOrEqual(0);
  });

  it("water averages over days with water, even a day with no food", () => {
    const s = summariseNutrition([day({ water_ml: 1500 }), day({ water_ml: 0 }), day({ water_ml: 2500, logged: true, calories: 1 })]);
    expect(s.averageWaterMl).toBe(2000);
  });

  it("an empty period is all zeros, not NaN", () => {
    const s = summariseNutrition([]);
    expect(s.loggedDays).toBe(0);
    expect(s.average.calories).toBe(0);
    expect(Object.values(s.mealShare)).toEqual([0, 0, 0, 0]);
    expect(s.averageWaterMl).toBe(0);
  });

  it("tolerates a day from an older server with no per-meal breakdown", () => {
    const legacy = { ...day({ logged: true, calories: 500 }), meal_calories: undefined } as unknown as NutritionSummaryDayDTO;
    expect(() => summariseNutrition([legacy])).not.toThrow();
    expect(summariseNutrition([legacy]).average.calories).toBe(500);
  });
});

describe("muscle map", () => {
  const groups: MuscleGroupStat[] = [
    { muscle_group: "chest", sets: 10, volume: 5000 },
    { muscle_group: "back", sets: 5, volume: 3000 },
    { muscle_group: "core", sets: 1, volume: 0 },
    { muscle_group: "cardio", sets: 4, volume: 0 }, // no region on the diagram
    { muscle_group: "other", sets: 3, volume: 100 },
  ];

  it("scales intensity to the most-trained muscle, 1 to 5", () => {
    const parts = bodyHighlightData(groups);
    const chest = parts.find((p) => p.slug === "chest")!;
    const back = parts.find((p) => p.slug === "upper-back")!;
    const abs = parts.find((p) => p.slug === "abs")!;
    expect(chest.intensity).toBe(HEAT_COLORS.length); // the busiest muscle is always darkest
    expect(back.intensity).toBe(3); // half of the max
    expect(abs.intensity).toBe(1);
  });

  it("one group can light several regions (core is abs and obliques)", () => {
    const slugs = bodyHighlightData(groups).map((p) => p.slug);
    expect(slugs).toEqual(expect.arrayContaining(["abs", "obliques"]));
  });

  it("skips groups with no region and returns nothing for no data", () => {
    const slugs = bodyHighlightData(groups).map((p) => p.slug);
    expect(slugs).not.toContain(undefined);
    expect(bodyHighlightData([])).toEqual([]);
    expect(bodyHighlightData([{ muscle_group: "cardio", sets: 9, volume: 0 }])).toEqual([]);
    expect(bodyHighlightData([{ muscle_group: "chest", sets: 0, volume: 0 }])).toEqual([]);
  });

  it("every library muscle group the seed can produce maps to at least one region (except non-anatomical ones)", () => {
    for (const group of ["chest", "shoulders", "biceps", "triceps", "forearms", "back", "lower back", "traps", "quads", "hamstrings", "glutes", "calves", "core", "adductors", "neck"]) {
      expect(MUSCLE_SLUGS[group]?.length).toBeGreaterThan(0);
    }
  });

  it("reports which balance-worthy muscles you have not trained", () => {
    expect(untrainedGroups([])).toEqual(BALANCE_GROUPS);
    const missing = untrainedGroups([{ muscle_group: "chest", sets: 4, volume: 1 }, { muscle_group: "back", sets: 0, volume: 0 }]);
    expect(missing).not.toContain("chest");
    expect(missing).toContain("back"); // zero sets does not count as trained
  });
});

describe("measurements helpers", () => {
  it("every kind has a label and a unit", () => {
    for (const kind of KINDS) {
      expect(KIND_LABEL[kind]).toBeTruthy();
      expect(KIND_UNIT[kind]).toBeTruthy();
    }
    expect(KIND_UNIT.weight).toBe("kg");
    expect(KIND_UNIT.body_fat).toBe("%");
    expect(KIND_UNIT.waist).toBe("cm");
  });

  it("formats to one decimal without a trailing .0", () => {
    expect(formatReading(72)).toBe("72");
    expect(formatReading(72.44)).toBe("72.4");
    expect(formatReading(72.46)).toBe("72.5");
  });

  it("change is newest minus oldest, null with fewer than two readings", () => {
    const readings: MeasurementDTO[] = [
      { date: "2026-09-01", kind: "weight", value: 75 },
      { date: "2026-09-15", kind: "weight", value: 73.5 },
      { date: "2026-10-01", kind: "weight", value: 72.2 },
    ];
    expect(changeOverPeriod(readings)).toEqual({ delta: -2.8, since: "2026-09-01" });
    expect(changeOverPeriod(readings.slice(0, 1))).toBeNull();
    expect(changeOverPeriod([])).toBeNull();
  });
});

describe("setupChecklist", () => {
  it("stays hidden until its data has loaded, so it never flashes 0 of 3", () => {
    expect(setupChecklist({ hasGoals: false, hasWorkout: false, hasWeight: false, ready: false }).show).toBe(false);
  });

  it("shows while anything is left and counts what is done", () => {
    const c = setupChecklist({ hasGoals: true, hasWorkout: false, hasWeight: true, ready: true });
    expect(c.show).toBe(true);
    expect(c.done).toBe(2);
    expect(c.items.find((i) => i.key === "workout")?.done).toBe(false);
  });

  it("disappears once everything is done", () => {
    expect(setupChecklist({ hasGoals: true, hasWorkout: true, hasWeight: true, ready: true }).show).toBe(false);
  });
});
