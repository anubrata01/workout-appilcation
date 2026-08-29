import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryApi, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { AUTH_API_URL } from "../config";
import { clearTokens, saveTokens } from "../lib/secureStorage";
import type { RootState } from "../store";
import { loggedOut, tokensRefreshed } from "../store/authSlice";

// The refresh call always goes to Auth Service, regardless of which service
// this base query instance is for — every service verifies the same tokens
// but only Auth Service issues them (schema doc 1).
const refreshBaseQuery = fetchBaseQuery({ baseUrl: AUTH_API_URL });

// Module-level (not per-instance) so every service's base query shares the
// SAME in-flight refresh — refresh tokens are single-use server-side
// (accounts/views.py RefreshView revokes on use), so if a screen fires
// requests to multiple services at once and their access tokens expire
// together, each one hitting /refresh independently would race: only the
// first succeeds, every other call gets "revoked" back and logs the user
// out from under a session that was actually still valid. Funneling all
// concurrent 401s through this one promise means they wait for one refresh
// and share its result instead of racing.
let refreshPromise: Promise<{ access: string; refresh: string } | null> | null = null;

async function refreshTokens(
  api: BaseQueryApi,
  extraOptions: object
): Promise<{ access: string; refresh: string } | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    if (!refreshToken) return null;

    const refreshResult = await refreshBaseQuery(
      { url: "/v1/auth/refresh", method: "POST", body: { refresh: refreshToken } },
      api,
      extraOptions
    );

    if (!refreshResult.data) return null;

    const { access, refresh } = refreshResult.data as { access: string; refresh: string };
    api.dispatch(tokensRefreshed({ access, refresh }));
    await saveTokens(access, refresh);
    return { access, refresh };
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * One of these per service base URL (see api/authApi.ts, api/workoutApi.ts).
 * On a 401, tries the refresh-token dance exactly once before logging out —
 * this is the one place that dance lives, shared across every service so it's
 * not reimplemented (and potentially drifted) per API slice.
 */
export function createServiceBaseQuery(
  baseUrl: string
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      const refreshed = await refreshTokens(api, extraOptions);

      if (refreshed) {
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(loggedOut());
        await clearTokens();
      }
    }

    return result;
  };
}
