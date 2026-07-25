import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Dumbbell, Plus } from "lucide-react-native";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CreateTagModal } from "../../components/workout/CreateTagModal";
import { ExerciseCard } from "../../components/workout/ExerciseCard";
import { ExercisePicker } from "../../components/workout/ExercisePicker";
import { LoadCard } from "../../components/workout/LoadCard";
import { TagChip } from "../../components/workout/TagChip";
import {
  useAddCustomTagMutation,
  useGetCustomTagsQuery,
  useGetDayQuery,
  useSaveDayMutation,
} from "../../api/workoutApi";
import type { SetEntryDTO, WorkoutDayDTO } from "../../api/workoutApi";
import {
  TAGS,
  colorForExerciseName,
  dayOffset,
  dayVolume,
  estimateCalories,
  formatDateHeader,
  keyFor,
  resolveTagColor,
} from "../../lib/workoutHelpers";
import { colors, fonts, spacing } from "../../theme/tokens";
import type { MainTabScreenProps } from "../../navigation/types";

interface LocalExercise {
  key: string;
  name: string;
  sets: SetEntryDTO[];
}

interface LocalDay {
  tag: string | null;
  exercises: LocalExercise[];
}

function fromServer(data: WorkoutDayDTO | null | undefined): LocalDay {
  if (!data) return { tag: null, exercises: [] };
  return { tag: data.tag, exercises: data.exercises.map((ex) => ({ key: ex.id, name: ex.name, sets: ex.sets })) };
}

let localKeyCounter = 0;
function nextLocalKey() {
  localKeyCounter += 1;
  return `local-${Date.now()}-${localKeyCounter}`;
}

const SAVE_DEBOUNCE_MS = 400;

/** The core loop (app flow doc §2.6) — ported from the prototype's LogTab, now
 * persisted per-user against the real Workout Service. */
export function LogScreen(_props: MainTabScreenProps<"Log">) {
  const [cursor, setCursor] = useState(0);
  const activeDate = dayOffset(cursor);
  const dateKey = keyFor(activeDate);
  const { day: dayName, date: dateLabel } = formatDateHeader(activeDate);
  const isToday = cursor >= 0; // cursor can't actually exceed 0 — the forward nav button is disabled there

  const { data, isLoading } = useGetDayQuery(dateKey);
  const [saveDay] = useSaveDayMutation();
  const { data: customTags = [] } = useGetCustomTagsQuery();
  const [addCustomTag, { isLoading: creatingTag }] = useAddCustomTagMutation();

  const [localDay, setLocalDay] = useState<LocalDay>({ tag: null, exercises: [] });
  const [picking, setPicking] = useState(false);
  const [creatingTagModal, setCreatingTagModal] = useState(false);

  const initializedDateRef = useRef<string | null>(null);
  const skipNextSaveRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-hydrate local editable state whenever we land on a date we haven't
  // already loaded server data for — local edits stay authoritative in
  // between (same "local state is the source of truth" pattern as the
  // prototype's `days` object), we just don't clobber them on every
  // save-triggered refetch.
  //
  // While that date's fetch is still in flight, show an empty placeholder —
  // never the previous date's data. Without this, navigating dates faster
  // than the network responds showed one day's numbers under a different
  // day's header (e.g. Thursday still showing Saturday's sets) until the
  // real fetch finally landed.
  useEffect(() => {
    if (initializedDateRef.current === dateKey) return;
    if (data === undefined && isLoading) {
      setLocalDay({ tag: null, exercises: [] });
      return;
    }
    initializedDateRef.current = dateKey;
    skipNextSaveRef.current = true;
    setLocalDay(fromServer(data));
  }, [dateKey, data, isLoading]);

  // Debounced save — fires ~400ms after the last edit instead of on every
  // keystroke, while still feeling live (TRD 4 offline/optimistic requirement).
  //
  // Must never fire before the real day has actually loaded for this date:
  // on a cold start, localDay starts as {tag: null, exercises: []} while the
  // GET is in flight — if that request takes longer than the debounce delay
  // (any real network latency), this effect would otherwise save that empty
  // placeholder first and wipe out whatever was really on the server just
  // before the fetch arrived to correct it. Gating on initializedDateRef
  // (not just skipNextSaveRef) closes that race regardless of timing.
  useEffect(() => {
    if (initializedDateRef.current !== dateKey) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDay({
        date: dateKey,
        body: {
          tag: localDay.tag,
          exercises: localDay.exercises.map((ex) => ({ name: ex.name, sets: ex.sets })),
        },
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDay]);

  function setDayTag(tag: string) {
    setLocalDay((d) => ({ ...d, tag }));
  }

  async function handleCreateTag(name: string) {
    try {
      const tag = await addCustomTag({ name, color: colorForExerciseName(name) }).unwrap();
      setDayTag(tag.name);
      setCreatingTagModal(false);
    } catch {
      // Most likely a duplicate name (unique per user) — leave the modal open so they can adjust it.
    }
  }

  function addExercise(name: string) {
    setLocalDay((d) => ({
      ...d,
      exercises: [...d.exercises, { key: nextLocalKey(), name, sets: [{ weight: 0, reps: 0, done: false }] }],
    }));
    setPicking(false);
  }

  function removeExercise(key: string) {
    setLocalDay((d) => ({ ...d, exercises: d.exercises.filter((e) => e.key !== key) }));
  }

  function addSet(key: string) {
    setLocalDay((d) => ({
      ...d,
      exercises: d.exercises.map((e) => {
        if (e.key !== key) return e;
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: false }] };
      }),
    }));
  }

  function updateSet(key: string, index: number, field: "weight" | "reps", value: number) {
    setLocalDay((d) => ({
      ...d,
      exercises: d.exercises.map((e) =>
        e.key === key ? { ...e, sets: e.sets.map((s, i) => (i === index ? { ...s, [field]: value } : s)) } : e
      ),
    }));
  }

  function toggleSetDone(key: string, index: number) {
    setLocalDay((d) => ({
      ...d,
      exercises: d.exercises.map((e) =>
        e.key === key ? { ...e, sets: e.sets.map((s, i) => (i === index ? { ...s, done: !s.done } : s)) } : e
      ),
    }));
  }

  const volume = dayVolume({ exercises: localDay.exercises });
  const calories = estimateCalories(volume);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.dateNav}>
        <Pressable style={styles.navBtn} onPress={() => setCursor((c) => c - 1)} hitSlop={8}>
          <ChevronLeft size={18} color={colors.chalk} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.dayName}>{dayName}</Text>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>
        {/* Can't log or edit a future date (TRD/backend guard mirrors this) — the button
            simply stops existing once you're back at today, instead of a read-only future view. */}
        <Pressable
          style={[styles.navBtn, isToday && styles.navBtnDisabled]}
          onPress={() => !isToday && setCursor((c) => c + 1)}
          disabled={isToday}
          hitSlop={8}
        >
          <ChevronRight size={18} color={isToday ? colors.faint : colors.chalk} />
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Tag today's session</Text>
      <View style={styles.tagRow}>
        {TAGS.map((t) => (
          <TagChip
            key={t.id}
            label={t.label}
            color={resolveTagColor(t.id, [])}
            active={localDay.tag === t.id}
            onPress={() => setDayTag(t.id)}
          />
        ))}
        {customTags.map((t) => (
          <TagChip
            key={t.id}
            label={t.name}
            color={t.color}
            active={localDay.tag === t.name}
            onPress={() => setDayTag(t.name)}
          />
        ))}
        <TagChip label="+ New tag" color={colors.dim} active={false} onPress={() => setCreatingTagModal(true)} />
      </View>

      <LoadCard
        volume={volume}
        calories={calories}
        exerciseCount={localDay.exercises.length}
        fillColor={resolveTagColor(localDay.tag, customTags)}
      />

      {localDay.exercises.length === 0 ? (
        <View style={styles.emptyState}>
          <Dumbbell size={22} color={colors.faint} />
          <Text style={styles.emptyText}>No sets logged yet. Pick a tag, then add your first exercise.</Text>
        </View>
      ) : (
        localDay.exercises.map((ex) => (
          <ExerciseCard
            key={ex.key}
            name={ex.name}
            sets={ex.sets}
            onRemove={() => removeExercise(ex.key)}
            onAddSet={() => addSet(ex.key)}
            onUpdateSet={(idx, field, value) => updateSet(ex.key, idx, field, value)}
            onToggleDone={(idx) => toggleSetDone(ex.key, idx)}
          />
        ))
      )}

      <Pressable style={styles.addExerciseBtn} onPress={() => setPicking(true)}>
        <Plus size={16} color={colors.track} />
        <Text style={styles.addExerciseLabel}>Add exercise</Text>
      </Pressable>

      <ExercisePicker
        visible={picking}
        tag={localDay.tag}
        onPick={addExercise}
        onClose={() => setPicking(false)}
      />

      <CreateTagModal
        visible={creatingTagModal}
        onCreate={handleCreateTag}
        onClose={() => setCreatingTagModal(false)}
        isLoading={creatingTag}
      />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.4 },
  dayName: { fontFamily: fonts.display, fontSize: 24, color: colors.chalk, letterSpacing: 1 },
  dateLabel: { fontFamily: fonts.data, fontSize: 11, color: colors.muted },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.dim,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm + 2,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 16,
    marginBottom: spacing.lg,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center", lineHeight: 18 },
  addExerciseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md + 1,
    marginTop: spacing.xs,
  },
  addExerciseLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.track },
});
