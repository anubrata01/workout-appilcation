import React, { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { X } from "lucide-react-native";

import { useGetPRsQuery } from "../../api/analyticsApi";
import type { PersonalRecordDTO } from "../../api/analyticsApi";
import {
  useAddCustomExerciseMutation,
  useGetExerciseLastSessionsQuery,
  useSearchLibraryQuery,
} from "../../api/workoutApi";
import type { ExerciseCategory, LastSessionDTO, LibraryItemDTO } from "../../api/workoutApi";
import { STALE_AFTER } from "../../lib/cachePolicy";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { parseLocalDate } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { ExerciseThumb } from "./ExerciseThumb";

export interface PickedExercise {
  name: string;
  category: ExerciseCategory;
  isBodyweight: boolean;
  imageUrl?: string;
}

const MUSCLE_FILTERS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "forearms",
  "traps",
  "lower back",
  "cardio",
];
const PAGE_SIZE = 100;
const MAX_LIMIT = 500;
// The last-sessions endpoint looks up at most 50 names per call.
const HISTORY_LOOKUP_CAP = 50;

type Filter = "recent" | "all" | string;

function formatLastSession(category: ExerciseCategory, lastSession: LastSessionDTO): string {
  if (category === "cardio") {
    return lastSession.sets.map((s) => `${s.duration_minutes}min · ${s.distance_km}km`).join(", ");
  }
  return lastSession.sets.map((s) => `${s.weight}kg×${s.reps}`).join(", ");
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
  const [filter, setFilter] = useState<Filter>("recent");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const debouncedQuery = useDebouncedValue(query, 300);
  const searching = debouncedQuery.trim().length > 0;

  // Opens on what you actually train. If nothing's been logged yet there is
  // nothing "recent" to show, so quietly fall back to the full catalogue.
  const recentQuery = useSearchLibraryQuery({ recent: true, limit: 40 }, { skip: !visible });
  const noRecent = recentQuery.isSuccess && (recentQuery.data?.length ?? 0) === 0;
  const effectiveFilter: Filter = filter === "recent" && noRecent ? "all" : filter;
  const showingRecent = !searching && effectiveFilter === "recent";

  const { data: browsed = [], isFetching } = useSearchLibraryQuery(
    {
      search: searching ? debouncedQuery.trim() : undefined,
      muscle_group: !searching && effectiveFilter !== "all" && effectiveFilter !== "recent" ? effectiveFilter : undefined,
      limit,
    },
    { skip: !visible || showingRecent }
  );
  const results: LibraryItemDTO[] = showingRecent ? recentQuery.data ?? [] : browsed;

  const [addCustomExercise, { isLoading: addingCustom }] = useAddCustomExerciseMutation();

  // "my record": Analytics Service's best-ever per exercise. PRs are computed
  // by a separate async pipeline (Redis -> analytics-service), refreshed by
  // the delayed invalidation after each save (lib/analyticsSync.ts), so a
  // short staleness window is enough; no refetch on every open.
  const { data: prs = [] } = useGetPRsQuery(undefined, { skip: !visible, refetchOnMountOrArgChange: STALE_AFTER.picker });
  const prByName = useMemo(() => {
    const map = new Map<string, PersonalRecordDTO>();
    for (const pr of prs) map.set(pr.name, pr);
    return map;
  }, [prs]);

  // "the entire set history of previous day": Workout Service's raw log.
  // Only exercises that actually have a PR can have history, so look up just
  // those among what's visible (usually a handful) instead of every row.
  const historyNames = useMemo(
    () => results.map((r) => r.name).filter((n) => prByName.has(n)).slice(0, HISTORY_LOOKUP_CAP),
    [results, prByName]
  );
  const { data: lastSessions = {} } = useGetExerciseLastSessionsQuery(historyNames, {
    skip: !visible || historyNames.length === 0,
    refetchOnMountOrArgChange: STALE_AFTER.picker,
  });

  function reset() {
    setQuery("");
    setLimit(PAGE_SIZE);
  }

  async function handleAddCustom() {
    const name = query.trim();
    if (!name) return;
    let isBodyweight = false;
    let category: ExerciseCategory = "strength";
    try {
      const created = await addCustomExercise({ name }).unwrap();
      isBodyweight = created.is_bodyweight;
      category = created.category;
    } catch {
      // If it already exists (e.g. re-adding your own custom entry), fall through and just use the name.
    }
    onPick({ name, category, isBodyweight });
    reset();
  }

  function handlePick(item: LibraryItemDTO) {
    onPick({ name: item.name, category: item.category, isBodyweight: item.is_bodyweight, imageUrl: item.image_url });
    reset();
  }

  const canShowMore = !showingRecent && !searching && results.length >= limit && limit < MAX_LIMIT;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {[
                { key: "recent", label: "Recent" },
                { key: "all", label: "All" },
                ...MUSCLE_FILTERS.map((m) => ({ key: m, label: m })),
              ].map((chip) => (
                <Pressable
                  key={chip.key}
                  onPress={() => {
                    setFilter(chip.key);
                    setLimit(PAGE_SIZE);
                  }}
                  style={[styles.chip, !searching && effectiveFilter === chip.key && styles.chipActive]}
                >
                  <Text style={[styles.chipText, !searching && effectiveFilter === chip.key && styles.chipTextActive]}>
                    {chip.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 360 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                !isFetching ? <Text style={styles.emptyText}>No matches. Add it as custom above.</Text> : null
              }
              ListFooterComponent={
                canShowMore ? (
                  <Pressable style={styles.moreBtn} onPress={() => setLimit((l) => Math.min(l + PAGE_SIZE * 2, MAX_LIMIT))}>
                    <Text style={styles.moreText}>Show more</Text>
                  </Pressable>
                ) : null
              }
              renderItem={({ item }) => {
                const pr = prByName.get(item.name);
                const lastSession = lastSessions[item.name];
                return (
                  <Pressable style={styles.item} onPress={() => handlePick(item)}>
                    <ExerciseThumb uri={item.image_url} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemText}>
                        {item.name}
                        {item.category === "cardio" ? <Text style={styles.itemTag}>  cardio</Text> : null}
                        {item.is_bodyweight ? <Text style={styles.itemTag}>  bodyweight</Text> : null}
                      </Text>
                      {item.muscle_group ? <Text style={styles.itemMeta}>{item.muscle_group}</Text> : null}
                      {lastSession ? (
                        <Text style={styles.itemHistory}>
                          ({formatShortDate(lastSession.date)}: {formatLastSession(item.category, lastSession)})
                        </Text>
                      ) : null}
                      {pr ? (
                        <Text style={styles.itemRecord}>
                          Record {pr.weight}kg × {pr.reps} ({formatShortDate(pr.date)})
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
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
    maxHeight: "80%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: colors.chalk },
  searchRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
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
  chipRow: { flexGrow: 0, marginBottom: spacing.sm },
  chip: {
    backgroundColor: colors.track,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, textTransform: "capitalize" },
  chipTextActive: { color: colors.surface },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm + 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm - 2,
  },
  itemText: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.chalk },
  itemTag: { fontFamily: fonts.data, fontSize: 9.5, color: colors.dim, textTransform: "uppercase" },
  itemMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.dim, textTransform: "capitalize", marginTop: 1 },
  itemHistory: { fontFamily: fonts.data, fontSize: 10.5, color: colors.dim, marginTop: 3 },
  itemRecord: { fontFamily: fonts.data, fontSize: 10.5, color: colors.accentWarm, marginTop: 2 },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center", padding: spacing.lg },
  moreBtn: { alignItems: "center", paddingVertical: spacing.md },
  moreText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.accentWarm },
});
