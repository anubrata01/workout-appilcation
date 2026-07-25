import { createApi } from "@reduxjs/toolkit/query/react";

import { AUTH_API_URL } from "../config";
import { createServiceBaseQuery } from "./createServiceBaseQuery";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: createServiceBaseQuery(AUTH_API_URL),
  tagTypes: ["Me"],
  endpoints: () => ({}),
});
