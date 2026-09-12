import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colorForExerciseName } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { TrendBadge } from "./TrendBadge";
import type { PersonalRecordDTO } from "../../api/analyticsApi";

/** Same card layout as the prototype's PRsTab (app flow doc §2.10) — tap
 * through to see the exercise's full weight/rep history over time. */
export function PRCard({ pr, onPress }: { pr: PersonalRecordDTO; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: colorForExerciseName(pr.name) }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{pr.name}</Text>
        <Text style={styles.date}>{pr.date}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.value}>
          {pr.weight}kg × {pr.reps}
        </Text>
        <TrendBadge trend={pr.trend} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg - 2,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md + 2,
    marginBottom: spacing.sm + 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  name: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.chalk },
  date: { fontFamily: fonts.data, fontSize: 10.5, color: colors.dim, marginTop: 1 },
  value: { fontFamily: fonts.dataBold, fontSize: 13, color: colors.chalk },
});
