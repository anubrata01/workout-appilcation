import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistReducer, persistStore } from "redux-persist";

import { analyticsApi } from "../api/analyticsApi";
import { baseApi } from "../api/baseApi";
import { notificationApi } from "../api/notificationApi";
import { workoutApi } from "../api/workoutApi";
import authReducer from "./authSlice";

// Only `queries` is persisted — `subscriptions`/`config` are runtime-only
// bookkeeping RTK Query rebuilds itself; persisting them would just replay a
// stale idea of "who was subscribed" from the last time the app was open.
const persistedWorkoutApiReducer = persistReducer(
  { key: "workoutApi", storage: AsyncStorage, whitelist: ["queries"] },
  workoutApi.reducer
);

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
    [workoutApi.reducerPath]: persistedWorkoutApiReducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // redux-persist's own actions carry non-serializable values by design
      // (see their docs) — this is the documented way to quiet that check
      // rather than a sign something's actually wrong.
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware, workoutApi.middleware, analyticsApi.middleware, notificationApi.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
