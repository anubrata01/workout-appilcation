import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Scale } from "lucide-react-native";

import { useGetMeasurementsQuery, useSaveMeasurementMutation } from "../../api/nutritionApi";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  /** The day this weight belongs to (YYYY-MM-DD). */
  dateKey: string;
  onOpenTrend?: () => void;
}

/** Quick weight entry for the day being viewed. Backed by the same body
 * measurements the Measurements screen charts, not a field on the food diary,
 * so one weigh-in shows up everywhere. */
export function BodyWeightCard({ dateKey, onOpenTrend }: Props) {
  // Same query the Measurements screen and Home use: one cached request serves all of them.
  const { data: readings = [] } = useGetMeasurementsQuery({ kind: "weight", range: "quarter" });
  const [saveMeasurement] = useSaveMeasurementMutation();

  const saved = readings.find((r) => r.date === dateKey)?.value ?? null;
  const [text, setText] = useState(saved != null ? String(saved) : "");

  // Re-sync when the saved value or the viewed date changes underneath us
  // (date arrows, a refetch), but never mid-typing, which only changes `text`.
  useEffect(() => {
    setText(saved != null ? String(saved) : "");
  }, [saved, dateKey]);

  async function commit(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") return; // clearing the box doesn't delete a reading; use the Measurements screen for that
    const parsed = parseFloat(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setText(saved != null ? String(saved) : "");
      return;
    }
    if (parsed === saved) return;
    try {
      await saveMeasurement({ date: dateKey, kind: "weight", value: parsed }).unwrap();
    } catch (e: any) {
      setText(saved != null ? String(saved) : "");
      Alert.alert("Couldn't save weight", String(e?.data?.detail ?? "Check the number and try again."));
    }
  }

  return (
    <Pressable style={styles.card} onPress={onOpenTrend} disabled={!onOpenTrend}>
      <View style={styles.left}>
        <Scale size={18} color="#7C6FE0" />
        <Text style={styles.caption}>Body weight</Text>
      </View>
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          onEndEditing={(e) => commit(e.nativeEvent.text)}
          placeholder="Log"
          placeholderTextColor={colors.dim}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <Text style={styles.unit}>kg</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 },
  caption: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  inputRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  input: {
    minWidth: 48,
    textAlign: "right",
    fontFamily: fonts.dataBold,
    fontSize: 16,
    color: colors.chalk,
    padding: 0,
  },
  unit: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
});
