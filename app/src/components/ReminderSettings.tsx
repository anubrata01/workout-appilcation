import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  useGetReminderPreferenceQuery,
  useRegisterDeviceTokenMutation,
  useUpdateReminderPreferenceMutation,
} from "../api/notificationApi";
import { requestPushToken } from "../lib/pushNotifications";
import { colors, fonts, radii, spacing } from "../theme/tokens";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function timeStringToDate(time: string | null): Date {
  const d = new Date();
  if (time) {
    const [h, m] = time.split(":").map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(18, 0, 0, 0);
  }
  return d;
}

function dateToTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
}

/** App flow doc §2.11 — opt-in only (PRD 8): the permission prompt only ever
 * fires from this toggle, never on app launch. */
export function ReminderSettings() {
  const { data: pref } = useGetReminderPreferenceQuery();
  const [updatePreference, { isLoading: saving }] = useUpdateReminderPreferenceMutation();
  const [registerDeviceToken] = useRegisterDeviceTokenMutation();

  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState(timeStringToDate(null));
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!pref) return;
    setDays(pref.days_of_week);
    setTime(timeStringToDate(pref.time_of_day));
  }, [pref]);

  async function handleToggle(next: boolean) {
    if (next) {
      const token = await requestPushToken();
      if (!token) {
        Alert.alert(
          "Notifications permission needed",
          "Enable notifications for LOADED in your phone's settings to use reminders."
        );
        return;
      }
      await registerDeviceToken({ fcm_token: token });
    }
    save({ enabled: next, days_of_week: days.length ? days : [0, 1, 2, 3, 4], time_of_day: dateToTimeString(time) });
  }

  function toggleDay(day: number) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    setDays(next);
    if (pref?.enabled) save({ enabled: true, days_of_week: next, time_of_day: dateToTimeString(time) });
  }

  function handleTimeChange(_event: unknown, selected?: Date) {
    setShowPicker(Platform.OS === "ios");
    if (!selected) return;
    setTime(selected);
    if (pref?.enabled) save({ enabled: true, days_of_week: days, time_of_day: dateToTimeString(selected) });
  }

  function save(body: { enabled: boolean; days_of_week: number[]; time_of_day: string }) {
    updatePreference({ ...body, timezone: pref?.timezone ?? "Asia/Kolkata" });
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Remind me to log</Text>
        <Switch
          value={pref?.enabled ?? false}
          onValueChange={handleToggle}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.chalk}
        />
      </View>

      {pref?.enabled ? (
        <>
          <View style={styles.dayRow}>
            {DAY_LABELS.map((label, i) => (
              <Pressable
                key={label}
                onPress={() => toggleDay(i)}
                style={[styles.dayChip, days.includes(i) && styles.dayChipActive]}
              >
                <Text style={[styles.dayChipLabel, days.includes(i) && styles.dayChipLabelActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.timeButton} onPress={() => setShowPicker(true)}>
            <Text style={styles.timeButtonLabel}>
              {time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </Text>
          </Pressable>
          {showPicker ? (
            <DateTimePicker value={time} mode="time" is24Hour={false} onChange={handleTimeChange} />
          ) : null}

          {saving ? <Text style={styles.saving}>Saving…</Text> : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md + 2,
    marginTop: spacing.xl,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.chalk },
  dayRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md, flexWrap: "wrap" },
  dayChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayChipLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.dim },
  dayChipLabelActive: { color: colors.track },
  timeButton: {
    marginTop: spacing.md,
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm + 2,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  timeButtonLabel: { fontFamily: fonts.dataBold, fontSize: 14, color: colors.chalk },
  saving: { fontFamily: fonts.body, fontSize: 11, color: colors.dim, marginTop: spacing.xs, textAlign: "center" },
});
