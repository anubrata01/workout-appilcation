import { configureStore } from "@reduxjs/toolkit";

import { analyticsApi } from "../api/analyticsApi";
import { baseApi } from "../api/baseApi";
import { notificationApi } from "../api/notificationApi";
import { workoutApi } from "../api/workoutApi";
import authReducer from "./authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
    [workoutApi.reducerPath]: workoutApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      baseApi.middleware,
      workoutApi.middleware,
      analyticsApi.middleware,
      notificationApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
