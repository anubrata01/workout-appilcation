import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { TrendingDown, TrendingUp, X } from "lucide-react-native";

import { useGetExerciseProgressQuery } from "../../api/analyticsApi";
import { parseLocalDate } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  exerciseName: string | null;
  onClose: () => void;
}

function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** How weight and reps have actually moved over time for one exercise —
 * replaces the old volume-by-day chart, which only ever showed a
 * kg-lifted total with no sense of whether you're getting stronger. */
export function ExerciseProgressModal({ exerciseName, onClose }: Props) {
  const { data: points = [], isLoading } = useGetExerciseProgressQuery(exerciseName ?? "", {
    skip: !exerciseName,
  });

  const first = points[0];
  const last = points[points.length - 1];
  const weightDelta = first && last ? last.weight - first.weight : 0;
  const repsDelta = first && last ? last.reps - first.reps : 0;

  return (
    <Modal visible={!!exerciseName} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{exerciseName}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          {points.length >= 2 ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                {weightDelta >= 0 ? (
                  <TrendingUp size={14} color={colors.success} />
                ) : (
                  <TrendingDown size={14} color={colors.error} />
                )}
                <Text style={styles.summaryText}>
                  {first.weight}kg → {last.weight}kg
                </Text>
              </View>
              <View style={styles.summaryStat}>
                {repsDelta >= 0 ? (
                  <TrendingUp size={14} color={colors.success} />
                ) : (
                  <TrendingDown size={14} color={colors.error} />
                )}
                <Text style={styles.summaryText}>
                  {first.reps} → {last.reps} reps
                </Text>
              </View>
            </View>
          ) : null}

          <ScrollView style={{ maxHeight: 320 }}>
            {isLoading ? null : points.length === 0 ? (
              <Text style={styles.emptyText}>No history yet for this exercise.</Text>
            ) : (
              [...points].reverse().map((p, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.rowDate}>{formatShortDate(p.date)}</Text>
                  <Text style={styles.rowValue}>
                    {p.weight}kg × {p.reps}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
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
    maxHeight: "75%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: colors.chalk },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryText: { fontFamily: fonts.dataBold, fontSize: 13, color: colors.chalk },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rowDate: { fontFamily: fonts.data, fontSize: 12, color: colors.muted },
  rowValue: { fontFamily: fonts.dataBold, fontSize: 13, color: colors.chalk },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center", padding: spacing.lg },
});
