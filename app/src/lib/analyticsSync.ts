import { analyticsApi } from "../api/analyticsApi";
import { ANALYTICS_SETTLE_DELAYS_MS } from "./cachePolicy";

interface Dispatcher {
  (action: ReturnType<typeof analyticsApi.util.invalidateTags>): unknown;
}

/**
 * Analytics (PRs, reports, streak, per-exercise progress) are recomputed
 * server-side a moment AFTER a workout save lands, so a fetch made right
 * after Finish can still return the old numbers. The app used to cope by
 * polling three endpoints every 4 seconds while Reports was open. Instead,
 * invalidate the analytics cache twice shortly after a save: any screen
 * showing analytics refetches once, anything not on screen simply refetches
 * the next time it opens. That is 2 requests per active query per workout
 * instead of one every 4 seconds.
 */
export function scheduleAnalyticsRefresh(dispatch: Dispatcher) {
  for (const delay of ANALYTICS_SETTLE_DELAYS_MS) {
    setTimeout(() => {
      dispatch(analyticsApi.util.invalidateTags(["Report", "PRs", "Streak", "Progress", "Records"]));
    }, delay);
  }
}
