import React, { useEffect, useState } from "react";
import { Scale } from "lucide-react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  weightKg: number | null;
  onChange: (nextKg: number | null) => void;
}

// A quick place to log today's body weight alongside food/water — separate
// from the workout log since it's a once-a-day number, not tied to a
// session. Saved through the same debounced day-save as everything else on
// this screen (see NutritionScreen's save effect).
export function BodyWeightCard({ weightKg, onChange }: Props) {
  const [text, setText] = useState(weightKg != null ? String(weightKg) : "");

  // Only re-sync from the prop when it actually changes underneath us (e.g.
  // switching dates) — not on every keystroke, which would fight typing.
  useEffect(() => {
    setText(weightKg != null ? String(weightKg) : "");
  }, [weightKg]);

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      onChange(null);
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setText(weightKg != null ? String(weightKg) : "");
      return;
    }
    onChange(parsed);
  }

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Scale size={18} color="#7C6FE0" />
        <Text style={styles.caption}>Body weight</Text>
      </View>
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          onEndEditing={(e) => commit(e.nativeEvent.text)}
          placeholder="Log"
          placeholderTextColor={colors.dim}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <Text style={styles.unit}>kg</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 },
  caption: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  inputRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  input: {
    minWidth: 48,
    textAlign: "right",
    fontFamily: fonts.dataBold,
    fontSize: 16,
    color: colors.chalk,
    padding: 0,
  },
  unit: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
});
