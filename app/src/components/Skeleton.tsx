import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

import { colors, radii } from "../theme/tokens";

interface SkeletonBlockProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

// A single shimmering placeholder block — opacity pulses between two values
// on a loop. Compose several of these into a *Skeleton layout component
// (see ReportsScreenSkeleton) shaped like the real content it stands in for,
// so the screen doesn't jump when data arrives.
export function SkeletonBlock({ width = "100%", height = 16, radius = radii.sm, style }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

export function ReportsScreenSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.statGrid}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} width="47%" height={84} radius={radii.lg} />
        ))}
      </View>
      <SkeletonBlock height={140} radius={radii.lg} style={{ marginBottom: 12 }} />
      <SkeletonBlock height={140} radius={radii.lg} />
    </View>
  );
}

export function PRsScreenSkeleton() {
  return (
    <View>
      {[0, 1, 2, 3, 4].map((i) => (
        <SkeletonBlock key={i} height={64} radius={radii.md} style={{ marginBottom: 10 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.track,
  },
  container: {
    paddingTop: 4,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
});
