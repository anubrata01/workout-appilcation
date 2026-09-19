import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronDown, Dumbbell, Plus, Timer } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DayRecordCard } from "../../components/workout/DayRecordCard";
import { ExerciseCard } from "../../components/workout/ExerciseCard";
import { ExercisePicker } from "../../components/workout/ExercisePicker";
import type { PickedExercise } from "../../components/workout/ExercisePicker";
import { PrimaryButton } from "../../components/PrimaryButton";
import { RestTimer } from "../../components/workout/RestTimer";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SessionStatRow } from "../../components/workout/SessionStatRow";
import { SessionSummaryModal } from "../../components/workout/SessionSummaryModal";
import { useGetDayQuery, useGetExerciseLastSessionsQuery, useSaveDayMutation, workoutApi } from "../../api/workoutApi";
import type { ExerciseDTO } from "../../api/workoutApi";
import {
  dayOffset,
  estimateCalories,
  estimateCardioCalories,
  formatElapsedClock,
  keyFor,
} from "../../lib/workoutHelpers";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  exerciseAdded,
  exerciseRemoved,
  sessionCleared,
  sessionStarted,
  setAdded,
  setDoneToggled,
  setUpdated,
} from "../../store/activeSessionSlice";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { hideWorkoutTimerNotification, showWorkoutTimerNotification } from "../../lib/workoutNotification";
import type { MainTabScreenProps } from "../../navigation/types";

let localKeyCounter = 0;
function nextLocalKey() {
  localKeyCounter += 1;
  return `local-${Date.now()}-${localKeyCounter}`;
}

interface RestTarget {
  exerciseKey: string;
  setIndex: number;
  label: string;
}

/** The core loop, rebuilt around a timed start/finish session instead of
 * editing an arbitrary calendar date (app flow doc §2.6, redesigned). */
export function SessionScreen({ navigation }: MainTabScreenProps<"Session">) {
  const dispatch = useAppDispatch();
  const { status, startedAt, exercises } = useAppSelector((s) => s.activeSession);
  const [saveDay] = useSaveDayMutation();
  const [picking, setPicking] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restTarget, setRestTarget] = useState<RestTarget | null>(null);
  const [finishedSummary, setFinishedSummary] = useState<{
    duration: string;
    startedAt: string | null;
    finishedAt: string;
    sets: number;
    reps: number;
    calories: number;
    exercises: ExerciseDTO[];
  } | null>(null);

  const todayKey = keyFor(new Date());
  const yesterdayKey = keyFor(dayOffset(-1));
  const { data: todayDay, isLoading: todayLoading } = useGetDayQuery(todayKey, { skip: status === "active" });
  const { data: yesterdayDay, isLoading: yesterdayLoading } = useGetDayQuery(yesterdayKey, {
    skip: status === "active",
  });

  useEffect(() => {
    if (status !== "active" || !startedAt) return;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [status, startedAt]);

  // Android lock-screen/notification-shade timer, kept in sync with the
  // session's own lifecycle rather than the ticking clock above — it's
  // driven natively once posted (see workoutNotification.ts), so this only
  // needs to fire on start/stop, not every second. Also covers relaunching
  // the app mid-session (status is already "active" from persisted state on
  // first mount), which re-posts the same notification id idempotently.
  useEffect(() => {
    if (status === "active" && startedAt) {
      showWorkoutTimerNotification(startedAt);
    } else {
      hideWorkoutTimerNotification();
    }
  }, [status, startedAt]);

  const exerciseNames = exercises.map((e) => e.name);
  const { data: lastSessions = {} } = useGetExerciseLastSessionsQuery(exerciseNames, {
    skip: status !== "active" || exerciseNames.length === 0,
    refetchOnMountOrArgChange: true,
  });

  const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const totalReps = exercises.reduce(
    (sum, e) => (e.category === "cardio" ? sum : sum + e.sets.reduce((s, set) => s + (set.done ? set.reps : 0), 0)),
    0
  );
  const totalVolume = exercises.reduce(
    (sum, e) =>
      e.category === "cardio" ? sum : sum + e.sets.reduce((s, set) => s + (set.done ? set.weight * set.reps : 0), 0),
    0
  );
  const totalCardioMinutes = exercises.reduce(
    (sum, e) =>
      e.category !== "cardio" ? sum : sum + e.sets.reduce((s, set) => s + (set.done ? set.duration_minutes : 0), 0),
    0
  );
  const calories = estimateCalories(totalVolume) + estimateCardioCalories(totalCardioMinutes);

  function handlePick({ name, category, isBodyweight }: PickedExercise) {
    dispatch(exerciseAdded({ key: nextLocalKey(), name, category, isBodyweight }));
    setPicking(false);
  }

  function handleToggleDone(exerciseKey: string, index: number) {
    const exercise = exercises.find((e) => e.key === exerciseKey);
    const set = exercise?.sets[index];
    const willBeDone = set ? !set.done : false;
    dispatch(setDoneToggled({ key: exerciseKey, index }));
    // Marking a set done is, in the normal flow, "I just finished this set
    // right now" — auto-starting the rest timer here matches that moment
    // instead of making rest tracking a separate manual step.
    if (willBeDone && exercise) {
      setRestTarget({ exerciseKey, setIndex: index, label: `${exercise.name} · Set ${index + 1}` });
    }
  }

  function handleRestStop(elapsed: number) {
    if (restTarget) {
      dispatch(
        setUpdated({ key: restTarget.exerciseKey, index: restTarget.setIndex, field: "rest_seconds", value: elapsed })
      );
    }
    setRestTarget(null);
  }

  async function handleFinish() {
    if (exercises.length === 0) {
      Alert.alert("Nothing to finish", "Add at least one exercise before finishing the session.");
      return;
    }
    // Without this, tapping Finish twice in a row (e.g. it feels slow, or a
    // double-tap) fires two concurrent saves with the same exercises —
    // confirmed in production data as duplicate exercise entries on the same
    // day (workout-service serializers.py appends every save as new rows,
    // it doesn't dedupe against an in-flight one).
    if (isFinishing) return;
    setIsFinishing(true);
    const finishDate = keyFor(new Date());
    const startedAtIso = startedAt ? new Date(startedAt).toISOString() : null;
    const finishedAtIso = new Date().toISOString();
    try {
      const saved = await saveDay({
        date: finishDate,
        body: {
          duration_seconds: elapsedSeconds,
          started_at: startedAtIso,
          finished_at: finishedAtIso,
          exercises: exercises.map((e) => ({ name: e.name, category: e.category, sets: e.sets })),
        },
      }).unwrap();
      // Write the server's own response straight into the "Today" card's
      // cache instead of relying on the invalidated tag's background refetch
      // to land in time — that refetch was racing the getDay query's own
      // unpause (it's skipped the whole time status is "active", right up
      // until sessionCleared below flips it back), so a just-finished
      // session could show up empty until you left and came back to the
      // tab. This guarantees it's there the instant this screen re-renders.
      await dispatch(workoutApi.util.upsertQueryData("getDay", finishDate, saved));
      // Show the server's own response, not locally-computed numbers — if
      // this were ever empty after a "successful" save, that's proof of a
      // real backend problem, not just a missing confirmation screen.
      setFinishedSummary({
        duration: formatElapsedClock(elapsedSeconds),
        startedAt: startedAtIso,
        finishedAt: finishedAtIso,
        sets: totalSets,
        reps: totalReps,
        calories,
        exercises: saved.exercises,
      });
      dispatch(sessionCleared());
    } catch {
      Alert.alert("Couldn't save", "Something went wrong saving your session. Please try again.");
    } finally {
      setIsFinishing(false);
    }
  }

  function confirmDiscard() {
    Alert.alert("Discard workout?", "Nothing from this session will be saved.", [
      { text: "Cancel", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => dispatch(sessionCleared()) },
    ]);
  }

  if (status !== "active") {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.screen} edges={["top"]}>
          <ScrollView contentContainerStyle={styles.idleContent}>
            <View style={styles.idleCenter}>
              <Dumbbell size={40} color={colors.faint} />
              <Text style={styles.idleTitle}>Ready to train?</Text>
              <Text style={styles.idleSub}>Start a session to begin logging sets with a live timer.</Text>
              <View style={{ width: "100%", marginTop: spacing.xl }}>
                <PrimaryButton label="Start Workout" onPress={() => dispatch(sessionStarted())} />
              </View>
              <Text style={styles.historyLink} onPress={() => navigation.navigate("History")}>
                View past workouts
              </Text>
            </View>

            <View style={styles.recordRow}>
              <DayRecordCard
                label="Today"
                day={todayDay}
                isLoading={todayLoading}
                onPress={() => navigation.navigate("History", { initialOffset: 0 })}
              />
              <DayRecordCard
                label="Yesterday"
                day={yesterdayDay}
                isLoading={yesterdayLoading}
                onPress={() => navigation.navigate("History", { initialOffset: -1 })}
              />
            </View>
          </ScrollView>

          <SessionSummaryModal
            visible={!!finishedSummary}
            duration={finishedSummary?.duration ?? "00:00"}
            startedAt={finishedSummary?.startedAt ?? null}
            finishedAt={finishedSummary?.finishedAt ?? null}
            sets={finishedSummary?.sets ?? 0}
            reps={finishedSummary?.reps ?? 0}
            calories={finishedSummary?.calories ?? 0}
            exercises={finishedSummary?.exercises ?? []}
            onClose={() => setFinishedSummary(null)}
          />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          {/* Lives outside the ScrollView below, in the header — stays put
              when you scroll, instead of the timer disappearing along with
              the rest of the stat row. */}
          <View style={styles.timerPill}>
            <Timer size={14} color={colors.accentWarm} />
            <Text style={styles.timerPillText}>{formatElapsedClock(elapsedSeconds)}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.exitBtn} onPress={confirmDiscard} hitSlop={8}>
              <ChevronDown size={18} color={colors.muted} />
              <Text style={styles.exitBtnText}>Exit</Text>
            </Pressable>
            <Pressable
              style={[styles.finishBtn, isFinishing && styles.finishBtnDisabled]}
              onPress={handleFinish}
              disabled={isFinishing}
            >
              <Text style={styles.finishBtnText}>{isFinishing ? "Saving…" : "Finish"}</Text>
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <SessionStatRow
              duration={formatElapsedClock(elapsedSeconds)}
              sets={totalSets}
              reps={totalReps}
              calories={calories}
            />

            <RestTimer
              active={!!restTarget}
              targetLabel={restTarget?.label}
              onStop={handleRestStop}
              onDismiss={() => setRestTarget(null)}
            />

            {exercises.length === 0 ? (
              <View style={styles.emptyState}>
                <Dumbbell size={22} color={colors.faint} />
                <Text style={styles.emptyText}>Start by adding your first exercise</Text>
              </View>
            ) : (
              exercises.map((ex) => (
                <ExerciseCard
                  key={ex.key}
                  name={ex.name}
                  category={ex.category}
                  sets={ex.sets}
                  isBodyweight={ex.isBodyweight}
                  lastSession={lastSessions[ex.name]}
                  onRemove={() => dispatch(exerciseRemoved({ key: ex.key }))}
                  onAddSet={() => dispatch(setAdded({ key: ex.key }))}
                  onUpdateSet={(idx, field, value) => dispatch(setUpdated({ key: ex.key, index: idx, field, value }))}
                  onToggleDone={(idx) => handleToggleDone(ex.key, idx)}
                />
              ))
            )}

            <Pressable style={styles.addExerciseBtn} onPress={() => setPicking(true)}>
              <Plus size={16} color={colors.surface} />
              <Text style={styles.addExerciseLabel}>Add Exercises</Text>
            </Pressable>

            <Text style={styles.discardLink} onPress={confirmDiscard}>
              Discard workout
            </Text>

            <ExercisePicker visible={picking} onPick={handlePick} onClose={() => setPicking(false)} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.accentWarm,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  timerPillText: { fontFamily: fonts.dataBold, fontSize: 14, color: colors.chalk, fontVariant: ["tabular-nums"] },
  finishBtn: {
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  finishBtnDisabled: { opacity: 0.6 },
  finishBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.surface },
  exitBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  exitBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.muted },
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
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
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, textAlign: "center" },
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
  addExerciseLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.surface },
  discardLink: {
    textAlign: "center",
    marginTop: spacing.lg,
    color: colors.error,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },
  idleContent: {
    flexGrow: 1,
    padding: spacing.xxl,
    justifyContent: "center",
  },
  idleCenter: {
    alignItems: "center",
  },
  idleTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.chalk,
    letterSpacing: 1,
    marginTop: spacing.lg,
  },
  idleSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  historyLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.accentWarm,
    marginTop: spacing.xl,
  },
  recordRow: {
    flexDirection: "column",
    gap: spacing.sm + 2,
    marginTop: spacing.xxl,
  },
});
