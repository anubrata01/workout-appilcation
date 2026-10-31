import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Trophy } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useGetPRsQuery } from "../../api/analyticsApi";
import { PRCard } from "../../components/analytics/PRCard";
import { PRsScreenSkeleton } from "../../components/Skeleton";
import { STALE_AFTER, useRefetchOnFocus } from "../../lib/cachePolicy";
import { colors, fonts, spacing } from "../../theme/tokens";
import type { MainStackParamList } from "../../navigation/types";

/** App flow doc §2.10: personal records feed, backed by Analytics Service.
 * Tapping a record opens that exercise's detail screen (all three record
 * types, history and chart). Refreshes when you return after it has gone
 * stale, not on a timer. */
export function PRsContent() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { data, isLoading, error, refetch } = useGetPRsQuery(undefined, {
    refetchOnMountOrArgChange: STALE_AFTER.analytics,
  });
  useRefetchOnFocus(refetch, STALE_AFTER.analytics);

  if (error) return <Text style={styles.errorText}>Couldn't load PRs. Pull to retry.</Text>;
  if (isLoading) return <PRsScreenSkeleton />;
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Trophy size={22} color={colors.faint} />
        <Text style={styles.emptyText}>No PRs yet. Mark a set "done" in the Workout tab to set your first one.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.name}
      renderItem={({ item }) => <PRCard pr={item} onPress={() => navigation.navigate("ExerciseDetail", { name: item.name })} />}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl * 2 },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: colors.error, textAlign: "center", marginTop: spacing.xl },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    margin: spacing.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 16,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dim, textAlign: "center" },
});
