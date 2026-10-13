import { useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * One place for every client-side cache lifetime, so "how often does this hit
 * the network?" has a single answer. The goal is fewer API calls: RTK Query
 * already de-duplicates identical in-flight requests and keeps results in
 * memory; the persisted store (store/index.ts) writes them to the phone so a
 * cold start shows data instantly. These numbers decide how long that cached
 * data is trusted before a background refresh.
 */
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How long an UNUSED cache entry survives in memory/on disk (RTK `keepUnusedDataFor`, seconds). */
export const KEEP = {
  /** A finished day is immutable except through our own save, so keep it a long time. */
  loggedDay: 14 * DAY,
  /** Catalogues (exercises, routines, goals) change rarely. */
  reference: DAY,
  /** Derived analytics and summaries: short, they change after every save. */
  analytics: 5 * MINUTE,
  /** Search results the user may retype within a session. */
  search: 10 * MINUTE,
} as const;

/** How old cached data may be (seconds) before a screen mount/focus refetches it (RTK `refetchOnMountOrArgChange`). */
export const STALE_AFTER = {
  analytics: 45,
  picker: 120,
  home: 30,
} as const;

/** Analytics are computed asynchronously after a save (workout-service -> Redis -> analytics-service). */
export const ANALYTICS_SETTLE_DELAYS_MS = [2500, 9000] as const;

/**
 * Refetch when a tab/screen gains focus, but only if the data is older than
 * `minAgeSeconds`. Tab screens stay mounted when you switch away, so
 * "refetch on every focus" would hit the API on every tab tap; this turns it
 * into "refresh if stale". The clock starts at mount because the query's own
 * initial fetch just happened.
 */
export function useRefetchOnFocus(refetch: () => unknown, minAgeSeconds: number) {
  const lastRef = useRef(Date.now());
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastRef.current >= minAgeSeconds * 1000) {
        lastRef.current = now;
        refetch();
      }
    }, [refetch, minAgeSeconds])
  );
}
