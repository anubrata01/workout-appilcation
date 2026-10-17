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
  // Screens stay mounted when you switch tabs. The very first focus fades in
  // from blank; every later return eases in from partly transparent, so a tab
  // switch always feels smooth without ever flashing an empty screen.
  const hasPlayedRef = useRef(isFocused);
  const skipMountRef = useRef(isFocused); // the screen already showing at launch needs no fade

  useEffect(() => {
    if (!isFocused) return;
    if (skipMountRef.current) {
      skipMountRef.current = false;
      return;
    }
    const firstTime = !hasPlayedRef.current;
    hasPlayedRef.current = true;
    opacity.setValue(firstTime ? 0 : 0.5);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isFocused, opacity]);

  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
}
