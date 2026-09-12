import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Droplet, Minus, Plus } from "lucide-react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  waterMl: number;
  onChange: (nextMl: number) => void;
}

const QUICK_ADD_ML = 250;

export function WaterTracker({ waterMl, onChange }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Droplet size={18} color="#3B9FD9" />
        <View>
          <Text style={styles.value}>{(waterMl / 1000).toFixed(waterMl % 1000 === 0 ? 0 : 1)} L</Text>
          <Text style={styles.caption}>water today</Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <Pressable
          style={styles.stepBtn}
          onPress={() => onChange(Math.max(0, waterMl - QUICK_ADD_ML))}
          disabled={waterMl === 0}
          hitSlop={8}
        >
          <Minus size={14} color={waterMl === 0 ? colors.faint : colors.chalk} />
        </Pressable>
        <Pressable style={styles.stepBtn} onPress={() => onChange(waterMl + QUICK_ADD_ML)} hitSlop={8}>
          <Plus size={14} color={colors.chalk} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 },
  value: { fontFamily: fonts.dataBold, fontSize: 16, color: colors.chalk },
  caption: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted, marginTop: 1 },
  buttons: { flexDirection: "row", gap: spacing.sm },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
