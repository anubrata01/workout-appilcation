import React, { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Trophy } from "lucide-react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGetPRsQuery } from "../../api/analyticsApi";
import { PRCard } from "../../components/analytics/PRCard";
import { ScreenBackground } from "../../components/ScreenBackground";
import { PRsScreenSkeleton } from "../../components/Skeleton";
import { colors, fonts, spacing } from "../../theme/tokens";

/** App flow doc §2.10 — personal records feed, backed by Analytics Service. */
export function PRsScreen() {
  const isFocused = useIsFocused();
  const { data, isLoading, error, refetch } = useGetPRsQuery(undefined, {
    pollingInterval: isFocused ? 4000 : 0,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <Text style={styles.sectionLabel}>Personal records</Text>

        {error ? (
          <Text style={styles.errorText}>Couldn't load PRs — pull to retry.</Text>
        ) : isLoading ? (
          <PRsScreenSkeleton />
        ) : !data || data.length === 0 ? (
          <View style={styles.emptyState}>
            <Trophy size={22} color={colors.faint} />
            <Text style={styles.emptyText}>
              No PRs yet — mark a set "done" in the Session tab to set your first one.
            </Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => <PRCard pr={item} />}
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
          />
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, paddingTop: spacing.md },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.dim,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  loadingText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: "center", marginTop: spacing.xl },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: colors.error, textAlign: "center", marginTop: spacing.xl },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 16,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center", lineHeight: 18 },
});
