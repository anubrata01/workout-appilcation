import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { View } from "react-native";

import { store } from "./src/store";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useAppFonts } from "./src/theme/useAppFonts";
import { colors } from "./src/theme/tokens";

export default function App() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar style="light" />
      </SafeAreaProvider>
    </Provider>
  );
}
