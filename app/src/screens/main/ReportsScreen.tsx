import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Dumbbell, Flame, Layers, Trophy } from "lucide-react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGetPRsQuery, useGetReportQuery, useGetStreakQuery } from "../../api/analyticsApi";
import { ConsistencyStrip } from "../../components/analytics/ConsistencyStrip";
import { StatTile } from "../../components/analytics/StatTile";
import { StreakCard } from "../../components/analytics/StreakCard";
import { TagSplitDonut } from "../../components/charts/TagSplitDonut";
import { VolumeBarChart } from "../../components/charts/VolumeBarChart";
import { keyFor } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

type Range = "week" | "month";

function rangeStartDate(range: Range): string {
  const days = range === "week" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return keyFor(d); // local calendar date — see workoutHelpers.ts keyFor for why toISOString is wrong here
}

/**
 * App flow doc §2.9, extended into a real analysis board — everything here
 * is served by endpoints Analytics Service already exposed but the app
 * wasn't using yet (streak, PRs), plus figures computed client-side from data
 * already being fetched (no backend changes). Bottom-tab screens stay
 * mounted when you switch away, so refetch explicitly on focus, plus a light
 * poll while this tab is actually visible — the recompute pipeline (Workout
 * Service -> Redis -> Analytics listener) has a small, real delay after you
 * log a set.
 */
export function ReportsScreen() {
  const [range, setRange] = useState<Range>("week");
  const isFocused = useIsFocused();

  const { data, isLoading, isFetching, error, refetch } = useGetReportQuery(range, {
    pollingInterval: isFocused ? 4000 : 0,
  });
  const { data: streak, refetch: refetchStreak } = useGetStreakQuery(undefined, {
    pollingInterval: isFocused ? 4000 : 0,
  });
  const { data: prs, refetch: refetchPRs } = useGetPRsQuery(undefined, {
    pollingInterval: isFocused ? 4000 : 0,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchStreak();
      refetchPRs();
    }, [refetch, refetchStreak, refetchPRs])
  );

  const totalVolume = useMemo(
    () => (data?.volumeByDay ?? []).reduce((sum, d) => sum + d.volume, 0),
    [data]
  );
  const sessions = data?.sessionsThisWeek ?? 0;
  const avgVolumePerSession = sessions > 0 ? Math.round(totalVolume / sessions) : 0;

  const newPRsCount = useMemo(() => {
    const startDate = rangeStartDate(range);
    return (prs ?? []).filter((pr) => pr.trend === "up" && pr.date >= startDate).length;
  }, [prs, range]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.segmented}>
        {(["week", "month"] as Range[]).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={[styles.segment, range === r && styles.segmentActive]}
          >
            <Text style={[styles.segmentLabel, range === r && styles.segmentLabelActive]}>
              {r === "week" ? "Week" : "Month"}
            </Text>
          </Pressable>
        ))}
      </View>

      {streak ? <StreakCard currentStreak={streak.currentStreak} longestStreak={streak.longestStreak} /> : null}

      {error ? (
        <Text style={styles.errorText}>Couldn't load reports — pull to retry.</Text>
      ) : isLoading ? (
        <Text style={styles.loadingText}>Loading…</Text>
      ) : (
        <>
          <View style={styles.statGrid}>
            <StatTile
              icon={Flame}
              iconColor={colors.accentWarm}
              value={(data?.caloriesThisWeek ?? 0).toLocaleString()}
              caption="kcal spent"
            />
            <StatTile icon={Dumbbell} iconColor={colors.warning} value={String(sessions)} caption="sessions" />
            <StatTile
              icon={Layers}
              iconColor={colors.success}
              value={`${avgVolumePerSession.toLocaleString()} kg`}
              caption="avg volume / session"
            />
            <StatTile icon={Trophy} iconColor="#A78BFA" value={String(newPRsCount)} caption="new PRs" />
          </View>

          <ConsistencyStrip data={data?.volumeByDay ?? []} />

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Volume by day (kg){isFetching ? "…" : ""}</Text>
            <VolumeBarChart data={data?.volumeByDay ?? []} />
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Split by tag</Text>
            <TagSplitDonut data={data?.tagSplit ?? []} />
          </View>

          {sessions === 0 ? (
            <Text style={styles.hint}>
              Nothing here yet — reports update shortly after you log a completed set.
            </Text>
          ) : null}
        </>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.sm + 2,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segment: { flex: 1, paddingVertical: spacing.xs + 3, alignItems: "center", borderRadius: radii.sm },
  segmentActive: { backgroundColor: colors.track },
  segmentLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.dim },
  segmentLabelActive: { color: colors.chalk },
  loadingText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: colors.error, textAlign: "center", marginTop: spacing.xl },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 2, marginBottom: spacing.md + 2 },
  chartCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md + 2,
  },
  chartTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, marginBottom: spacing.sm + 2 },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.faint,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
