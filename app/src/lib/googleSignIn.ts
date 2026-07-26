import { GoogleSignin } from "@react-native-google-signin/google-signin";

let configured = false;

/**
 * Uses the WEB client ID (not the Android one) as webClientId — that's the
 * client id the backend verifies the token's audience against too (Auth
 * Service's GOOGLE_OAUTH_CLIENT_ID must be the same value). The Android
 * client id only needs to exist in Google Cloud Console; the native SDK
 * looks it up by package name + SHA-1, it's never referenced directly here.
 */
function ensureConfigured() {
  if (configured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set — see app/.env.example.");
  }
  GoogleSignin.configure({ webClientId });
  configured = true;
}

/** Returns the Google ID token to send to Auth Service's /v1/auth/google, or null if the user cancelled. */
export async function signInWithGoogle(): Promise<string | null> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type === "cancelled") return null;
  return response.data.idToken;
}
