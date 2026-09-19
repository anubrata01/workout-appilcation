import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CheckCircle2 } from "lucide-react-native";

import type { ExerciseDTO } from "../../api/workoutApi";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  visible: boolean;
  duration: string; // pre-formatted, e.g. "32:07"
  sets: number;
  reps: number;
  calories: number;
  exercises: ExerciseDTO[]; // the server's own response — proof it actually saved, not locally-computed numbers
  onClose: () => void;
}

// Shown once, right after a session is successfully saved — answers "how
// long did I just work out" AND shows the actual persisted, read-only log
// (straight from the server's response), not just aggregate stats. If this
// is ever empty after a successful save, that's a real signal something's
// wrong server-side, not just a UI gap.
export function SessionSummaryModal({ visible, duration, sets, reps, calories, exercises, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <CheckCircle2 size={36} color={colors.success} />
          <Text style={styles.title}>Workout complete</Text>
          <Text style={styles.duration}>{duration}</Text>
          <Text style={styles.durationLabel}>total time</Text>

          <View style={styles.statRow}>
            <Stat label="Exercises" value={String(exercises.length)} />
            <Stat label="Sets" value={String(sets)} />
            <Stat label="Reps" value={String(reps)} />
            <Stat label="Calories" value={String(calories)} />
          </View>

          <Text style={styles.logLabel}>Saved log</Text>
          <ScrollView style={styles.logScroll}>
            {exercises.map((ex) => (
              <View key={ex.id} style={styles.exerciseBlock}>
                <Text style={styles.exerciseName}>
                  {ex.name}
                  {ex.category === "cardio" ? <Text style={styles.exerciseTag}>  cardio</Text> : null}
                </Text>
                {ex.sets.map((s, i) => (
                  <Text key={i} style={styles.setLine}>
                    Set {i + 1}:{" "}
                    {ex.category === "cardio"
                      ? `${s.duration_minutes}min · ${s.distance_km}km`
                      : `${s.weight}kg × ${s.reps}`}
                    {s.done ? " ✓" : ""}
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>

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
    maxHeight: "85%",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 1,
    color: colors.chalk,
    marginTop: spacing.sm,
  },
  duration: {
    fontFamily: fonts.dataBold,
    fontSize: 36,
    color: colors.accent,
    marginTop: spacing.md,
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
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: fonts.dataBold, fontSize: 17, color: colors.chalk },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  logLabel: {
    alignSelf: "flex-start",
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  logScroll: {
    width: "100%",
    maxHeight: 220,
    marginBottom: spacing.lg,
  },
  exerciseBlock: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseName: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.chalk, marginBottom: 2 },
  exerciseTag: { fontFamily: fonts.data, fontSize: 9.5, color: colors.dim, textTransform: "uppercase" },
  setLine: { fontFamily: fonts.data, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  doneBtn: {
    width: "100%",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  doneBtnText: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.surface },
});
