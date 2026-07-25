import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/PrimaryButton";
import { TextField } from "../../components/TextField";
import { useSignupMutation } from "../../api/authApi";
import { saveTokens } from "../../lib/secureStorage";
import { useAppDispatch } from "../../store/hooks";
import { credentialsReceived } from "../../store/authSlice";
import { colors, fonts, spacing } from "../../theme/tokens";
import type { AuthStackScreenProps } from "../../navigation/types";

/** Field errors mirror the server's DRF validation shape: { field: [messages] }. */
function firstFieldError(error: unknown, field: string): string | undefined {
  const data = (error as { data?: Record<string, string[]> } | undefined)?.data;
  return data?.[field]?.[0];
}

export function SignUpScreen({ navigation }: AuthStackScreenProps<"SignUp">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string>();

  const dispatch = useAppDispatch();
  const [signup, { isLoading, error }] = useSignupMutation();

  async function handleSubmit() {
    setConfirmError(undefined);
    if (password !== confirmPassword) {
      setConfirmError("Passwords don't match.");
      return;
    }
    try {
      const { user, access, refresh } = await signup({ email: email.trim(), password }).unwrap();
      await saveTokens(access, refresh);
      dispatch(credentialsReceived({ user, access, refresh }));
    } catch {
      // Field errors are already surfaced below via the `error` state from the hook.
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          error={firstFieldError(error, "email")}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={firstFieldError(error, "password")}
        />
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          error={confirmError}
        />

        <PrimaryButton label="Sign up" onPress={handleSubmit} loading={isLoading} />

        <Text style={styles.loginLink} onPress={() => navigation.navigate("Login")}>
          Already have an account? <Text style={styles.loginLinkAccent}>Log in</Text>
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xxl, paddingTop: spacing.lg },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.chalk,
    letterSpacing: 1,
    marginBottom: spacing.xl,
  },
  loginLink: {
    textAlign: "center",
    marginTop: spacing.md,
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  loginLinkAccent: {
    color: colors.accentWarm,
    fontFamily: fonts.bodySemiBold,
  },
});
