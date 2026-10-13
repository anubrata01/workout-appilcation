import React, { useEffect, useRef, useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, Plus } from "lucide-react-native";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddFoodSheet } from "../../components/nutrition/AddFoodSheet";
import type { NewFoodEntry } from "../../components/nutrition/AddFoodSheet";
import { BodyWeightCard } from "../../components/nutrition/BodyWeightCard";
import { DaySummaryCard } from "../../components/nutrition/DaySummaryCard";
import { FoodEntryCard } from "../../components/nutrition/FoodEntryCard";
import { WaterTracker } from "../../components/nutrition/WaterTracker";
import { ScreenBackground } from "../../components/ScreenBackground";
import {
  MEALS,
  nutritionApi,
  useGetGoalsQuery,
  useGetNutritionDayQuery,
  useSaveNutritionDayMutation,
} from "../../api/nutritionApi";
import type { FoodEntryDTO, Meal } from "../../api/nutritionApi";
import { dayOffset, formatDateHeader, keyFor } from "../../lib/workoutHelpers";
import { entriesForMeal, mealForHour, sumEntries } from "../../lib/nutritionMath";
import { useAppDispatch } from "../../store/hooks";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { MainTabScreenProps } from "../../navigation/types";

let localKeyCounter = 0;
function nextLocalKey() {
  localKeyCounter += 1;
  return `food-local-${Date.now()}-${localKeyCounter}`;
}

const SAVE_DEBOUNCE_MS = 400;

const MEAL_TITLE: Record<Meal, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snacks" };

/** A food diary: unlike the Workout tab, there's no natural "start/finish"
 * moment for eating throughout a day, so this keeps the old
 * pick-a-date-and-autosave pattern instead of a timed session. */
export function NutritionScreen({ navigation }: MainTabScreenProps<"Nutrition">) {
  const [cursor, setCursor] = useState(0);
  const activeDate = dayOffset(cursor);
  const dateKey = keyFor(activeDate);
  const { day: dayName, date: dateLabel } = formatDateHeader(activeDate);
  const isToday = cursor >= 0;

  const dispatch = useAppDispatch();
  const { data, isLoading } = useGetNutritionDayQuery(dateKey);
  const { data: goals } = useGetGoalsQuery();
  const [saveDay] = useSaveNutritionDayMutation();
  const [entries, setEntries] = useState<FoodEntryDTO[]>([]);
  const [waterMl, setWaterMl] = useState(0);
  const [addingTo, setAddingTo] = useState<Meal | null>(null);

  const initializedDateRef = useRef<string | null>(null);
  const skipNextSaveRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The latest not-yet-sent save for whichever date scheduled it: read (and
  // sent immediately) by the flush effect below whenever you navigate away
  // from that date before the debounce timer got to fire on its own.
  const pendingSaveRef = useRef<{
    date: string;
    body: { water_ml: number; entries: Omit<FoodEntryDTO, "id">[] };
  } | null>(null);

  // Same "local state is the source of truth, re-hydrate only on a real date
  // change" pattern as the old Log screen used: this avoids clobbering
  // in-flight edits with a stale refetch.
  useEffect(() => {
    if (initializedDateRef.current === dateKey) return;
    if (data === undefined && isLoading) {
      setEntries([]);
      setWaterMl(0);
      return;
    }
    initializedDateRef.current = dateKey;
    skipNextSaveRef.current = true;
    setEntries(data?.entries ?? []);
    setWaterMl(data?.water_ml ?? 0);
  }, [dateKey, data, isLoading]);

  function flushPendingSave() {
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!pending) return;
    saveDay(pending)
      .unwrap()
      .then((saved) => {
        // Write the server's own response straight into the cache for that
        // date instead of waiting on the invalidated tag's background
        // refetch: if you navigate back to this date quickly, the
        // background refetch might not have landed yet and the hydrate
        // effect would otherwise show what was cached before this save.
        return dispatch(nutritionApi.util.upsertQueryData("getNutritionDay", pending.date, saved));
      })
      .catch(() => {
        Alert.alert("Couldn't save", "Your nutrition log didn't save. Check your connection and try again.");
      });
  }

  // Schedules the debounced save for the current date and keeps
  // pendingSaveRef pointing at the latest snapshot to send. Weight is
  // deliberately absent from the body: it lives in body measurements now, and
  // omitting it tells the server to leave the day's own weight untouched.
  useEffect(() => {
    if (initializedDateRef.current !== dateKey) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    pendingSaveRef.current = {
      date: dateKey,
      body: { water_ml: waterMl, entries: entries.map(({ id, ...rest }) => rest) },
    };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushPendingSave, SAVE_DEBOUNCE_MS);
  }, [entries, waterMl, dateKey, saveDay]);

  // Flushes a still-pending save the instant you leave the date that
  // scheduled it (arrow nav to another date, or leaving the screen/tab
  // entirely) instead of just cancelling it and silently losing the edit:
  // switching dates within the debounce window used to discard whatever you'd
  // just added.
  useEffect(() => {
    return () => flushPendingSave();
  }, [dateKey, saveDay]);

  function handleAdd(entry: NewFoodEntry) {
    setEntries((prev) => [...prev, { ...entry, id: nextLocalKey() }]);
    setAddingTo(null);
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const totals = sumEntries(entries);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.dateNav}>
            <Pressable style={styles.navBtn} onPress={() => setCursor((c) => c - 1)} hitSlop={8}>
              <ChevronLeft size={18} color={colors.chalk} />
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.dayName}>{dayName}</Text>
              <Text style={styles.dateLabel}>{dateLabel}</Text>
            </View>
            <View style={styles.navRight}>
              <Pressable style={styles.navBtn} onPress={() => navigation.navigate("NutritionInsights")} hitSlop={8}>
                <BarChart3 size={16} color={colors.chalk} />
              </Pressable>
              <Pressable
                style={[styles.navBtn, isToday && styles.navBtnDisabled]}
                onPress={() => !isToday && setCursor((c) => c + 1)}
                disabled={isToday}
                hitSlop={8}
              >
                <ChevronRight size={18} color={isToday ? colors.faint : colors.chalk} />
              </Pressable>
            </View>
          </View>

          <DaySummaryCard
            calories={totals.calories}
            protein={totals.protein}
            carbs={totals.carbs}
            fat={totals.fat}
            goals={goals}
            onSetGoals={() => navigation.navigate("Goals")}
          />

          <WaterTracker waterMl={waterMl} goalMl={goals?.water_ml} onChange={setWaterMl} />
          <BodyWeightCard dateKey={dateKey} onOpenTrend={() => navigation.navigate("Measurements", { kind: "weight" })} />

          {MEALS.map((meal) => {
            const mealEntries = entriesForMeal(entries, meal);
            const mealCalories = mealEntries.reduce((sum, e) => sum + e.calories, 0);
            return (
              <View key={meal} style={styles.mealSection}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealTitle}>{MEAL_TITLE[meal]}</Text>
                  <View style={styles.mealRight}>
                    <Text style={styles.mealKcal}>{mealCalories} kcal</Text>
                    <Pressable onPress={() => setAddingTo(meal)} hitSlop={8} style={styles.mealAdd}>
                      <Plus size={14} color={colors.chalk} />
                    </Pressable>
                  </View>
                </View>
                {mealEntries.map((entry) => (
                  <FoodEntryCard key={entry.id} entry={entry} onRemove={() => removeEntry(entry.id)} />
                ))}
              </View>
            );
          })}

          <Pressable style={styles.addBtn} onPress={() => setAddingTo(mealForHour(new Date().getHours()))}>
            <Plus size={16} color={colors.surface} />
            <Text style={styles.addBtnLabel}>Add Food</Text>
          </Pressable>

          {entries.length === 0 ? (
            <Text style={styles.emptyText}>Nothing logged yet. Add what you ate today.</Text>
          ) : null}
        </ScrollView>

        <AddFoodSheet
          visible={addingTo !== null}
          initialMeal={addingTo ?? "snack"}
          onAdd={handleAdd}
          onClose={() => setAddingTo(null)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2 },
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  navRight: { flexDirection: "row", gap: spacing.sm },
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
  mealSection: { marginBottom: spacing.md },
  mealHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  mealTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  mealRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  mealKcal: { fontFamily: fonts.data, fontSize: 11, color: colors.dim },
  mealAdd: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center", marginTop: spacing.lg },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 1,
    marginTop: spacing.sm,
  },
  addBtnLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.surface },
});
