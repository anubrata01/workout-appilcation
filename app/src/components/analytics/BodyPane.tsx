import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronRight, Ruler } from "lucide-react-native";

import { useGetLatestMeasurementsQuery, useGetMeasurementsQuery } from "../../api/nutritionApi";
import { KIND_LABEL, KIND_UNIT, KINDS, formatReading } from "../../lib/measurements";
import { parseLocalDate } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { MainStackParamList } from "../../navigation/types";
import { LineChart } from "../charts/LineChart";

function shortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** The Body pane of Progress: your latest reading of each measurement, a
 * quick weight trend, and a way into the full Measurements screen. */
export function BodyPane() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { data: latest = [] } = useGetLatestMeasurementsQuery();
  const { data: weights = [] } = useGetMeasurementsQuery({ kind: "weight", range: "quarter" });

  const latestByKind = new Map(latest.map((m) => [m.kind, m]));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {weights.length >= 2 ? (
        <Pressable style={styles.card} onPress={() => navigation.navigate("Measurements", { kind: "weight" })}>
          <Text style={styles.cardTitle}>Weight, last 3 months</Text>
          <LineChart
            points={weights.map((w) => ({ label: shortDate(w.date), value: Math.round(w.value * 10) / 10 }))}
            height={150}
            labelEvery={Math.max(1, Math.ceil(weights.length / 5))}
            showDots={weights.length <= 14}
          />
        </Pressable>
      ) : null}

      <Text style={styles.sectionLabel}>Latest readings</Text>
      <View style={styles.card}>
        {KINDS.map((kind, i) => {
          const reading = latestByKind.get(kind);
          return (
            <Pressable
              key={kind}
              style={[styles.row, i > 0 && styles.divider]}
              onPress={() => navigation.navigate("Measurements", { kind })}
            >
              <Text style={styles.rowLabel}>{KIND_LABEL[kind]}</Text>
              <Text style={styles.rowValue}>
                {reading ? `${formatReading(reading.value, kind)} ${KIND_UNIT[kind]}` : "Not logged"}
              </Text>
              {reading ? <Text style={styles.rowDate}>{shortDate(reading.date)}</Text> : null}
              <ChevronRight size={14} color={colors.faint} />
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.cta} onPress={() => navigation.navigate("Measurements")}>
        <Ruler size={16} color={colors.surface} />
        <Text style={styles.ctaText}>Log a measurement</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, marginBottom: spacing.sm },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md - 2 },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  rowLabel: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.chalk },
  rowValue: { fontFamily: fonts.dataBold, fontSize: 13, color: colors.chalk },
  rowDate: { fontFamily: fonts.data, fontSize: 10.5, color: colors.faint, width: 46, textAlign: "right" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 1,
    marginTop: spacing.sm,
  },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.surface },
});
