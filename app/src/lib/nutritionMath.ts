import type { FoodDTO, FoodEntryDTO, GoalDTO, Meal } from "../api/nutritionApi";

export const OZ_IN_GRAMS = 28.3495;

export type ServingUnit = "g" | "oz";

/** Grams for an amount typed in the chosen unit. */
export function toGrams(amount: number, unit: ServingUnit): number {
  return unit === "oz" ? amount * OZ_IN_GRAMS : amount;
}

/** The amount to show when switching unit, so 200 g becomes ~7.1 oz rather than staying "200". */
export function fromGrams(grams: number, unit: ServingUnit): number {
  return unit === "oz" ? grams / OZ_IN_GRAMS : grams;
}

export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Nutrients for `grams` of a food (catalogue values are per 100 g). Calories round to whole kcal. */
export function scaleFood(food: FoodDTO, grams: number): Macros {
  const k = Math.max(0, grams) / 100;
  return {
    calories: Math.round(food.calories_100g * k),
    protein_g: round1(food.protein_100g * k),
    carbs_g: round1(food.carbs_100g * k),
    fat_g: round1(food.fat_100g * k),
    fiber_g: round1(food.fiber_100g * k),
    sugar_g: round1(food.sugar_100g * k),
    sodium_mg: Math.round(food.sodium_mg_100g * k),
  };
}

/** Energy split by macro, for the donut: 4 kcal/g protein and carbs, 9 kcal/g fat. */
export function macroPercentages(protein_g: number, carbs_g: number, fat_g: number) {
  const p = protein_g * 4;
  const c = carbs_g * 4;
  const f = fat_g * 9;
  const total = p + c + f;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  const protein = Math.round((p / total) * 100);
  const carbs = Math.round((c / total) * 100);
  return { protein, carbs, fat: Math.max(0, 100 - protein - carbs) };
}

export function sumEntries(entries: Pick<FoodEntryDTO, "calories" | "protein_g" | "carbs_g" | "fat_g">[]) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein_g,
      carbs: acc.carbs + e.carbs_g,
      fat: acc.fat + e.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function entriesForMeal(entries: FoodEntryDTO[], meal: Meal): FoodEntryDTO[] {
  return entries.filter((e) => (e.meal ?? "snack") === meal);
}

/** A sensible default meal for "now", so adding food at 8am lands under Breakfast without asking. */
export function mealForHour(hour: number): Meal {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 22) return "dinner";
  return "snack";
}

export function formatTimeHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export interface GoalInputs {
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  activity: "sedentary" | "light" | "moderate" | "active";
  aim: "lose" | "maintain" | "gain";
}

const ACTIVITY_FACTOR = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 } as const;
const AIM_ADJUSTMENT = { lose: -500, maintain: 0, gain: 300 } as const;

/**
 * Starting-point daily targets: Mifflin-St Jeor basal rate x activity, then a
 * deficit/surplus for the aim. Protein is 1.8 g per kg bodyweight, fat 25% of
 * calories, carbs the remainder. These are estimates to edit, not medical
 * advice, and the screen says so.
 */
export function suggestGoals(input: GoalInputs): GoalDTO {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + (input.sex === "male" ? 5 : -161);
  const calories = Math.max(1200, Math.round((base * ACTIVITY_FACTOR[input.activity] + AIM_ADJUSTMENT[input.aim]) / 10) * 10);
  const protein_g = Math.round(input.weightKg * 1.8);
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));
  return { calories, protein_g, carbs_g, fat_g, water_ml: Math.round(input.weightKg * 35 / 50) * 50, target_weight_kg: null };
}

/** Fraction (0..1+) of a target reached; 0 when there is no target to compare against. */
export function progressTowards(value: number, target: number | null | undefined): number {
  if (!target || target <= 0) return 0;
  return value / target;
}
