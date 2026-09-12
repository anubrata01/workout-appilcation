import React, { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors } from "../theme/tokens";

interface ScreenBackgroundProps {
  children: ReactNode;
}

// Soft gradient standing in for real background photography/texture — swap
// the <LinearGradient> below for an <ImageBackground> once real art exists;
// every screen already renders through this one component, so that's a
// one-file change later, not a per-screen one.
export function ScreenBackground({ children }: ScreenBackgroundProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.bg, colors.surfaceElevated, colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
});
