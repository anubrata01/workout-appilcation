import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";

import type { FoodEntryDTO } from "../../api/nutritionApi";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  entry: FoodEntryDTO;
  onRemove: () => void;
}

export function FoodEntryCard({ entry, onRemove }: Props) {
  function confirmRemove() {
    Alert.alert(`Remove ${entry.name}?`, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: onRemove },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{entry.name}</Text>
        <Text style={styles.meta}>
          {entry.quantity_label ? `${entry.quantity_label} · ` : ""}
          {entry.calories} kcal · P {entry.protein_g}g · C {entry.carbs_g}g · F {entry.fat_g}g
        </Text>
      </View>
      <Pressable onPress={confirmRemove} hitSlop={8}>
        <Trash2 size={14} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.chalk },
  meta: { fontFamily: fonts.data, fontSize: 10.5, color: colors.muted, marginTop: 3 },
});
