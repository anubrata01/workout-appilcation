import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { WorkoutDayDTO } from "../../api/workoutApi";
import { dayCalories } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  label: string; // "Today" / "Yesterday"
  day: WorkoutDayDTO | null | undefined;
  isLoading: boolean;
}

// A quiet glance at a recent day's numbers on the idle Session tab, so it
// isn't just a bare "Start Workout" button — "today record" / "last day
// record" per the redesign note.
export function DayRecordCard({ label, day, isLoading }: Props) {
  const hasData = !isLoading && !!day && day.exercises.length > 0;
  const calories = hasData ? dayCalories(day) : 0;
  const durationLabel =
    hasData && day?.duration_seconds != null ? `${Math.round(day.duration_seconds / 60)}m` : "—";

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {isLoading ? (
        <Text style={styles.empty}>…</Text>
      ) : !hasData ? (
        <Text style={styles.empty}>No workout logged</Text>
      ) : (
        <View style={styles.statRow}>
          <Stat value={durationLabel} caption="duration" />
          <Stat value={String(day!.exercises.length)} caption="exercises" />
          <Stat value={String(calories)} caption="kcal" />
        </View>
      )}
    </View>
  );
}

function Stat({ value, caption }: { value: string; caption: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statCaption}>{caption}</Text>
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
    padding: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dim,
  },
  statRow: { flexDirection: "row", gap: spacing.sm },
  stat: { flex: 1 },
  statValue: { fontFamily: fonts.dataBold, fontSize: 15, color: colors.chalk },
  statCaption: { fontFamily: fonts.body, fontSize: 9.5, color: colors.muted, marginTop: 1 },
});
