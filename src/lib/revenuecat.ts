// RevenueCat SDK wrapper.
//
// Apple Guideline 3.1.1: paid digital content on iOS must be sold via
// In-App Purchase. We use RevenueCat to wrap StoreKit because it handles
// receipt validation, restore-purchases, and webhook fan-out to our
// Supabase `subscriptions` table.
//
// All RevenueCat code is gated to iOS native — on the web we keep using
// Stripe. The dynamic imports below also keep RevenueCat out of the
// browser bundle entirely.

import { isIosNative } from "@/lib/native";
import { supabase } from "@/integrations/supabase/client";

// RevenueCat iOS public SDK key. Safe to ship in the client bundle —
// RevenueCat keys are scoped to a single app and a single platform.
const IOS_API_KEY = import.meta.env.VITE_REVENUECAT_IOS_PUBLIC_KEY as string | undefined;

let initialised = false;
let initPromise: Promise<void> | null = null;
let currentAppUserId: string | null = null;

/**
 * Make sure the SDK is configured before any offerings/purchase call.
 * Pulls the current Supabase user id so callers don't have to thread it
 * through. Safe to call repeatedly — subsequent calls are no-ops.
 */
async function ensureReady(): Promise<boolean> {
  if (!isIosNative()) return false;
  if (!IOS_API_KEY) {
    console.warn("[revenuecat] VITE_REVENUECAT_IOS_PUBLIC_KEY not set — purchases disabled");
    return false;
  }
  if (initialised && currentAppUserId) return true;
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id ?? null;
  if (!uid) {
    console.warn("[revenuecat] no Supabase user — cannot start purchase");
    return false;
  }
  await initRevenueCat(uid);
  return initialised;
}

/**
 * Initialise the Purchases SDK with the current Supabase user id.
 * Safe to call multiple times — subsequent calls are no-ops unless the
 * user changes, in which case we call `logIn` to swap identity.
 */
export async function initRevenueCat(supabaseUserId: string | null): Promise<void> {
  if (!isIosNative()) return;
  if (!IOS_API_KEY) {
    console.warn("[revenuecat] VITE_REVENUECAT_IOS_PUBLIC_KEY not set");
    return;
  }
  if (!supabaseUserId) return;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");

    if (!initialised) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({
        apiKey: IOS_API_KEY,
        appUserID: supabaseUserId,
      });
      initialised = true;
      currentAppUserId = supabaseUserId;
      console.info("[revenuecat] configured for", supabaseUserId);
    } else if (currentAppUserId !== supabaseUserId) {
      await Purchases.logIn({ appUserID: supabaseUserId });
      currentAppUserId = supabaseUserId;
      console.info("[revenuecat] switched user to", supabaseUserId);
    }
  })();

  try {
    await initPromise;
  } catch (err) {
    console.error("[revenuecat] init failed", err);
    initialised = false;
    currentAppUserId = null;
  } finally {
    initPromise = null;
  }
}

/** Sign the current user out of RevenueCat (anonymises future purchases). */
export async function logoutRevenueCat(): Promise<void> {
  if (!isIosNative() || !initialised) return;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  try {
    await Purchases.logOut();
    currentAppUserId = null;
  } catch {
    // logOut throws if already anonymous — safe to swallow
  }
}

export type IapPackage = {
  identifier: string;
  productIdentifier: string;
  priceString: string;
  /** "essential" | "private" | "family" — derived from product id */
  tierKey: "essential" | "private" | "family";
  /** "monthly" | "annual" */
  cadence: "monthly" | "annual";
  rawPackage: unknown;
};

/**
 * Fetch the current RevenueCat offering and normalise into our tier model.
 * Returns [] if not on iOS or no offering is configured.
 */
export async function getIapPackages(): Promise<IapPackage[]> {
  if (!isIosNative()) return [];
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { current } = await Purchases.getOfferings();
  if (!current) return [];

  const out: IapPackage[] = [];
  for (const pkg of current.availablePackages ?? []) {
    const productId = pkg.product.identifier;
    const tierKey = productId.startsWith("essential")
      ? "essential"
      : productId.startsWith("private")
        ? "private"
        : productId.startsWith("family")
          ? "family"
          : null;
    if (!tierKey) continue;
    const cadence = productId.endsWith("_annual") ? "annual" : "monthly";
    out.push({
      identifier: pkg.identifier,
      productIdentifier: productId,
      priceString: pkg.product.priceString,
      tierKey,
      cadence,
      rawPackage: pkg,
    });
  }
  return out;
}

/** Buy a package. Throws if the user cancels or the purchase fails. */
export async function purchaseIapPackage(pkg: IapPackage): Promise<{ activeEntitlements: string[] }> {
  if (!isIosNative()) throw new Error("In-app purchases are only available in the iOS app");
  const { Purchases, PURCHASES_ERROR_CODE } = await import("@revenuecat/purchases-capacitor");
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await Purchases.purchasePackage({ aPackage: pkg.rawPackage as any });
    const active = Object.keys(result.customerInfo.entitlements.active ?? {});
    return { activeEntitlements: active };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      throw new Error("CANCELLED");
    }
    throw err;
  }
}

/** Apple-required Restore Purchases. */
export async function restoreIapPurchases(): Promise<{ activeEntitlements: string[] }> {
  if (!isIosNative()) throw new Error("Restore is only available in the iOS app");
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const result = await Purchases.restorePurchases();
  const active = Object.keys(result.customerInfo.entitlements.active ?? {});
  return { activeEntitlements: active };
}

export function isRevenueCatConfigured(): boolean {
  return !!IOS_API_KEY;
}
