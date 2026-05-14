// Thin wrapper around Capacitor APIs.
// Safe to import from anywhere: every method no-ops on the web.
import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform(); // "ios" | "android" | "web"

// Haptics --------------------------------------------------------------
export async function tapHaptic() {
  if (!isNative()) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  await Haptics.impact({ style: ImpactStyle.Light });
}

// Biometrics (Face ID / Touch ID) -------------------------------------
export async function biometricUnlock(reason = "Unlock Æther Wealth") {
  if (!isNative()) return { available: false, verified: false };
  const { NativeBiometric } = await import("capacitor-native-biometric");
  const result = await NativeBiometric.isAvailable();
  if (!result.isAvailable) return { available: false, verified: false };
  try {
    await NativeBiometric.verifyIdentity({
      reason,
      title: "Æther Wealth",
      subtitle: "Authenticate to view your portfolio",
    });
    return { available: true, verified: true };
  } catch {
    return { available: true, verified: false };
  }
}

// Push notifications --------------------------------------------------
export async function registerPush(onToken: (token: string) => void) {
  if (!isNative()) return;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;
  await PushNotifications.register();
  PushNotifications.addListener("registration", (t) => onToken(t.value));
}

// Splash screen -------------------------------------------------------
export async function hideSplash() {
  if (!isNative()) return;
  const { SplashScreen } = await import("@capacitor/splash-screen");
  await SplashScreen.hide();
}

// App Tracking Transparency (iOS) -------------------------------------
// Apple requires the ATT prompt before any data is used to track the user
// across apps and websites owned by other companies. We currently do not
// engage in cross-app tracking, but we still surface the prompt on iOS so
// reviewers can verify the system dialog appears.
export async function requestTrackingPermission() {
  if (!isNative() || platform() !== "ios") return { status: "unavailable" as const };
  try {
    const { AppTrackingTransparency } = await import(
      "capacitor-plugin-app-tracking-transparency"
    );
    const current = await AppTrackingTransparency.getStatus();
    if (current.status === "notDetermined") {
      const res = await AppTrackingTransparency.requestPermission();
      return { status: res.status };
    }
    return { status: current.status };
  } catch {
    return { status: "error" as const };
  }
}
