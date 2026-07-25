import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";

import { colors, fonts, spacing } from "../../theme/tokens";
import type { VolumeByDay } from "../../api/analyticsApi";

const CHART_HEIGHT = 140;
const BAR_SLOT = 34;
const BAR_WIDTH = 16;

/**
 * Hand-rolled with react-native-svg (already a dependency for icons) instead of
 * pulling in a charting library — this is simple enough not to need one, and it
 * avoids another native-module version to keep in sync with the Expo SDK.
 */
export function VolumeBarChart({ data }: { data: VolumeByDay[] }) {
  const max = Math.max(1, ...data.map((d) => d.volume));
  const width = data.length * BAR_SLOT;
  // Highlight the best day so the chart answers "which day was strongest" at a
  // glance, not just "how much total" — only meaningful once something's logged.
  const peakIndex = max > 0 ? data.findIndex((d) => d.volume === max) : -1;

  const chart = (
    <Svg width={width} height={CHART_HEIGHT}>
      <Line x1={0} y1={CHART_HEIGHT} x2={width} y2={CHART_HEIGHT} stroke={colors.border} strokeWidth={1} />
      {data.map((d, i) => {
        const barHeight = (d.volume / max) * (CHART_HEIGHT - 8);
        const x = i * BAR_SLOT + (BAR_SLOT - BAR_WIDTH) / 2;
        return (
          <Rect
            key={i}
            x={x}
            y={CHART_HEIGHT - barHeight}
            width={BAR_WIDTH}
            height={Math.max(barHeight, 1)}
            rx={4}
            fill={i === peakIndex ? colors.accentWarm : colors.accent}
            opacity={peakIndex === -1 || i === peakIndex ? 1 : 0.55}
          />
        );
      })}
    </Svg>
  );

  return (
    <View>
      {data.length > 10 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {chart}
        </ScrollView>
      ) : (
        chart
      )}
      <View style={[styles.labelRow, { width: data.length > 10 ? undefined : width }]}>
        {data.length <= 10
          ? data.map((d, i) => (
              <Text key={i} style={styles.label}>
                {d.label}
              </Text>
            ))
          : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  label: { width: BAR_SLOT, textAlign: "center", fontFamily: fonts.data, fontSize: 10, color: colors.dim },
});
