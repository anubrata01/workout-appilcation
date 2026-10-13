import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Check, Trash2 } from "lucide-react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { ExerciseCategory, LastSessionDTO, SetEntryDTO, SetType } from "../../api/workoutApi";
import { parseLocalDate } from "../../lib/workoutHelpers";
import { ExerciseThumb } from "./ExerciseThumb";

type SetField = "weight" | "reps" | "duration_minutes" | "distance_km";

interface Props {
  name: string;
  category: ExerciseCategory;
  sets: SetEntryDTO[];
  isBodyweight?: boolean;
  imageUrl?: string;
  note?: string;
  lastSession?: LastSessionDTO | null;
  onOpenDetail: () => void;
  onRemove: () => void;
  onAddSet: () => void;
  onRemoveSet: (index: number) => void;
  onUpdateSet: (index: number, field: SetField, value: number) => void;
  onToggleDone: (index: number) => void;
  onCycleSetType: (index: number) => void;
  onNoteChange: (note: string) => void;
}

function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** What you did in this same set position last time, e.g. "60×8", for the PREVIOUS column. */
export function previousSetText(category: ExerciseCategory, previous: SetEntryDTO | undefined): string {
  if (!previous) return "";
  if (category === "cardio") {
    return previous.duration_minutes > 0 ? `${previous.duration_minutes}min` : "";
  }
  return previous.weight > 0 || previous.reps > 0 ? `${previous.weight}×${previous.reps}` : "";
}

const TYPE_STYLE: Record<SetType, { label: string | null; bg: string; fg: string }> = {
  normal: { label: null, bg: colors.track, fg: colors.dim },
  warmup: { label: "W", bg: "#FBE7B5", fg: colors.warning },
  drop: { label: "D", bg: "#DCD7F7", fg: "#5B4FC4" },
  failure: { label: "F", bg: "#FAD3CD", fg: colors.error },
};

export function ExerciseCard({
  name,
  category,
  sets,
  isBodyweight,
  imageUrl,
  note,
  lastSession,
  onOpenDetail,
  onRemove,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleDone,
  onCycleSetType,
  onNoteChange,
}: Props) {
  const [showNote, setShowNote] = useState(!!note);

  function confirmRemove() {
    // Deleting is effectively permanent once saved: it also removes this
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
        <ExerciseThumb uri={imageUrl} size={40} />
        <Pressable style={{ flex: 1 }} onPress={onOpenDetail}>
          <Text style={styles.name}>
            {name}
            {isCardio ? <Text style={styles.tag}>  cardio</Text> : null}
            {isBodyweight ? <Text style={styles.tag}>  bodyweight</Text> : null}
          </Text>
          {lastSession ? (
            <Text style={styles.lastSession}>Last time, {formatShortDate(lastSession.date)}</Text>
          ) : (
            <Text style={styles.lastSession}>Tap for history and records</Text>
          )}
        </Pressable>
        <Pressable onPress={confirmRemove} hitSlop={8}>
          <Trash2 size={14} color={colors.muted} />
        </Pressable>
      </View>

      {showNote ? (
        <TextInput
          style={styles.noteInput}
          value={note ?? ""}
          onChangeText={onNoteChange}
          placeholder="Note for this exercise"
          placeholderTextColor={colors.dim}
          multiline
        />
      ) : (
        <Pressable onPress={() => setShowNote(true)} hitSlop={6}>
          <Text style={styles.addNote}>+ Add note</Text>
        </Pressable>
      )}

      <View style={styles.setHeaderRow}>
        <Text style={[styles.colLabel, { flex: 0.5 }]}>SET</Text>
        <Text style={[styles.colLabel, { flex: 1.1 }]}>PREVIOUS</Text>
        {isCardio ? (
          <>
            <Text style={styles.colLabel}>MIN</Text>
            <Text style={styles.colLabel}>KM</Text>
          </>
        ) : (
          <>
            <Text style={styles.colLabel}>{isBodyweight ? "KG (OPT)" : "KG"}</Text>
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
          previous={previousSetText(category, lastSession?.sets[i])}
          canRemove={sets.length > 1}
          onRemove={() => onRemoveSet(i)}
          onUpdateSet={(field, value) => onUpdateSet(i, field, value)}
          onToggleDone={() => onToggleDone(i)}
          onCycleType={() => onCycleSetType(i)}
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
  previous: string;
  canRemove: boolean;
  onRemove: () => void;
  onUpdateSet: (field: SetField, value: number) => void;
  onToggleDone: () => void;
  onCycleType: () => void;
}

// Values are edited as free text locally, not derived straight from the
// numeric prop on every keystroke: a controlled input that reformats via
// parseFloat(v) -> String(...) on every change strips a trailing "." the
// instant you type it (parseFloat("23.") === 23), so "23.5" was never
// reachable one digit at a time. Keeping local text state means the field
// only reflects what was actually typed; onUpdateSet still fires on every
// change so the parsed number reaches the parent/Redux immediately.
//
// The effects below re-sync the text when the NUMBER changes from outside
// (removing a set above shifts later rows up under the same React key), but
// leave it alone while it still parses to the same number, so "23." survives.
function SetRow({
  index,
  set,
  isCardio,
  previous,
  canRemove,
  onRemove,
  onUpdateSet,
  onToggleDone,
  onCycleType,
}: SetRowProps) {
  const primaryValue = isCardio ? set.duration_minutes : set.weight;
  const secondaryValue = isCardio ? set.distance_km : set.reps;
  const [primaryText, setPrimaryText] = useState(String(primaryValue));
  const [secondaryText, setSecondaryText] = useState(String(secondaryValue));

  useEffect(() => {
    if ((parseFloat(primaryText) || 0) !== primaryValue) setPrimaryText(String(primaryValue));
  }, [primaryValue]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if ((parseFloat(secondaryText) || 0) !== secondaryValue) setSecondaryText(String(secondaryValue));
  }, [secondaryValue]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function confirmRemoveSet() {
    if (!canRemove) return;
    Alert.alert(`Remove set ${index + 1}?`, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: onRemove },
    ]);
  }

  const type = TYPE_STYLE[set.set_type ?? "normal"];

  return (
    <View style={styles.setRowWrap}>
      <View style={styles.setRow}>
        <View style={{ flex: 0.5 }}>
          <Pressable
            onPress={onCycleType}
            onLongPress={confirmRemoveSet}
            style={[styles.typeChip, { backgroundColor: type.bg }]}
            hitSlop={4}
          >
            <Text style={[styles.typeChipText, { color: type.fg }]}>{type.label ?? index + 1}</Text>
          </Pressable>
        </View>
        <Text style={[styles.previous, { flex: 1.1 }]} numberOfLines={1}>
          {previous}
        </Text>
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
      {set.rest_seconds != null ? <Text style={styles.restBadge}>rest: {set.rest_seconds}s</Text> : null}
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
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  name: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.chalk },
  tag: { fontFamily: fonts.data, fontSize: 9.5, color: colors.dim, textTransform: "uppercase" },
  lastSession: { fontFamily: fonts.data, fontSize: 10.5, color: colors.dim, marginTop: 2 },
  addNote: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.dim, marginBottom: spacing.sm },
  noteInput: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.chalk,
    backgroundColor: colors.track,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 36,
  },
  setHeaderRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs + 2 },
  colLabel: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 9.5, color: colors.faint, letterSpacing: 1 },
  setRowWrap: { marginBottom: spacing.xs + 2 },
  setRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  typeChip: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  typeChipText: { fontFamily: fonts.dataBold, fontSize: 12 },
  previous: { fontFamily: fonts.data, fontSize: 11, color: colors.dim },
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
