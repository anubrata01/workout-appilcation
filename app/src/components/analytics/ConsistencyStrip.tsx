import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { VolumeByDay } from "../../api/analyticsApi";

const PIP_SIZE = 16;
const PIP_GAP = 6;

/** A GitHub-style "did you train" strip — one pip per day in the selected range. */
export function ConsistencyStrip({ data }: { data: VolumeByDay[] }) {
  const trainedDays = data.filter((d) => d.volume > 0).length;
  const pips = (
    <View style={styles.row}>
      {data.map((d, i) => (
        <View
          key={i}
          style={[styles.pip, d.volume > 0 ? styles.pipFilled : styles.pipEmpty]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Consistency</Text>
        <Text style={styles.count}>
          {trainedDays}/{data.length} days
        </Text>
      </View>
      {data.length > 14 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {pips}
        </ScrollView>
      ) : (
        pips
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
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm + 2 },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  count: { fontFamily: fonts.data, fontSize: 11.5, color: colors.dim },
  row: { flexDirection: "row", gap: PIP_GAP },
  pip: { width: PIP_SIZE, height: PIP_SIZE, borderRadius: 4 },
  pipFilled: { backgroundColor: colors.accent },
  pipEmpty: { backgroundColor: colors.track, borderWidth: 1, borderColor: colors.border },
});
