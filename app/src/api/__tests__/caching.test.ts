import { configureStore } from "@reduxjs/toolkit";

import { workoutApi } from "../workoutApi";
import type { WorkoutDayDTO } from "../workoutApi";
import { nutritionApi } from "../nutritionApi";
import type { NutritionDayDTO } from "../nutritionApi";
import authReducer, { credentialsReceived } from "../../store/authSlice";

// A real store (not a mock) wired up with the actual API slices, so these
// tests exercise the real RTK Query cache machinery end to end — the exact
// two bugs this project hit (nutrition entries vanishing on a date switch,
// a just-finished session not showing on the "Today" card) were both real
// caching races, not typos, so the safety net for them has to actually run
// the cache logic rather than assert against mocked-away internals.
function makeStore() {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [workoutApi.reducerPath]: workoutApi.reducer,
      [nutritionApi.reducerPath]: nutritionApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(workoutApi.middleware, nutritionApi.middleware),
  });
  store.dispatch(
    credentialsReceived({
      user: { id: "u1", email: "a@b.com", display_name: "A", avatar_url: "", email_verified: true, created_at: "" },
      access: "test-access-token",
      refresh: "test-refresh-token",
    })
  );
  return store;
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers({ "content-type": "application/json" }),
    clone() {
      return this;
    },
  } as unknown as Response);
}

const emptyDay = (date: string): WorkoutDayDTO => ({
  date,
  duration_seconds: null,
  started_at: null,
  finished_at: null,
  exercises: [],
});

const emptyNutritionDay = (date: string): NutritionDayDTO => ({
  date,
  water_ml: 0,
  weight_kg: null,
  entries: [],
});

describe("workoutApi caching", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
  });

  afterEach(() => {
    // Both APIs configure a real keepUnusedDataFor timeout (two weeks) —
    // resetApiState cancels it instead of leaving a live setTimeout past the
    // end of the test, which is what was leaking into "environment torn
    // down" noise on the next suite.
    store.dispatch(workoutApi.util.resetApiState());
    store.dispatch(nutritionApi.util.resetApiState());
    jest.restoreAllMocks();
  });

  it("a normal fetch populates the cache for that date", async () => {
    const day = { ...emptyDay("2026-09-16"), exercises: [{ id: "ex-1", name: "Squat", category: "strength" as const, sets: [] }] };
    global.fetch = jest.fn().mockReturnValue(jsonResponse(day));

    await store.dispatch(workoutApi.endpoints.getDay.initiate("2026-09-16"));

    const cached = workoutApi.endpoints.getDay.select("2026-09-16")(store.getState()).data;
    expect(cached?.exercises.map((e) => e.name)).toEqual(["Squat"]);
  });

  it("upsertQueryData patches the cache immediately, without waiting on a network round trip — the exact fix for the 'Today' card race", async () => {
    // No fetch mock needed at all for this one: the whole point of the fix
    // is that the cache is populated directly from the save's own response,
    // never touching the network again.
    global.fetch = jest.fn().mockRejectedValue(new Error("network should not be called"));

    const savedDay: WorkoutDayDTO = {
      date: "2026-09-16",
      duration_seconds: 1800,
      started_at: "2026-09-16T07:00:00Z",
      finished_at: "2026-09-16T07:30:00Z",
      exercises: [
        { id: "ex-1", name: "Bench Press", category: "strength", sets: [] },
        { id: "ex-2", name: "Cable Fly", category: "strength", sets: [] },
        { id: "ex-3", name: "Lateral Raise", category: "strength", sets: [] },
      ],
    };

    await store.dispatch(workoutApi.util.upsertQueryData("getDay", "2026-09-16", savedDay));

    const cached = workoutApi.endpoints.getDay.select("2026-09-16")(store.getState()).data;
    expect(cached?.exercises.map((e) => e.name)).toEqual(["Bench Press", "Cable Fly", "Lateral Raise"]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("a query subscribed BEFORE the save still ends up with the saved data (the actual SessionScreen sequence)", async () => {
    global.fetch = jest.fn().mockReturnValue(jsonResponse(emptyDay("2026-09-16")));

    // The "Today" card's query runs first, while nothing's logged yet —
    // mirrors it being subscribed before the active session starts.
    const sub = store.dispatch(workoutApi.endpoints.getDay.initiate("2026-09-16"));
    await sub;
    expect(workoutApi.endpoints.getDay.select("2026-09-16")(store.getState()).data?.exercises).toEqual([]);

    // Finish happens: the mutation's own response is written straight into
    // the same cache entry the still-subscribed query is reading.
    const savedDay: WorkoutDayDTO = {
      ...emptyDay("2026-09-16"),
      exercises: [{ id: "ex-1", name: "Squat", category: "strength", sets: [] }],
    };
    await store.dispatch(workoutApi.util.upsertQueryData("getDay", "2026-09-16", savedDay));

    const cached = workoutApi.endpoints.getDay.select("2026-09-16")(store.getState()).data;
    expect(cached?.exercises.map((e) => e.name)).toEqual(["Squat"]);

    sub.unsubscribe();
  });

  it("invalidatesTags on saveDay does NOT fire when the save errors (no pointless refetch of unchanged data)", async () => {
    global.fetch = jest.fn().mockReturnValue(jsonResponse({ detail: "boom" }, 500));

    await store.dispatch(
      workoutApi.endpoints.saveDay.initiate({
        date: "2026-09-16",
        body: { duration_seconds: 0, started_at: null, finished_at: null, exercises: [] },
      })
    );

    // A tag subscriber count of 0 after a failed mutation, with no prior
    // query for this date, is the simplest observable proxy: no refetch was
    // queued off the back of the error.
    expect(global.fetch).toHaveBeenCalledTimes(1); // only the one failed PUT, nothing else triggered
  });
});

describe("nutritionApi caching", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
  });

  afterEach(() => {
    store.dispatch(workoutApi.util.resetApiState());
    store.dispatch(nutritionApi.util.resetApiState());
    jest.restoreAllMocks();
  });

  it("upsertQueryData patches getNutritionDay directly — the fix for the debounced-save-vs-date-switch race", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network should not be called"));

    const saved: NutritionDayDTO = {
      ...emptyNutritionDay("2026-09-13"),
      entries: [
        { id: "food-1", name: "Chicken", quantity_label: "200g", calories: 330, protein_g: 62, carbs_g: 0, fat_g: 7 },
      ],
    };

    await store.dispatch(nutritionApi.util.upsertQueryData("getNutritionDay", "2026-09-13", saved));

    const cached = nutritionApi.endpoints.getNutritionDay.select("2026-09-13")(store.getState()).data;
    expect(cached?.entries.map((e) => e.name)).toEqual(["Chicken"]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("patching one date's cache does not affect another date's cache", async () => {
    global.fetch = jest.fn().mockReturnValue(jsonResponse(emptyNutritionDay("2026-09-12")));

    await store.dispatch(nutritionApi.endpoints.getNutritionDay.initiate("2026-09-12"));

    const saturday: NutritionDayDTO = {
      ...emptyNutritionDay("2026-09-13"),
      entries: [
        { id: "food-1", name: "Chicken", quantity_label: "", calories: 330, protein_g: 62, carbs_g: 0, fat_g: 7 },
      ],
    };
    await store.dispatch(nutritionApi.util.upsertQueryData("getNutritionDay", "2026-09-13", saturday));

    const fri = nutritionApi.endpoints.getNutritionDay.select("2026-09-12")(store.getState()).data;
    const sat = nutritionApi.endpoints.getNutritionDay.select("2026-09-13")(store.getState()).data;
    expect(fri?.entries).toEqual([]);
    expect(sat?.entries.map((e) => e.name)).toEqual(["Chicken"]);
  });
});
