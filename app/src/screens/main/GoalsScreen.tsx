import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGetGoalsQuery, useGetLatestMeasurementsQuery, useSaveGoalsMutation } from "../../api/nutritionApi";
import type { GoalDTO } from "../../api/nutritionApi";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenBackground } from "../../components/ScreenBackground";
import { suggestGoals } from "../../lib/nutritionMath";
import type { GoalInputs } from "../../lib/nutritionMath";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { MainStackScreenProps } from "../../navigation/types";

type Sex = GoalInputs["sex"];
type Activity = GoalInputs["activity"];
type Aim = GoalInputs["aim"];

const ACTIVITY: { key: Activity; label: string }[] = [
  { key: "sedentary", label: "Mostly seated" },
  { key: "light", label: "Light (1-3 days)" },
  { key: "moderate", label: "Moderate (3-5)" },
  { key: "active", label: "Very active (6-7)" },
];
const AIMS: { key: Aim; label: string }[] = [
  { key: "lose", label: "Lose fat" },
  { key: "maintain", label: "Maintain" },
  { key: "gain", label: "Build muscle" },
];

function num(text: string): number {
  return parseFloat(text) || 0;
}

/** Daily targets that Nutrition, Home and Insights compare against. Edit the
 * numbers directly, or have a starting point calculated from your body and
 * aim. The calculator is an estimate, not medical advice. */
export function GoalsScreen({ navigation }: MainStackScreenProps<"Goals">) {
  const { data: goals } = useGetGoalsQuery();
  const { data: latest = [] } = useGetLatestMeasurementsQuery();
  const [saveGoals, { isLoading: saving }] = useSaveGoalsMutation();

  const [calories, setCalories] = useState("2000");
  const [protein, setProtein] = useState("100");
  const [carbs, setCarbs] = useState("250");
  const [fat, setFat] = useState("65");
  const [waterL, setWaterL] = useState("2.5");
  const [targetWeight, setTargetWeight] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("25");
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [aim, setAim] = useState<Aim>("maintain");

  useEffect(() => {
    if (goals && !loaded) {
      setCalories(String(goals.calories));
      setProtein(String(goals.protein_g));
      setCarbs(String(goals.carbs_g));
      setFat(String(goals.fat_g));
      setWaterL(String(goals.water_ml / 1000));
      setTargetWeight(goals.target_weight_kg ? String(goals.target_weight_kg) : "");
      setLoaded(true);
    }
  }, [goals, loaded]);

  // Prefill the calculator's weight from the latest logged one.
  const latestWeight = latest.find((m) => m.kind === "weight")?.value;
  useEffect(() => {
    if (latestWeight && !weight) setWeight(String(latestWeight));
  }, [latestWeight, weight]);

  function calculate() {
    if (num(weight) <= 0 || num(height) <= 0 || num(age) <= 0) {
      Alert.alert("Fill in your details", "Age, height and weight are needed to calculate a starting point.");
      return;
    }
    const suggested = suggestGoals({ sex, age: num(age), heightCm: num(height), weightKg: num(weight), activity, aim });
    setCalories(String(suggested.calories));
    setProtein(String(suggested.protein_g));
    setCarbs(String(suggested.carbs_g));
    setFat(String(suggested.fat_g));
    setWaterL(String(suggested.water_ml / 1000));
  }

  async function handleSave() {
    const body: GoalDTO = {
      calories: Math.round(num(calories)),
      protein_g: num(protein),
      carbs_g: num(carbs),
      fat_g: num(fat),
      water_ml: Math.round(num(waterL) * 1000),
      target_weight_kg: num(targetWeight) > 0 ? num(targetWeight) : null,
    };
    try {
      await saveGoals(body).unwrap();
      navigation.goBack();
    } catch (e: any) {
      const first = e?.data?.detail?.[0]?.msg ?? "Check the numbers and try again.";
      Alert.alert("Couldn't save goals", String(first));
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <ChevronLeft size={20} color={colors.chalk} />
          </Pressable>
          <Text style={styles.title}>Goals</Text>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Daily targets</Text>
          <View style={styles.card}>
            <Row label="Calories" unit="kcal" value={calories} onChange={setCalories} />
            <Row label="Protein" unit="g" value={protein} onChange={setProtein} />
            <Row label="Carbs" unit="g" value={carbs} onChange={setCarbs} />
            <Row label="Fat" unit="g" value={fat} onChange={setFat} />
            <Row label="Water" unit="L" value={waterL} onChange={setWaterL} />
            <Row label="Target weight" unit="kg" value={targetWeight} onChange={setTargetWeight} last />
          </View>

          <Text style={styles.sectionLabel}>Calculate a starting point</Text>
          <View style={styles.card}>
            <ChipRow
              options={[
                { key: "male", label: "Male" },
                { key: "female", label: "Female" },
              ]}
              value={sex}
              onChange={(k) => setSex(k as Sex)}
            />
            <View style={styles.calcRow}>
              <MiniField label="Age" value={age} onChange={setAge} />
              <MiniField label="Height (cm)" value={height} onChange={setHeight} />
              <MiniField label="Weight (kg)" value={weight} onChange={setWeight} />
            </View>
            <Text style={styles.miniLabel}>Activity</Text>
            <ChipRow options={ACTIVITY} value={activity} onChange={(k) => setActivity(k as Activity)} wrap />
            <Text style={styles.miniLabel}>Aim</Text>
            <ChipRow options={AIMS} value={aim} onChange={(k) => setAim(k as Aim)} />
            <Pressable style={styles.calcBtn} onPress={calculate}>
              <Text style={styles.calcBtnText}>Calculate and fill in targets</Text>
            </Pressable>
            <Text style={styles.disclaimer}>
              An estimate from the Mifflin-St Jeor formula, to adjust as you learn how your body responds. It is not
              medical advice.
            </Text>
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton label="Save goals" onPress={handleSave} loading={saving} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Row({
  label,
  unit,
  value,
  onChange,
  last,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(v) => /^\d*\.?\d*$/.test(v) && onChange(v)}
        keyboardType="decimal-pad"
        style={styles.rowInput}
        placeholder="0"
        placeholderTextColor={colors.dim}
      />
      <Text style={styles.rowUnit}>{unit}</Text>
    </View>
  );
}

function MiniField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.miniLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(v) => /^\d*\.?\d*$/.test(v) && onChange(v)}
        keyboardType="decimal-pad"
        style={styles.miniInput}
      />
    </View>
  );
}

function ChipRow({
  options,
  value,
  onChange,
  wrap,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  wrap?: boolean;
}) {
  return (
    <View style={[styles.chipRow, wrap && { flexWrap: "wrap" }]}>
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.chip, value === o.key && styles.chipActive]}>
          <Text style={[styles.chipText, value === o.key && styles.chipTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  title: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: colors.chalk },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  rowLabel: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.chalk },
  rowInput: {
    minWidth: 80,
    textAlign: "right",
    fontFamily: fonts.dataBold,
    fontSize: 16,
    color: colors.chalk,
    backgroundColor: colors.track,
    borderRadius: radii.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
  },
  rowUnit: { width: 36, fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginLeft: spacing.sm },
  calcRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  miniLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: colors.muted, marginTop: spacing.md, marginBottom: 4 },
  miniInput: {
    backgroundColor: colors.track,
    borderRadius: radii.sm + 2,
    fontFamily: fonts.dataBold,
    fontSize: 15,
    color: colors.chalk,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipRow: { flexDirection: "row", gap: spacing.sm },
  chip: { backgroundColor: colors.track, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.chalk },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  chipTextActive: { color: colors.surface },
  calcBtn: {
    alignItems: "center",
    backgroundColor: colors.track,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  calcBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.accentWarm },
  disclaimer: { fontFamily: fonts.body, fontSize: 11, color: colors.dim, lineHeight: 16, marginTop: spacing.md },
});
