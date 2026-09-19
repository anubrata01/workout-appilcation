import React, { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGetDayQuery } from "../../api/workoutApi";
import { ScreenBackground } from "../../components/ScreenBackground";
import { dayCalories, dayOffset, formatDateHeader, keyFor } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { MainStackScreenProps } from "../../navigation/types";

/** Read-only browse of past sessions — finished sessions are no longer
 * editable inline (that's what the active Session tab is for); this is
 * purely a viewer, reusing the same getDay endpoint. */
export function HistoryScreen({ navigation, route }: MainStackScreenProps<"History">) {
  // Defaults to one day back ("today" normally belongs to the Session tab),
  // but tapping the Today/Yesterday record card on that tab opens straight
  // to the day that was tapped instead of always landing on yesterday.
  const [cursor, setCursor] = useState(route.params?.initialOffset ?? -1);
  const activeDate = dayOffset(cursor);
  const dateKey = keyFor(activeDate);
  const { day: dayName, date: dateLabel } = formatDateHeader(activeDate);
  const canGoForward = cursor < 0;

  const { data, isLoading } = useGetDayQuery(dateKey);
  const totalSets = (data?.exercises ?? []).reduce((sum, ex) => sum + ex.sets.length, 0);
  const calories = dayCalories(data ?? undefined);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <X size={20} color={colors.muted} />
          </Pressable>
        </View>

        <View style={styles.dateNav}>
          <Pressable style={styles.navBtn} onPress={() => setCursor((c) => c - 1)} hitSlop={8}>
            <ChevronLeft size={18} color={colors.chalk} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.dayName}>{dayName}</Text>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
          </View>
          <Pressable
            style={[styles.navBtn, !canGoForward && styles.navBtnDisabled]}
            onPress={() => canGoForward && setCursor((c) => c + 1)}
            disabled={!canGoForward}
            hitSlop={8}
          >
            <ChevronRight size={18} color={canGoForward ? colors.chalk : colors.faint} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {isLoading ? null : !data || data.exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No workout logged on this date.</Text>
            </View>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <SummaryStat label="Duration" value={data.duration_seconds != null ? `${Math.round(data.duration_seconds / 60)}m` : "0m"} />
                <SummaryStat label="Sets" value={String(totalSets)} />
                <SummaryStat label="Calories" value={String(calories)} />
              </View>
              {data.exercises.map((ex) => (
                <View key={ex.id} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>
                    {ex.name}
                    {ex.category === "cardio" ? <Text style={styles.exerciseTag}>  cardio</Text> : null}
                  </Text>
                  {ex.sets.map((s, i) => (
                    <Text key={i} style={styles.setLine}>
                      Set {i + 1}:{" "}
                      {ex.category === "cardio"
                        ? `${s.duration_minutes}min · ${s.distance_km}km`
                        : `${s.weight}kg × ${s.reps}`}
                    </Text>
                  ))}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  title: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: colors.chalk },
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.4 },
  dayName: { fontFamily: fonts.display, fontSize: 22, color: colors.chalk, letterSpacing: 1 },
  dateLabel: { fontFamily: fonts.data, fontSize: 11, color: colors.muted },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 16,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center" },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryStat: { flex: 1, alignItems: "center" },
  summaryLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginBottom: 4 },
  summaryValue: { fontFamily: fonts.dataBold, fontSize: 15, color: colors.chalk },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg - 2,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
  },
  exerciseName: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.chalk, marginBottom: spacing.xs },
  exerciseTag: { fontFamily: fonts.data, fontSize: 9.5, color: colors.dim, textTransform: "uppercase" },
  setLine: { fontFamily: fonts.data, fontSize: 12, color: colors.muted, marginTop: 2 },
});
