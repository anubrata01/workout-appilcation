import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { MainTabNavigator } from "./MainTabNavigator";
import { ExerciseDetailScreen } from "../screens/main/ExerciseDetailScreen";
import { GoalsScreen } from "../screens/main/GoalsScreen";
import { HistoryScreen } from "../screens/main/HistoryScreen";
import { MeasurementsScreen } from "../screens/main/MeasurementsScreen";
import { NutritionInsightsScreen } from "../screens/main/NutritionInsightsScreen";
import { RoutineEditorScreen } from "../screens/main/RoutineEditorScreen";
import { SettingsScreen } from "../screens/main/SettingsScreen";
import type { MainStackParamList } from "./types";

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="History" component={HistoryScreen} options={{ presentation: "modal" }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="RoutineEditor" component={RoutineEditorScreen} />
      <Stack.Screen name="NutritionInsights" component={NutritionInsightsScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="Measurements" component={MeasurementsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
