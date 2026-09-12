import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenBackground } from "../../components/ScreenBackground";
import { TextField } from "../../components/TextField";
import { useLoginMutation } from "../../api/authApi";
import { saveTokens } from "../../lib/secureStorage";
import { useAppDispatch } from "../../store/hooks";
import { credentialsReceived } from "../../store/authSlice";
import { colors, fonts, spacing } from "../../theme/tokens";
import type { AuthStackScreenProps } from "../../navigation/types";

export function LoginScreen({ navigation }: AuthStackScreenProps<"Login">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useAppDispatch();
  const [login, { isLoading, error }] = useLoginMutation();

  async function handleSubmit() {
    try {
      const { user, access, refresh } = await login({ email: email.trim(), password }).unwrap();
      await saveTokens(access, refresh);
      dispatch(credentialsReceived({ user, access, refresh }));
    } catch {
      // Errors are already surfaced below via the `error` state from the hook.
    }
  }

  const invalidCredentials =
    error && "data" in error
      ? (error.data as { non_field_errors?: string[] })?.non_field_errors?.[0]
      : undefined;
  const formError = error && !invalidCredentials;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Log in</Text>

          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />

          {invalidCredentials ? <Text style={styles.error}>{invalidCredentials}</Text> : null}
          {formError ? <Text style={styles.error}>Something went wrong — try again.</Text> : null}

          <PrimaryButton label="Log in" onPress={handleSubmit} loading={isLoading} />

          <Text style={styles.link}>Forgot password?</Text>
          <Text style={styles.loginLink} onPress={() => navigation.navigate("SignUp")}>
            New here? <Text style={styles.loginLinkAccent}>Sign up</Text>
          </Text>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.xxl, paddingTop: spacing.lg },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.chalk,
    letterSpacing: 1,
    marginBottom: spacing.xl,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12.5,
    marginBottom: spacing.md,
  },
  link: {
    textAlign: "center",
    marginTop: spacing.lg,
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
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
