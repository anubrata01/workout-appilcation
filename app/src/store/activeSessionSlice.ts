import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { ExerciseCategory, SetEntryDTO } from "../api/workoutApi";

export interface LocalExercise {
  key: string;
  name: string;
  category: ExerciseCategory;
  isBodyweight: boolean;
  sets: SetEntryDTO[];
}

interface ActiveSessionState {
  status: "idle" | "active";
  startedAt: number | null; // epoch ms — duration is derived in the UI, never ticked in Redux
  exercises: LocalExercise[];
}

const initialState: ActiveSessionState = {
  status: "idle",
  startedAt: null,
  exercises: [],
};

function blankSet(): SetEntryDTO {
  return { weight: 0, reps: 0, duration_minutes: 0, distance_km: 0, rest_seconds: null, done: false };
}

const activeSessionSlice = createSlice({
  name: "activeSession",
  initialState,
  reducers: {
    sessionStarted(state) {
      state.status = "active";
      state.startedAt = Date.now();
      state.exercises = [];
    },
    sessionCleared() {
      return initialState;
    },
    exerciseAdded(
      state,
      action: PayloadAction<{ key: string; name: string; category: ExerciseCategory; isBodyweight: boolean }>
    ) {
      state.exercises.push({
        key: action.payload.key,
        name: action.payload.name,
        category: action.payload.category,
        isBodyweight: action.payload.isBodyweight,
        sets: [blankSet()],
      });
    },
    exerciseRemoved(state, action: PayloadAction<{ key: string }>) {
      state.exercises = state.exercises.filter((e) => e.key !== action.payload.key);
    },
    setAdded(state, action: PayloadAction<{ key: string }>) {
      const exercise = state.exercises.find((e) => e.key === action.payload.key);
      if (!exercise) return;
      const last = exercise.sets[exercise.sets.length - 1];
      exercise.sets.push({ ...blankSet(), weight: last?.weight ?? 0, reps: last?.reps ?? 0 });
    },
    setUpdated(
      state,
      action: PayloadAction<{
        key: string;
        index: number;
        field: "weight" | "reps" | "duration_minutes" | "distance_km" | "rest_seconds";
        value: number;
      }>
    ) {
      const exercise = state.exercises.find((e) => e.key === action.payload.key);
      if (!exercise) return;
      const set = exercise.sets[action.payload.index];
      if (!set) return;
      set[action.payload.field] = action.payload.value;
    },
    setDoneToggled(state, action: PayloadAction<{ key: string; index: number }>) {
      const exercise = state.exercises.find((e) => e.key === action.payload.key);
      if (!exercise) return;
      const set = exercise.sets[action.payload.index];
      if (!set) return;
      set.done = !set.done;
    },
  },
});

export const {
  sessionStarted,
  sessionCleared,
  exerciseAdded,
  exerciseRemoved,
  setAdded,
  setUpdated,
  setDoneToggled,
} = activeSessionSlice.actions;
export default activeSessionSlice.reducer;
