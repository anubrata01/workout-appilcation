import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronLeft, ChevronUp, Trophy } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGetExerciseProgressQuery, useGetExerciseRecordsQuery } from "../../api/analyticsApi";
import type { RecordEntryDTO } from "../../api/analyticsApi";
import { useGetExerciseDetailQuery } from "../../api/workoutApi";
import { LineChart } from "../../components/charts/LineChart";
import { ScreenBackground } from "../../components/ScreenBackground";
import { ExerciseThumb } from "../../components/workout/ExerciseThumb";
import { STALE_AFTER } from "../../lib/cachePolicy";
import { parseLocalDate } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { MainStackScreenProps } from "../../navigation/types";

function shortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** One exercise in depth: how to do it, your three kinds of personal record,
 * and how weight and reps have moved over time. Reached by tapping an
 * exercise's name while logging, or a PR. */
export function ExerciseDetailScreen({ navigation, route }: MainStackScreenProps<"ExerciseDetail">) {
  const { name } = route.params;
  const [howToOpen, setHowToOpen] = useState(false);
  const [heroFailed, setHeroFailed] = useState(false);

  const { data: detail } = useGetExerciseDetailQuery(name);
  const { data: records } = useGetExerciseRecordsQuery(name, { refetchOnMountOrArgChange: STALE_AFTER.analytics });
  const { data: points = [] } = useGetExerciseProgressQuery(name, { refetchOnMountOrArgChange: STALE_AFTER.analytics });

  const weightPoints = points.map((p) => ({ label: shortDate(p.date), value: p.weight }));
  const repsPoints = points.map((p) => ({ label: shortDate(p.date), value: p.reps }));
  const hasHistory = (records?.sessions ?? 0) > 0;
  const heroUri = detail?.image_url;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.back}>
            <ChevronLeft size={20} color={colors.chalk} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {name}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {heroUri && !heroFailed ? (
            <Image source={{ uri: heroUri }} style={styles.hero} resizeMode="cover" onError={() => setHeroFailed(true)} />
          ) : (
            <View style={[styles.hero, styles.heroEmpty]}>
              <ExerciseThumb size={64} />
            </View>
          )}

          <View style={styles.tagRow}>
            {detail?.muscle_group ? <Text style={styles.tag}>{detail.muscle_group}</Text> : null}
            {detail?.equipment && detail.equipment !== "none" ? <Text style={styles.tag}>{detail.equipment}</Text> : null}
            {detail?.category === "cardio" ? <Text style={styles.tag}>cardio</Text> : null}
          </View>

          <Text style={styles.sectionLabel}>Personal records</Text>
          {hasHistory && records ? (
            <View style={styles.recordRow}>
              <RecordCard label="Heaviest" entry={records.heaviest} unit="kg" detail={(e) => `${e.weight}kg × ${e.reps}`} />
              <RecordCard label="Est. 1RM" entry={records.best_e1rm} unit="kg" detail={(e) => `${e.weight}kg × ${e.reps}`} />
              <RecordCard label="Best set" entry={records.best_set_volume} unit="kg" detail={(e) => `${e.weight}kg × ${e.reps}`} />
            </View>
          ) : (
            <Text style={styles.empty}>No records yet. Finish a workout with this exercise to set the first ones.</Text>
          )}

          <Text style={styles.sectionLabel}>Progress</Text>
          {points.length >= 2 ? (
            <View style={styles.card}>
              <Text style={styles.chartLabel}>Weight (kg)</Text>
              <LineChart points={weightPoints} color={colors.accent} unit="kg" height={130} />
              <Text style={styles.chartLabel}>Reps</Text>
              <LineChart points={repsPoints} color={colors.success} height={130} />
            </View>
          ) : (
            <Text style={styles.empty}>Log this exercise a couple more times to see a trend.</Text>
          )}

          {points.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>History</Text>
              <View style={styles.card}>
                {[...points].reverse().map((p, i) => (
                  <View key={`${p.date}-${i}`} style={[styles.historyRow, i > 0 && styles.historyDivider]}>
                    <Text style={styles.historyDate}>{shortDate(p.date)}</Text>
                    <Text style={styles.historyValue}>
                      {p.weight}kg × {p.reps}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {detail?.description ? (
            <>
              <Pressable style={styles.howToHeader} onPress={() => setHowToOpen((o) => !o)}>
                <Text style={styles.sectionLabelInline}>How to</Text>
                {howToOpen ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}
              </Pressable>
              {howToOpen ? <Text style={styles.howTo}>{detail.description}</Text> : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function RecordCard({
  label,
  entry,
  unit,
  detail,
}: {
  label: string;
  entry: RecordEntryDTO | null;
  unit: string;
  detail: (e: RecordEntryDTO) => string;
}) {
  return (
    <View style={styles.recordCard}>
      <Trophy size={13} color={colors.warning} />
      <Text style={styles.recordValue}>
        {entry ? entry.value : 0}
        <Text style={styles.recordUnit}> {unit}</Text>
      </Text>
      <Text style={styles.recordLabel}>{label}</Text>
      {entry ? <Text style={styles.recordDetail}>{detail(entry)}</Text> : null}
      {entry ? <Text style={styles.recordDate}>{shortDate(entry.date)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  back: { padding: 2 },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: colors.chalk },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  hero: { width: "100%", height: 200, borderRadius: radii.lg, backgroundColor: colors.track },
  heroEmpty: { alignItems: "center", justifyContent: "center" },
  tagRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginTop: spacing.md },
  tag: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.muted,
    backgroundColor: colors.track,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    textTransform: "capitalize",
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionLabelInline: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  empty: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, lineHeight: 18 },
  recordRow: { flexDirection: "row", gap: spacing.sm },
  recordCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg - 2,
    padding: spacing.md,
    gap: 2,
  },
  recordValue: { fontFamily: fonts.dataBold, fontSize: 18, color: colors.chalk, marginTop: 4 },
  recordUnit: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  recordLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted },
  recordDetail: { fontFamily: fonts.data, fontSize: 10.5, color: colors.dim, marginTop: 4 },
  recordDate: { fontFamily: fonts.data, fontSize: 10, color: colors.faint },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  chartLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: colors.dim, marginTop: spacing.xs, marginBottom: 2 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  historyDivider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  historyDate: { fontFamily: fonts.data, fontSize: 12, color: colors.muted },
  historyValue: { fontFamily: fonts.dataBold, fontSize: 13, color: colors.chalk },
  howToHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  howTo: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
});
