import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { SetEntryDTO } from "../api/workoutApi";

export interface LocalExercise {
  key: string;
  name: string;
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
    exerciseAdded(state, action: PayloadAction<{ key: string; name: string; isBodyweight: boolean }>) {
      state.exercises.push({
        key: action.payload.key,
        name: action.payload.name,
        isBodyweight: action.payload.isBodyweight,
        sets: [{ weight: 0, reps: 0, done: false }],
      });
    },
    exerciseRemoved(state, action: PayloadAction<{ key: string }>) {
      state.exercises = state.exercises.filter((e) => e.key !== action.payload.key);
    },
    setAdded(state, action: PayloadAction<{ key: string }>) {
      const exercise = state.exercises.find((e) => e.key === action.payload.key);
      if (!exercise) return;
      const last = exercise.sets[exercise.sets.length - 1];
      exercise.sets.push({ weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: false });
    },
    setUpdated(
      state,
      action: PayloadAction<{ key: string; index: number; field: "weight" | "reps"; value: number }>
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
