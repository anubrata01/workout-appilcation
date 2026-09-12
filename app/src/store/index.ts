import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistReducer, persistStore } from "redux-persist";

import { analyticsApi } from "../api/analyticsApi";
import { baseApi } from "../api/baseApi";
import { notificationApi } from "../api/notificationApi";
import { nutritionApi } from "../api/nutritionApi";
import { workoutApi } from "../api/workoutApi";
import activeSessionReducer from "./activeSessionSlice";
import authReducer from "./authSlice";

// Only `queries` is persisted — `subscriptions`/`config` are runtime-only
// bookkeeping RTK Query rebuilds itself; persisting them would just replay a
// stale idea of "who was subscribed" from the last time the app was open.
const persistedWorkoutApiReducer = persistReducer(
  { key: "workoutApi", storage: AsyncStorage, whitelist: ["queries"] },
  workoutApi.reducer
);
const persistedNutritionApiReducer = persistReducer(
  { key: "nutritionApi", storage: AsyncStorage, whitelist: ["queries"] },
  nutritionApi.reducer
);
// The whole slice, not just a whitelist — status/startedAt/exercises all
// need to survive the app being killed mid-session, or the timer (and
// everything logged so far) is just gone. startedAt is a plain timestamp,
// not a ticking value, so rehydrating it and recomputing elapsed time from
// Date.now() on the next launch just works with no extra logic needed.
const persistedActiveSessionReducer = persistReducer(
  { key: "activeSession", storage: AsyncStorage },
  activeSessionReducer
);

export const store = configureStore({
  reducer: {
    auth: authReducer,
    activeSession: persistedActiveSessionReducer,
    [baseApi.reducerPath]: baseApi.reducer,
    [workoutApi.reducerPath]: persistedWorkoutApiReducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
    [nutritionApi.reducerPath]: persistedNutritionApiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // redux-persist's own actions carry non-serializable values by design
      // (see their docs) — this is the documented way to quiet that check
      // rather than a sign something's actually wrong.
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(
      baseApi.middleware,
      workoutApi.middleware,
      analyticsApi.middleware,
      notificationApi.middleware,
      nutritionApi.middleware
    ),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
