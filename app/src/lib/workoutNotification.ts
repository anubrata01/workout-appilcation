import { Platform } from "react-native";
import notifee, { AndroidImportance, AndroidVisibility } from "@notifee/react-native";

const CHANNEL_ID = "active-workout";
const NOTIFICATION_ID = "active-workout-timer";

let channelReady = false;

async function ensureChannel() {
  if (Platform.OS !== "android" || channelReady) return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "Active workout",
    importance: AndroidImportance.HIGH,
    // PUBLIC so the running time is actually readable on the lock screen,
    // not hidden behind "notification content" the way a PRIVATE channel
    // would show by default.
    visibility: AndroidVisibility.PUBLIC,
  });
  channelReady = true;
}

/**
 * Posts (or re-posts, if one's already showing) a persistent notification
 * with a live-ticking timer — visible on the lock screen, not just the
 * notification shade. The elapsed time is rendered by Android's own
 * Chronometer view off the `timestamp` we give it, natively, so it keeps
 * counting correctly whether or not the app's JS is actually running (killed
 * in the background, phone locked, etc.) — no JS interval needed to keep it
 * in sync the way the in-app timer does.
 *
 * Android only. iOS has no equivalent short of a Live Activity, which needs
 * a WidgetKit extension (native Swift code) this app doesn't have — a
 * regular notification can't live-tick on the iOS lock screen the way it
 * can on Android's.
 */
export async function showWorkoutTimerNotification(startedAtMs: number): Promise<void> {
  if (Platform.OS !== "android") return;
  await ensureChannel();
  const settings = await notifee.requestPermission();
  // AuthorizationStatus.DENIED === 0 -- anything else (AUTHORIZED,
  // PROVISIONAL) is fine to proceed with.
  if (settings.authorizationStatus === 0) return;

  await notifee.displayNotification({
    id: NOTIFICATION_ID,
    title: "Workout in progress",
    body: "Tap to return to GetFit",
    android: {
      channelId: CHANNEL_ID,
      ongoing: true, // not swipe-dismissible — Discard/Finish is the only way to clear it
      autoCancel: false,
      onlyAlertOnce: true, // one sound/vibration when it first appears, not on every re-post
      showTimestamp: true,
      timestamp: startedAtMs,
      showChronometer: true,
      chronometerDirection: "up",
      pressAction: { id: "default" }, // tapping it just opens the app, same as any other notification
    },
  });
}

/** Removes the timer notification — call on Finish or Discard. Safe to call
 * even if nothing is currently showing. */
export async function hideWorkoutTimerNotification(): Promise<void> {
  if (Platform.OS !== "android") return;
  await notifee.cancelNotification(NOTIFICATION_ID);
}
