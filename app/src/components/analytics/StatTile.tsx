import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  value: string;
  caption: string;
}

export function StatTile({ icon: Icon, iconColor, value, caption }: Props) {
  return (
    <View style={styles.card}>
      <Icon size={16} color={iconColor} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg - 2,
    padding: spacing.md + 2,
    gap: spacing.xs,
  },
  value: { fontFamily: fonts.display, fontSize: 22, color: colors.chalk },
  caption: { fontFamily: fonts.body, fontSize: 10.5, color: colors.dim },
});
