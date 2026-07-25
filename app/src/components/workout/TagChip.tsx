import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  label: string;
  color: string;
  active: boolean;
  onPress: () => void;
}

/** Same pill/border/fill pattern as the prototype's tag chips (UI/UX brief §2). */
export function TagChip({ label, color, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: color, backgroundColor: active ? color : "transparent" },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, { color: active ? colors.track : color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.sm - 1,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
  },
});
