import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

import { colors, fonts } from "../../theme/tokens";

export interface BarDatum {
  label: string;
  value: number;
  /** Bars with no data (nothing logged that day) render as a faint stub instead of a misleading zero-height bar. */
  empty?: boolean;
}

interface Props {
  data: BarDatum[];
  color?: string;
  height?: number;
  /** Draws a dashed horizontal line, e.g. the daily calorie goal. */
  target?: number | null;
  unit?: string;
  /** Show a label under every Nth bar so a 30 or 90 day range stays readable. */
  labelEvery?: number;
}

const WIDTH = 320;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 18;
const PAD_BOTTOM = 22;

/** The largest value on the y axis, rounded up to a tidy number so gridlines land on round figures. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Dependency-free SVG bar chart: one bar per day, an optional dashed target
 * line, labels thinned out for long ranges. Used for calories vs goal and
 * macro intake on the Insights screen. */
export function BarChart({ data, color = colors.accent, height = 160, target, unit = "", labelEvery = 1 }: Props) {
  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Not enough data yet</Text>
      </View>
    );
  }

  const max = niceMax(Math.max(...data.map((d) => d.value), target ?? 0));
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const slot = plotWidth / data.length;
  const barWidth = Math.max(2, Math.min(24, slot * 0.62));
  const baseline = height - PAD_BOTTOM;
  const yFor = (v: number) => baseline - (v / max) * plotHeight;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${WIDTH} ${height}`}>
      <Line x1={PAD_LEFT} y1={baseline} x2={WIDTH - PAD_RIGHT} y2={baseline} stroke={colors.border} strokeWidth={1} />
      <SvgText x={PAD_LEFT} y={PAD_TOP - 6} fontSize={9} fill={colors.dim}>
        {max}
        {unit}
      </SvgText>
      {data.map((d, i) => {
        const x = PAD_LEFT + slot * i + (slot - barWidth) / 2;
        const barHeight = d.empty ? 2 : Math.max(2, (d.value / max) * plotHeight);
        return (
          <React.Fragment key={`${d.label}-${i}`}>
            <Rect
              x={x}
              y={baseline - barHeight}
              width={barWidth}
              height={barHeight}
              rx={Math.min(3, barWidth / 2)}
              fill={d.empty ? colors.track : color}
            />
            {i % labelEvery === 0 ? (
              <SvgText x={x + barWidth / 2} y={height - 7} fontSize={8.5} fill={colors.muted} textAnchor="middle">
                {d.label}
              </SvgText>
            ) : null}
          </React.Fragment>
        );
      })}
      {target ? (
        <>
          <Line
            x1={PAD_LEFT}
            y1={yFor(target)}
            x2={WIDTH - PAD_RIGHT}
            y2={yFor(target)}
            stroke={colors.success}
            strokeWidth={1.2}
            strokeDasharray="4 3"
          />
          <SvgText x={WIDTH - PAD_RIGHT} y={yFor(target) - 3} fontSize={8.5} fill={colors.success} textAnchor="end">
            goal {target}
            {unit}
          </SvgText>
        </>
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim },
});
