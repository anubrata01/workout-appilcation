import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function NutritionSummaryRow({ calories, protein, carbs, fat }: Props) {
  return (
    <View style={styles.row}>
      <Stat value={String(calories)} caption="kcal" accent={colors.accent} />
      <Stat value={`${Math.round(protein)}g`} caption="protein" accent={colors.success} />
      <Stat value={`${Math.round(carbs)}g`} caption="carbs" accent={colors.warning} />
      <Stat value={`${Math.round(fat)}g`} caption="fat" accent="#7C6FE0" />
    </View>
  );
}

function Stat({ value, caption, accent }: { value: string; caption: string; accent: string }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  stat: { flex: 1, alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },
  value: { fontFamily: fonts.dataBold, fontSize: 16, color: colors.chalk },
  caption: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: 1 },
});
