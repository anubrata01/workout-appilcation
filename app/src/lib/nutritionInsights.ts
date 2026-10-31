import type { Meal, NutritionSummaryDayDTO } from "../api/nutritionApi";

export type Metric = "calories" | "protein_g" | "carbs_g" | "fat_g";

const MEAL_KEYS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export interface NutritionSummary {
  loggedDays: number;
  average: Record<Metric, number>;
  averageByMeal: Record<Meal, number>;
  /** Each meal's share of total average calories, rounded so the four always sum to 100 (or are all 0). */
  mealShare: Record<Meal, number>;
  averageWaterMl: number;
}

const zeroMeals = (): Record<Meal, number> => ({ breakfast: 0, lunch: 0, dinner: 0, snack: 0 });

/**
 * Averages over only the days that have food logged, so skipping a day
 * doesn't drag "average per day" toward zero. A day with only water logged
 * has `logged: false` and is excluded from calorie/macro averages, but its
 * water still counts toward the water average.
 */
export function summariseNutrition(days: NutritionSummaryDayDTO[]): NutritionSummary {
  const logged = days.filter((d) => d.logged);
  const count = logged.length;
  const avg = (pick: (d: NutritionSummaryDayDTO) => number) =>
    count === 0 ? 0 : Math.round(logged.reduce((sum, d) => sum + pick(d), 0) / count);

  const averageByMeal = zeroMeals();
  for (const meal of MEAL_KEYS) averageByMeal[meal] = avg((d) => d.meal_calories?.[meal] ?? 0);

  const totalMeal = MEAL_KEYS.reduce((sum, m) => sum + averageByMeal[m], 0);
  const mealShare = zeroMeals();
  if (totalMeal > 0) {
    // Largest-remainder rounding: floor every share, then hand the leftover
    // points to the meals with the biggest fractional parts, so the four
    // always add up to exactly 100 and none can go negative.
    const raw = MEAL_KEYS.map((meal) => (averageByMeal[meal] / totalMeal) * 100);
    const floors = raw.map(Math.floor);
    let leftover = 100 - floors.reduce((a, b) => a + b, 0);
    const byFraction = raw.map((r, i) => ({ i, frac: r - floors[i] })).sort((a, b) => b.frac - a.frac);
    for (const { i } of byFraction) {
      if (leftover <= 0) break;
      floors[i] += 1;
      leftover -= 1;
    }
    MEAL_KEYS.forEach((meal, i) => (mealShare[meal] = floors[i]));
  }

  const waterDays = days.filter((d) => d.water_ml > 0);
  return {
    loggedDays: count,
    average: {
      calories: avg((d) => d.calories),
      protein_g: avg((d) => d.protein_g),
      carbs_g: avg((d) => d.carbs_g),
      fat_g: avg((d) => d.fat_g),
    },
    averageByMeal,
    mealShare,
    averageWaterMl: waterDays.length === 0 ? 0 : Math.round(waterDays.reduce((s, d) => s + d.water_ml, 0) / waterDays.length),
  };
}
