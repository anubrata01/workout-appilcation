import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { colors, fonts } from "../../theme/tokens";

interface Point {
  label: string;
  value: number;
}

interface Props {
  points: Point[];
  color?: string;
  height?: number;
  unit?: string; // appended to the value labels above each dot, e.g. "kg"
}

const WIDTH = 320;
const PADDING_X = 24;
const PADDING_Y = 24;

/** A small, dependency-free SVG line chart — one line, one color, a dot per
 * point, labels above the dots and along the x-axis. Built for exercise
 * weight/rep progression and nutrition calorie/water trends; not meant to
 * be a general charting library, just enough for those two. */
export function LineChart({ points, color = colors.accent, height = 160, unit = "" }: Props) {
  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Not enough data yet</Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = height - PADDING_Y * 2;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? PADDING_X + plotWidth / 2 : PADDING_X + (i / (points.length - 1)) * plotWidth;
    const y = PADDING_Y + plotHeight - ((p.value - minValue) / range) * plotHeight;
    return { x, y, ...p };
  });

  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${WIDTH} ${height}`}>
      <Line
        x1={PADDING_X}
        y1={height - PADDING_Y}
        x2={WIDTH - PADDING_X}
        y2={height - PADDING_Y}
        stroke={colors.border}
        strokeWidth={1}
      />
      <Path d={pathD} stroke={color} strokeWidth={2.5} fill="none" />
      {coords.map((c, i) => (
        <React.Fragment key={i}>
          <Circle cx={c.x} cy={c.y} r={4} fill={color} />
          <SvgText x={c.x} y={c.y - 10} fontSize={10} fill={colors.chalk} textAnchor="middle">
            {c.value}
            {unit}
          </SvgText>
          <SvgText x={c.x} y={height - 6} fontSize={9} fill={colors.muted} textAnchor="middle">
            {c.label}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim },
});
