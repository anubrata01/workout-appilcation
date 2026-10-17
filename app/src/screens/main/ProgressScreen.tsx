import React, { useState } from "react";

import { FadeSwap } from "../../components/FadeSwap";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BodyPane } from "../../components/analytics/BodyPane";
import { ScreenBackground } from "../../components/ScreenBackground";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import { PRsContent } from "./PRsScreen";
import { ReportsContent } from "./ReportsScreen";

type Pane = "overview" | "records" | "body";

const PANES: { key: Pane; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "records", label: "Records" },
  { key: "body", label: "Body" },
];

/** One home for "how am I doing": the training overview (stats, muscle map,
 * nutrition), personal records, and body measurements. Only the selected
 * pane is mounted, so the other two make no requests until you open them. */
export function ProgressScreen() {
  const [pane, setPane] = useState<Pane>("overview");

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <View style={styles.segmented}>
            {PANES.map((p) => (
              <Pressable key={p.key} onPress={() => setPane(p.key)} style={[styles.segment, pane === p.key && styles.segmentActive]}>
                <Text style={[styles.segmentText, pane === p.key && styles.segmentTextActive]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <FadeSwap trigger={pane}>
            {pane === "overview" ? <ReportsContent /> : pane === "records" ? <PRsContent /> : <BodyPane />}
          </FadeSwap>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: 1, color: colors.chalk, marginBottom: spacing.sm },
  segmented: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radii.sm + 2, padding: 3 },
  segment: { flex: 1, paddingVertical: spacing.xs + 3, alignItems: "center", borderRadius: radii.sm },
  segmentActive: { backgroundColor: colors.track },
  segmentText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.dim },
  segmentTextActive: { color: colors.chalk },
});
