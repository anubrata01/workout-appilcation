import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BarChart3, Dumbbell, Settings as SettingsIcon, Trophy, Utensils } from "lucide-react-native";

import { SessionScreen } from "../screens/main/SessionScreen";
import { NutritionScreen } from "../screens/main/NutritionScreen";
import { ReportsScreen } from "../screens/main/ReportsScreen";
import { PRsScreen } from "../screens/main/PRsScreen";
import { SettingsScreen } from "../screens/main/SettingsScreen";
import { FadeInOnFocus } from "../components/FadeInOnFocus";
import { colors, fonts } from "../theme/tokens";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Settings lives in the footer tab bar alongside Log/Reports/PRs, not as a
 * floating icon on each screen — one consistent place to reach it from. */
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surfaceElevated, borderTopColor: colors.borderSubtle },
        tabBarActiveTintColor: colors.chalk,
        tabBarInactiveTintColor: colors.dim,
        tabBarLabelStyle: { fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
        animation: "shift",
      }}
    >
      <Tab.Screen
        name="Session"
        options={{
          tabBarIcon: ({ color, focused }) => <Dumbbell size={18} color={focused ? colors.accent : color} />,
        }}
      >
        {(props) => (
          <FadeInOnFocus>
            <SessionScreen {...props} />
          </FadeInOnFocus>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Nutrition"
        options={{
          tabBarIcon: ({ color, focused }) => <Utensils size={18} color={focused ? colors.accent : color} />,
        }}
      >
        {() => (
          <FadeInOnFocus>
            <NutritionScreen />
          </FadeInOnFocus>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Reports"
        options={{
          tabBarIcon: ({ color, focused }) => <BarChart3 size={18} color={focused ? colors.accent : color} />,
        }}
      >
        {() => (
          <FadeInOnFocus>
            <ReportsScreen />
          </FadeInOnFocus>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="PRs"
        options={{
          tabBarIcon: ({ color, focused }) => <Trophy size={18} color={focused ? colors.accent : color} />,
        }}
      >
        {() => (
          <FadeInOnFocus>
            <PRsScreen />
          </FadeInOnFocus>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        options={{
          tabBarIcon: ({ color, focused }) => <SettingsIcon size={18} color={focused ? colors.accent : color} />,
        }}
      >
        {() => (
          <FadeInOnFocus>
            <SettingsScreen />
          </FadeInOnFocus>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
