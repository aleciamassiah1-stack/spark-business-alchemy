import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "co.aetherwealth.app",
  appName: "Æther Wealth",
  // Loads the live, published web app inside the iOS shell.
  // SSR, Plaid, Supabase auth, server functions all keep working.
  server: {
    url: "https://aetherwealth.co",
    cleartext: false,
    iosScheme: "https",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0f0f18",
    limitsNavigationsToAppBoundDomains: false,
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      launchFadeOutDuration: 0,
      backgroundColor: "#0f0f18",
      showSpinner: false,
      splashImmersive: false,
      splashFullScreen: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f0f18",
      overlaysWebView: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
