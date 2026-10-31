import { analyticsApi } from "../../api/analyticsApi";
import { scheduleAnalyticsRefresh } from "../analyticsSync";
import { ANALYTICS_SETTLE_DELAYS_MS, KEEP, STALE_AFTER } from "../cachePolicy";
import type { SetType } from "../../api/workoutApi";
import { dayCalories, dayVolume, estimateCalories, estimateOneRepMax, isCountedSet } from "../workoutHelpers";

function set(overrides: Partial<{ weight: number; reps: number; done: boolean; set_type: SetType; duration_minutes: number }> = {}) {
  return { weight: 0, reps: 0, duration_minutes: 0, distance_km: 0, rest_seconds: null, done: false, ...overrides };
}

describe("isCountedSet", () => {
  it("counts done working sets of every non-warm-up type", () => {
    for (const set_type of ["normal", "drop", "failure", undefined]) {
      expect(isCountedSet({ done: true, set_type })).toBe(true);
    }
  });

  it("never counts a warm-up or an unfinished set", () => {
    expect(isCountedSet({ done: true, set_type: "warmup" })).toBe(false);
    expect(isCountedSet({ done: false, set_type: "normal" })).toBe(false);
    expect(isCountedSet({ done: false })).toBe(false);
  });
});

describe("warm-ups in volume and calories", () => {
  const day = {
    exercises: [
      {
        category: "strength" as const,
        sets: [
          set({ weight: 40, reps: 10, done: true, set_type: "warmup" }),
          set({ weight: 60, reps: 8, done: true }),
          set({ weight: 60, reps: 8, done: true, set_type: "drop" }),
          set({ weight: 60, reps: 8, done: false }),
        ],
      },
    ],
  };

  it("volume ignores warm-ups and unfinished sets, matching the server", () => {
    expect(dayVolume(day)).toBe(60 * 8 * 2);
  });

  it("calories follow the same volume", () => {
    expect(dayCalories(day)).toBe(estimateCalories(960));
  });

  it("a day of only warm-ups is zero volume and zero calories (no +90 baseline)", () => {
    const warmOnly = { exercises: [{ category: "strength" as const, sets: [set({ weight: 40, reps: 10, done: true, set_type: "warmup" })] }] };
    expect(dayVolume(warmOnly)).toBe(0);
    expect(dayCalories(warmOnly)).toBe(0);
  });
});

describe("estimateOneRepMax (Epley)", () => {
  it("weight x (1 + reps/30), rounded to a tenth", () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
    expect(estimateOneRepMax(80, 12)).toBe(112);
  });

  it("a single rep is the weight itself, and nonsense is 0", () => {
    expect(estimateOneRepMax(140, 1)).toBe(140);
    expect(estimateOneRepMax(0, 10)).toBe(0);
    expect(estimateOneRepMax(60, 0)).toBe(0);
    expect(estimateOneRepMax(-5, 5)).toBe(0);
  });

  it("agrees with the number the backend records endpoint computes", () => {
    // services/analytics-service ExerciseRecordsView: round(weight * (1 + reps / 30), 1)
    expect(estimateOneRepMax(100, 5)).toBe(Math.round(100 * (1 + 5 / 30) * 10) / 10);
  });
});

describe("cache policy", () => {
  it("keeps finished days far longer than derived analytics", () => {
    expect(KEEP.loggedDay).toBeGreaterThan(KEEP.reference);
    expect(KEEP.reference).toBeGreaterThan(KEEP.analytics);
    expect(KEEP.search).toBeGreaterThan(KEEP.analytics);
  });

  it("staleness windows are sane, positive seconds", () => {
    for (const value of Object.values(STALE_AFTER)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(KEEP.analytics);
    }
  });

  it("the post-save settle delays are increasing and short", () => {
    const delays = [...ANALYTICS_SETTLE_DELAYS_MS];
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(Math.max(...delays)).toBeLessThanOrEqual(15000);
  });
});

describe("scheduleAnalyticsRefresh", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("invalidates analytics twice, after each settle delay, and not before", () => {
    const dispatch = jest.fn();
    scheduleAnalyticsRefresh(dispatch);
    expect(dispatch).not.toHaveBeenCalled(); // never synchronously: the server hasn't recomputed yet

    jest.advanceTimersByTime(ANALYTICS_SETTLE_DELAYS_MS[0]);
    expect(dispatch).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(ANALYTICS_SETTLE_DELAYS_MS[1] - ANALYTICS_SETTLE_DELAYS_MS[0]);
    expect(dispatch).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(60_000);
    expect(dispatch).toHaveBeenCalledTimes(2); // and then it stops: no polling
  });

  it("invalidates every analytics tag the Progress and exercise screens read", () => {
    const dispatch = jest.fn();
    scheduleAnalyticsRefresh(dispatch);
    jest.advanceTimersByTime(ANALYTICS_SETTLE_DELAYS_MS[0]);
    const action = dispatch.mock.calls[0][0];
    expect(action).toEqual(analyticsApi.util.invalidateTags(["Report", "PRs", "Streak", "Progress", "Records"]));
  });
});
