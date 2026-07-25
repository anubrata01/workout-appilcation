import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BarChart3, ClipboardList, Settings as SettingsIcon, Trophy } from "lucide-react-native";

import { LogScreen } from "../screens/main/LogScreen";
import { ReportsScreen } from "../screens/main/ReportsScreen";
import { PRsScreen } from "../screens/main/PRsScreen";
import { SettingsScreen } from "../screens/main/SettingsScreen";
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
      }}
    >
      <Tab.Screen
        name="Log"
        component={LogScreen}
        options={{
          tabBarIcon: ({ color, focused }) => <ClipboardList size={18} color={focused ? colors.accent : color} />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => <BarChart3 size={18} color={focused ? colors.accent : color} />,
        }}
      />
      <Tab.Screen
        name="PRs"
        component={PRsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => <Trophy size={18} color={focused ? colors.accent : color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => <SettingsIcon size={18} color={focused ? colors.accent : color} />,
        }}
      />
    </Tab.Navigator>
  );
}
