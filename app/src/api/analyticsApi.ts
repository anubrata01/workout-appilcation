import { createApi } from "@reduxjs/toolkit/query/react";
import { REHYDRATE } from "redux-persist";

import { ANALYTICS_API_URL } from "../config";
import { KEEP } from "../lib/cachePolicy";
import { createServiceBaseQuery } from "./createServiceBaseQuery";

export interface VolumeByDay {
  label: string;
  volume: number;
}

export interface ReportDTO {
  volumeByDay: VolumeByDay[];
  caloriesThisWeek: number;
  sessionsThisWeek: number;
}

export interface PersonalRecordDTO {
  name: string;
  weight: number;
  reps: number;
  date: string;
  trend: "up" | "down" | "same";
  lastWeight: number | null;
  lastReps: number | null;
  lastDate: string | null;
}

export interface StreakDTO {
  currentStreak: number;
  longestStreak: number;
  lastLoggedDate: string | null;
}

export interface ExerciseProgressPointDTO {
  date: string;
  weight: number;
  reps: number;
}

export interface RecordEntryDTO {
  value: number;
  weight: number;
  reps: number;
  date: string;
}

export interface ExerciseRecordsDTO {
  name: string;
  sessions: number;
  heaviest: RecordEntryDTO | null;
  best_e1rm: RecordEntryDTO | null;
  best_set_volume: RecordEntryDTO | null;
}

export const analyticsApi = createApi({
  reducerPath: "analyticsApi",
  baseQuery: createServiceBaseQuery(ANALYTICS_API_URL),
  tagTypes: ["Report", "PRs", "Streak", "Progress", "Records"],
  keepUnusedDataFor: KEEP.analytics,
  // Persisted (see store/index.ts) so Reports/PRs paint instantly on a cold
  // start from the last known numbers, then refresh in the background.
  extractRehydrationInfo(action, { reducerPath }): any {
    if (action.type === REHYDRATE) {
      return (action as { payload?: Record<string, unknown> }).payload?.[reducerPath];
    }
  },
  endpoints: (builder) => ({
    getReport: builder.query<ReportDTO, "week" | "month">({
      query: (range) => `/v1/analytics/reports/?range=${range}`,
      providesTags: ["Report"],
    }),
    getPRs: builder.query<PersonalRecordDTO[], void>({
      query: () => "/v1/analytics/prs/",
      providesTags: ["PRs"],
    }),
    getStreak: builder.query<StreakDTO, void>({
      query: () => "/v1/analytics/streak/",
      providesTags: ["Streak"],
    }),
    // Oldest-first weight/rep history for one exercise — how weight and reps
    // have actually moved over time, replacing the old volume-by-day chart.
    getExerciseProgress: builder.query<ExerciseProgressPointDTO[], string>({
      query: (name) => `/v1/analytics/exercises/${encodeURIComponent(name)}/progress/`,
      providesTags: (_result, _error, name) => [{ type: "Progress", id: name }],
    }),
    // Heaviest weight / estimated 1RM / best set volume for the exercise detail screen.
    getExerciseRecords: builder.query<ExerciseRecordsDTO, string>({
      query: (name) => `/v1/analytics/exercises/${encodeURIComponent(name)}/records/`,
      providesTags: (_result, _error, name) => [{ type: "Records", id: name }],
    }),
  }),
});

export const {
  useGetReportQuery,
  useGetPRsQuery,
  useGetStreakQuery,
  useGetExerciseProgressQuery,
  useGetExerciseRecordsQuery,
} = analyticsApi;
