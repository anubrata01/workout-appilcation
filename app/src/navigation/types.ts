import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";

import type { MeasurementKind } from "../api/nutritionApi";

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  Login: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type MainTabParamList = {
  Home: undefined;
  Session: undefined;
  Nutrition: undefined;
  Progress: undefined;
  More: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  History: { initialOffset?: number } | undefined;
  ExerciseDetail: { name: string };
  RoutineEditor: { routineId?: string } | undefined;
  NutritionInsights: undefined;
  Goals: undefined;
  Measurements: { kind?: MeasurementKind } | undefined;
  Settings: undefined;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<MainStackParamList>
>;

export type MainStackScreenProps<T extends keyof MainStackParamList> = NativeStackScreenProps<
  MainStackParamList,
  T
>;
