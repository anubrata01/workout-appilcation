import { createApi } from "@reduxjs/toolkit/query/react";

import { ANALYTICS_API_URL } from "../config";
import { createServiceBaseQuery } from "./createServiceBaseQuery";

export interface VolumeByDay {
  label: string;
  volume: number;
}

export interface TagSplitEntry {
  tag: string;
  value: number;
}

export interface ReportDTO {
  volumeByDay: VolumeByDay[];
  caloriesThisWeek: number;
  sessionsThisWeek: number;
  tagSplit: TagSplitEntry[];
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

export const analyticsApi = createApi({
  reducerPath: "analyticsApi",
  baseQuery: createServiceBaseQuery(ANALYTICS_API_URL),
  tagTypes: ["Report", "PRs", "Streak"],
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
  }),
});

export const { useGetReportQuery, useGetPRsQuery, useGetStreakQuery } = analyticsApi;
