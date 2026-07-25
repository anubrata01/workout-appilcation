import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Dumbbell } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, fonts, spacing } from "../../theme/tokens";
import type { AuthStackScreenProps } from "../../navigation/types";

export function WelcomeScreen({ navigation }: AuthStackScreenProps<"Welcome">) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Dumbbell size={22} color={colors.track} strokeWidth={2.5} />
        </View>
        <Text style={styles.brandText}>LOADED</Text>
        <Text style={styles.brandSub}>workout log</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Continue with Google"
          onPress={() =>
            // Native Google Sign-In needs @react-native-google-signin/google-signin
            // plus a real OAuth client id wired into app.json — not available
            // until that's configured (implementation plan Phase 6 step 2).
            Alert.alert("Not configured yet", "Google Sign-In needs an OAuth client id — use email for now.")
          }
        />
        <View style={{ height: spacing.md }} />
        <PrimaryButton label="Sign up with email" onPress={() => navigation.navigate("SignUp")} />
        <Text style={styles.loginLink} onPress={() => navigation.navigate("Login")}>
          Already have an account? <Text style={styles.loginLinkAccent}>Log in</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "space-between",
    padding: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl * 2,
  },
  brand: {
    alignItems: "center",
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  brandText: {
    fontFamily: fonts.display,
    fontSize: 42,
    letterSpacing: 2,
    color: colors.chalk,
  },
  brandSub: {
    fontFamily: fonts.data,
    fontSize: 13,
    color: colors.dim,
    marginTop: spacing.xs,
  },
  actions: {
    width: "100%",
  },
  loginLink: {
    textAlign: "center",
    marginTop: spacing.lg,
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  loginLinkAccent: {
    color: colors.accentWarm,
    fontFamily: fonts.bodySemiBold,
  },
});
