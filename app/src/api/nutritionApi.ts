import { createApi } from "@reduxjs/toolkit/query/react";
import { REHYDRATE } from "redux-persist";

import { NUTRITION_API_URL } from "../config";
import { createServiceBaseQuery } from "./createServiceBaseQuery";

// A logged day is immutable once written except through saveDay — same
// reasoning as workoutApi's getDay: safe to cache long past the screen's
// lifetime and worth persisting across app restarts.
const TWO_WEEKS_IN_SECONDS = 60 * 60 * 24 * 14;

export interface FoodEntryDTO {
  id: string;
  name: string;
  quantity_label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
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
}

export const nutritionApi = createApi({
  reducerPath: "nutritionApi",
  baseQuery: createServiceBaseQuery(NUTRITION_API_URL),
  tagTypes: ["Day", "Summary"],
  extractRehydrationInfo(action, { reducerPath }): any {
    if (action.type === REHYDRATE) {
      return (action as { payload?: Record<string, unknown> }).payload?.[reducerPath];
    }
  },
  endpoints: (builder) => ({
    // No trailing slash — FastAPI's routes here are declared without one
    // (unlike the Django services' urls.py, which do use one), and letting
    // a mismatch redirect (Starlette's default) rather than matching exactly
    // is an extra round-trip worth just not having.
    getNutritionDay: builder.query<NutritionDayDTO | null, string>({
      query: (date) => `/v1/nutrition/days/${date}`,
      providesTags: (_result, _error, date) => [{ type: "Day", id: date }],
      keepUnusedDataFor: TWO_WEEKS_IN_SECONDS,
    }),
    saveNutritionDay: builder.mutation<
      NutritionDayDTO,
      { date: string; body: { water_ml: number; weight_kg: number | null; entries: Omit<FoodEntryDTO, "id">[] } }
    >({
      query: ({ date, body }) => ({ url: `/v1/nutrition/days/${date}`, method: "PUT", body }),
      invalidatesTags: (_result, error, { date }) => (error ? [] : [{ type: "Day", id: date }, "Summary"]),
    }),
    getNutritionSummary: builder.query<NutritionSummaryDayDTO[], "week" | "month">({
      query: (range) => `/v1/nutrition/summary?range=${range}`,
      providesTags: ["Summary"],
    }),
  }),
});

export const { useGetNutritionDayQuery, useSaveNutritionDayMutation, useGetNutritionSummaryQuery } = nutritionApi;
