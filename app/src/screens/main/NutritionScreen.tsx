import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Utensils } from "lucide-react-native";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddFoodModal } from "../../components/nutrition/AddFoodModal";
import type { NewFoodEntry } from "../../components/nutrition/AddFoodModal";
import { BodyWeightCard } from "../../components/nutrition/BodyWeightCard";
import { FoodEntryCard } from "../../components/nutrition/FoodEntryCard";
import { NutritionSummaryRow } from "../../components/nutrition/NutritionSummaryRow";
import { WaterTracker } from "../../components/nutrition/WaterTracker";
import { ScreenBackground } from "../../components/ScreenBackground";
import { useGetNutritionDayQuery, useSaveNutritionDayMutation } from "../../api/nutritionApi";
import type { FoodEntryDTO } from "../../api/nutritionApi";
import { dayOffset, formatDateHeader, keyFor } from "../../lib/workoutHelpers";
import { colors, fonts, spacing } from "../../theme/tokens";

let localKeyCounter = 0;
function nextLocalKey() {
  localKeyCounter += 1;
  return `food-local-${Date.now()}-${localKeyCounter}`;
}

const SAVE_DEBOUNCE_MS = 400;

/** A food diary — unlike the Session tab, there's no natural "start/finish"
 * moment for eating throughout a day, so this keeps the old
 * pick-a-date-and-autosave pattern instead of a timed session. */
export function NutritionScreen() {
  const [cursor, setCursor] = useState(0);
  const activeDate = dayOffset(cursor);
  const dateKey = keyFor(activeDate);
  const { day: dayName, date: dateLabel } = formatDateHeader(activeDate);
  const isToday = cursor >= 0;

  const { data, isLoading } = useGetNutritionDayQuery(dateKey);
  const [saveDay] = useSaveNutritionDayMutation();
  const [entries, setEntries] = useState<FoodEntryDTO[]>([]);
  const [waterMl, setWaterMl] = useState(0);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [addingFood, setAddingFood] = useState(false);

  const initializedDateRef = useRef<string | null>(null);
  const skipNextSaveRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Same "local state is the source of truth, re-hydrate only on a real date
  // change" pattern as the old Log screen used — see its comments for why
  // this avoids clobbering in-flight edits with a stale refetch.
  useEffect(() => {
    if (initializedDateRef.current === dateKey) return;
    if (data === undefined && isLoading) {
      setEntries([]);
      setWaterMl(0);
      setWeightKg(null);
      return;
    }
    initializedDateRef.current = dateKey;
    skipNextSaveRef.current = true;
    setEntries(data?.entries ?? []);
    setWaterMl(data?.water_ml ?? 0);
    setWeightKg(data?.weight_kg ?? null);
  }, [dateKey, data, isLoading]);

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
        body: { water_ml: waterMl, weight_kg: weightKg, entries: entries.map(({ id, ...rest }) => rest) },
      })
        .unwrap()
        .catch(() => {
          Alert.alert("Couldn't save", "Your nutrition log didn't save — check your connection and try again.");
        });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [entries, waterMl, weightKg, dateKey, saveDay]);

  function handleAdd(entry: NewFoodEntry) {
    setEntries((prev) => [...prev, { ...entry, id: nextLocalKey() }]);
    setAddingFood(false);
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein_g,
      carbs: acc.carbs + e.carbs_g,
      fat: acc.fat + e.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

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
            <Pressable
              style={[styles.navBtn, isToday && styles.navBtnDisabled]}
              onPress={() => !isToday && setCursor((c) => c + 1)}
              disabled={isToday}
              hitSlop={8}
            >
              <ChevronRight size={18} color={isToday ? colors.faint : colors.chalk} />
            </Pressable>
          </View>

          <NutritionSummaryRow
            calories={totals.calories}
            protein={totals.protein}
            carbs={totals.carbs}
            fat={totals.fat}
          />

          <WaterTracker waterMl={waterMl} onChange={setWaterMl} />
          <BodyWeightCard weightKg={weightKg} onChange={setWeightKg} />

          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Utensils size={22} color={colors.faint} />
              <Text style={styles.emptyText}>Nothing logged yet — add what you ate today.</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <FoodEntryCard key={entry.id} entry={entry} onRemove={() => removeEntry(entry.id)} />
            ))
          )}

          <Pressable style={styles.addBtn} onPress={() => setAddingFood(true)}>
            <Plus size={16} color={colors.surface} />
            <Text style={styles.addBtnLabel}>Add Food</Text>
          </Pressable>

          <AddFoodModal visible={addingFood} onAdd={handleAdd} onClose={() => setAddingFood(false)} />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md + 1,
    marginTop: spacing.xs,
  },
  addBtnLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.surface },
});
