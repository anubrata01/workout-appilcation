import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { Timer } from "lucide-react-native";

import { formatElapsedClock } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  active: boolean;
  targetLabel?: string;
  /** Countdown length in seconds; 0 means count up like a stopwatch. */
  durationSeconds: number;
  vibrate: boolean;
  onStop: (elapsedSeconds: number) => void;
  onDismiss: () => void;
}

/** What the big number shows: remaining time while counting down, then "+overtime"; plain elapsed for a stopwatch. */
export function restDisplay(elapsed: number, durationSeconds: number): { text: string; over: boolean } {
  if (durationSeconds <= 0) return { text: formatElapsedClock(elapsed), over: false };
  const remaining = durationSeconds - elapsed;
  return remaining > 0
    ? { text: formatElapsedClock(remaining), over: false }
    : { text: `+${formatElapsedClock(-remaining)}`, over: true };
}

// Auto-starts (see SessionScreen) the moment a set is marked done, the
// natural "I just finished that set" moment, and logs its elapsed time onto
// that specific set once stopped. With a countdown length set it ticks down,
// buzzes once at zero, then keeps counting overtime, because the time you
// actually rested is what gets recorded, not the target. Resets on every new
// activation; each rest period is independent of the last.
export function RestTimer({ active, targetLabel, durationSeconds, vibrate, onStop, onDismiss }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const buzzedRef = useRef(false);

  useEffect(() => {
    buzzedRef.current = false;
    if (!active) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (active && vibrate && durationSeconds > 0 && elapsed >= durationSeconds && !buzzedRef.current) {
      buzzedRef.current = true;
      Vibration.vibrate([0, 250, 120, 250]);
    }
  }, [active, vibrate, durationSeconds, elapsed]);

  if (!active) return null;

  const display = restDisplay(elapsed, durationSeconds);

  return (
    <View style={[styles.card, display.over && styles.cardOver]}>
      <View style={styles.left}>
        <Timer size={18} color={colors.accentWarm} />
        <View>
          <Text style={[styles.time, display.over && styles.timeOver]}>{display.text}</Text>
          <Text style={styles.label}>
            {display.over ? "rest over" : "resting"}
            {targetLabel ? ` · ${targetLabel}` : ""}
          </Text>
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
  cardOver: { backgroundColor: "#FFF1EC" },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 },
  time: { fontFamily: fonts.dataBold, fontSize: 18, color: colors.chalk },
  timeOver: { color: colors.accent },
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
