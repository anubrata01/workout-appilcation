import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useDeleteMeasurementMutation,
  useGetLatestMeasurementsQuery,
  useGetMeasurementsQuery,
  useSaveMeasurementMutation,
} from "../../api/nutritionApi";
import type { MeasurementKind, MeasurementRange } from "../../api/nutritionApi";
import { LineChart } from "../../components/charts/LineChart";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenBackground } from "../../components/ScreenBackground";
import { KIND_LABEL, KIND_UNIT, KINDS, changeOverPeriod, formatReading } from "../../lib/measurements";
import { keyFor, parseLocalDate } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { MainStackScreenProps } from "../../navigation/types";

const RANGES: { key: MeasurementRange; label: string }[] = [
  { key: "month", label: "1M" },
  { key: "quarter", label: "3M" },
  { key: "year", label: "1Y" },
  { key: "all", label: "All" },
];

function shortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** Weight, body fat and tape measurements over time: pick a measurement,
 * log today's reading, and watch the trend. Stored metric (kg, %, cm). */
export function MeasurementsScreen({ navigation, route }: MainStackScreenProps<"Measurements">) {
  const [kind, setKind] = useState<MeasurementKind>(route.params?.kind ?? "weight");
  const [range, setRange] = useState<MeasurementRange>("quarter");
  const [valueText, setValueText] = useState("");

  const { data: readings = [] } = useGetMeasurementsQuery({ kind, range });
  const { data: latest = [] } = useGetLatestMeasurementsQuery();
  const [saveMeasurement, { isLoading: saving }] = useSaveMeasurementMutation();
  const [deleteMeasurement] = useDeleteMeasurementMutation();

  const today = keyFor(new Date());
  const todaysReading = readings.find((r) => r.date === today)?.value;
  useEffect(() => {
    setValueText(todaysReading != null ? String(todaysReading) : "");
  }, [kind, todaysReading]);

  const unit = KIND_UNIT[kind];
  const lastReading = readings[readings.length - 1];
  const change = changeOverPeriod(readings);
  const labelEvery = Math.max(1, Math.ceil(readings.length / 6));

  async function handleSave() {
    const value = parseFloat(valueText);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert("Enter a number", `Type your ${KIND_LABEL[kind].toLowerCase()} first.`);
      return;
    }
    try {
      await saveMeasurement({ date: today, kind, value }).unwrap();
    } catch (e: any) {
      Alert.alert("Couldn't save", String(e?.data?.detail ?? "Check the number and try again."));
    }
  }

  function confirmDelete(date: string) {
    Alert.alert("Delete this reading?", `${KIND_LABEL[kind]} on ${shortDate(date)}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMeasurement({ date, kind }) },
    ]);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <ChevronLeft size={20} color={colors.chalk} />
          </Pressable>
          <Text style={styles.title}>Measurements</Text>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kindRow}>
            {KINDS.map((k) => {
              const has = latest.some((m) => m.kind === k);
              return (
                <Pressable key={k} onPress={() => setKind(k)} style={[styles.kindChip, kind === k && styles.kindChipActive]}>
                  <Text style={[styles.kindText, kind === k && styles.kindTextActive]}>
                    {KIND_LABEL[k]}
                    {has && kind !== k ? " •" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.card}>
            <Text style={styles.big}>
              {lastReading ? formatReading(lastReading.value, kind) : "No data"}
              {lastReading ? <Text style={styles.bigUnit}> {unit}</Text> : null}
            </Text>
            {lastReading ? <Text style={styles.sub}>Last logged {shortDate(lastReading.date)}</Text> : null}
            {change ? (
              <Text style={[styles.change, { color: change.delta === 0 ? colors.muted : colors.chalk }]}>
                {change.delta > 0 ? "+" : ""}
                {formatReading(change.delta, kind)} {unit} since {shortDate(change.since)}
              </Text>
            ) : null}

            <View style={styles.segmented}>
              {RANGES.map((r) => (
                <Pressable key={r.key} onPress={() => setRange(r.key)} style={[styles.segment, range === r.key && styles.segmentActive]}>
                  <Text style={[styles.segmentText, range === r.key && styles.segmentTextActive]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>

            {readings.length >= 2 ? (
              <LineChart
                points={readings.map((r) => ({ label: shortDate(r.date), value: Math.round(r.value * 10) / 10 }))}
                color={colors.accent}
                unit=""
                height={170}
                labelEvery={labelEvery}
                showDots={readings.length <= 14}
              />
            ) : (
              <Text style={styles.empty}>Log at least two readings to see a trend.</Text>
            )}
          </View>

          <Text style={styles.sectionLabel}>Log today</Text>
          <View style={styles.card}>
            <View style={styles.logRow}>
              <TextInput
                value={valueText}
                onChangeText={(v) => /^\d*\.?\d*$/.test(v) && setValueText(v)}
                keyboardType="decimal-pad"
                placeholder={`${KIND_LABEL[kind]} in ${unit}`}
                placeholderTextColor={colors.dim}
                style={styles.input}
              />
              <Text style={styles.unitText}>{unit}</Text>
            </View>
            <PrimaryButton label={todaysReading != null ? "Update today's reading" : "Save reading"} onPress={handleSave} loading={saving} />
          </View>

          {readings.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>History</Text>
              <View style={styles.card}>
                {[...readings]
                  .reverse()
                  .slice(0, 20)
                  .map((r, i) => (
                    <Pressable key={r.date} onLongPress={() => confirmDelete(r.date)} style={[styles.historyRow, i > 0 && styles.divider]}>
                      <Text style={styles.historyDate}>{shortDate(r.date)}</Text>
                      <Text style={styles.historyValue}>
                        {formatReading(r.value, kind)} {unit}
                      </Text>
                    </Pressable>
                  ))}
                <Text style={styles.hint}>Hold a reading to delete it.</Text>
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
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
  },
  title: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: colors.chalk },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  kindRow: { flexGrow: 0, marginBottom: spacing.md },
  kindChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.md + 2, paddingVertical: 7, marginRight: spacing.sm },
  kindChipActive: { backgroundColor: colors.chalk, borderColor: colors.chalk },
  kindText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted },
  kindTextActive: { color: colors.surface },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  big: { fontFamily: fonts.dataBold, fontSize: 30, color: colors.chalk },
  bigUnit: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  sub: { fontFamily: fonts.body, fontSize: 11.5, color: colors.dim, marginTop: 2 },
  change: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, marginTop: spacing.xs },
  segmented: { flexDirection: "row", backgroundColor: colors.track, borderRadius: radii.sm + 2, padding: 3, marginVertical: spacing.md },
  segment: { flex: 1, paddingVertical: spacing.xs + 2, alignItems: "center", borderRadius: radii.sm },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.dim },
  segmentTextActive: { color: colors.chalk },
  empty: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center", paddingVertical: spacing.xl },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  logRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  input: {
    flex: 1,
    backgroundColor: colors.track,
    borderRadius: radii.sm + 2,
    fontFamily: fonts.dataBold,
    fontSize: 18,
    color: colors.chalk,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  unitText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, width: 28 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm + 1 },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  historyDate: { fontFamily: fonts.data, fontSize: 12, color: colors.muted },
  historyValue: { fontFamily: fonts.dataBold, fontSize: 13, color: colors.chalk },
  hint: { fontFamily: fonts.body, fontSize: 10.5, color: colors.faint, marginTop: spacing.sm },
});
