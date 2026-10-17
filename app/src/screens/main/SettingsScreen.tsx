import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/PrimaryButton";
import { ReminderSettings } from "../../components/ReminderSettings";
import { ScreenBackground } from "../../components/ScreenBackground";
import { useDeleteAccountMutation, useLogoutMutation, useMeQuery } from "../../api/authApi";
import { clearTokens } from "../../lib/secureStorage";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loggedOut } from "../../store/authSlice";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { MainStackScreenProps } from "../../navigation/types";

/** App flow doc §2.11: workout preferences, account rows and opt-in reminders. */
export function SettingsScreen({ navigation }: MainStackScreenProps<"Settings">) {
  const dispatch = useAppDispatch();
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);
  const { data: user } = useMeQuery();
  const [logout] = useLogoutMutation();
  const [deleteAccount, { isLoading: deleting }] = useDeleteAccountMutation();

  async function handleLogout() {
    if (refreshToken) {
      await logout({ refresh: refreshToken }).catch(() => {
        // Best-effort server-side revoke; local logout proceeds regardless.
      });
    }
    await clearTokens();
    dispatch(loggedOut());
  }

  function confirmDelete() {
    Alert.alert(
      "Delete account",
      "This deactivates your account and starts the data-purge process across every service (TRD §7). This cannot be undone from the app.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteAccount();
            await clearTokens();
            dispatch(loggedOut());
          },
        },
      ]
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <ChevronLeft size={20} color={colors.chalk} />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {user ? <Text style={styles.email}>{user.email}</Text> : null}

          <ReminderSettings />

          <View style={{ marginTop: spacing.xxl, width: "100%" }}>
            <PrimaryButton label="Log out" onPress={handleLogout} />
          </View>

          <Text style={styles.dangerLink} onPress={confirmDelete}>
            {deleting ? "Deleting…" : "Delete account"}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.chalk, letterSpacing: 1 },
  content: { padding: spacing.xxl, paddingTop: spacing.md, alignItems: "center" },
  email: { fontFamily: fonts.data, fontSize: 12, color: colors.muted, alignSelf: "flex-start" },
  sectionLabel: {
    alignSelf: "flex-start",
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  cardHint: { fontFamily: fonts.body, fontSize: 12, color: colors.dim, lineHeight: 17, marginBottom: spacing.md },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { backgroundColor: colors.track, borderRadius: radii.pill, paddingHorizontal: spacing.md + 2, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.accent },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted },
  chipTextActive: { color: colors.surface },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.lg },
  switchLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.chalk },
  dangerLink: {
    marginTop: spacing.xxl * 2,
    color: colors.faint,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },
});
