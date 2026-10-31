import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fonts, radii, spacing } from "../theme/tokens";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

/** A one-field dialog. React Native's Alert.prompt is iOS only, so Android
 * (this app's main platform) needs its own. */
export function PromptModal({
  visible,
  title,
  message,
  initialValue = "",
  placeholder,
  confirmLabel = "Save",
  keyboardType = "default",
  onSubmit,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const trimmed = value.trim();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.dim}
            keyboardType={keyboardType}
            autoFocus
            style={styles.input}
            onSubmitEditing={() => trimmed && onSubmit(trimmed)}
          />
          <View style={styles.row}>
            <Pressable style={styles.cancel} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirm, !trimmed && styles.confirmDisabled]}
              disabled={!trimmed}
              onPress={() => onSubmit(trimmed)}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: spacing.xxl },
  card: {
    width: "100%",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: colors.chalk },
  message: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: spacing.xs },
  input: {
    marginTop: spacing.md,
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm + 2,
    color: colors.chalk,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  cancel: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.track,
  },
  cancelText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.muted },
  confirm: { flex: 1, alignItems: "center", paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.accent },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.surface },
});
