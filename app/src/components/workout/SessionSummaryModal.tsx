import React, { useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, ListPlus, Share2 } from "lucide-react-native";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";

import type { ExerciseDTO } from "../../api/workoutApi";
import { formatClockTime } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  visible: boolean;
  duration: string; // pre-formatted, e.g. "32:07"
  startedAt: string | null; // full ISO timestamp
  finishedAt: string | null;
  sets: number;
  reps: number;
  calories: number;
  exercises: ExerciseDTO[]; // the server's own response, proof it actually saved, not locally-computed numbers
  routineName?: string | null;
  /** Offered only when this session wasn't started from a routine. */
  onSaveRoutine?: () => void;
  onClose: () => void;
}

const SHARE_EXERCISE_LIMIT = 6;

// Shown once, right after a session is successfully saved: answers "how
// long did I just work out" AND shows the actual persisted, read-only log
// (straight from the server's response), not just aggregate stats. If this
// is ever empty after a successful save, that's a real signal something's
// wrong server-side, not just a UI gap. The top block doubles as the card
// that Share turns into an image.
export function SessionSummaryModal({
  visible,
  duration,
  startedAt,
  finishedAt,
  sets,
  reps,
  calories,
  exercises,
  routineName,
  onSaveRoutine,
  onClose,
}: Props) {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (sharing || !cardRef.current) return;
    setSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing isn't available", "This device can't share images from the app.");
        return;
      }
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your workout" });
    } catch {
      Alert.alert("Couldn't share", "Something went wrong creating the image. Please try again.");
    } finally {
      setSharing(false);
    }
  }

  const dateLabel = finishedAt
    ? new Date(finishedAt).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
    : "";
  const shown = exercises.slice(0, SHARE_EXERCISE_LIMIT);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View ref={cardRef} collapsable={false} style={styles.shareArea}>
            <CheckCircle2 size={34} color={colors.success} />
            <Text style={styles.title}>{routineName ? routineName : "Workout complete"}</Text>
            {dateLabel ? <Text style={styles.dateLabel}>{dateLabel}</Text> : null}
            <Text style={styles.duration}>{duration}</Text>
            <Text style={styles.durationLabel}>total time</Text>
            {startedAt && finishedAt ? (
              <Text style={styles.timeRange}>
                {formatClockTime(startedAt)} – {formatClockTime(finishedAt)}
              </Text>
            ) : null}

            <View style={styles.statRow}>
              <Stat label="Exercises" value={String(exercises.length)} />
              <Stat label="Sets" value={String(sets)} />
              <Stat label="Reps" value={String(reps)} />
              <Stat label="Calories" value={String(calories)} />
            </View>

            <View style={styles.shareList}>
              {shown.map((ex) => (
                <Text key={ex.id} style={styles.shareListLine} numberOfLines={1}>
                  {ex.sets.length} × {ex.name}
                </Text>
              ))}
              {exercises.length > shown.length ? (
                <Text style={styles.shareListMore}>+{exercises.length - shown.length} more</Text>
              ) : null}
            </View>
            <Text style={styles.brand}>GETFIT</Text>
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
                    {ex.category === "cardio" ? `${s.duration_minutes}min · ${s.distance_km}km` : `${s.weight}kg × ${s.reps}`}
                    {s.set_type && s.set_type !== "normal" ? `  (${s.set_type})` : ""}
                    {s.done ? " ✓" : ""}
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryBtn} onPress={handleShare} disabled={sharing}>
              <Share2 size={15} color={colors.chalk} />
              <Text style={styles.secondaryText}>{sharing ? "Preparing…" : "Share"}</Text>
            </Pressable>
            {onSaveRoutine && !routineName ? (
              <Pressable style={styles.secondaryBtn} onPress={onSaveRoutine}>
                <ListPlus size={15} color={colors.chalk} />
                <Text style={styles.secondaryText}>Save as routine</Text>
              </Pressable>
            ) : null}
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
    maxHeight: "90%",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
  },
  shareArea: { width: "100%", alignItems: "center", backgroundColor: colors.surfaceElevated, paddingBottom: spacing.sm },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    color: colors.chalk,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  dateLabel: { fontFamily: fonts.data, fontSize: 11, color: colors.muted, marginTop: 2 },
  duration: { fontFamily: fonts.dataBold, fontSize: 36, color: colors.accent, marginTop: spacing.md },
  durationLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  timeRange: { fontFamily: fonts.data, fontSize: 11.5, color: colors.dim, marginTop: 4 },
  statRow: { flexDirection: "row", width: "100%", marginTop: spacing.lg, marginBottom: spacing.md },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: fonts.dataBold, fontSize: 17, color: colors.chalk },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  shareList: { width: "100%", marginTop: spacing.xs, gap: 2 },
  shareListLine: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.chalk },
  shareListMore: { fontFamily: fonts.body, fontSize: 11.5, color: colors.dim },
  brand: { fontFamily: fonts.display, fontSize: 14, letterSpacing: 3, color: colors.accent, marginTop: spacing.md },
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
  logScroll: { width: "100%", maxHeight: 150, marginBottom: spacing.md },
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
  actionRow: { flexDirection: "row", gap: spacing.sm, width: "100%", marginBottom: spacing.sm },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.track,
    borderRadius: radii.md,
    paddingVertical: spacing.md - 2,
  },
  secondaryText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.chalk },
  doneBtn: { width: "100%", backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: "center" },
  doneBtnText: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.surface },
});
