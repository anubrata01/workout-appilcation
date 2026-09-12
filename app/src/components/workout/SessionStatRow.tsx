import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  duration: string; // pre-formatted, e.g. "00:12"
  sets: number;
  reps: number;
  calories: number;
}

// The live stat row shown at the top of an active session — Duration / Sets
// / Reps / Calories, matching the reference design. Deliberately no "total
// volume" tile here (dropped per the redesign brief); calories takes that
// slot instead.
export function SessionStatRow({ duration, sets, reps, calories }: Props) {
  return (
    <View style={styles.row}>
      <Stat label="Duration" value={duration} />
      <Stat label="Sets" value={String(sets)} />
      <Stat label="Reps" value={String(reps)} />
      <Stat label="Calories" value={String(calories)} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
  },
  value: {
    fontFamily: fonts.dataBold,
    fontSize: 16,
    color: colors.chalk,
  },
});
