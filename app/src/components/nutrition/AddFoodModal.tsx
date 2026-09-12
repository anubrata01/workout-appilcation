import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

export interface NewFoodEntry {
  name: string;
  quantity_label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface Props {
  visible: boolean;
  onAdd: (entry: NewFoodEntry) => void;
  onClose: () => void;
}

// Manual entry only for now — no shared food database, matching the scoping
// decision. The person typing this in owns the accuracy of the numbers.
export function AddFoodModal({ visible, onAdd, onClose }: Props) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  function reset() {
    setName("");
    setQuantity("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  }

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      quantity_label: quantity.trim(),
      calories: parseInt(calories, 10) || 0,
      protein_g: parseFloat(protein) || 0,
      carbs_g: parseFloat(carbs) || 0,
      fat_g: parseFloat(fat) || 0,
    });
    reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Add food</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Field label="Food name" value={name} onChangeText={setName} placeholder="e.g. Grilled chicken" />
            <Field label="Quantity (optional)" value={quantity} onChangeText={setQuantity} placeholder="e.g. 200g, 1 cup" />

            <View style={styles.row}>
              <Field label="Calories" value={calories} onChangeText={setCalories} keyboardType="number-pad" style={{ flex: 1 }} />
              <Field label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" style={{ flex: 1 }} />
            </View>
            <View style={styles.row}>
              <Field label="Carbs (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" style={{ flex: 1 }} />
              <Field label="Fat (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" style={{ flex: 1 }} />
            </View>

            <Pressable style={[styles.addBtn, !name.trim() && styles.addBtnDisabled]} onPress={handleAdd} disabled={!name.trim()}>
              <Text style={styles.addBtnText}>Add to today</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Field({
  label,
  style,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.dim}
        style={styles.fieldInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: colors.chalk },
  row: { flexDirection: "row", gap: spacing.sm },
  field: { marginBottom: spacing.md },
  fieldLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  fieldInput: {
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm + 2,
    color: colors.chalk,
    fontFamily: fonts.body,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.surface },
});
