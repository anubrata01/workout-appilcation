import React from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Check, Trash2 } from "lucide-react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { LastSessionDTO, SetEntryDTO } from "../../api/workoutApi";
import { parseLocalDate } from "../../lib/workoutHelpers";

interface Props {
  name: string;
  sets: SetEntryDTO[];
  isBodyweight?: boolean;
  lastSession?: LastSessionDTO | null;
  onRemove: () => void;
  onAddSet: () => void;
  onUpdateSet: (index: number, field: "weight" | "reps", value: number) => void;
  onToggleDone: (index: number) => void;
}

function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function ExerciseCard({
  name,
  sets,
  isBodyweight,
  lastSession,
  onRemove,
  onAddSet,
  onUpdateSet,
  onToggleDone,
}: Props) {
  function confirmRemove() {
    // Deleting is effectively permanent once saved — it also removes this
    // exercise's contribution to today's PRs/reports the next time Analytics
    // recomputes, so it deserves a confirmation, not a silent one-tap remove.
    Alert.alert(`Remove ${name}?`, "This removes all its sets from today's log.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: onRemove },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {name}
            {isBodyweight ? <Text style={styles.bodyweightTag}>  bodyweight</Text> : null}
          </Text>
          {lastSession ? (
            <Text style={styles.lastSession}>
              Last {formatShortDate(lastSession.date)}: {lastSession.sets.map((s) => `${s.weight}×${s.reps}`).join(", ")} kg
            </Text>
          ) : null}
        </View>
        <Pressable onPress={confirmRemove} hitSlop={8}>
          <Trash2 size={14} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.setHeaderRow}>
        <Text style={[styles.colLabel, { flex: 0.6 }]}>SET</Text>
        <Text style={styles.colLabel}>WEIGHT (kg){isBodyweight ? " · OPT" : ""}</Text>
        <Text style={styles.colLabel}>REPS</Text>
        <Text style={[styles.colLabel, { flex: 0.6, textAlign: "right" }]}>DONE</Text>
      </View>

      {sets.map((s, i) => (
        <View key={i} style={styles.setRow}>
          <Text style={[styles.setIndex, { flex: 0.6 }]}>{i + 1}</Text>
          <TextInput
            value={String(s.weight)}
            onChangeText={(v) => onUpdateSet(i, "weight", parseFloat(v) || 0)}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <TextInput
            value={String(s.reps)}
            onChangeText={(v) => onUpdateSet(i, "reps", parseInt(v, 10) || 0)}
            keyboardType="number-pad"
            style={styles.input}
          />
          <View style={{ flex: 0.6, alignItems: "flex-end" }}>
            <Pressable
              onPress={() => onToggleDone(i)}
              style={[
                styles.checkBtn,
                { backgroundColor: s.done ? colors.accent : "transparent", borderColor: s.done ? colors.accent : colors.border },
              ]}
            >
              {s.done ? <Check size={12} color={colors.track} strokeWidth={3} /> : null}
            </Pressable>
          </View>
        </View>
      ))}

      <Pressable onPress={onAddSet} hitSlop={6}>
        <Text style={styles.addSet}>+ Add set</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg - 2,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm + 2 },
  name: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.chalk },
  bodyweightTag: { fontFamily: fonts.data, fontSize: 9.5, color: colors.dim, textTransform: "uppercase" },
  lastSession: { fontFamily: fonts.data, fontSize: 10.5, color: colors.dim, marginTop: 2 },
  setHeaderRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs + 2 },
  colLabel: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 9.5, color: colors.faint, letterSpacing: 1 },
  setRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", marginBottom: spacing.xs + 2 },
  setIndex: { fontFamily: fonts.data, fontSize: 12, color: colors.dim },
  input: {
    flex: 1,
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    color: colors.chalk,
    fontFamily: fonts.data,
    fontSize: 13,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 3,
  },
  checkBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  addSet: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.accentWarm,
    marginTop: spacing.xs,
  },
});
