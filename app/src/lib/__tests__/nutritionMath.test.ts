import type { FoodDTO, FoodEntryDTO } from "../../api/nutritionApi";
import {
  OZ_IN_GRAMS,
  entriesForMeal,
  formatTimeHHMM,
  fromGrams,
  macroPercentages,
  mealForHour,
  progressTowards,
  scaleFood,
  suggestGoals,
  sumEntries,
  toGrams,
} from "../nutritionMath";

const chicken: FoodDTO = {
  id: "f1",
  name: "Chicken breast, cooked",
  brand: "",
  source: "curated",
  calories_100g: 165,
  protein_100g: 31,
  carbs_100g: 0,
  fat_100g: 3.6,
  fiber_100g: 0,
  sugar_100g: 0,
  sodium_mg_100g: 74,
  serving_g: 120,
  serving_label: "1 breast",
  is_approx: false,
  is_mine: false,
};

function entry(overrides: Partial<FoodEntryDTO>): FoodEntryDTO {
  return {
    id: "e",
    name: "x",
    quantity_label: "",
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    meal: "snack",
    eaten_at: null,
    serving_amount: null,
    serving_unit: "g",
    food_id: null,
    ...overrides,
  };
}

describe("unit conversion", () => {
  it("oz and grams convert both ways and round-trip", () => {
    expect(toGrams(100, "g")).toBe(100);
    expect(toGrams(1, "oz")).toBeCloseTo(OZ_IN_GRAMS, 4);
    expect(fromGrams(100, "oz")).toBeCloseTo(3.527, 2);
    expect(fromGrams(toGrams(7, "oz"), "oz")).toBeCloseTo(7, 6);
  });
});

describe("scaleFood", () => {
  it("scales per-100g values to the amount eaten", () => {
    const m = scaleFood(chicken, 200);
    expect(m.calories).toBe(330);
    expect(m.protein_g).toBe(62);
    expect(m.fat_g).toBe(7.2);
    expect(m.sodium_mg).toBe(148);
  });

  it("is zero for zero or negative grams, never negative", () => {
    expect(scaleFood(chicken, 0).calories).toBe(0);
    expect(scaleFood(chicken, -50).protein_g).toBe(0);
  });

  it("handles fractional amounts and rounds calories to whole kcal", () => {
    expect(scaleFood(chicken, 33).calories).toBe(54); // 54.45
    expect(scaleFood(chicken, 33).protein_g).toBe(10.2); // 10.23
  });
});

describe("macroPercentages", () => {
  it("splits by calories (4/4/9) and always sums to 100", () => {
    expect(macroPercentages(30, 40, 10)).toEqual({ protein: 32, carbs: 43, fat: 25 });
    for (const [p, c, f] of [[33, 33, 33], [1, 1, 1], [50, 0, 0], [7, 91, 13]]) {
      const pct = macroPercentages(p, c, f);
      expect(pct.protein + pct.carbs + pct.fat).toBe(100);
    }
  });

  it("is all zero with nothing eaten instead of dividing by zero", () => {
    expect(macroPercentages(0, 0, 0)).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

describe("sumEntries / entriesForMeal", () => {
  const entries = [
    entry({ id: "1", calories: 300, protein_g: 10, carbs_g: 50, fat_g: 5, meal: "breakfast" }),
    entry({ id: "2", calories: 400, protein_g: 40, carbs_g: 0, fat_g: 10, meal: "lunch" }),
    entry({ id: "3", calories: 150, protein_g: 5, carbs_g: 5, fat_g: 12, meal: "lunch" }),
  ];

  it("totals every nutrient", () => {
    expect(sumEntries(entries)).toEqual({ calories: 850, protein: 55, carbs: 55, fat: 27 });
    expect(sumEntries([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("groups by meal, and treats an entry from an old build with no meal as a snack", () => {
    expect(entriesForMeal(entries, "lunch").map((e) => e.id)).toEqual(["2", "3"]);
    expect(entriesForMeal(entries, "dinner")).toEqual([]);
    const legacy = { ...entry({ id: "old" }), meal: undefined } as unknown as FoodEntryDTO;
    expect(entriesForMeal([legacy], "snack").map((e) => e.id)).toEqual(["old"]);
  });
});

describe("mealForHour", () => {
  it.each([
    [5, "breakfast"],
    [10, "breakfast"],
    [11, "lunch"],
    [15, "lunch"],
    [16, "dinner"],
    [21, "dinner"],
    [22, "snack"],
    [0, "snack"],
    [4, "snack"],
  ])("hour %i is %s", (hour, meal) => {
    expect(mealForHour(hour)).toBe(meal);
  });
});

describe("formatTimeHHMM", () => {
  it("zero-pads, 24-hour, local time", () => {
    expect(formatTimeHHMM(new Date(2026, 9, 13, 7, 5))).toBe("07:05");
    expect(formatTimeHHMM(new Date(2026, 9, 13, 23, 59))).toBe("23:59");
  });
});

describe("suggestGoals", () => {
  const base = { sex: "male", age: 25, heightCm: 170, weightKg: 70, activity: "moderate", aim: "maintain" } as const;

  it("matches the Mifflin-St Jeor x activity worked example", () => {
    // BMR 10*70 + 6.25*170 - 5*25 + 5 = 1642.5; x1.55 = 2545.9 -> 2550
    const goals = suggestGoals(base);
    expect(goals.calories).toBe(2550);
    expect(goals.protein_g).toBe(126); // 1.8 g/kg
    expect(goals.fat_g).toBe(71); // 25% of calories
    expect(goals.carbs_g).toBe(352); // the rest
    expect(goals.water_ml).toBe(2450);
    expect(goals.target_weight_kg).toBeNull();
  });

  it("macros add back up to roughly the calorie target", () => {
    const g = suggestGoals(base);
    expect(Math.abs(g.protein_g * 4 + g.carbs_g * 4 + g.fat_g * 9 - g.calories)).toBeLessThan(15);
  });

  it("losing fat eats less and gaining eats more than maintaining", () => {
    const lose = suggestGoals({ ...base, aim: "lose" }).calories;
    const keep = suggestGoals(base).calories;
    const gain = suggestGoals({ ...base, aim: "gain" }).calories;
    expect(lose).toBeLessThan(keep);
    expect(gain).toBeGreaterThan(keep);
  });

  it("women get a lower basal rate than men of the same size", () => {
    expect(suggestGoals({ ...base, sex: "female" }).calories).toBeLessThan(suggestGoals(base).calories);
  });

  it("never recommends below a 1200 kcal floor", () => {
    const tiny = suggestGoals({ sex: "female", age: 80, heightCm: 140, weightKg: 38, activity: "sedentary", aim: "lose" });
    expect(tiny.calories).toBe(1200);
  });
});

describe("progressTowards", () => {
  it("is a fraction of the target, 0 when there is no usable target", () => {
    expect(progressTowards(500, 2000)).toBe(0.25);
    expect(progressTowards(2500, 2000)).toBe(1.25); // over target stays > 1 so the UI can flag it
    expect(progressTowards(500, null)).toBe(0);
    expect(progressTowards(500, undefined)).toBe(0);
    expect(progressTowards(500, 0)).toBe(0);
  });
});
