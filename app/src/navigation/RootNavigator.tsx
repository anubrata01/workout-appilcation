import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { loadTokens } from "../lib/secureStorage";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { hydratedFromStorage } from "../store/authSlice";
import { colors } from "../theme/tokens";

/**
 * Hard gate per app flow doc §2.1: nothing behind Welcome is reachable
 * without a valid session, and we don't decide which side to show until the
 * stored tokens have actually been checked (hydrationStatus === "unknown"
 * briefly on every cold launch).
 */
export function RootNavigator() {
  const dispatch = useAppDispatch();
  const hydrationStatus = useAppSelector((s) => s.auth.hydrationStatus);
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  useEffect(() => {
    loadTokens().then((tokens) => dispatch(hydratedFromStorage(tokens)));
  }, [dispatch]);

  if (hydrationStatus === "unknown") {
    return <View style={styles.splash} />;
  }

  return (
    <NavigationContainer>
      {accessToken ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg },
});
