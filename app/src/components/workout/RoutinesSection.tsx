import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ListChecks, Pencil, Play, Plus } from "lucide-react-native";

import type { RoutineDTO } from "../../api/workoutApi";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { ExerciseThumb } from "./ExerciseThumb";

interface Props {
  routines: RoutineDTO[];
  onStart: (routine: RoutineDTO) => void;
  onEdit: (routine: RoutineDTO) => void;
  onCreate: () => void;
}

/** Saved routines on the idle Workout screen: tap Start to begin a session
 * pre-filled with that routine's exercises and set counts. */
export function RoutinesSection({ routines, onStart, onEdit, onCreate }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <ListChecks size={14} color={colors.muted} />
          <Text style={styles.title}>Routines</Text>
        </View>
        <Pressable onPress={onCreate} hitSlop={8} style={styles.newBtn}>
          <Plus size={13} color={colors.accentWarm} />
          <Text style={styles.newText}>New</Text>
        </Pressable>
      </View>

      {routines.length === 0 ? (
        <Text style={styles.empty}>
          Save a workout you repeat as a routine. Create one here, or tap "Save as routine" after you finish a session.
        </Text>
      ) : (
        routines.map((routine) => (
          <Pressable
            key={routine.id}
            style={styles.card}
            onPress={() => onStart(routine)}
            onLongPress={() => Alert.alert(routine.name, undefined, [{ text: "Edit", onPress: () => onEdit(routine) }, { text: "Close", style: "cancel" }])}
          >
            <View style={styles.thumbs}>
              {routine.items.slice(0, 3).map((item, i) => (
                <View key={`${item.name}-${i}`} style={[styles.thumbWrap, { marginLeft: i === 0 ? 0 : -10 }]}>
                  <ExerciseThumb name={item.name} category={item.category} size={32} />
                </View>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{routine.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {routine.items.length} {routine.items.length === 1 ? "exercise" : "exercises"}
                {routine.items.length > 0 ? ` · ${routine.items.map((i) => i.name).join(", ")}` : ""}
              </Text>
            </View>
            <Pressable onPress={() => onEdit(routine)} hitSlop={8} style={styles.iconBtn}>
              <Pencil size={14} color={colors.muted} />
            </Pressable>
            <View style={styles.startPill}>
              <Play size={12} color={colors.surface} fill={colors.surface} />
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: "100%", marginTop: spacing.xxl },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  newText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.accentWarm },
  empty: { fontFamily: fonts.body, fontSize: 12, color: colors.dim, lineHeight: 17 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  thumbs: { flexDirection: "row", width: 74 },
  thumbWrap: { borderRadius: radii.sm + 1, borderWidth: 2, borderColor: colors.surface, overflow: "hidden" },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.chalk },
  meta: { fontFamily: fonts.body, fontSize: 11, color: colors.dim, marginTop: 2 },
  iconBtn: { padding: 4 },
  startPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
