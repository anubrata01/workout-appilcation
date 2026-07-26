import React from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/PrimaryButton";
import { ReminderSettings } from "../../components/ReminderSettings";
import { useDeleteAccountMutation, useLogoutMutation, useMeQuery } from "../../api/authApi";
import { clearTokens } from "../../lib/secureStorage";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loggedOut } from "../../store/authSlice";
import { colors, fonts, spacing } from "../../theme/tokens";

/** App flow doc §2.11 — account rows + opt-in reminders. */
export function SettingsScreen() {
  const dispatch = useAppDispatch();
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);
  const { data: user } = useMeQuery();
  const [logout] = useLogoutMutation();
  const [deleteAccount, { isLoading: deleting }] = useDeleteAccountMutation();

  async function handleLogout() {
    if (refreshToken) {
      await logout({ refresh: refreshToken }).catch(() => {
        // Best-effort server-side revoke — local logout proceeds regardless.
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xxl, paddingTop: spacing.md, alignItems: "center" },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.chalk, letterSpacing: 1, alignSelf: "flex-start" },
  email: { fontFamily: fonts.data, fontSize: 12, color: colors.muted, alignSelf: "flex-start", marginTop: spacing.xs },
  dangerLink: {
    marginTop: spacing.xxl * 2,
    color: colors.faint,
    fontFamily: fonts.body,
    fontSize: 12.5,
  },
});
