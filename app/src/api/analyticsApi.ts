import { createApi } from "@reduxjs/toolkit/query/react";

import { ANALYTICS_API_URL } from "../config";
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

export const analyticsApi = createApi({
  reducerPath: "analyticsApi",
  baseQuery: createServiceBaseQuery(ANALYTICS_API_URL),
  tagTypes: ["Report", "PRs", "Streak", "Progress"],
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
  }),
});

export const { useGetReportQuery, useGetPRsQuery, useGetStreakQuery, useGetExerciseProgressQuery } = analyticsApi;
