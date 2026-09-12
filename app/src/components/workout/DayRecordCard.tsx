import React from "react";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ExerciseDTO, WorkoutDayDTO } from "../../api/workoutApi";
import { dayCalories } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  label: string; // "Today" / "Yesterday"
  day: WorkoutDayDTO | null | undefined;
  isLoading: boolean;
  onPress?: () => void;
}

const MAX_EXERCISES_SHOWN = 3;

function exerciseSummaryLine(ex: ExerciseDTO): string {
  const done = ex.sets.filter((s) => s.done);
  const sets = done.length > 0 ? done : ex.sets;
  if (sets.length === 0) return "no sets";
  if (ex.category === "cardio") {
    const minutes = sets.reduce((sum, s) => sum + s.duration_minutes, 0);
    const km = sets.reduce((sum, s) => sum + s.distance_km, 0);
    return `${minutes}min${km > 0 ? ` · ${km}km` : ""}`;
  }
  const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
  return `${sets.length} × ${sets[sets.length - 1].reps} reps (${totalReps} total)`;
}

// A quiet glance at a recent day's numbers on the idle Session tab, so it
// isn't just a bare "Start Workout" button — "today record" / "last day
// record" per the redesign note. Shows the actual exercises done (with
// reps), not just an aggregate stat grid, and taps through to the full
// read-only log for the rest of the detail.
export function DayRecordCard({ label, day, isLoading, onPress }: Props) {
  const hasData = !isLoading && !!day && day.exercises.length > 0;
  const calories = hasData ? dayCalories(day) : 0;
  const durationLabel =
    hasData && day?.duration_seconds != null ? `${Math.round(day.duration_seconds / 60)}m` : "—";
  const shown = hasData ? day!.exercises.slice(0, MAX_EXERCISES_SHOWN) : [];
  const remaining = hasData ? day!.exercises.length - shown.length : 0;

  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!hasData}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {hasData ? (
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>
              {durationLabel} · {calories} kcal
            </Text>
            <ChevronRight size={14} color={colors.faint} />
          </View>
        ) : null}
      </View>
      {isLoading ? (
        <Text style={styles.empty}>…</Text>
      ) : !hasData ? (
        <Text style={styles.empty}>No workout logged</Text>
      ) : (
        <View>
          {shown.map((ex) => (
            <View key={ex.id} style={styles.exerciseRow}>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {ex.name}
              </Text>
              <Text style={styles.exerciseDetail}>{exerciseSummaryLine(ex)}</Text>
            </View>
          ))}
          {remaining > 0 ? <Text style={styles.moreText}>+{remaining} more</Text> : null}
        </View>
      )}
    </Pressable>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerMeta: { fontFamily: fonts.data, fontSize: 10.5, color: colors.dim },
  empty: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dim,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: 4,
  },
  exerciseName: { flexShrink: 1, fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.chalk },
  exerciseDetail: { fontFamily: fonts.data, fontSize: 11.5, color: colors.muted },
  moreText: { fontFamily: fonts.body, fontSize: 11, color: colors.dim, marginTop: 6 },
});
