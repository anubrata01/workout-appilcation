import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ChevronLeft, Minus, Plus, Trash2 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useCreateRoutineMutation,
  useDeleteRoutineMutation,
  useGetRoutinesQuery,
  useUpdateRoutineMutation,
} from "../../api/workoutApi";
import type { RoutineItemDTO } from "../../api/workoutApi";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenBackground } from "../../components/ScreenBackground";
import { ExercisePicker } from "../../components/workout/ExercisePicker";
import type { PickedExercise } from "../../components/workout/ExercisePicker";
import { ExerciseThumb } from "../../components/workout/ExerciseThumb";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { MainStackScreenProps } from "../../navigation/types";

const MAX_SETS = 10;

/** Create or edit a routine: a name plus an ordered list of exercises, each
 * with how many sets to start with. Starting a routine on the Workout tab
 * pre-fills a session from this. */
export function RoutineEditorScreen({ navigation, route }: MainStackScreenProps<"RoutineEditor">) {
  const routineId = route.params?.routineId;
  const { data: routines = [] } = useGetRoutinesQuery();
  const existing = routineId ? routines.find((r) => r.id === routineId) : undefined;

  const [name, setName] = useState("");
  const [items, setItems] = useState<RoutineItemDTO[]>([]);
  const [picking, setPicking] = useState(false);
  const [loaded, setLoaded] = useState(!routineId);

  const [createRoutine, { isLoading: creating }] = useCreateRoutineMutation();
  const [updateRoutine, { isLoading: updating }] = useUpdateRoutineMutation();
  const [deleteRoutine] = useDeleteRoutineMutation();
  const saving = creating || updating;

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name);
      setItems(existing.items);
      setLoaded(true);
    }
  }, [existing, loaded]);

  function addExercise(picked: PickedExercise) {
    setPicking(false);
    setItems((prev) =>
      prev.some((i) => i.name === picked.name)
        ? prev
        : [
            ...prev,
            {
              name: picked.name,
              category: picked.category,
              is_bodyweight: picked.isBodyweight,
              default_sets: 3,
              image_url: picked.imageUrl,
            },
          ]
    );
  }

  function changeSets(index: number, delta: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, default_sets: Math.max(1, Math.min(MAX_SETS, item.default_sets + delta)) } : item
      )
    );
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Name your routine", "Give it a name like Push Day.");
    if (items.length === 0) return Alert.alert("Add an exercise", "A routine needs at least one exercise.");
    const body = {
      name: trimmed,
      // image_url is read-only on the server; it joins thumbnails itself.
      items: items.map(({ image_url: _ignored, ...item }, order) => ({ ...item, order })),
    };
    try {
      if (routineId) await updateRoutine({ id: routineId, ...body }).unwrap();
      else await createRoutine(body).unwrap();
      navigation.goBack();
    } catch (e: any) {
      const detail = e?.data?.name?.[0] ?? e?.data?.items?.[0] ?? "Something went wrong saving this routine.";
      Alert.alert("Couldn't save", String(detail));
    }
  }

  function confirmDelete() {
    if (!routineId) return;
    Alert.alert("Delete routine?", `"${name}" will be removed. Past workouts are not affected.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteRoutine(routineId);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.back}>
            <ChevronLeft size={20} color={colors.chalk} />
          </Pressable>
          <Text style={styles.title}>{routineId ? "Edit routine" : "New routine"}</Text>
          {routineId ? (
            <Pressable onPress={confirmDelete} hitSlop={8}>
              <Trash2 size={18} color={colors.error} />
            </Pressable>
          ) : (
            <View style={{ width: 18 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Routine name, e.g. Push Day"
            placeholderTextColor={colors.dim}
            style={styles.nameInput}
            maxLength={80}
          />

          {items.length === 0 ? (
            <Text style={styles.empty}>No exercises yet. Add the ones you do in this workout.</Text>
          ) : (
            items.map((item, index) => (
              <View key={item.name} style={styles.itemCard}>
                <ExerciseThumb name={item.name} category={item.category} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.category === "cardio" ? "cardio" : item.is_bodyweight ? "bodyweight" : "strength"}
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable onPress={() => changeSets(index, -1)} hitSlop={6} style={styles.stepBtn}>
                    <Minus size={14} color={colors.chalk} />
                  </Pressable>
                  <Text style={styles.stepValue}>{item.default_sets} sets</Text>
                  <Pressable onPress={() => changeSets(index, 1)} hitSlop={6} style={styles.stepBtn}>
                    <Plus size={14} color={colors.chalk} />
                  </Pressable>
                </View>
                <Pressable onPress={() => setItems((prev) => prev.filter((_, i) => i !== index))} hitSlop={8}>
                  <Trash2 size={14} color={colors.muted} />
                </Pressable>
              </View>
            ))
          )}

          <Pressable style={styles.addBtn} onPress={() => setPicking(true)}>
            <Plus size={16} color={colors.surface} />
            <Text style={styles.addLabel}>Add exercise</Text>
          </Pressable>

          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton label={routineId ? "Save changes" : "Save routine"} onPress={handleSave} loading={saving} />
          </View>
        </ScrollView>

        <ExercisePicker visible={picking} onPick={addExercise} onClose={() => setPicking(false)} />
      </SafeAreaView>
    </ScreenBackground>
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
  back: { padding: 2 },
  title: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: colors.chalk },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  nameInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.chalk,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  empty: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center", marginBottom: spacing.lg },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg - 2,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemName: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.chalk },
  itemMeta: { fontFamily: fonts.data, fontSize: 10, color: colors.dim, textTransform: "uppercase", marginTop: 1 },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.track,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { fontFamily: fonts.dataBold, fontSize: 12, color: colors.chalk, minWidth: 44, textAlign: "center" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.chalk,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  addLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.surface },
});
