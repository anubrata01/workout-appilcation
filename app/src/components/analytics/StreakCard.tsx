import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Flame } from "lucide-react-native";

import { colors, fonts, radii, spacing } from "../../theme/tokens";

interface Props {
  currentStreak: number;
  longestStreak: number;
}

/**
 * The streak endpoint (GET /v1/analytics/streak/) has been live and tested
 * since the backend was built but had no screen using it — this is that
 * screen. A streak is one of the highest-signal "come back tomorrow" numbers
 * a workout tracker can show, so it gets its own card, not a buried stat tile.
 */
export function StreakCard({ currentStreak, longestStreak }: Props) {
  const isActive = currentStreak > 0;

  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
        <Flame size={20} color={isActive ? colors.track : colors.dim} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.value}>
          {currentStreak} {currentStreak === 1 ? "day" : "days"}
        </Text>
        <Text style={styles.caption}>
          {isActive ? "current streak" : "no active streak — log a session to start one"}
        </Text>
      </View>
      {longestStreak > currentStreak ? (
        <View style={styles.longestPill}>
          <Text style={styles.longestText}>best {longestStreak}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.lg,
  },
  cardActive: {
    borderColor: colors.accent,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.track,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.accent,
  },
  value: { fontFamily: fonts.display, fontSize: 22, color: colors.chalk, letterSpacing: 0.5 },
  caption: { fontFamily: fonts.body, fontSize: 11.5, color: colors.dim, marginTop: 1 },
  longestPill: {
    backgroundColor: colors.track,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  longestText: { fontFamily: fonts.data, fontSize: 10.5, color: colors.muted },
});
