import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Check, Trash2 } from "lucide-react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { ExerciseCategory, LastSessionDTO, SetEntryDTO } from "../../api/workoutApi";
import { parseLocalDate } from "../../lib/workoutHelpers";

type SetField = "weight" | "reps" | "duration_minutes" | "distance_km";

interface Props {
  name: string;
  category: ExerciseCategory;
  sets: SetEntryDTO[];
  isBodyweight?: boolean;
  lastSession?: LastSessionDTO | null;
  onRemove: () => void;
  onAddSet: () => void;
  onUpdateSet: (index: number, field: SetField, value: number) => void;
  onToggleDone: (index: number) => void;
}

function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function formatLastSessionSets(category: ExerciseCategory, lastSession: LastSessionDTO): string {
  if (category === "cardio") {
    return lastSession.sets.map((s) => `${s.duration_minutes}min·${s.distance_km}km`).join(", ");
  }
  return lastSession.sets.map((s) => `${s.weight}kg×${s.reps}`).join(", ");
}

export function ExerciseCard({
  name,
  category,
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

  const isCardio = category === "cardio";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {name}
            {isCardio ? <Text style={styles.bodyweightTag}>  cardio</Text> : null}
            {isBodyweight ? <Text style={styles.bodyweightTag}>  bodyweight</Text> : null}
          </Text>
          {lastSession ? (
            <Text style={styles.lastSession}>
              ({formatShortDate(lastSession.date)}: {formatLastSessionSets(category, lastSession)})
            </Text>
          ) : null}
        </View>
        <Pressable onPress={confirmRemove} hitSlop={8}>
          <Trash2 size={14} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.setHeaderRow}>
        <Text style={[styles.colLabel, { flex: 0.6 }]}>SET</Text>
        {isCardio ? (
          <>
            <Text style={styles.colLabel}>DURATION (min)</Text>
            <Text style={styles.colLabel}>DISTANCE (km)</Text>
          </>
        ) : (
          <>
            <Text style={styles.colLabel}>WEIGHT (kg){isBodyweight ? " · OPT" : ""}</Text>
            <Text style={styles.colLabel}>REPS</Text>
          </>
        )}
        <Text style={[styles.colLabel, { flex: 0.6, textAlign: "right" }]}>DONE</Text>
      </View>

      {sets.map((s, i) => (
        <SetRow
          key={i}
          index={i}
          set={s}
          isCardio={isCardio}
          onUpdateSet={(field, value) => onUpdateSet(i, field, value)}
          onToggleDone={() => onToggleDone(i)}
        />
      ))}

      <Pressable onPress={onAddSet} hitSlop={6}>
        <Text style={styles.addSet}>+ Add set</Text>
      </Pressable>
    </View>
  );
}

interface SetRowProps {
  index: number;
  set: SetEntryDTO;
  isCardio: boolean;
  onUpdateSet: (field: SetField, value: number) => void;
  onToggleDone: () => void;
}

// Values are edited as free text locally, not derived straight from the
// numeric prop on every keystroke — a controlled input that reformats via
// parseFloat(v) -> String(...) on every change strips a trailing "." the
// instant you type it (parseFloat("23.") === 23), so "23.5" was never
// reachable one digit at a time. Keeping local text state means the field
// only reflects what was actually typed; onUpdateSet still fires on every
// change so the parsed number reaches the parent/Redux immediately.
function SetRow({ index, set, isCardio, onUpdateSet, onToggleDone }: SetRowProps) {
  const [primaryText, setPrimaryText] = useState(String(isCardio ? set.duration_minutes : set.weight));
  const [secondaryText, setSecondaryText] = useState(String(isCardio ? set.distance_km : set.reps));

  function handlePrimaryChange(v: string) {
    if (!/^\d*\.?\d*$/.test(v)) return; // digits and at most one decimal point
    setPrimaryText(v);
    onUpdateSet(isCardio ? "duration_minutes" : "weight", parseFloat(v) || 0);
  }

  function handleSecondaryChange(v: string) {
    if (isCardio) {
      if (!/^\d*\.?\d*$/.test(v)) return;
      setSecondaryText(v);
      onUpdateSet("distance_km", parseFloat(v) || 0);
    } else {
      if (!/^\d*$/.test(v)) return;
      setSecondaryText(v);
      onUpdateSet("reps", parseInt(v, 10) || 0);
    }
  }

  return (
    <View style={styles.setRowWrap}>
      <View style={styles.setRow}>
        <Text style={[styles.setIndex, { flex: 0.6 }]}>{index + 1}</Text>
        <TextInput
          value={primaryText}
          onChangeText={handlePrimaryChange}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <TextInput
          value={secondaryText}
          onChangeText={handleSecondaryChange}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <View style={{ flex: 0.6, alignItems: "flex-end" }}>
          <Pressable
            onPress={onToggleDone}
            style={[
              styles.checkBtn,
              { backgroundColor: set.done ? colors.accent : "transparent", borderColor: set.done ? colors.accent : colors.border },
            ]}
          >
            {set.done ? <Check size={12} color={colors.track} strokeWidth={3} /> : null}
          </Pressable>
        </View>
      </View>
      {set.rest_seconds != null ? (
        <Text style={styles.restBadge}>rest: {set.rest_seconds}s</Text>
      ) : null}
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
  setRowWrap: { marginBottom: spacing.xs + 2 },
  setRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
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
  restBadge: {
    fontFamily: fonts.data,
    fontSize: 9.5,
    color: colors.accentWarm,
    marginTop: 2,
    marginLeft: spacing.sm + 24, // roughly aligns under the SET index column
  },
  addSet: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.accentWarm,
    marginTop: spacing.xs,
  },
});
