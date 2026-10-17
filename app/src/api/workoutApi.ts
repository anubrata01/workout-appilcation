import { createApi } from "@reduxjs/toolkit/query/react";
import { REHYDRATE } from "redux-persist";

import { WORKOUT_API_URL } from "../config";
import { KEEP } from "../lib/cachePolicy";
import { createServiceBaseQuery } from "./createServiceBaseQuery";

export type SetType = "normal" | "warmup" | "drop" | "failure";

export interface SetEntryDTO {
  weight: number;
  reps: number;
  // Cardio-only: a strength set leaves these at 0, unused; a cardio set
  // leaves weight/reps at 0, unused instead. Exercise.category says which
  // pair actually applies (see ExerciseCard's category-based rendering).
  duration_minutes: number;
  distance_km: number;
  // Rest taken AFTER this set, before the next, set via the rest timer,
  // not typed in directly.
  rest_seconds: number | null;
  done: boolean;
  // Absent on cached days saved before set types existed; treat as "normal".
  set_type?: SetType;
}

export interface ExerciseDTO {
  id: string;
  name: string;
  category: ExerciseCategory;
  note?: string;
  sets: SetEntryDTO[];
}

export interface WorkoutDayDTO {
  date: string;
  duration_seconds: number | null;
  started_at: string | null;
  finished_at: string | null;
  exercises: ExerciseDTO[];
}

export type ExerciseCategory = "strength" | "cardio";

export interface LibraryItemDTO {
  id: string;
  name: string;
  category: ExerciseCategory;
  is_bodyweight: boolean;
  muscle_group: string;
  equipment: string;
  image_url: string;
  /** Only present on the detail endpoint; the list omits it to stay light. */
  description?: string;
  is_curated: boolean;
}

export interface LastSessionDTO {
  date: string;
  sets: SetEntryDTO[];
}

export interface RoutineItemDTO {
  name: string;
  order?: number;
  category: ExerciseCategory;
  is_bodyweight: boolean;
  default_sets: number;
  /** Joined in by the server from the exercise library, for thumbnails; ignored on write. */
  image_url?: string;
}

export interface RoutineDTO {
  id: string;
  name: string;
  items: RoutineItemDTO[];
  created_at: string;
  updated_at: string;
}

export interface RoutineInput {
  name: string;
  items: RoutineItemDTO[];
}

export interface MuscleGroupStat {
  muscle_group: string;
  sets: number;
  volume: number;
}

export interface MuscleDistributionDTO {
  range: string;
  total_sets: number;
  groups: MuscleGroupStat[];
}

export type MuscleRange = "week" | "month" | "quarter";

export interface LibrarySearchArgs {
  search?: string;
  category?: ExerciseCategory;
  muscle_group?: string;
  limit?: number;
  /** The exercises this user logged most recently, newest first. */
  recent?: boolean;
}

export const workoutApi = createApi({
  reducerPath: "workoutApi",
  baseQuery: createServiceBaseQuery(WORKOUT_API_URL),
  tagTypes: ["Day", "Library", "LastSession", "Routine", "Muscle", "RecentExercises"],
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
      keepUnusedDataFor: KEEP.loggedDay,
    }),
    saveDay: builder.mutation<
      WorkoutDayDTO,
      {
        date: string;
        body: {
          duration_seconds: number | null;
          started_at: string | null;
          finished_at: string | null;
          exercises: unknown[];
        };
      }
    >({
      query: ({ date, body }) => ({ url: `/v1/workouts/days/${date}/`, method: "PUT", body }),
      // Also invalidates every cached "last session" lookup (so the Add
      // Exercise picker reflects what you just finished) and the muscle map.
      invalidatesTags: (_result, error, { date }) =>
        error ? [] : [{ type: "Day", id: date }, "LastSession", "Muscle", "RecentExercises"],
    }),
    searchLibrary: builder.query<LibraryItemDTO[], LibrarySearchArgs>({
      query: ({ search, category, muscle_group, limit, recent }) => {
        const params = new URLSearchParams();
        if (recent) params.set("recent", "1");
        if (search) params.set("search", search);
        if (category) params.set("category", category);
        if (muscle_group) params.set("muscle_group", muscle_group);
        if (limit) params.set("limit", String(limit));
        return `/v1/workouts/library/?${params.toString()}`;
      },
      // The "recent" variant depends on what you've logged, so it is refreshed by
      // saveDay; the rest of the catalogue only changes when a custom exercise is added.
      providesTags: (_result, _error, arg) => (arg.recent ? ["RecentExercises"] : ["Library"]),
      keepUnusedDataFor: KEEP.reference,
    }),
    addCustomExercise: builder.mutation<LibraryItemDTO, { name: string }>({
      query: (body) => ({ url: "/v1/workouts/library/", method: "POST", body }),
      invalidatesTags: ["Library"],
    }),
    // One exercise's full entry (description / how-to), fetched only when its
    // detail screen opens, so the ~800-row list never carries instructions.
    getExerciseDetail: builder.query<LibraryItemDTO | null, string>({
      query: (name) => `/v1/workouts/library/detail/?name=${encodeURIComponent(name)}`,
      providesTags: ["Library"],
      keepUnusedDataFor: KEEP.reference,
    }),
    // The entire set list from the last time each of these exercises was
    // logged, not just the best set (that's PersonalRecord's job, served by
    // Analytics Service). A name with no history comes back null; the picker
    // must never show anything for a name that isn't genuinely linked to a
    // real past log.
    getExerciseLastSessions: builder.query<Record<string, LastSessionDTO | null>, string[]>({
      query: (names) => ({ url: "/v1/workouts/exercises/last-sessions/", method: "POST", body: { names } }),
      providesTags: ["LastSession"],
    }),
    // Every past session of one exercise with its full set list, newest first
    // (the "what I did before" list under the note on the workout screen).
    // Shares the LastSession tag so finishing a workout refreshes it too.
    getExerciseHistory: builder.query<LastSessionDTO[], string>({
      query: (name) => `/v1/workouts/exercises/history/?name=${encodeURIComponent(name)}&limit=10`,
      providesTags: ["LastSession"],
    }),
    getRoutines: builder.query<RoutineDTO[], void>({
      query: () => "/v1/workouts/templates/",
      providesTags: ["Routine"],
      keepUnusedDataFor: KEEP.reference,
    }),
    createRoutine: builder.mutation<RoutineDTO, RoutineInput>({
      query: (body) => ({ url: "/v1/workouts/templates/", method: "POST", body }),
      invalidatesTags: (_result, error) => (error ? [] : ["Routine"]),
    }),
    updateRoutine: builder.mutation<RoutineDTO, { id: string } & RoutineInput>({
      query: ({ id, ...body }) => ({ url: `/v1/workouts/templates/${id}/`, method: "PUT", body }),
      invalidatesTags: (_result, error) => (error ? [] : ["Routine"]),
    }),
    deleteRoutine: builder.mutation<void, string>({
      query: (id) => ({ url: `/v1/workouts/templates/${id}/`, method: "DELETE" }),
      invalidatesTags: (_result, error) => (error ? [] : ["Routine"]),
    }),
    getMuscleDistribution: builder.query<MuscleDistributionDTO, MuscleRange>({
      query: (range) => `/v1/workouts/muscle-distribution/?range=${range}`,
      providesTags: ["Muscle"],
      keepUnusedDataFor: KEEP.analytics,
    }),
  }),
});

export const {
  useGetDayQuery,
  useSaveDayMutation,
  useSearchLibraryQuery,
  useAddCustomExerciseMutation,
  useGetExerciseDetailQuery,
  useGetExerciseLastSessionsQuery,
  useGetExerciseHistoryQuery,
  useGetRoutinesQuery,
  useCreateRoutineMutation,
  useUpdateRoutineMutation,
  useDeleteRoutineMutation,
  useGetMuscleDistributionQuery,
} = workoutApi;
