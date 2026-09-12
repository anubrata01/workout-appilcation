import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { MainTabNavigator } from "./MainTabNavigator";
import { HistoryScreen } from "../screens/main/HistoryScreen";
import type { MainStackParamList } from "./types";

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="History" component={HistoryScreen} options={{ presentation: "modal" }} />
    </Stack.Navigator>
  );
}
