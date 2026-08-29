import { createApi } from "@reduxjs/toolkit/query/react";
import { REHYDRATE } from "redux-persist";

import { WORKOUT_API_URL } from "../config";
import { createServiceBaseQuery } from "./createServiceBaseQuery";

// A logged day is immutable once written except through saveDay (which
// already invalidates just that date's tag) — safe to keep it around long
// after the screen that fetched it unmounts, so revisiting a recent date
// reads from cache instead of refetching. Paired with the persisted store
// config (store/index.ts), this also survives an app restart.
const TWO_WEEKS_IN_SECONDS = 60 * 60 * 24 * 14;

export interface SetEntryDTO {
  weight: number;
  reps: number;
  done: boolean;
}

export interface ExerciseDTO {
  id: string;
  name: string;
  sets: SetEntryDTO[];
}

export type TagId = "push" | "pull" | "legs" | "upper" | "lower" | "full";

// A day's tag is either a built-in TagId or a custom tag's name — the backend
// doesn't constrain it to the enum (workouts/models.py WorkoutDay.tag has no
// `choices`), so the type here is deliberately just `string`.
export interface WorkoutDayDTO {
  date: string;
  tag: string | null;
  exercises: ExerciseDTO[];
}

export interface LibraryItemDTO {
  id: string;
  name: string;
  primary_tag: TagId | null;
  muscle_group: string;
  equipment: string;
  image_url: string;
  description: string;
  is_curated: boolean;
}

export interface CustomTagDTO {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface LastSessionDTO {
  date: string;
  sets: SetEntryDTO[];
}

export const workoutApi = createApi({
  reducerPath: "workoutApi",
  baseQuery: createServiceBaseQuery(WORKOUT_API_URL),
  tagTypes: ["Day", "Library", "CustomTag"],
  // Lets rehydrated cache from AsyncStorage (see store/index.ts) populate
  // this slice's query cache on launch, instead of every query starting empty
  // and refetching.
  extractRehydrationInfo(action, { reducerPath }): any {
    if (action.type === REHYDRATE) {
      return (action as { payload?: Record<string, unknown> }).payload?.[reducerPath];
    }
  },
  endpoints: (builder) => ({
    getDay: builder.query<WorkoutDayDTO | null, string>({
      query: (date) => `/v1/workouts/days/${date}/`,
      providesTags: (_result, _error, date) => [{ type: "Day", id: date }],
      keepUnusedDataFor: TWO_WEEKS_IN_SECONDS,
    }),
    saveDay: builder.mutation<WorkoutDayDTO, { date: string; body: { tag: string | null; exercises: unknown[] } }>({
      query: ({ date, body }) => ({ url: `/v1/workouts/days/${date}/`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { date }) => [{ type: "Day", id: date }],
    }),
    searchLibrary: builder.query<LibraryItemDTO[], { search?: string; tag?: TagId }>({
      query: ({ search, tag }) => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (tag) params.set("tag", tag);
        return `/v1/workouts/library/?${params.toString()}`;
      },
      providesTags: ["Library"],
    }),
    addCustomExercise: builder.mutation<LibraryItemDTO, { name: string }>({
      query: (body) => ({ url: "/v1/workouts/library/", method: "POST", body }),
      invalidatesTags: ["Library"],
    }),
    getCustomTags: builder.query<CustomTagDTO[], void>({
      query: () => "/v1/workouts/tags/",
      providesTags: ["CustomTag"],
    }),
    addCustomTag: builder.mutation<CustomTagDTO, { name: string; color: string }>({
      query: (body) => ({ url: "/v1/workouts/tags/", method: "POST", body }),
      invalidatesTags: ["CustomTag"],
    }),
    // The entire set list from the last time each of these exercises was
    // logged — not just the best set (that's PersonalRecord's job, served by
    // Analytics Service). A name with no history comes back null; the picker
    // must never show anything for a name that isn't genuinely linked to a
    // real past log.
    getExerciseLastSessions: builder.query<Record<string, LastSessionDTO | null>, string[]>({
      query: (names) => ({ url: "/v1/workouts/exercises/last-sessions/", method: "POST", body: { names } }),
    }),
  }),
});

export const {
  useGetDayQuery,
  useSaveDayMutation,
  useSearchLibraryQuery,
  useAddCustomExerciseMutation,
  useGetCustomTagsQuery,
  useAddCustomTagMutation,
  useGetExerciseLastSessionsQuery,
} = workoutApi;
