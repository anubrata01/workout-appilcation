import React from "react";
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Share2, TrendingDown, TrendingUp, X } from "lucide-react-native";

import { useGetExerciseProgressQuery } from "../../api/analyticsApi";
import { LineChart } from "../charts/LineChart";
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

  async function handleShare() {
    if (!exerciseName || !first || !last) return;
    const weightPart =
      weightDelta !== 0 ? `${first.weight}kg → ${last.weight}kg` : `holding steady at ${last.weight}kg`;
    const repsPart = repsDelta !== 0 ? `${first.reps} → ${last.reps} reps` : `${last.reps} reps`;
    try {
      await Share.share({
        message: `${exerciseName}: ${weightPart}, ${repsPart} over ${points.length} sessions — tracked with GetFit 💪`,
      });
    } catch {
      // User cancelled the share sheet — nothing to handle.
    }
  }

  const chartPoints = points.map((p) => ({ label: formatShortDate(p.date), value: p.weight }));

  return (
    <Modal visible={!!exerciseName} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerBand}>
            <Text style={styles.title}>{exerciseName}</Text>
            <View style={styles.headerActions}>
              <Pressable onPress={handleShare} hitSlop={8} style={styles.headerIconBtn}>
                <Share2 size={16} color={colors.surface} />
              </Pressable>
              <Pressable onPress={onClose} hitSlop={8} style={styles.headerIconBtn}>
                <X size={18} color={colors.surface} />
              </Pressable>
            </View>
          </View>

          <View style={styles.body}>
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

            {!isLoading && points.length > 0 ? (
              <View style={styles.chartCard}>
                <LineChart points={chartPoints} color={colors.accent} unit="kg" />
              </View>
            ) : null}

            <ScrollView style={{ maxHeight: 220 }}>
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
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    overflow: "hidden",
    maxHeight: "80%",
  },
  headerBand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  headerActions: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  headerIconBtn: { padding: 2 },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: colors.surface },
  body: { padding: spacing.lg },
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
  chartCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
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
