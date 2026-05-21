import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { WealthProvider } from "@/lib/wealth-context";
import { OnboardingProvider } from "@/lib/onboarding-context";
import { AuthProvider } from "@/lib/auth-context";
import { ActiveProfileProvider } from "@/lib/active-profile-context";
import { AccessProvider } from "@/lib/access-context";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Toaster } from "@/components/ui/sonner";
import { installAuthFetch } from "@/lib/auth-fetch";


import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl text-gradient-violet">404</h1>
        <h2 className="mt-4 font-serif text-2xl text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This screen does not exist in your portfolio.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 glow-violet"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#0f0f18" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Æther" },
      { title: "Æther Wealth — Private Wealth Management" },
      { name: "description", content: "A private bank in your pocket. Manage investments, insurance, trust, and estate from a single luxury interface." },
      { name: "author", content: "Æther Wealth" },
      { property: "og:title", content: "Æther Wealth — Private Wealth Management" },
      { property: "og:description", content: "A private bank in your pocket. Manage investments, insurance, trust, and estate from a single luxury interface." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Æther Wealth — Private Wealth Management" },
      { name: "twitter:description", content: "A private bank in your pocket. Manage investments, insurance, trust, and estate from a single luxury interface." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f6acb342-cc7c-4cfa-b76e-8dab9d59e8a3/id-preview-7576f6af--70e40dda-83f0-429c-bb3e-310f288f91fb.lovable.app-1776981781490.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f6acb342-cc7c-4cfa-b76e-8dab9d59e8a3/id-preview-7576f6af--70e40dda-83f0-429c-bb3e-310f288f91fb.lovable.app-1776981781490.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Æther Wealth",
              url: "https://aetherwealth.co",
              logo: "https://aetherwealth.co/icon-512.png",
            },
            {
              "@type": "WebSite",
              name: "Æther Wealth",
              url: "https://aetherwealth.co",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    installAuthFetch();
    // Native iOS init (no-ops on web)
    import("@/lib/native").then(async ({ hideSplash, requestTrackingPermission }) => {
      await hideSplash();
      // Apple requires the ATT prompt to appear before any tracking-related
      // data collection. Trigger it once on first launch.
      await requestTrackingPermission();
    });
  }, []);
  return (
    <AuthProvider>
      <AccessProvider>
        <ActiveProfileProvider>
          <OnboardingProvider>
            <WealthProvider>
              <ScrollToTop />
              <PaymentTestModeBanner />
              <SyncStatusBar />
              <Outlet />

              <Toaster theme="dark" position="top-center" />
            </WealthProvider>
          </OnboardingProvider>
        </ActiveProfileProvider>
      </AccessProvider>
    </AuthProvider>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
