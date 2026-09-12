import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Dumbbell } from "lucide-react-native";

import { colors, fonts, spacing } from "../theme/tokens";

interface LogoProps {
  size?: "md" | "lg";
}

// Placeholder brand mark — an accent-filled circle + wordmark, same shape the
// old "LOADED" brand had. Swap this component's internals for a real logo
// image/animation once one exists; every other screen just renders <Logo />.
export function Logo({ size = "md" }: LogoProps) {
  const markSize = size === "lg" ? 72 : 56;
  const iconSize = size === "lg" ? 30 : 22;
  const textSize = size === "lg" ? 54 : 42;

  return (
    <View style={styles.container}>
      <View style={[styles.mark, { width: markSize, height: markSize, borderRadius: markSize / 2.8 }]}>
        <Dumbbell size={iconSize} color={colors.surface} strokeWidth={2.5} />
      </View>
      <Text style={[styles.text, { fontSize: textSize }]}>GetFit</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  mark: {
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  text: {
    fontFamily: fonts.display,
    letterSpacing: 2,
    color: colors.chalk,
  },
});
