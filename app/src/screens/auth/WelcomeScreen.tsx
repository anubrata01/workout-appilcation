import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { statusCodes, isErrorWithCode } from "@react-native-google-signin/google-signin";

import { Logo } from "../../components/Logo";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenBackground } from "../../components/ScreenBackground";
import { useGoogleAuthMutation } from "../../api/authApi";
import { signInWithGoogle } from "../../lib/googleSignIn";
import { saveTokens } from "../../lib/secureStorage";
import { useAppDispatch } from "../../store/hooks";
import { credentialsReceived } from "../../store/authSlice";
import { colors, fonts, spacing } from "../../theme/tokens";
import type { AuthStackScreenProps } from "../../navigation/types";

export function WelcomeScreen({ navigation }: AuthStackScreenProps<"Welcome">) {
  const dispatch = useAppDispatch();
  const [googleAuth, { isLoading: signingIn }] = useGoogleAuthMutation();

  async function handleGoogleSignIn() {
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) return; // user cancelled — not an error

      const { user, access, refresh } = await googleAuth({ id_token: idToken }).unwrap();
      await saveTokens(access, refresh);
      dispatch(credentialsReceived({ user, access, refresh }));
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) return;
      Alert.alert("Couldn't sign in with Google", "Please try again, or use email instead.");
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.brand}>
          <Logo />
          <Text style={styles.brandSub}>workout log</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Continue with Google" onPress={handleGoogleSignIn} loading={signingIn} />
          <View style={{ height: spacing.md }} />
          <PrimaryButton label="Sign up with email" onPress={() => navigation.navigate("SignUp")} />
          <Text style={styles.loginLink} onPress={() => navigation.navigate("Login")}>
            Already have an account? <Text style={styles.loginLinkAccent}>Log in</Text>
          </Text>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl * 2,
  },
  brand: {
    alignItems: "center",
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
