import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { chartPalette, colors, fonts, spacing } from "../../theme/tokens";
import type { TagSplitEntry } from "../../api/analyticsApi";

const SIZE = 110;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Same cycling-by-index approach as the prototype's ReportsTab pieColors.
const PALETTE = chartPalette;

export function TagSplitDonut({ data }: { data: TagSplitEntry[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulative = 0;

  return (
    <View style={styles.row}>
      <Svg width={SIZE} height={SIZE}>
        <G rotation={-90} originX={SIZE / 2} originY={SIZE / 2}>
          {total === 0 ? (
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.border} strokeWidth={STROKE} fill="none" />
          ) : (
            data.map((d, i) => {
              const fraction = d.value / total;
              const segment = fraction * CIRCUMFERENCE;
              const offset = -cumulative;
              cumulative += segment;
              return (
                <Circle
                  key={d.tag}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={STROKE}
                  strokeDasharray={`${segment} ${CIRCUMFERENCE - segment}`}
                  strokeDashoffset={offset}
                  fill="none"
                />
              );
            })
          )}
        </G>
      </Svg>

      <View style={styles.legend}>
        {data.length === 0 ? (
          <Text style={styles.emptyText}>No tagged sessions yet.</Text>
        ) : (
          data.map((d, i) => (
            <View key={d.tag} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: PALETTE[i % PALETTE.length] }]} />
              <Text style={styles.legendText}>
                {d.tag} · {d.value}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  legend: { flex: 1, gap: spacing.xs + 2 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.body, fontSize: 11.5, color: "#C9C4B4" },
  emptyText: { fontFamily: fonts.body, fontSize: 12, color: colors.dim },
});
