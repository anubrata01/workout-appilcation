import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useGetExerciseProgressQuery, useGetPRsQuery } from "../../api/analyticsApi";
import { LineChart } from "../charts/LineChart";
import { parseLocalDate } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** How weight/reps are trending for a chosen exercise, embedded directly on
 * the Reports screen — the volume-by-day chart it replaces was a raw
 * kg-lifted total with no sense of whether you're actually getting
 * stronger; this shows that directly. */
export function ExerciseProgressSection() {
  const { data: prs = [] } = useGetPRsQuery();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && prs.length > 0) setSelected(prs[0].name);
  }, [prs, selected]);

  const { data: points = [] } = useGetExerciseProgressQuery(selected ?? "", { skip: !selected });

  if (prs.length === 0) return null;

  const chartPoints = points.map((p) => ({ label: formatShortDate(p.date), value: p.weight }));
  const repsPoints = points.map((p) => ({ label: formatShortDate(p.date), value: p.reps }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Exercise progress</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {prs.map((pr) => (
          <Pressable
            key={pr.name}
            onPress={() => setSelected(pr.name)}
            style={[styles.chip, selected === pr.name && styles.chipActive]}
          >
            <Text style={[styles.chipText, selected === pr.name && styles.chipTextActive]}>{pr.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {points.length >= 2 ? (
        <>
          <Text style={styles.chartLabel}>Weight (kg)</Text>
          <LineChart points={chartPoints} color={colors.accent} unit="kg" height={130} />
          <Text style={styles.chartLabel}>Reps</Text>
          <LineChart points={repsPoints} color={colors.success} height={130} />
        </>
      ) : (
        <Text style={styles.emptyText}>Log this exercise a couple more times to see a trend.</Text>
      )}
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
  title: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, marginBottom: spacing.sm + 2 },
  chipRow: { marginBottom: spacing.md },
  chip: {
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  chipTextActive: { color: colors.surface },
  chartLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: colors.dim, marginBottom: 2, marginTop: spacing.xs },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center", paddingVertical: spacing.lg },
});
