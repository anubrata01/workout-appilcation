import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";

import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { LaunchScreen } from "../components/LaunchScreen";
import { loadTokens } from "../lib/secureStorage";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { hydratedFromStorage } from "../store/authSlice";

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
    return <LaunchScreen />;
  }

  return (
    <NavigationContainer>
      {accessToken ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
