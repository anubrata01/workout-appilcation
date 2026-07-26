import { createApi } from "@reduxjs/toolkit/query/react";

import { NOTIFICATION_API_URL } from "../config";
import { createServiceBaseQuery } from "./createServiceBaseQuery";

export interface ReminderPreferenceDTO {
  enabled: boolean;
  days_of_week: number[]; // 0=Mon .. 6=Sun, matches backend schema doc 4
  time_of_day: string | null; // "HH:MM:SS"
  timezone: string;
}

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: createServiceBaseQuery(NOTIFICATION_API_URL),
  tagTypes: ["ReminderPreference"],
  endpoints: (builder) => ({
    getReminderPreference: builder.query<ReminderPreferenceDTO, void>({
      query: () => "/v1/notifications/preferences/",
      providesTags: ["ReminderPreference"],
    }),
    updateReminderPreference: builder.mutation<ReminderPreferenceDTO, ReminderPreferenceDTO>({
      query: (body) => ({ url: "/v1/notifications/preferences/", method: "PUT", body }),
      invalidatesTags: ["ReminderPreference"],
    }),
    registerDeviceToken: builder.mutation<void, { fcm_token: string }>({
      query: (body) => ({ url: "/v1/notifications/device-token/", method: "POST", body }),
    }),
    unregisterDeviceToken: builder.mutation<void, { fcm_token: string }>({
      query: (body) => ({ url: "/v1/notifications/device-token/", method: "DELETE", body }),
    }),
  }),
});

export const {
  useGetReminderPreferenceQuery,
  useUpdateReminderPreferenceMutation,
  useRegisterDeviceTokenMutation,
  useUnregisterDeviceTokenMutation,
} = notificationApi;
