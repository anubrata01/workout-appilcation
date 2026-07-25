import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  email_verified: boolean;
  created_at: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** "unknown" until the stored tokens have been checked on launch — the root
   * navigator must not decide Welcome-vs-Home until this resolves (app flow
   * doc §2.1 "hard gate"). */
  hydrationStatus: "unknown" | "hydrated";
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrationStatus: "unknown",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    credentialsReceived(
      state,
      action: PayloadAction<{ user: AuthUser; access: string; refresh: string }>
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.access;
      state.refreshToken = action.payload.refresh;
      state.hydrationStatus = "hydrated";
    },
    tokensRefreshed(state, action: PayloadAction<{ access: string; refresh: string }>) {
      state.accessToken = action.payload.access;
      state.refreshToken = action.payload.refresh;
    },
    userUpdated(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    hydratedFromStorage(
      state,
      action: PayloadAction<{ access: string; refresh: string } | null>
    ) {
      if (action.payload) {
        state.accessToken = action.payload.access;
        state.refreshToken = action.payload.refresh;
      }
      state.hydrationStatus = "hydrated";
    },
    loggedOut(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
    },
  },
});

export const { credentialsReceived, tokensRefreshed, userUpdated, hydratedFromStorage, loggedOut } =
  authSlice.actions;
export default authSlice.reducer;
