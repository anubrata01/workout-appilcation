import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Flame } from "lucide-react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  volume: number;
  calories: number;
  exerciseCount: number;
  fillColor: string;
}

const MAX_VOLUME_REF = 3000; // visual scale reference, same as the prototype's barbell fill

/** The signature "loaded bar" visual — do not simplify this away (UI/UX brief §2). */
export function LoadCard({ volume, calories, exerciseCount, fillColor }: Props) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const targetPct = Math.min(100, (volume / MAX_VOLUME_REF) * 100);

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: targetPct,
      duration: 250,
      useNativeDriver: false, // width isn't supported by the native driver
    }).start();
  }, [targetPct, widthAnim]);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.label}>Today's load</Text>
        <Text style={styles.volume}>{volume.toLocaleString()} kg</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: fillColor,
              width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
            },
          ]}
        />
      </View>
      <View style={styles.stats}>
        <View style={styles.pill}>
          <Flame size={12} color={colors.accentWarm} />
          <Text style={styles.pillText}>{calories} kcal</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"}
          </Text>
        </View>
      </View>
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
    marginBottom: spacing.xl,
  },
  top: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md - 2 },
  label: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  volume: { fontFamily: fonts.dataBold, fontSize: 14, color: colors.chalk },
  track: { height: 10, backgroundColor: colors.track, borderRadius: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  stats: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.track,
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  pillText: { fontFamily: fonts.data, fontSize: 11, color: "#C9C4B4" },
});
