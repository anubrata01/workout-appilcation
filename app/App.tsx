import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { PersistGate } from "redux-persist/integration/react";

import { persistor, store } from "./src/store";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { LaunchScreen } from "./src/components/LaunchScreen";
import { useAppFonts } from "./src/theme/useAppFonts";

// Keep the native splash up until our own animated LaunchScreen is ready to
// take over below — avoids a blank-white flash between the OS splash and the
// first JS frame.
SplashScreen.preventAutoHideAsync().catch(() => {});

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

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={<LaunchScreen />} persistor={persistor}>
        <SafeAreaProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
