import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BarChart3, Dumbbell, Home, Menu, Utensils } from "lucide-react-native";

import { FadeInOnFocus } from "../components/FadeInOnFocus";
import { HomeScreen } from "../screens/main/HomeScreen";
import { MoreScreen } from "../screens/main/MoreScreen";
import { NutritionScreen } from "../screens/main/NutritionScreen";
import { ProgressScreen } from "../screens/main/ProgressScreen";
import { SessionScreen } from "../screens/main/SessionScreen";
import { colors, fonts } from "../theme/tokens";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Five daily destinations: Home (today at a glance), Workout, Nutrition,
 * Progress (overview, records, body) and More (goals, measurements, settings). */
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surfaceElevated, borderTopColor: colors.borderSubtle },
        tabBarActiveTintColor: colors.chalk,
        tabBarInactiveTintColor: colors.dim,
        tabBarLabelStyle: { fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
        animation: "fade",
      }}
    >
      <Tab.Screen
        name="Home"
        options={{ tabBarIcon: ({ color, focused }) => <Home size={18} color={focused ? colors.accent : color} /> }}
      >
        {(props) => (
          <FadeInOnFocus>
            <HomeScreen {...props} />
          </FadeInOnFocus>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Session"
        options={{
          title: "Workout",
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
        options={{ tabBarIcon: ({ color, focused }) => <Utensils size={18} color={focused ? colors.accent : color} /> }}
      >
        {(props) => (
          <FadeInOnFocus>
            <NutritionScreen {...props} />
          </FadeInOnFocus>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Progress"
        options={{ tabBarIcon: ({ color, focused }) => <BarChart3 size={18} color={focused ? colors.accent : color} /> }}
      >
        {() => (
          <FadeInOnFocus>
            <ProgressScreen />
          </FadeInOnFocus>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="More"
        options={{ tabBarIcon: ({ color, focused }) => <Menu size={18} color={focused ? colors.accent : color} /> }}
      >
        {(props) => (
          <FadeInOnFocus>
            <MoreScreen {...props} />
          </FadeInOnFocus>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
