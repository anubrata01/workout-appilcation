import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Droplet, Utensils } from "lucide-react-native";

import { useGetNutritionSummaryQuery } from "../../api/nutritionApi";
import { LineChart } from "../charts/LineChart";
import { parseLocalDate } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  range: "week" | "month";
}

function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** What's actually been eaten and drunk over the range — calories per day
 * and total water — sitting alongside the workout stats above it. */
export function NutritionReportCard({ range }: Props) {
  const { data = [], isLoading } = useGetNutritionSummaryQuery(range);

  if (isLoading || data.length === 0) return null;

  const totalCalories = data.reduce((sum, d) => sum + d.calories, 0);
  const totalWaterMl = data.reduce((sum, d) => sum + d.water_ml, 0);
  const loggedDays = data.filter((d) => d.calories > 0).length;
  const avgCalories = loggedDays > 0 ? Math.round(totalCalories / loggedDays) : 0;

  const chartPoints = data.map((d) => ({ label: formatShortDate(d.date), value: d.calories }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Nutrition</Text>

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Utensils size={16} color={colors.accentWarm} />
          <Text style={styles.statValue}>{avgCalories}</Text>
          <Text style={styles.statCaption}>avg kcal/day</Text>
        </View>
        <View style={styles.stat}>
          <Droplet size={16} color="#3B9FD9" />
          <Text style={styles.statValue}>{(totalWaterMl / 1000).toFixed(1)}L</Text>
          <Text style={styles.statCaption}>total water</Text>
        </View>
      </View>

      <Text style={styles.chartLabel}>Calories per day</Text>
      <LineChart points={chartPoints} color={colors.accentWarm} height={130} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md + 2,
  },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, marginBottom: spacing.md },
  statRow: { flexDirection: "row", gap: spacing.xl, marginBottom: spacing.md },
  stat: { alignItems: "center", gap: 2 },
  statValue: { fontFamily: fonts.dataBold, fontSize: 16, color: colors.chalk },
  statCaption: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
  chartLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: colors.dim, marginBottom: 2 },
});
