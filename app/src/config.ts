import { Platform } from "react-native";

/**
 * Direct-to-service URLs for now (each service's dev port, root README
 * "Running locally") — swap for the gateway URL (localhost:8080) once
 * gateway/kong.yml is verified end-to-end (implementation plan Phase 5).
 *
 * Android emulator can't resolve the host machine's "localhost" — it needs the
 * special 10.0.2.2 alias. A physical device over Expo Go needs your machine's
 * LAN IP instead; override with the EXPO_PUBLIC_*_API_URL vars in that case.
 */
const DEFAULT_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";

export const AUTH_API_URL =
  process.env.EXPO_PUBLIC_AUTH_API_URL ?? `http://${DEFAULT_HOST}:8001/api`;

export const WORKOUT_API_URL =
  process.env.EXPO_PUBLIC_WORKOUT_API_URL ?? `http://${DEFAULT_HOST}:8002/api`;

export const ANALYTICS_API_URL =
  process.env.EXPO_PUBLIC_ANALYTICS_API_URL ?? `http://${DEFAULT_HOST}:8003/api`;

export const NOTIFICATION_API_URL =
  process.env.EXPO_PUBLIC_NOTIFICATION_API_URL ?? `http://${DEFAULT_HOST}:8004/api`;
