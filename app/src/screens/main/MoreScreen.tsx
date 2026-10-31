import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Ruler, Settings as SettingsIcon, Target, User } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMeQuery } from "../../api/authApi";
import { ScreenBackground } from "../../components/ScreenBackground";
import { colors, fonts, radii, spacing } from "../../theme/tokens";
import type { MainTabScreenProps } from "../../navigation/types";

/** Everything that isn't a daily tab: goals, measurements, settings. */
export function MoreScreen({ navigation }: MainTabScreenProps<"More">) {
  const { data: user } = useMeQuery();

  const rows = [
    { key: "goals", label: "Goals", hint: "Calories, macros, water, target weight", icon: Target, go: () => navigation.navigate("Goals") },
    { key: "measurements", label: "Measurements", hint: "Weight, body fat and tape measurements", icon: Ruler, go: () => navigation.navigate("Measurements") },
    { key: "settings", label: "Settings", hint: "Reminders and account", icon: SettingsIcon, go: () => navigation.navigate("Settings") },
  ];

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>More</Text>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <User size={26} color={colors.surface} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.display_name || user?.email || "Your account"}
              </Text>
              {user?.display_name && user?.email ? (
                <Text style={styles.email} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.card}>
            {rows.map((row, i) => (
              <Pressable key={row.key} style={[styles.row, i > 0 && styles.divider]} onPress={row.go}>
                <row.icon size={18} color={colors.chalk} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{row.label}</Text>
                  <Text style={styles.hint}>{row.hint}</Text>
                </View>
                <ChevronRight size={16} color={colors.faint} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 1, color: colors.chalk },
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.lg },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 52, height: 52 },
  profileName: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.chalk },
  email: { fontFamily: fonts.data, fontSize: 12, color: colors.muted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg - 2 },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.chalk },
  hint: { fontFamily: fonts.body, fontSize: 11.5, color: colors.dim, marginTop: 1 },
});
