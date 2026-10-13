import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface PreferencesState {
  /** Rest-timer length in seconds. 0 means "count up like a stopwatch" (the original behaviour). */
  restSeconds: number;
  /** Vibrate when a countdown rest ends. */
  vibrateOnRestEnd: boolean;
}

export const REST_PRESETS = [0, 30, 60, 90, 120, 180] as const;

const initialState: PreferencesState = {
  restSeconds: 90,
  vibrateOnRestEnd: true,
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    restSecondsChanged(state, action: PayloadAction<number>) {
      state.restSeconds = Math.max(0, Math.min(Math.round(action.payload), 900));
    },
    vibrateOnRestEndChanged(state, action: PayloadAction<boolean>) {
      state.vibrateOnRestEnd = action.payload;
    },
  },
});

export const { restSecondsChanged, vibrateOnRestEndChanged } = preferencesSlice.actions;
export default preferencesSlice.reducer;
