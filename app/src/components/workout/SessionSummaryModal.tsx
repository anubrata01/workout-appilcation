import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2 } from "lucide-react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  visible: boolean;
  duration: string; // pre-formatted, e.g. "32:07"
  sets: number;
  reps: number;
  calories: number;
  exerciseCount: number;
  onClose: () => void;
}

// Shown once, right after a session is successfully saved — answers "how
// long did I just work out" before dropping back to the idle Session tab.
export function SessionSummaryModal({ visible, duration, sets, reps, calories, exerciseCount, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <CheckCircle2 size={40} color={colors.success} />
          <Text style={styles.title}>Workout complete</Text>
          <Text style={styles.duration}>{duration}</Text>
          <Text style={styles.durationLabel}>total time</Text>

          <View style={styles.statRow}>
            <Stat label="Exercises" value={String(exerciseCount)} />
            <Stat label="Sets" value={String(sets)} />
            <Stat label="Reps" value={String(reps)} />
            <Stat label="Calories" value={String(calories)} />
          </View>

          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    color: colors.chalk,
    marginTop: spacing.md,
  },
  duration: {
    fontFamily: fonts.dataBold,
    fontSize: 40,
    color: colors.accent,
    marginTop: spacing.lg,
  },
  durationLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  statRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: fonts.dataBold, fontSize: 17, color: colors.chalk },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  doneBtn: {
    width: "100%",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  doneBtnText: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.surface },
});
