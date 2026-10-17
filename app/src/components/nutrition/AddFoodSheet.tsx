import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronLeft, Plus, Search, X } from "lucide-react-native";

import {
  MEALS,
  useCreateFoodMutation,
  useDeleteFoodMutation,
  useGetMyFoodsQuery,
  useGetRecentFoodsQuery,
  useSearchFoodsQuery,
} from "../../api/nutritionApi";
import type { FoodDTO, FoodEntryDTO, Meal } from "../../api/nutritionApi";
import { STALE_AFTER } from "../../lib/cachePolicy";
import {
  OZ_IN_GRAMS,
  formatTimeHHMM,
  fromGrams,
  scaleFood,
  toGrams,
  type ServingUnit,
} from "../../lib/nutritionMath";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { PrimaryButton } from "../PrimaryButton";
import { FadeSwap } from "../FadeSwap";
import { MacroDonut } from "./MacroDonut";

export type NewFoodEntry = Omit<FoodEntryDTO, "id">;

interface Props {
  visible: boolean;
  initialMeal: Meal;
  onAdd: (entry: NewFoodEntry) => void;
  onClose: () => void;
}

type Tab = "search" | "recent" | "mine" | "manual";

const TABS: { key: Tab; label: string }[] = [
  { key: "search", label: "Search" },
  { key: "recent", label: "Recent" },
  { key: "mine", label: "My Foods" },
  { key: "manual", label: "Quick add" },
];

const MEAL_LABEL: Record<Meal, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

function describe(food: FoodDTO): string {
  return `Per 100 g · ${Math.round(food.calories_100g)} kcal · P ${Math.round(food.protein_100g)}g · C ${Math.round(
    food.carbs_100g
  )}g · F ${Math.round(food.fat_100g)}g`;
}

/** Logging food: search the catalogue (or your own foods / recents), pick an
 * amount, see the macros update live, add it to a meal. Quick add covers
 * anything not in the catalogue, and can save it to My Foods for next time. */
export function AddFoodSheet({ visible, initialMeal, onAdd, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("search");
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FoodDTO | null>(null);
  const debounced = useDebouncedValue(query.trim(), 300);

  useEffect(() => {
    if (visible) {
      setMeal(initialMeal);
      setTab("search");
      setQuery("");
      setSelected(null);
    }
  }, [visible, initialMeal]);

  const search = useSearchFoodsQuery(debounced, { skip: !visible || tab !== "search" || debounced.length < 2 });
  const recent = useGetRecentFoodsQuery(undefined, {
    skip: !visible || tab !== "recent",
    refetchOnMountOrArgChange: STALE_AFTER.home,
  });
  const mine = useGetMyFoodsQuery(undefined, { skip: !visible || tab !== "mine" });
  const [deleteFood] = useDeleteFoodMutation();

  function addEntry(entry: NewFoodEntry) {
    onAdd({ ...entry, meal, eaten_at: formatTimeHHMM(new Date()) });
  }

  function quickAddFood(food: FoodDTO) {
    const grams = food.serving_g || 100;
    const m = scaleFood(food, grams);
    addEntry({
      name: food.name,
      quantity_label: food.serving_label ? `1 ${food.serving_label}` : `${grams} g`,
      ...m,
      meal,
      eaten_at: null,
      serving_amount: grams,
      serving_unit: "g",
      food_id: food.is_mine ? food.id : food.id,
    });
  }

  function addRecent(entry: FoodEntryDTO) {
    const { id: _id, ...rest } = entry;
    addEntry(rest);
  }

  function confirmDeleteFood(food: FoodDTO) {
    Alert.alert(`Delete ${food.name}?`, "It is removed from My Foods. Meals you already logged keep it.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteFood(food.id) },
    ]);
  }

  const listData: FoodDTO[] = tab === "search" ? search.data ?? [] : tab === "mine" ? mine.data ?? [] : [];
  const loading = (tab === "search" && search.isFetching) || (tab === "mine" && mine.isLoading);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => (selected ? setSelected(null) : onClose())}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => (selected ? setSelected(null) : onClose())} hitSlop={10} style={styles.topBtn}>
            {selected ? <ChevronLeft size={20} color={colors.chalk} /> : <X size={20} color={colors.chalk} />}
          </Pressable>
          <Text style={styles.topTitle}>{selected ? "Amount" : "Add food"}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealRow} contentContainerStyle={styles.mealRowContent}>
          {MEALS.map((m) => (
            <Pressable key={m} onPress={() => setMeal(m)} style={[styles.mealChip, meal === m && styles.mealChipActive]}>
              <Text style={[styles.mealChipText, meal === m && styles.mealChipTextActive]}>{MEAL_LABEL[m]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <FadeSwap trigger={selected ? `detail-${selected.id}` : `${tab}-${debounced}`}>
        {selected ? (
          <FoodDetail food={selected} meal={meal} onAdd={(entry) => addEntry(entry)} />
        ) : (
          <>
            <View style={styles.tabRow}>
              {TABS.map((t) => (
                <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
                  <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            {tab === "search" ? (
              <View style={styles.searchBox}>
                <Search size={16} color={colors.dim} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search foods, e.g. paneer, oats, chicken"
                  placeholderTextColor={colors.dim}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {query ? (
                  <Pressable onPress={() => setQuery("")} hitSlop={8}>
                    <X size={15} color={colors.dim} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {tab === "manual" ? (
              <ManualEntry
                onAdd={(entry) => addEntry(entry)}
                onSavedFood={() => setTab("mine")}
              />
            ) : tab === "recent" ? (
              <FlatList
                data={recent.data ?? []}
                keyExtractor={(item, i) => `${item.name}-${i}`}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  recent.isLoading ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <Text style={styles.empty}>Foods you log will show up here for one-tap re-adding.</Text>
                  )
                }
                renderItem={({ item }) => (
                  <Pressable style={styles.row} onPress={() => addRecent(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{item.name}</Text>
                      <Text style={styles.rowMeta}>
                        {item.quantity_label || (item.serving_amount ? `${item.serving_amount} ${item.serving_unit}` : "1 serving")}{" "}
                        · {item.calories} kcal · P {Math.round(item.protein_g)}g
                      </Text>
                    </View>
                    <View style={styles.plus}>
                      <Plus size={16} color={colors.chalk} />
                    </View>
                  </Pressable>
                )}
              />
            ) : (
              <FlatList
                data={listData}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  loading ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : tab === "search" ? (
                    <Text style={styles.empty}>
                      {debounced.length < 2
                        ? "Type at least two letters to search."
                        : "No matches. Use Quick add to enter it yourself."}
                    </Text>
                  ) : (
                    <Text style={styles.empty}>Foods you save with Quick add live here.</Text>
                  )
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.row}
                    onPress={() => setSelected(item)}
                    onLongPress={item.is_mine ? () => confirmDeleteFood(item) : undefined}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>
                        {item.name}
                        {item.is_approx ? <Text style={styles.approx}>  approx</Text> : null}
                        {item.is_mine && tab === "search" ? <Text style={styles.approx}>  mine</Text> : null}
                      </Text>
                      {item.brand ? <Text style={styles.rowBrand}>{item.brand}</Text> : null}
                      <Text style={styles.rowMeta}>{describe(item)}</Text>
                    </View>
                    <Pressable style={styles.plus} onPress={() => quickAddFood(item)} hitSlop={6}>
                      <Plus size={16} color={colors.chalk} />
                    </Pressable>
                  </Pressable>
                )}
              />
            )}
          </>
        )}
        </FadeSwap>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FoodDetail({ food, meal, onAdd }: { food: FoodDTO; meal: Meal; onAdd: (entry: NewFoodEntry) => void }) {
  const [unit, setUnit] = useState<ServingUnit>("g");
  const [amountText, setAmountText] = useState(String(food.serving_g || 100));

  const amount = parseFloat(amountText) || 0;
  const grams = toGrams(amount, unit);
  const macros = useMemo(() => scaleFood(food, grams), [food, grams]);

  function switchUnit(next: ServingUnit) {
    if (next === unit) return;
    const currentGrams = toGrams(amount, unit);
    setUnit(next);
    setAmountText(String(Math.round(fromGrams(currentGrams, next) * 10) / 10));
  }

  return (
    <ScrollView contentContainerStyle={styles.detail} keyboardShouldPersistTaps="handled">
      <Text style={styles.detailName}>{food.name}</Text>
      {food.brand ? <Text style={styles.rowBrand}>{food.brand}</Text> : null}
      {food.is_approx ? (
        <Text style={styles.approxNote}>Approximate values for a typical homemade or restaurant portion.</Text>
      ) : null}

      <View style={styles.card}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Servings</Text>
          <TextInput
            value={amountText}
            onChangeText={(v) => /^\d*\.?\d*$/.test(v) && setAmountText(v)}
            keyboardType="decimal-pad"
            style={styles.amountInput}
            selectTextOnFocus
          />
          <Text style={styles.unitText}>{unit}</Text>
        </View>
        <View style={styles.unitRow}>
          {(["g", "oz"] as ServingUnit[]).map((u) => (
            <Pressable key={u} onPress={() => switchUnit(u)} style={[styles.unitChip, unit === u && styles.unitChipActive]}>
              <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>{u}</Text>
            </Pressable>
          ))}
          {food.serving_label ? (
            <Pressable
              onPress={() => {
                setUnit("g");
                setAmountText(String(food.serving_g));
              }}
              style={styles.unitChip}
            >
              <Text style={styles.unitChipText}>
                1 {food.serving_label} ({food.serving_g} g)
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <MacroDonut calories={macros.calories} protein={macros.protein_g} carbs={macros.carbs_g} fat={macros.fat_g} />
      </View>

      <Text style={styles.factsTitle}>Nutrition facts</Text>
      <View style={styles.card}>
        <Fact label="Fiber" value={`${macros.fiber_g} g`} />
        <Fact label="Sugar" value={`${macros.sugar_g} g`} />
        <Fact label="Sodium" value={`${macros.sodium_mg} mg`} last />
      </View>

      <PrimaryButton
        label={`Add to ${MEAL_LABEL[meal]}`}
        disabled={grams <= 0}
        onPress={() =>
          onAdd({
            name: food.name,
            quantity_label: `${Math.round(amount * 10) / 10} ${unit}`,
            ...macros,
            meal,
            eaten_at: null,
            serving_amount: Math.round(grams * 10) / 10,
            serving_unit: "g",
            food_id: food.id,
          })
        }
      />
      <Text style={styles.footnote}>1 oz = {OZ_IN_GRAMS.toFixed(1)} g</Text>
    </ScrollView>
  );
}

function Fact({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.factRow, !last && styles.factDivider]}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function ManualEntry({ onAdd, onSavedFood }: { onAdd: (entry: NewFoodEntry) => void; onSavedFood: () => void }) {
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("100");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saveToMine, setSaveToMine] = useState(false);
  const [createFood, { isLoading: saving }] = useCreateFoodMutation();

  async function handleAdd() {
    if (!name.trim()) return;
    const kcal = Math.round(parseFloat(calories) || 0);
    const p = parseFloat(protein) || 0;
    const c = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;
    const amount = parseFloat(grams) || 100;

    if (saveToMine) {
      // What you typed is the totals for `amount` grams; the catalogue stores per 100 g.
      const k = 100 / amount;
      try {
        await createFood({
          name: name.trim(),
          brand: "",
          calories_100g: Math.round(kcal * k),
          protein_100g: Math.round(p * k * 10) / 10,
          carbs_100g: Math.round(c * k * 10) / 10,
          fat_100g: Math.round(f * k * 10) / 10,
          fiber_100g: 0,
          sugar_100g: 0,
          sodium_mg_100g: 0,
          serving_g: amount,
          serving_label: "",
        }).unwrap();
      } catch (e: any) {
        Alert.alert("Couldn't save to My Foods", String(e?.data?.detail ?? "You may already have a food with that name."));
      }
    }

    onAdd({
      name: name.trim(),
      quantity_label: `${amount} g`,
      calories: kcal,
      protein_g: p,
      carbs_g: c,
      fat_g: f,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
      meal: "snack",
      eaten_at: null,
      serving_amount: amount,
      serving_unit: "g",
      food_id: null,
    });
    if (saveToMine) onSavedFood();
  }

  return (
    <ScrollView contentContainerStyle={styles.detail} keyboardShouldPersistTaps="handled">
      <Text style={styles.manualHint}>For anything not in the catalogue. Enter the totals for the amount you ate.</Text>
      <Field label="Food name" value={name} onChangeText={setName} placeholder="e.g. Mom's chicken curry" />
      <Field label="Amount eaten (g)" value={grams} onChangeText={setGrams} keyboardType="decimal-pad" />
      <View style={styles.fieldRow}>
        <Field label="Calories" value={calories} onChangeText={setCalories} keyboardType="number-pad" style={{ flex: 1 }} />
        <Field label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" style={{ flex: 1 }} />
      </View>
      <View style={styles.fieldRow}>
        <Field label="Carbs (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" style={{ flex: 1 }} />
        <Field label="Fat (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" style={{ flex: 1 }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Save to My Foods for next time</Text>
        <Switch value={saveToMine} onValueChange={setSaveToMine} trackColor={{ true: colors.accent }} />
      </View>
      <PrimaryButton label="Add" onPress={handleAdd} disabled={!name.trim()} loading={saving} />
    </ScrollView>
  );
}

function Field({
  label,
  style,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...inputProps} placeholderTextColor={colors.dim} style={styles.fieldInput} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "android" ? spacing.xl : spacing.xxl * 2,
    paddingBottom: spacing.sm,
  },
  topBtn: { width: 28, alignItems: "flex-start" },
  topTitle: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: colors.chalk },
  // flexShrink: 0 and a fixed height keep the chips whole when the keyboard
  // shrinks the sheet (a horizontal ScrollView otherwise gets squashed first).
  mealRow: { flexGrow: 0, flexShrink: 0, height: 44, marginBottom: spacing.sm },
  mealRowContent: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  mealChip: { backgroundColor: colors.track, borderRadius: radii.pill, paddingHorizontal: spacing.md + 2, paddingVertical: 7 },
  mealChipActive: { backgroundColor: colors.chalk },
  mealChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted },
  mealChipTextActive: { color: colors.surface },
  tabRow: { flexDirection: "row", flexShrink: 0, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  tab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm + 2, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.dim },
  tabTextActive: { color: colors.chalk },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.chalk, paddingVertical: spacing.md - 1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2 },
  empty: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center", padding: spacing.xl, lineHeight: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.chalk },
  rowBrand: { fontFamily: fonts.body, fontSize: 11.5, color: colors.dim, marginTop: 1 },
  rowMeta: { fontFamily: fonts.data, fontSize: 10.5, color: colors.muted, marginTop: 3 },
  approx: { fontFamily: fonts.data, fontSize: 9.5, color: colors.warning, textTransform: "uppercase" },
  plus: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.track, alignItems: "center", justifyContent: "center" },
  detail: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  detailName: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 1, color: colors.chalk },
  approxNote: { fontFamily: fonts.body, fontSize: 11.5, color: colors.warning, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  amountRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  amountLabel: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.chalk },
  amountInput: {
    minWidth: 80,
    textAlign: "right",
    backgroundColor: colors.track,
    borderRadius: radii.sm + 2,
    fontFamily: fonts.dataBold,
    fontSize: 18,
    color: colors.chalk,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  unitText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, width: 22 },
  unitRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  unitChip: { backgroundColor: colors.track, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  unitChipActive: { backgroundColor: colors.accent },
  unitChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  unitChipTextActive: { color: colors.surface },
  factsTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: spacing.lg,
  },
  factRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm + 1 },
  factDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  factLabel: { fontFamily: fonts.body, fontSize: 13.5, color: colors.chalk },
  factValue: { fontFamily: fonts.dataBold, fontSize: 13.5, color: colors.chalk },
  footnote: { fontFamily: fonts.data, fontSize: 10, color: colors.faint, textAlign: "center", marginTop: spacing.md },
  manualHint: { fontFamily: fonts.body, fontSize: 12, color: colors.dim, marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  fieldRow: { flexDirection: "row", gap: spacing.sm },
  fieldLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm + 2,
    color: colors.chalk,
    fontFamily: fonts.body,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  switchLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.chalk },
});
