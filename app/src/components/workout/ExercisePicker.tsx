import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";

import { useGetPRsQuery } from "../../api/analyticsApi";
import type { PersonalRecordDTO } from "../../api/analyticsApi";
import {
  useAddCustomExerciseMutation,
  useGetExerciseLastSessionsQuery,
  useSearchLibraryQuery,
} from "../../api/workoutApi";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { parseLocalDate } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

export interface PickedExercise {
  name: string;
  isBodyweight: boolean;
}

interface Props {
  visible: boolean;
  onPick: (exercise: PickedExercise) => void;
  onClose: () => void;
}

function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function ExercisePicker({ visible, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: results = [], isFetching } = useSearchLibraryQuery(
    { search: debouncedQuery || undefined },
    { skip: !visible }
  );
  const [addCustomExercise, { isLoading: addingCustom }] = useAddCustomExerciseMutation();

  // "my record" — Analytics Service's best-ever per exercise.
  const { data: prs = [] } = useGetPRsQuery(undefined, { skip: !visible });
  const prByName = useMemo(() => {
    const map = new Map<string, PersonalRecordDTO>();
    for (const pr of prs) map.set(pr.name, pr);
    return map;
  }, [prs]);

  // "the entire set history of previous day" — Workout Service's raw log,
  // bulk-fetched for exactly what's currently visible/filtered. A name with
  // no real history comes back null and nothing renders for it — this is
  // never fabricated from the library item alone.
  const visibleNames = useMemo(() => results.map((r) => r.name), [results]);
  const { data: lastSessions = {} } = useGetExerciseLastSessionsQuery(visibleNames, {
    skip: !visible || visibleNames.length === 0,
  });

  async function handleAddCustom() {
    const name = query.trim();
    if (!name) return;
    let isBodyweight = false;
    try {
      const created = await addCustomExercise({ name }).unwrap();
      isBodyweight = created.is_bodyweight;
    } catch {
      // If it already exists (e.g. re-adding your own custom entry), fall through and just use the name.
    }
    onPick({ name, isBodyweight });
    setQuery("");
  }

  function handlePick(name: string, isBodyweight: boolean) {
    onPick({ name, isBodyweight });
    setQuery("");
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Add exercise</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              placeholder="Search or add a custom exercise"
              placeholderTextColor={colors.dim}
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
            />
            <Pressable onPress={handleAddCustom} disabled={!query.trim() || addingCustom} style={styles.addBtn}>
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 360 }}
            ListEmptyComponent={
              !isFetching ? <Text style={styles.emptyText}>No matches — add it as custom above.</Text> : null
            }
            renderItem={({ item }) => {
              const pr = prByName.get(item.name);
              const lastSession = lastSessions[item.name];
              return (
                <Pressable style={styles.item} onPress={() => handlePick(item.name, item.is_bodyweight)}>
                  <Text style={styles.itemText}>
                    {item.name}
                    {item.is_bodyweight ? <Text style={styles.itemBodyweight}>  bodyweight</Text> : null}
                  </Text>
                  {lastSession ? (
                    <Text style={styles.itemHistory}>
                      Last {formatShortDate(lastSession.date)}:{" "}
                      {lastSession.sets.map((s) => `${s.weight}×${s.reps}`).join(", ")} kg
                    </Text>
                  ) : null}
                  {pr ? (
                    <Text style={styles.itemRecord}>
                      Record {pr.weight}kg × {pr.reps} ({formatShortDate(pr.date)})
                    </Text>
                  ) : null}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    maxHeight: "75%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: colors.chalk },
  searchRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  searchInput: {
    flex: 1,
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm + 2,
    color: colors.chalk,
    fontFamily: fonts.body,
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  addBtn: {
    backgroundColor: colors.border,
    borderRadius: radii.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.chalk },
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm + 2,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm - 2,
  },
  itemText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.chalk },
  itemBodyweight: { fontFamily: fonts.data, fontSize: 9.5, color: colors.dim, textTransform: "uppercase" },
  itemHistory: { fontFamily: fonts.data, fontSize: 10.5, color: colors.dim, marginTop: 3 },
  itemRecord: { fontFamily: fonts.data, fontSize: 10.5, color: colors.accentWarm, marginTop: 2 },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center", padding: spacing.lg },
});
