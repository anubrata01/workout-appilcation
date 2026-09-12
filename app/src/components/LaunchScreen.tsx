import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

import { Logo } from "./Logo";
import { ScreenBackground } from "./ScreenBackground";

// Shown during every cold-launch gate (fonts loading, persisted-cache
// rehydration, auth-token hydration) instead of a flat blank View — a simple
// fade + scale-in of the logo, so the app never shows nothing while it loads.
export function LaunchScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
    ]).start();
  }, [opacity, scale]);

  return (
    <ScreenBackground>
      <Animated.View style={[styles.center, { opacity, transform: [{ scale }] }]}>
        <Logo size="lg" />
      </Animated.View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
