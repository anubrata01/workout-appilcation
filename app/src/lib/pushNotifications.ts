import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

/**
 * Requests permission and returns the raw FCM device token — not an Expo
 * push token. The backend sends via firebase-admin directly (TRD 1.3), so it
 * needs the native token, not Expo's push service intermediary.
 *
 * Only call this from an explicit opt-in action (enabling reminders in
 * Settings) — permission prompts must never fire unprompted (PRD 8).
 */
export async function requestPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null; // emulators without Google Play Services can't get a real FCM token
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { data } = await Notifications.getDevicePushTokenAsync();
  return data;
}
