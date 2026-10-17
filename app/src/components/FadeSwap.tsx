import React, { ReactNode, useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

interface Props {
  /** Changing this value plays a short fade-in on the content, e.g. the active tab or the search term. */
  trigger: string | number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Softens content swaps. When `trigger` changes (a tab switch, a new search
 * term, a filter) the content eases in from slightly transparent instead of
 * snapping. It never fades to fully blank, so there is no flash of empty space.
 */
export function FadeSwap({ trigger, children, style }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    opacity.setValue(0.25);
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [trigger, opacity]);

  return <Animated.View style={[{ flex: 1, opacity }, style]}>{children}</Animated.View>;
}
