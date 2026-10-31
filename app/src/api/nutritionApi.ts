import { createApi } from "@reduxjs/toolkit/query/react";
import { REHYDRATE } from "redux-persist";

import { NUTRITION_API_URL } from "../config";
import { KEEP } from "../lib/cachePolicy";
import { createServiceBaseQuery } from "./createServiceBaseQuery";

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export type MeasurementKind =
  | "weight"
  | "body_fat"
  | "chest"
  | "waist"
  | "hips"
  | "neck"
  | "shoulders"
  | "bicep"
  | "forearm"
  | "thigh"
  | "calf";

export interface FoodEntryDTO {
  id: string;
  name: string;
  quantity_label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  meal: Meal;
  eaten_at: string | null; // local "HH:MM"
  serving_amount: number | null;
  serving_unit: string;
  food_id: string | null;
}

export interface NutritionDayDTO {
  date: string;
  water_ml: number;
  weight_kg: number | null;
  entries: FoodEntryDTO[];
}

export interface NutritionSummaryDayDTO {
  date: string;
  calories: number;
  water_ml: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_calories: Record<Meal, number>;
  logged: boolean;
}

export type SummaryRange = "week" | "month" | "quarter";

export interface FoodDTO {
  id: string;
  name: string;
  brand: string;
  source: string;
  calories_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g: number;
  sugar_100g: number;
  sodium_mg_100g: number;
  serving_g: number;
  serving_label: string;
  is_approx: boolean;
  is_mine: boolean;
}

export type FoodInput = Pick<
  FoodDTO,
  | "name"
  | "brand"
  | "calories_100g"
  | "protein_100g"
  | "carbs_100g"
  | "fat_100g"
  | "fiber_100g"
  | "sugar_100g"
  | "sodium_mg_100g"
  | "serving_g"
  | "serving_label"
>;

export interface GoalDTO {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  target_weight_kg: number | null;
}

export interface MeasurementDTO {
  date: string;
  kind: MeasurementKind;
  value: number;
}

export type MeasurementRange = "month" | "quarter" | "year" | "all";

export const nutritionApi = createApi({
  reducerPath: "nutritionApi",
  baseQuery: createServiceBaseQuery(NUTRITION_API_URL),
  tagTypes: ["Day", "Summary", "MyFoods", "Recent", "Goals", "Measurements"],
  extractRehydrationInfo(action, { reducerPath }): any {
    if (action.type === REHYDRATE) {
      return (action as { payload?: Record<string, unknown> }).payload?.[reducerPath];
    }
  },
  endpoints: (builder) => ({
    // No trailing slash: FastAPI's routes here are declared without one
    // (unlike the Django services' urls.py, which do use one), and letting
    // a mismatch redirect (Starlette's default) rather than matching exactly
    // is an extra round-trip worth just not having.
    getNutritionDay: builder.query<NutritionDayDTO | null, string>({
      query: (date) => `/v1/nutrition/days/${date}`,
      providesTags: (_result, _error, date) => [{ type: "Day", id: date }],
      keepUnusedDataFor: KEEP.loggedDay,
    }),
    saveNutritionDay: builder.mutation<
      NutritionDayDTO,
      { date: string; body: { water_ml: number; weight_kg?: number | null; entries: Omit<FoodEntryDTO, "id">[] } }
    >({
      query: ({ date, body }) => ({ url: `/v1/nutrition/days/${date}`, method: "PUT", body }),
      invalidatesTags: (_result, error, { date }) =>
        error ? [] : [{ type: "Day", id: date }, "Summary", "Recent"],
    }),
    getNutritionSummary: builder.query<NutritionSummaryDayDTO[], { range: SummaryRange; end: string }>({
      query: ({ range, end }) => `/v1/nutrition/summary?range=${range}&end=${end}`,
      providesTags: ["Summary"],
      keepUnusedDataFor: KEEP.analytics,
    }),
    // Search is answered from memory on the server and cached here too; one
    // request per distinct query, kept for a session's worth of retyping.
    searchFoods: builder.query<FoodDTO[], string>({
      query: (q) => `/v1/nutrition/foods/search?q=${encodeURIComponent(q)}`,
      providesTags: ["MyFoods"],
      keepUnusedDataFor: KEEP.search,
    }),
    getMyFoods: builder.query<FoodDTO[], void>({
      query: () => "/v1/nutrition/foods/mine",
      providesTags: ["MyFoods"],
      keepUnusedDataFor: KEEP.reference,
    }),
    getRecentFoods: builder.query<FoodEntryDTO[], void>({
      query: () => "/v1/nutrition/foods/recent",
      providesTags: ["Recent"],
      keepUnusedDataFor: KEEP.analytics,
    }),
    createFood: builder.mutation<FoodDTO, FoodInput>({
      query: (body) => ({ url: "/v1/nutrition/foods", method: "POST", body }),
      invalidatesTags: (_result, error) => (error ? [] : ["MyFoods"]),
    }),
    deleteFood: builder.mutation<void, string>({
      query: (id) => ({ url: `/v1/nutrition/foods/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, error) => (error ? [] : ["MyFoods"]),
    }),
    getGoals: builder.query<GoalDTO | null, void>({
      query: () => "/v1/nutrition/goals",
      providesTags: ["Goals"],
      keepUnusedDataFor: KEEP.reference,
    }),
    saveGoals: builder.mutation<GoalDTO, GoalDTO>({
      query: (body) => ({ url: "/v1/nutrition/goals", method: "PUT", body }),
      invalidatesTags: (_result, error) => (error ? [] : ["Goals"]),
    }),
    getMeasurements: builder.query<MeasurementDTO[], { kind: MeasurementKind; range: MeasurementRange }>({
      query: ({ kind, range }) => `/v1/nutrition/measurements?kind=${kind}&range=${range}`,
      providesTags: ["Measurements"],
      keepUnusedDataFor: KEEP.reference,
    }),
    getLatestMeasurements: builder.query<MeasurementDTO[], void>({
      query: () => "/v1/nutrition/measurements/latest",
      providesTags: ["Measurements"],
      keepUnusedDataFor: KEEP.reference,
    }),
    saveMeasurement: builder.mutation<MeasurementDTO, { date: string; kind: MeasurementKind; value: number }>({
      query: ({ date, kind, value }) => ({
        url: `/v1/nutrition/measurements/${date}/${kind}`,
        method: "PUT",
        body: { value },
      }),
      invalidatesTags: (_result, error) => (error ? [] : ["Measurements"]),
    }),
    deleteMeasurement: builder.mutation<void, { date: string; kind: MeasurementKind }>({
      query: ({ date, kind }) => ({ url: `/v1/nutrition/measurements/${date}/${kind}`, method: "DELETE" }),
      invalidatesTags: (_result, error) => (error ? [] : ["Measurements"]),
    }),
  }),
});

export const {
  useGetNutritionDayQuery,
  useSaveNutritionDayMutation,
  useGetNutritionSummaryQuery,
  useSearchFoodsQuery,
  useGetMyFoodsQuery,
  useGetRecentFoodsQuery,
  useCreateFoodMutation,
  useDeleteFoodMutation,
  useGetGoalsQuery,
  useSaveGoalsMutation,
  useGetMeasurementsQuery,
  useGetLatestMeasurementsQuery,
  useSaveMeasurementMutation,
  useDeleteMeasurementMutation,
} = nutritionApi;
