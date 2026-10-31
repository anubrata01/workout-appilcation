import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Play, Square, Timer } from "lucide-react-native";

import { formatElapsedClock } from "../../lib/workoutHelpers";
import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  /** When the stopwatch was started (ms since epoch), or null while it is stopped. */
  startedAtMs: number | null;
  /** Which set the rest will be recorded on, shown while running. */
  targetLabel?: string;
  onStart: () => void;
  onStop: (elapsedSeconds: number) => void;
}

/**
 * A floating rest stopwatch. It sits over the workout log (not inside the
 * scrolling list), so it stays in view however many exercises are added.
 * It only counts up, and only runs when you start it. Stopping it, or ticking
 * the next set done, records how long you rested on the set you finished.
 */
export function RestStopwatch({ startedAtMs, targetLabel, onStart, onStop }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const running = startedAtMs !== null;

  useEffect(() => {
    if (startedAtMs === null) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.floor((Date.now() - startedAtMs) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAtMs]);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {running ? (
        <View style={[styles.bar, styles.barRunning]}>
          <Timer size={18} color={colors.accentWarm} />
          <View style={{ flex: 1 }}>
            <Text style={styles.time}>{formatElapsedClock(elapsed)}</Text>
            <Text style={styles.label} numberOfLines={1}>
              {targetLabel ? `Resting · ${targetLabel}` : "Resting"}
            </Text>
          </View>
          <Pressable style={styles.stopBtn} onPress={() => onStop(elapsed)} hitSlop={6}>
            <Square size={12} color={colors.surface} fill={colors.surface} />
            <Text style={styles.stopText}>Stop</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={[styles.bar, styles.barIdle]} onPress={onStart}>
          <Play size={14} color={colors.accentWarm} fill={colors.accentWarm} />
          <Text style={styles.startText}>Start rest timer</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.md, alignItems: "center" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentWarm,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  barIdle: { alignSelf: "center" },
  barRunning: { alignSelf: "stretch" },
  time: { fontFamily: fonts.dataBold, fontSize: 18, color: colors.chalk, fontVariant: ["tabular-nums"] },
  label: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted, marginTop: 1 },
  startText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.chalk },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
  },
  stopText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.surface },
});
