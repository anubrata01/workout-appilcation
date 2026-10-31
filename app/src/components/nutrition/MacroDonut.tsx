import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { macroPercentages } from "../../lib/nutritionMath";
import { colors, fonts, spacing } from "../../theme/tokens";

export const MACRO_COLORS = { protein: "#7C6FE0", carbs: "#E08A3C", fat: "#E5B93A" } as const;

interface Props {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
}

/** Calories in the middle, ringed by the protein/carbs/fat split of that
 * energy. Percentages are by calories (4/4/9 kcal per gram), the same way
 * most food trackers present them. */
export function MacroDonut({ calories, protein, carbs, fat, size = 92 }: Props) {
  const pct = macroPercentages(protein, carbs, fat);
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { color: MACRO_COLORS.protein, share: pct.protein },
    { color: MACRO_COLORS.carbs, share: pct.carbs },
    { color: MACRO_COLORS.fat, share: pct.fat },
  ];
  let offset = 0;

  return (
    <View style={styles.row}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.track} strokeWidth={stroke} fill="none" />
          {segments.map((seg) => {
            const length = (seg.share / 100) * circumference;
            const circle = (
              <Circle
                key={seg.color}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                rotation={-90}
                origin={`${size / 2}, ${size / 2}`}
              />
            );
            offset += length;
            return seg.share > 0 ? circle : null;
          })}
        </Svg>
        <View style={styles.center}>
          <Text style={styles.calories}>{calories}</Text>
          <Text style={styles.kcal}>kcal</Text>
        </View>
      </View>

      <View style={styles.legend}>
        <Legend color={MACRO_COLORS.protein} label="Protein" percent={pct.protein} grams={protein} />
        <Legend color={MACRO_COLORS.carbs} label="Carbs" percent={pct.carbs} grams={carbs} />
        <Legend color={MACRO_COLORS.fat} label="Fat" percent={pct.fat} grams={fat} />
      </View>
    </View>
  );
}

function Legend({ color, label, percent, grams }: { color: string; label: string; percent: number; grams: number }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>
        {Math.round(grams * 10) / 10} g · {percent}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xl },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  calories: { fontFamily: fonts.dataBold, fontSize: 18, color: colors.chalk },
  kcal: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: -2 },
  legend: { flex: 1, gap: spacing.sm },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, width: 52 },
  legendValue: { fontFamily: fonts.dataBold, fontSize: 12, color: colors.chalk },
});
