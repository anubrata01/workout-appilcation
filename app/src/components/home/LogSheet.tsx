import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Dumbbell, Ruler, Scale, Utensils } from "lucide-react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

export type LogChoice = "workout" | "meal" | "weight" | "measurement";

interface Props {
  visible: boolean;
  onChoose: (choice: LogChoice) => void;
  onClose: () => void;
}

const OPTIONS: { key: LogChoice; label: string; hint: string; icon: typeof Dumbbell }[] = [
  { key: "workout", label: "Workout", hint: "Start a session", icon: Dumbbell },
  { key: "meal", label: "Meal", hint: "Search or quick add", icon: Utensils },
  { key: "weight", label: "Weight", hint: "Log today's weigh-in", icon: Scale },
  { key: "measurement", label: "Measurement", hint: "Body fat, waist, chest and more", icon: Ruler },
];

/** The "+ Log" menu: one place to start anything you track. */
export function LogSheet({ visible, onChoose, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {OPTIONS.map((option, i) => (
            <Pressable
              key={option.key}
              style={[styles.row, i > 0 && styles.divider]}
              onPress={() => onChoose(option.key)}
            >
              <option.icon size={18} color={colors.chalk} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{option.label}</Text>
                <Text style={styles.hint}>{option.hint}</Text>
              </View>
              <ChevronRight size={16} color={colors.faint} />
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "flex-end", paddingTop: 96, paddingHorizontal: spacing.lg },
  sheet: {
    width: 290,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md + 2 },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.chalk },
  hint: { fontFamily: fonts.body, fontSize: 11.5, color: colors.dim, marginTop: 1 },
});
