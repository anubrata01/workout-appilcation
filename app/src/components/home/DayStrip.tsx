import React, { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { dayOffset } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  /** 0 is today, -1 yesterday, and so on. */
  selectedOffset: number;
  onSelect: (offset: number) => void;
  days?: number;
}

/** A scrollable strip of recent days, today at the right edge. Picking one
 * re-points the Home cards at that date, so "swipe through past days"
 * needs no extra screen. */
export function DayStrip({ selectedOffset, onSelect, days = 14 }: Props) {
  const ref = useRef<ScrollView>(null);
  const offsets = Array.from({ length: days }, (_, i) => -(days - 1 - i)); // oldest ... today

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}
      contentContainerStyle={styles.row}
    >
      {offsets.map((offset) => {
        const date = dayOffset(offset);
        const selected = offset === selectedOffset;
        return (
          <Pressable key={offset} onPress={() => onSelect(offset)} style={[styles.pill, selected && styles.pillActive]}>
            <Text style={[styles.weekday, selected && styles.textActive]}>
              {date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3)}
            </Text>
            <Text style={[styles.dayNum, selected && styles.textActive]}>{date.getDate()}</Text>
            {offset === 0 ? <View style={[styles.todayDot, selected && { backgroundColor: colors.surface }]} /> : <View style={styles.todaySpacer} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  pill: {
    width: 48,
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.chalk, borderColor: colors.chalk },
  weekday: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: colors.dim },
  dayNum: { fontFamily: fonts.dataBold, fontSize: 16, color: colors.chalk, marginTop: 2 },
  textActive: { color: colors.surface },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 4 },
  todaySpacer: { width: 4, height: 4, marginTop: 4 },
});
