import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  visible: boolean;
  onCreate: (name: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

/**
 * Android has no built-in text-prompt dialog (Alert.prompt is iOS-only), so a
 * custom tag needs its own small modal rather than a one-liner.
 */
export function CreateTagModal({ visible, onCreate, onClose, isLoading }: Props) {
  const [name, setName] = useState("");

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>New tag</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>
          <TextInput
            placeholder="e.g. Arms Day"
            placeholderTextColor={colors.dim}
            value={name}
            onChangeText={setName}
            style={styles.input}
            autoFocus
          />
          <Pressable
            style={[styles.createBtn, (!name.trim() || isLoading) && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || isLoading}
          >
            <Text style={styles.createBtnLabel}>{isLoading ? "Creating…" : "Create"}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: spacing.xxl },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: colors.chalk },
  input: {
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm + 2,
    color: colors.chalk,
    fontFamily: fonts.body,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  createBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 3,
    alignItems: "center",
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.track },
});
