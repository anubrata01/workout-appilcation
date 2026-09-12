import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Timer } from "lucide-react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  active: boolean;
  targetLabel?: string;
  onStop: (elapsedSeconds: number) => void;
  onDismiss: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// Auto-starts (see SessionScreen) the moment a set is marked done — the
// natural "I just finished that set" moment — and logs its elapsed time onto
// that specific set once stopped. Resets to 0 on every new activation, not a
// running total, since each rest period is independent of the last.
export function RestTimer({ active, targetLabel, onStop, onDismiss }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Timer size={18} color={colors.accentWarm} />
        <View>
          <Text style={styles.time}>{formatDuration(elapsed)}</Text>
          <Text style={styles.label}>{targetLabel ? `resting · ${targetLabel}` : "resting"}</Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <Pressable style={styles.skipBtn} onPress={onDismiss}>
          <Text style={styles.skipBtnText}>Skip</Text>
        </Pressable>
        <Pressable style={styles.stopBtn} onPress={() => onStop(elapsed)}>
          <Text style={styles.stopBtnText}>Done</Text>
        </Pressable>
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
    borderColor: colors.accentWarm,
    borderRadius: radii.lg,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 },
  time: { fontFamily: fonts.dataBold, fontSize: 18, color: colors.chalk },
  label: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted, marginTop: 1 },
  buttons: { flexDirection: "row", gap: spacing.sm },
  skipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 1,
    borderRadius: radii.sm + 2,
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  stopBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 1,
    borderRadius: radii.sm + 2,
    backgroundColor: colors.accentWarm,
  },
  stopBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.surface },
});
