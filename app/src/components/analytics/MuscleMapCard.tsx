import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Body from "react-native-body-highlighter";

import { useGetMuscleDistributionQuery } from "../../api/workoutApi";
import type { MuscleRange } from "../../api/workoutApi";
import { STALE_AFTER } from "../../lib/cachePolicy";
import { HEAT_COLORS, bodyHighlightData, untrainedGroups } from "../../lib/muscleMap";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

const RANGES: { key: MuscleRange; label: string }[] = [
  { key: "week", label: "7d" },
  { key: "month", label: "30d" },
  { key: "quarter", label: "3m" },
];

/** Which muscles your recent training actually hit, as a heat map on a body
 * diagram (front and back), plus a ranked list and a nudge toward whatever
 * you haven't touched. Warm-ups and unfinished sets don't count. */
export function MuscleMapCard() {
  const [range, setRange] = useState<MuscleRange>("week");
  const { data } = useGetMuscleDistributionQuery(range, { refetchOnMountOrArgChange: STALE_AFTER.analytics });

  const groups = data?.groups ?? [];
  const highlights = useMemo(() => bodyHighlightData(groups), [groups]);
  const missing = useMemo(() => untrainedGroups(groups), [groups]);
  const total = data?.total_sets ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Muscle distribution</Text>
        <View style={styles.segmented}>
          {RANGES.map((r) => (
            <Pressable key={r.key} onPress={() => setRange(r.key)} style={[styles.segment, range === r.key && styles.segmentActive]}>
              <Text style={[styles.segmentText, range === r.key && styles.segmentTextActive]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.bodies}>
        <Body data={highlights} colors={[...HEAT_COLORS]} side="front" gender="male" scale={0.62} border={colors.border} />
        <Body data={highlights} colors={[...HEAT_COLORS]} side="back" gender="male" scale={0.62} border={colors.border} />
      </View>

      {total === 0 ? (
        <Text style={styles.empty}>Finish a workout to see which muscles you trained.</Text>
      ) : (
        <>
          {groups.slice(0, 5).map((g) => (
            <View key={g.muscle_group} style={styles.row}>
              <Text style={styles.groupName}>{g.muscle_group}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(g.sets / groups[0].sets) * 100}%` }]} />
              </View>
              <Text style={styles.sets}>{g.sets}</Text>
            </View>
          ))}
          {missing.length > 0 ? (
            <Text style={styles.hint}>Not trained in this period: {missing.join(", ")}.</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md + 2,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  segmented: { flexDirection: "row", backgroundColor: colors.track, borderRadius: radii.sm + 2, padding: 2 },
  segment: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.sm },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.dim },
  segmentTextActive: { color: colors.chalk },
  bodies: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", marginVertical: spacing.md },
  empty: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  groupName: { width: 86, fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.chalk, textTransform: "capitalize" },
  track: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.track, overflow: "hidden" },
  fill: { height: 7, borderRadius: 4, backgroundColor: colors.accentWarm },
  sets: { width: 28, textAlign: "right", fontFamily: fonts.dataBold, fontSize: 12, color: colors.chalk },
  hint: { fontFamily: fonts.body, fontSize: 11.5, color: colors.dim, marginTop: spacing.md, lineHeight: 16 },
});
