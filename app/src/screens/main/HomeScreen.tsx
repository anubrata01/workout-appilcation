import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, Circle, Flame, Plus, Scale } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGetPRsQuery, useGetReportQuery, useGetStreakQuery } from "../../api/analyticsApi";
import {
  useGetGoalsQuery,
  useGetLatestMeasurementsQuery,
  useGetNutritionDayQuery,
  useSaveMeasurementMutation,
} from "../../api/nutritionApi";
import { useGetDayQuery } from "../../api/workoutApi";
import { ConsistencyStrip } from "../../components/analytics/ConsistencyStrip";
import { DayStrip } from "../../components/home/DayStrip";
import { LogSheet } from "../../components/home/LogSheet";
import type { LogChoice } from "../../components/home/LogSheet";
import { DaySummaryCard } from "../../components/nutrition/DaySummaryCard";
import { PromptModal } from "../../components/PromptModal";
import { ScreenBackground } from "../../components/ScreenBackground";
import { DayRecordCard } from "../../components/workout/DayRecordCard";
import { STALE_AFTER, useRefetchOnFocus } from "../../lib/cachePolicy";
import { setupChecklist } from "../../lib/homeChecklist";
import { sumEntries } from "../../lib/nutritionMath";
import { dayOffset, formatDateHeader, keyFor } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { MainTabScreenProps } from "../../navigation/types";

/** The landing tab: pick a day, see what you ate and trained against your
 * goals, your streak and weight, and log anything from one "+ Log" menu.
 * It composes queries other screens already use, so most of it is served
 * from cache; nothing here needs a dedicated backend call. */
export function HomeScreen({ navigation }: MainTabScreenProps<"Home">) {
  const [offset, setOffset] = useState(0);
  const [logOpen, setLogOpen] = useState(false);
  const [weighing, setWeighing] = useState(false);

  const date = dayOffset(offset);
  const dateKey = keyFor(date);
  const { day: dayName, date: dateLabel } = formatDateHeader(date);
  const isToday = offset === 0;
  const fresh = { refetchOnMountOrArgChange: STALE_AFTER.home };

  const nutritionDay = useGetNutritionDayQuery(dateKey);
  const workoutDay = useGetDayQuery(dateKey);
  const goals = useGetGoalsQuery(undefined, fresh);
  const streak = useGetStreakQuery(undefined, fresh);
  const report = useGetReportQuery("week", fresh);
  const prs = useGetPRsQuery(undefined, fresh);
  const latest = useGetLatestMeasurementsQuery(undefined, fresh);
  const [saveMeasurement] = useSaveMeasurementMutation();

  // Today's own data changes as you log; the rest is derived server-side.
  useRefetchOnFocus(() => {
    streak.refetch();
    report.refetch();
  }, STALE_AFTER.home);

  const totals = useMemo(() => sumEntries(nutritionDay.data?.entries ?? []), [nutritionDay.data]);
  const weight = latest.data?.find((m) => m.kind === "weight");
  const checklist = setupChecklist({
    hasGoals: !!goals.data,
    hasWorkout: (prs.data?.length ?? 0) > 0,
    hasWeight: !!weight,
    ready: goals.isSuccess && prs.isSuccess && latest.isSuccess,
  });

  function handleChoose(choice: LogChoice) {
    setLogOpen(false);
    if (choice === "workout") navigation.navigate("Session");
    else if (choice === "meal") navigation.navigate("Nutrition");
    else if (choice === "weight") setWeighing(true);
    else navigation.navigate("Measurements");
  }

  async function saveWeight(text: string) {
    setWeighing(false);
    const value = parseFloat(text);
    if (!Number.isFinite(value) || value <= 0) return;
    try {
      await saveMeasurement({ date: keyFor(new Date()), kind: "weight", value }).unwrap();
    } catch (e: any) {
      Alert.alert("Couldn't save weight", String(e?.data?.detail ?? "Check the number and try again."));
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{isToday ? "Today" : dayName}</Text>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
          </View>
          <Pressable style={styles.logBtn} onPress={() => setLogOpen(true)}>
            <Plus size={16} color={colors.surface} />
            <Text style={styles.logBtnText}>Log</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.stripWrap}>
            <DayStrip selectedOffset={offset} onSelect={setOffset} />
          </View>

          <View style={styles.pad}>
            {checklist.show ? (
              <View style={styles.checklist}>
                <Text style={styles.checklistTitle}>
                  Get started · {checklist.done} of {checklist.items.length}
                </Text>
                {checklist.items.map((item) => (
                  <Pressable
                    key={item.key}
                    style={styles.checkRow}
                    onPress={() =>
                      item.key === "goals"
                        ? navigation.navigate("Goals")
                        : item.key === "workout"
                          ? navigation.navigate("Session")
                          : setWeighing(true)
                    }
                  >
                    {item.done ? <Check size={16} color={colors.success} /> : <Circle size={16} color={colors.faint} />}
                    <Text style={[styles.checkText, item.done && styles.checkTextDone]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Nutrition</Text>
            <Pressable onPress={() => navigation.navigate("Nutrition")}>
              <DaySummaryCard
                calories={totals.calories}
                protein={totals.protein}
                carbs={totals.carbs}
                fat={totals.fat}
                goals={goals.data}
                onSetGoals={() => navigation.navigate("Goals")}
              />
            </Pressable>

            <Text style={styles.sectionLabel}>Workout</Text>
            <DayRecordCard
              label={isToday ? "Today" : dayName}
              day={workoutDay.data}
              isLoading={workoutDay.isLoading}
              onPress={() => navigation.navigate("History", { initialOffset: offset })}
            />

            <View style={styles.statRow}>
              <Pressable style={styles.statCard} onPress={() => navigation.navigate("Measurements", { kind: "weight" })}>
                <Scale size={16} color="#7C6FE0" />
                <Text style={styles.statValue}>{weight ? `${Math.round(weight.value * 10) / 10} kg` : "Log"}</Text>
                <Text style={styles.statCaption}>Weight</Text>
              </Pressable>
              <View style={styles.statCard}>
                <Flame size={16} color={colors.accentWarm} />
                <Text style={styles.statValue}>{streak.data?.currentStreak ?? 0} days</Text>
                <Text style={styles.statCaption}>Streak</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>This week</Text>
            <ConsistencyStrip data={report.data?.volumeByDay ?? []} />
          </View>
        </ScrollView>

        <LogSheet visible={logOpen} onChoose={handleChoose} onClose={() => setLogOpen(false)} />
        <PromptModal
          visible={weighing}
          title="Log weight"
          message="Today's weigh-in, in kg."
          placeholder="e.g. 72.4"
          keyboardType="decimal-pad"
          confirmLabel="Save"
          initialValue={weight && weight.date === keyFor(new Date()) ? String(weight.value) : ""}
          onSubmit={saveWeight}
          onCancel={() => setWeighing(false)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 1, color: colors.chalk },
  dateLabel: { fontFamily: fonts.data, fontSize: 11, color: colors.muted },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 1,
  },
  logBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.surface },
  content: { paddingBottom: spacing.xxl * 2 },
  stripWrap: { marginVertical: spacing.sm },
  pad: { paddingHorizontal: spacing.lg },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  checklist: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentWarm,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  checklistTitle: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.chalk, marginBottom: spacing.sm },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  checkText: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.chalk },
  checkTextDone: { color: colors.dim, textDecorationLine: "line-through" },
  statRow: { flexDirection: "row", gap: spacing.sm + 2, marginTop: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 4,
  },
  statValue: { fontFamily: fonts.dataBold, fontSize: 18, color: colors.chalk },
  statCaption: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
});
