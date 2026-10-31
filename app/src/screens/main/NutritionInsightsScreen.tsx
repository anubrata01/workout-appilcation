import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MEALS, useGetGoalsQuery, useGetNutritionSummaryQuery } from "../../api/nutritionApi";
import type { Meal, NutritionSummaryDayDTO, SummaryRange } from "../../api/nutritionApi";
import { BarChart } from "../../components/charts/BarChart";
import type { BarDatum } from "../../components/charts/BarChart";
import { MACRO_COLORS, MacroDonut } from "../../components/nutrition/MacroDonut";
import { ScreenBackground } from "../../components/ScreenBackground";
import { STALE_AFTER } from "../../lib/cachePolicy";
import { summariseNutrition } from "../../lib/nutritionInsights";
import type { Metric } from "../../lib/nutritionInsights";
import { keyFor, parseLocalDate } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { MainStackScreenProps } from "../../navigation/types";

const RANGES: { key: SummaryRange; label: string }[] = [
  { key: "week", label: "7 days" },
  { key: "month", label: "30 days" },
  { key: "quarter", label: "3 months" },
];
const METRICS: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: "calories", label: "Calories", unit: "", color: colors.accent },
  { key: "protein_g", label: "Protein", unit: "g", color: MACRO_COLORS.protein },
  { key: "carbs_g", label: "Carbs", unit: "g", color: MACRO_COLORS.carbs },
  { key: "fat_g", label: "Fat", unit: "g", color: MACRO_COLORS.fat },
];
const MEAL_LABEL: Record<Meal, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snacks" };

function barLabel(day: NutritionSummaryDayDTO, range: SummaryRange): string {
  const d = parseLocalDate(day.date);
  return range === "week" ? d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3) : String(d.getDate());
}

/** What you actually ate over a week, month or quarter: calories and macros
 * per day against your goal, the macro split, and where in the day the
 * calories came from. Averages count only days you logged, so a missed day
 * doesn't drag the number down. */
export function NutritionInsightsScreen({ navigation }: MainStackScreenProps<"NutritionInsights">) {
  const [range, setRange] = useState<SummaryRange>("week");
  const [metric, setMetric] = useState<Metric>("calories");

  const end = keyFor(new Date());
  const { data: days = [] } = useGetNutritionSummaryQuery(
    { range, end },
    { refetchOnMountOrArgChange: STALE_AFTER.analytics }
  );
  const { data: goals } = useGetGoalsQuery();

  const summary = useMemo(() => summariseNutrition(days), [days]);
  const current = METRICS.find((m) => m.key === metric)!;
  const target = goals ? { calories: goals.calories, protein_g: goals.protein_g, carbs_g: goals.carbs_g, fat_g: goals.fat_g }[metric] : null;

  const bars: BarDatum[] = days.map((d) => ({
    label: barLabel(d, range),
    value: d[metric],
    empty: !d.logged,
  }));
  const labelEvery = range === "week" ? 1 : range === "month" ? 5 : 14;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <ChevronLeft size={20} color={colors.chalk} />
          </Pressable>
          <Text style={styles.title}>Insights</Text>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.segmented}>
            {RANGES.map((r) => (
              <Pressable key={r.key} onPress={() => setRange(r.key)} style={[styles.segment, range === r.key && styles.segmentActive]}>
                <Text style={[styles.segmentText, range === r.key && styles.segmentTextActive]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>

          {summary.loggedDays === 0 ? (
            <Text style={styles.empty}>Nothing logged in this period yet. Log a few meals and the trends appear here.</Text>
          ) : (
            <>
              <View style={styles.card}>
                <View style={styles.metricRow}>
                  {METRICS.map((m) => (
                    <Pressable key={m.key} onPress={() => setMetric(m.key)} style={[styles.metricChip, metric === m.key && { backgroundColor: m.color }]}>
                      <Text style={[styles.metricText, metric === m.key && { color: colors.surface }]}>{m.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.big}>
                  {summary.average[metric]}
                  <Text style={styles.bigUnit}> {metric === "calories" ? "kcal" : "g"} avg per logged day</Text>
                </Text>
                <Text style={styles.sub}>
                  {summary.loggedDays} of {days.length} days logged
                  {target ? ` · goal ${target}${metric === "calories" ? " kcal" : " g"}` : ""}
                </Text>
                <BarChart data={bars} color={current.color} target={target} unit={current.unit} labelEvery={labelEvery} height={170} />
              </View>

              <Text style={styles.sectionLabel}>Macro split</Text>
              <View style={styles.card}>
                <MacroDonut
                  calories={summary.average.calories}
                  protein={summary.average.protein_g}
                  carbs={summary.average.carbs_g}
                  fat={summary.average.fat_g}
                />
                <Text style={styles.sub}>Average per logged day, by share of calories.</Text>
              </View>

              <Text style={styles.sectionLabel}>Where the calories came from</Text>
              <View style={styles.card}>
                {MEALS.map((meal) => {
                  const kcal = summary.averageByMeal[meal];
                  const pct = summary.mealShare[meal];
                  return (
                    <View key={meal} style={styles.mealRow}>
                      <View style={styles.mealTop}>
                        <Text style={styles.mealName}>{MEAL_LABEL[meal]}</Text>
                        <Text style={styles.mealValue}>
                          {kcal} kcal · {pct}%
                        </Text>
                      </View>
                      <View style={styles.mealTrack}>
                        <View style={[styles.mealFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Water</Text>
              <View style={styles.card}>
                <Text style={styles.big}>
                  {(summary.averageWaterMl / 1000).toFixed(1)}
                  <Text style={styles.bigUnit}> L avg per logged day</Text>
                </Text>
              </View>
            </>
          )}
        </ScrollView>
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
    paddingTop: spacing.sm,
  },
  title: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: colors.chalk },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  segmented: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radii.sm + 2, padding: 3 },
  segment: { flex: 1, paddingVertical: spacing.xs + 3, alignItems: "center", borderRadius: radii.sm },
  segmentActive: { backgroundColor: colors.track },
  segmentText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.dim },
  segmentTextActive: { color: colors.chalk },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, textAlign: "center", marginTop: spacing.xxl, lineHeight: 19 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  metricRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  metricChip: { backgroundColor: colors.track, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  metricText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  big: { fontFamily: fonts.dataBold, fontSize: 26, color: colors.chalk },
  bigUnit: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  sub: { fontFamily: fonts.body, fontSize: 11.5, color: colors.dim, marginTop: 2, marginBottom: spacing.sm },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: spacing.xl,
  },
  mealRow: { marginBottom: spacing.md },
  mealTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  mealName: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.chalk },
  mealValue: { fontFamily: fonts.dataBold, fontSize: 12, color: colors.muted },
  mealTrack: { height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: "hidden" },
  mealFill: { height: 8, borderRadius: 4, backgroundColor: "#5B6FC9" },
});
