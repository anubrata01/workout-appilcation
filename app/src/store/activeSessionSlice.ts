import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { ExerciseCategory, SetEntryDTO, SetType } from "../api/workoutApi";

export interface LocalExercise {
  key: string;
  name: string;
  category: ExerciseCategory;
  isBodyweight: boolean;
  imageUrl?: string;
  /** Free-text note for this exercise in this session. Absent on sessions persisted before notes existed. */
  note?: string;
  sets: SetEntryDTO[];
}

/** What starting from a routine (or adding from the picker) needs to build an exercise card. */
export interface PresetExercise {
  key: string;
  name: string;
  category: ExerciseCategory;
  isBodyweight: boolean;
  imageUrl?: string;
  setCount?: number;
}

interface ActiveSessionState {
  status: "idle" | "active";
  startedAt: number | null; // epoch ms: duration is derived in the UI, never ticked in Redux
  exercises: LocalExercise[];
  routineName: string | null;
}

const initialState: ActiveSessionState = {
  status: "idle",
  startedAt: null,
  exercises: [],
  routineName: null,
};

export const SET_TYPE_ORDER: SetType[] = ["normal", "warmup", "drop", "failure"];

function blankSet(): SetEntryDTO {
  return { weight: 0, reps: 0, duration_minutes: 0, distance_km: 0, rest_seconds: null, done: false, set_type: "normal" };
}

function toLocalExercise(preset: PresetExercise): LocalExercise {
  const count = Math.max(1, Math.min(preset.setCount ?? 1, 10));
  return {
    key: preset.key,
    name: preset.name,
    category: preset.category,
    isBodyweight: preset.isBodyweight,
    imageUrl: preset.imageUrl,
    note: "",
    sets: Array.from({ length: count }, blankSet),
  };
}

const activeSessionSlice = createSlice({
  name: "activeSession",
  initialState,
  reducers: {
    /** Starts an empty session, or one pre-filled from a routine. */
    sessionStarted(state, action: PayloadAction<{ exercises: PresetExercise[]; routineName?: string } | undefined>) {
      state.status = "active";
      state.startedAt = Date.now();
      state.exercises = (action.payload?.exercises ?? []).map(toLocalExercise);
      state.routineName = action.payload?.routineName ?? null;
    },
    sessionCleared() {
      return initialState;
    },
    exerciseAdded(state, action: PayloadAction<PresetExercise>) {
      state.exercises.push(toLocalExercise({ ...action.payload, setCount: action.payload.setCount ?? 1 }));
    },
    exerciseRemoved(state, action: PayloadAction<{ key: string }>) {
      state.exercises = state.exercises.filter((e) => e.key !== action.payload.key);
    },
    exerciseNoteChanged(state, action: PayloadAction<{ key: string; note: string }>) {
      const exercise = state.exercises.find((e) => e.key === action.payload.key);
      if (exercise) exercise.note = action.payload.note;
    },
    setAdded(state, action: PayloadAction<{ key: string }>) {
      const exercise = state.exercises.find((e) => e.key === action.payload.key);
      if (!exercise) return;
      const last = exercise.sets[exercise.sets.length - 1];
      exercise.sets.push({ ...blankSet(), weight: last?.weight ?? 0, reps: last?.reps ?? 0 });
    },
    setRemoved(state, action: PayloadAction<{ key: string; index: number }>) {
      const exercise = state.exercises.find((e) => e.key === action.payload.key);
      // Never remove the only set: an exercise with zero sets can't be edited.
      if (!exercise || exercise.sets.length <= 1) return;
      exercise.sets.splice(action.payload.index, 1);
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
    /** Tapping a set's type chip cycles normal -> warm-up -> drop -> failure -> normal. */
    setTypeCycled(state, action: PayloadAction<{ key: string; index: number }>) {
      const exercise = state.exercises.find((e) => e.key === action.payload.key);
      const set = exercise?.sets[action.payload.index];
      if (!set) return;
      const current = SET_TYPE_ORDER.indexOf(set.set_type ?? "normal");
      set.set_type = SET_TYPE_ORDER[(current + 1) % SET_TYPE_ORDER.length];
    },
  },
});

export const {
  sessionStarted,
  sessionCleared,
  exerciseAdded,
  exerciseRemoved,
  exerciseNoteChanged,
  setAdded,
  setRemoved,
  setUpdated,
  setDoneToggled,
  setTypeCycled,
} = activeSessionSlice.actions;
export default activeSessionSlice.reducer;
