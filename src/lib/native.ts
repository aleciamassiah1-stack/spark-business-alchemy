// Thin wrapper around Capacitor APIs.
// Safe to import from anywhere: every method no-ops on the web.
import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform(); // "ios" | "android" | "web"

/**
 * True only inside the native iOS Capacitor build.
 * Used to gate web-only purchase flows (Apple's IAP requirement —
 * no external paywall UI is allowed inside the iOS app binary).
 */
export const isIosNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

function randomString(len = 32): string {
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Thrown by signInWithNativeApple when the user cancels the system Apple
 * sheet. Callers can use this to suppress the error toast for cancellations.
 */
export class AppleSignInCancelledError extends Error {
  constructor() {
    super("Apple sign-in was cancelled.");
    this.name = "AppleSignInCancelledError";
  }
}

function isAppleCancellation(err: unknown): boolean {
  if (!err) return false;
  const e = err as { code?: string | number; message?: string };
  const code = String(e.code ?? "");
  const msg = (typeof err === "string" ? err : (e.message ?? "")).toLowerCase();
  // ASAuthorizationErrorCanceled = 1001.
  return (
    code === "1001" ||
    msg.includes("canceled") ||
    msg.includes("cancelled") ||
    msg.includes("the user canceled")
  );
}

export async function signInWithNativeApple() {
  if (!isIosNative()) throw new Error("Native Apple sign-in is only available in the iOS app.");

  const [{ SignInWithApple }, { supabase }] = await Promise.all([
    import("@capacitor-community/apple-sign-in"),
    import("@/integrations/supabase/client"),
  ]);

  // Apple/Supabase recommend a nonce: raw random sent to Supabase, sha256(nonce) sent to Apple.
  const rawNonce = randomString(32);
  const hashedNonce = await sha256Hex(rawNonce);

  let result: Awaited<ReturnType<typeof SignInWithApple.authorize>>;
  try {
    result = await SignInWithApple.authorize({
      clientId: "co.aetherwealth.app",
      redirectURI: "https://aetherwealth.co/signin",
      scopes: "email name",
      state: randomString(16),
      nonce: hashedNonce,
    });
  } catch (err) {
    if (isAppleCancellation(err)) throw new AppleSignInCancelledError();
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Apple couldn't complete sign-in${msg ? `: ${msg}` : "."} Please try again, or use email sign-in.`,
    );
  }

  const token = result.response?.identityToken;
  if (!token) {
    throw new Error(
      "Apple didn't return a sign-in token. Make sure you're signed in to iCloud on this device and try again.",
    );
  }

  try {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token,
      nonce: rawNonce,
    });
    if (error) throw error;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Surface the token-exchange failure clearly so reviewers can report it.
    throw new Error(
      `We couldn't verify your Apple sign-in with our servers${msg ? ` (${msg})` : ""}. Please try again, or use email sign-in.`,
    );
  }
}

/**
 * In-app Google sign-in for iOS native. Uses Supabase PKCE + SFSafariViewController
 * (Capacitor Browser plugin) so authentication NEVER leaves the app to the system
 * Safari browser — required by App Store Guideline 4.
 */
export async function signInWithNativeOAuth(provider: "google" | "apple"): Promise<void> {
  if (!isIosNative()) throw new Error("Native OAuth is only available in the iOS app.");

  const [{ Browser }, { App }, { supabase }] = await Promise.all([
    import("@capacitor/browser"),
    import("@capacitor/app"),
    import("@/integrations/supabase/client"),
  ]);

  // Custom URL scheme registered in iOS Info.plist (CFBundleURLTypes).
  const redirectTo = "co.aetherwealth.app://oauth-callback";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Could not start sign-in.");

  // Wait for the deep-link callback from SFSafariViewController. Some iOS
  // builds set the session successfully but do not deliver the appUrlOpen
  // event back to the WebView, so also resolve from auth state/session checks.
  const completion = new Promise<void>((resolve, reject) => {
    let settled = false;
    let appSub: Promise<{ remove: () => void }> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    const cleanup = async () => {
      if (poll) clearInterval(poll);
      await Browser.close().catch(() => {});
      await appSub?.then((s) => s.remove()).catch(() => {});
      authSub.unsubscribe();
    };

    const finish = (errorToThrow?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      void cleanup().finally(() => {
        if (errorToThrow) {
          reject(errorToThrow instanceof Error ? errorToThrow : new Error(String(errorToThrow)));
        } else {
          resolve();
        }
      });
    };

    const resolveIfSessionExists = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) finish();
    };

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish();
    });

    const timeout = setTimeout(() => {
      finish(new Error("Sign-in timed out. Please try again."));
    }, 45 * 1000);

    poll = setInterval(() => {
      void resolveIfSessionExists().catch(() => {});
    }, 1000);

    appSub = App.addListener("appUrlOpen", async (event: { url: string }) => {
      try {
        if (!event.url || !event.url.startsWith(redirectTo)) return;
        const url = new URL(event.url);
        const code = url.searchParams.get("code");
        const errParam = url.searchParams.get("error_description") || url.searchParams.get("error");
        if (errParam) throw new Error(errParam);
        if (!code) {
          await resolveIfSessionExists();
          if (!settled) throw new Error("Sign-in callback missing authorization code.");
          return;
        }
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchErr) throw exchErr;
        finish();
      } catch (e) {
        finish(e);
      }
    });
  });

  // "fullscreen" keeps SFSafariViewController in-app on both iPhone and iPad.
  // "popover" without an anchor view falls back to external Safari on iPad,
  // which violates App Store Guideline 4 (and caused our prior rejection).
  await Browser.open({ url: data.url, presentationStyle: "fullscreen" });
  await completion;
}

// Haptics --------------------------------------------------------------
export async function tapHaptic() {
  if (!isNative()) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  await Haptics.impact({ style: ImpactStyle.Light });
}

// Biometrics (Face ID / Touch ID) -------------------------------------
export async function biometricUnlock(reason = "Unlock Æther Wealth") {
  if (!isNative()) return { available: false, verified: false };
  const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
  const result = await NativeBiometric.isAvailable({ useFallback: true });
  if (!result.isAvailable) return { available: false, verified: false };
  try {
    await NativeBiometric.verifyIdentity({
      reason,
      title: "Æther Wealth",
      subtitle: "Authenticate to view your portfolio",
      useFallback: true,
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
    const { AppTrackingTransparency } = await import("capacitor-plugin-app-tracking-transparency");
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
