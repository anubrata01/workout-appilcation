import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GoalDTO } from "../../api/nutritionApi";
import { progressTowards } from "../../lib/nutritionMath";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { MACRO_COLORS } from "./MacroDonut";

interface Props {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goals: GoalDTO | null | undefined;
  onSetGoals: () => void;
}

/** Today's intake against your targets: a calorie bar plus one bar per macro.
 * Without goals it still shows the totals and nudges you to set some. */
export function DaySummaryCard({ calories, protein, carbs, fat, goals, onSetGoals }: Props) {
  const calFraction = progressTowards(calories, goals?.calories);
  const over = calFraction > 1;
  const remaining = goals ? goals.calories - calories : null;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.calories}>
            {calories}
            {goals ? <Text style={styles.goal}> / {goals.calories}</Text> : null}
            <Text style={styles.kcal}> kcal</Text>
          </Text>
          {remaining !== null ? (
            <Text style={[styles.remaining, over && { color: colors.error }]}>
              {over ? `${Math.abs(remaining)} over` : `${remaining} left`}
            </Text>
          ) : null}
        </View>
        {!goals ? (
          <Pressable onPress={onSetGoals} hitSlop={8} style={styles.setGoals}>
            <Text style={styles.setGoalsText}>Set goals</Text>
          </Pressable>
        ) : null}
      </View>

      {goals ? (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${Math.min(100, calFraction * 100)}%`, backgroundColor: over ? colors.error : colors.accent },
            ]}
          />
        </View>
      ) : null}

      <View style={styles.macroRow}>
        <MacroBar label="Protein" value={protein} target={goals?.protein_g} color={MACRO_COLORS.protein} />
        <MacroBar label="Carbs" value={carbs} target={goals?.carbs_g} color={MACRO_COLORS.carbs} />
        <MacroBar label="Fat" value={fat} target={goals?.fat_g} color={MACRO_COLORS.fat} />
      </View>
    </View>
  );
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target?: number; color: string }) {
  const fraction = Math.min(1, progressTowards(value, target));
  return (
    <View style={styles.macro}>
      <Text style={styles.macroValue}>
        {Math.round(value)}
        {target ? <Text style={styles.macroTarget}>/{Math.round(target)}</Text> : null}g
      </Text>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${fraction * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroLabel}>{label}</Text>
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
    marginBottom: spacing.lg,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  calories: { fontFamily: fonts.dataBold, fontSize: 26, color: colors.chalk },
  goal: { fontFamily: fonts.data, fontSize: 15, color: colors.muted },
  kcal: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  remaining: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.success, marginTop: 2 },
  setGoals: { backgroundColor: colors.track, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  setGoalsText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.accentWarm },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.track, marginTop: spacing.md, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  macroRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.lg },
  macro: { flex: 1 },
  macroValue: { fontFamily: fonts.dataBold, fontSize: 13, color: colors.chalk },
  macroTarget: { fontFamily: fonts.data, fontSize: 11, color: colors.dim },
  macroTrack: { height: 5, borderRadius: 3, backgroundColor: colors.track, marginVertical: 4, overflow: "hidden" },
  macroFill: { height: 5, borderRadius: 3 },
  macroLabel: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted },
});
