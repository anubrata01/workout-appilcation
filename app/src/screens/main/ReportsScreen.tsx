import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Dumbbell, Flame, Trophy } from "lucide-react-native";

import { useGetPRsQuery, useGetReportQuery, useGetStreakQuery } from "../../api/analyticsApi";
import { ConsistencyStrip } from "../../components/analytics/ConsistencyStrip";
import { ExerciseProgressSection } from "../../components/analytics/ExerciseProgressSection";
import { MuscleMapCard } from "../../components/analytics/MuscleMapCard";
import { NutritionReportCard } from "../../components/analytics/NutritionReportCard";
import { StatTile } from "../../components/analytics/StatTile";
import { StreakCard } from "../../components/analytics/StreakCard";
import { ReportsScreenSkeleton } from "../../components/Skeleton";
import { STALE_AFTER, useRefetchOnFocus } from "../../lib/cachePolicy";
import { keyFor } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

type Range = "week" | "month";

function rangeStartDate(range: Range): string {
  const days = range === "week" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return keyFor(d); // local calendar date, see workoutHelpers.ts keyFor for why toISOString is wrong here
}

/**
 * The overview pane of the Progress tab: streak, headline numbers, training
 * consistency, per-exercise progress, the muscle map and nutrition. Everything
 * here comes from endpoints the app already had plus figures computed on the
 * client from data already fetched.
 *
 * Network behaviour: each query is trusted for STALE_AFTER.analytics seconds
 * and refetched when you come back to the tab after that. There is no polling
 * any more (it used to hit three endpoints every 4 seconds while this was
 * open); after you finish a workout the analytics caches are invalidated once
 * or twice shortly afterwards (lib/analyticsSync.ts), which covers the delay
 * while the server recomputes.
 */
export function ReportsContent() {
  const [range, setRange] = useState<Range>("week");
  const staleOptions = { refetchOnMountOrArgChange: STALE_AFTER.analytics };

  const { data, isLoading, error, refetch } = useGetReportQuery(range, staleOptions);
  const { data: streak, refetch: refetchStreak } = useGetStreakQuery(undefined, staleOptions);
  const { data: prs, refetch: refetchPRs } = useGetPRsQuery(undefined, staleOptions);

  useRefetchOnFocus(
    () => {
      refetch();
      refetchStreak();
      refetchPRs();
    },
    STALE_AFTER.analytics
  );

  const sessions = data?.sessionsThisWeek ?? 0;

  const newPRsCount = useMemo(() => {
    const startDate = rangeStartDate(range);
    return (prs ?? []).filter((pr) => pr.trend === "up" && pr.date >= startDate).length;
  }, [prs, range]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.segmented}>
        {(["week", "month"] as Range[]).map((r) => (
          <Pressable key={r} onPress={() => setRange(r)} style={[styles.segment, range === r && styles.segmentActive]}>
            <Text style={[styles.segmentLabel, range === r && styles.segmentLabelActive]}>
              {r === "week" ? "Week" : "Month"}
            </Text>
          </Pressable>
        ))}
      </View>

      {streak ? <StreakCard currentStreak={streak.currentStreak} longestStreak={streak.longestStreak} /> : null}

      {error ? (
        <Text style={styles.errorText}>Couldn't load reports. Pull to retry.</Text>
      ) : isLoading ? (
        <ReportsScreenSkeleton />
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
            <StatTile icon={Trophy} iconColor="#A78BFA" value={String(newPRsCount)} caption="new PRs" />
          </View>

          <ConsistencyStrip data={data?.volumeByDay ?? []} />

          {sessions === 0 ? (
            <Text style={styles.hint}>Nothing here yet. Reports update shortly after you log a completed set.</Text>
          ) : (
            <>
              <MuscleMapCard />
              <ExerciseProgressSection />
              <NutritionReportCard range={range} />
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2 },
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
  errorText: { fontFamily: fonts.body, fontSize: 13, color: colors.error, textAlign: "center", marginTop: spacing.xl },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 2, marginBottom: spacing.md + 2 },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.faint,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
