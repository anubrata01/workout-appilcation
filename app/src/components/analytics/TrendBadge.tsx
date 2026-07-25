import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Minus, TrendingDown, TrendingUp } from "lucide-react-native";

import { colors, fonts } from "../../theme/tokens";
import type { PersonalRecordDTO } from "../../api/analyticsApi";

const TREND_MAP: Record<PersonalRecordDTO["trend"], { Icon: typeof TrendingUp; color: string; label: string }> = {
  up: { Icon: TrendingUp, color: colors.success, label: "new PR" },
  down: { Icon: TrendingDown, color: colors.dim, label: "below best" },
  same: { Icon: Minus, color: colors.dim, label: "matched" },
};

/** Same up/down/same badge as the prototype's PRsTab (app flow doc §2.10). */
export function TrendBadge({ trend }: { trend: PersonalRecordDTO["trend"] }) {
  const { Icon, color, label } = TREND_MAP[trend];
  return (
    <View style={styles.row}>
      <Icon size={11} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 3, justifyContent: "flex-end" },
  label: { fontFamily: fonts.body, fontSize: 10 },
});
