import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { View } from "react-native";
import * as Notifications from "expo-notifications";
import { PersistGate } from "redux-persist/integration/react";

import { persistor, store } from "./src/store";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useAppFonts } from "./src/theme/useAppFonts";
import { colors } from "./src/theme/tokens";

// Reminders are the only notification kind (PRD/app flow scope) — always
// show them with sound even while the app's open, same as the OS would.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={<View style={{ flex: 1, backgroundColor: colors.bg }} />} persistor={persistor}>
        <SafeAreaProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
