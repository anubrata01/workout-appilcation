import React, { ReactNode, useEffect, useRef } from "react";
import { Animated } from "react-native";
import { useIsFocused } from "@react-navigation/native";

// A guaranteed-to-render fade, independent of react-navigation's own
// `animation` screenOption — that option is present in the installed
// bottom-tabs version but wasn't visibly transitioning, so this drives the
// same effect directly with Animated instead of depending on library
// internals we can't verify at runtime from here.
export function FadeInOnFocus({ children }: { children: ReactNode }) {
  const isFocused = useIsFocused();
  const opacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  // Screens stay mounted when you switch tabs away and back (see
  // ReportsScreen's own focus-effect comment) — only the very first focus
  // should fade in from blank. Re-blanking on every return visit is what
  // made a tab look like it "goes blank" each time you came back to it.
  const hasPlayedRef = useRef(isFocused);

  useEffect(() => {
    if (!isFocused || hasPlayedRef.current) return;
    hasPlayedRef.current = true;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isFocused, opacity]);

  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
}
