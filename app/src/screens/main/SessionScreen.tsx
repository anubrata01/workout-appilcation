import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronDown, Dumbbell, Plus } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ExerciseCard } from "../../components/workout/ExerciseCard";
import { ExercisePicker } from "../../components/workout/ExercisePicker";
import type { PickedExercise } from "../../components/workout/ExercisePicker";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenBackground } from "../../components/ScreenBackground";
import { SessionStatRow } from "../../components/workout/SessionStatRow";
import { useGetExerciseLastSessionsQuery, useSaveDayMutation } from "../../api/workoutApi";
import { estimateCalories, keyFor } from "../../lib/workoutHelpers";
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
import type { MainTabScreenProps } from "../../navigation/types";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

let localKeyCounter = 0;
function nextLocalKey() {
  localKeyCounter += 1;
  return `local-${Date.now()}-${localKeyCounter}`;
}

/** The core loop, rebuilt around a timed start/finish session instead of
 * editing an arbitrary calendar date (app flow doc §2.6, redesigned). */
export function SessionScreen({ navigation }: MainTabScreenProps<"Session">) {
  const dispatch = useAppDispatch();
  const { status, startedAt, exercises } = useAppSelector((s) => s.activeSession);
  const [saveDay] = useSaveDayMutation();
  const [picking, setPicking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (status !== "active" || !startedAt) return;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [status, startedAt]);

  const exerciseNames = exercises.map((e) => e.name);
  const { data: lastSessions = {} } = useGetExerciseLastSessionsQuery(exerciseNames, {
    skip: status !== "active" || exerciseNames.length === 0,
  });

  const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const totalReps = exercises.reduce((sum, e) => sum + e.sets.reduce((s, set) => s + (set.done ? set.reps : 0), 0), 0);
  const totalVolume = exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, set) => s + (set.done ? set.weight * set.reps : 0), 0),
    0
  );
  const calories = estimateCalories(totalVolume);

  function handlePick({ name, isBodyweight }: PickedExercise) {
    dispatch(exerciseAdded({ key: nextLocalKey(), name, isBodyweight }));
    setPicking(false);
  }

  async function handleFinish() {
    if (exercises.length === 0) {
      Alert.alert("Nothing to finish", "Add at least one exercise before finishing the session.");
      return;
    }
    try {
      await saveDay({
        date: keyFor(new Date()),
        body: {
          duration_seconds: elapsedSeconds,
          exercises: exercises.map((e) => ({ name: e.name, sets: e.sets })),
        },
      }).unwrap();
      dispatch(sessionCleared());
    } catch {
      Alert.alert("Couldn't save", "Something went wrong saving your session — please try again.");
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
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={() => navigation.navigate("History")}>
            <ChevronDown size={22} color={colors.chalk} />
          </Pressable>
          <Pressable style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>Finish</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <SessionStatRow
              duration={formatDuration(elapsedSeconds)}
              sets={totalSets}
              reps={totalReps}
              calories={calories}
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
                  sets={ex.sets}
                  isBodyweight={ex.isBodyweight}
                  lastSession={lastSessions[ex.name]}
                  onRemove={() => dispatch(exerciseRemoved({ key: ex.key }))}
                  onAddSet={() => dispatch(setAdded({ key: ex.key }))}
                  onUpdateSet={(idx, field, value) => dispatch(setUpdated({ key: ex.key, index: idx, field, value }))}
                  onToggleDone={(idx) => dispatch(setDoneToggled({ key: ex.key, index: idx }))}
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
  finishBtn: {
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  finishBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.surface },
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
  idleCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
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
});
