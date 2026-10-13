import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";

import type { FoodEntryDTO } from "../../api/nutritionApi";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  entry: FoodEntryDTO;
  onRemove: () => void;
}

function amountLabel(entry: FoodEntryDTO): string {
  if (entry.quantity_label) return entry.quantity_label;
  if (entry.serving_amount) return `${Math.round(entry.serving_amount * 10) / 10} ${entry.serving_unit}`;
  return "";
}

export function FoodEntryCard({ entry, onRemove }: Props) {
  function confirmRemove() {
    Alert.alert(`Remove ${entry.name}?`, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: onRemove },
    ]);
  }

  const amount = amountLabel(entry);
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{entry.name}</Text>
        <Text style={styles.meta}>
          {amount ? `${amount} · ` : ""}
          {entry.calories} kcal · P {Math.round(entry.protein_g)}g · C {Math.round(entry.carbs_g)}g · F{" "}
          {Math.round(entry.fat_g)}g
        </Text>
      </View>
      {entry.eaten_at ? <Text style={styles.time}>{entry.eaten_at}</Text> : null}
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
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.chalk },
  meta: { fontFamily: fonts.data, fontSize: 10.5, color: colors.muted, marginTop: 3 },
  time: { fontFamily: fonts.data, fontSize: 10.5, color: colors.faint },
});
