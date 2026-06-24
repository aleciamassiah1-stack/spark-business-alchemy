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
      { name: "apple-mobile-web-app-title", content: "Æther Wealth" },
      { name: "author", content: "Æther Wealth" },
      { property: "og:site_name", content: "Æther Wealth" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "google-site-verification", content: "0HKp25FrwxgliZbXqOcL1llP24IZ08ZPGR-TgZBY0GY" },
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
              alternateName: ["Aether Wealth", "AetherWealth"],
              url: "https://aetherwealth.co",
              logo: "https://aetherwealth.co/icon-512.png",
              description:
                "Private-bank-grade wealth platform unifying banking, investments, real estate, insurance, business and trust & estate planning in one luxury mobile dashboard.",
              sameAs: ["https://aetherwealth.co"],
            },
            {
              "@type": "WebSite",
              name: "Æther Wealth",
              url: "https://aetherwealth.co",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://aetherwealth.co/?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "SoftwareApplication",
              name: "Æther Wealth",
              alternateName: "Aether Wealth",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web, iOS",
              url: "https://aetherwealth.co",
              description:
                "Private wealth dashboard with net worth tracking, estate planning, beneficiary management, insurance vault, will builder, and audience portals for advisors, attorneys, CPAs and family offices.",
              offers: { "@type": "Offer", priceCurrency: "USD" },
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
