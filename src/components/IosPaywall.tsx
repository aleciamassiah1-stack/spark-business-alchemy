// iOS-only paywall. Renders inside /pricing when the binary is running on
// iOS native, replacing the Stripe checkout flow with Apple In-App Purchase
// via RevenueCat.
//
// Apple requires a visible "Restore Purchases" entry point on every paid
// surface (Guideline 3.1.1) — included below.

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";
import {
  getIapPackages,
  isRevenueCatConfigured,
  purchaseIapPackage,
  restoreIapPurchases,
  type IapPackage,
} from "@/lib/revenuecat";
import { useAccess } from "@/lib/access-context";

type Billing = "monthly" | "annual";

const TIER_META = {
  essential: {
    name: "Essential",
    description: "For individuals and independent advisors",
    priceColor: "text-foreground",
    cta: "border border-white/[0.18] bg-transparent text-foreground hover:bg-white/[0.06]",
    accent: "text-muted-foreground",
    border: "border-white/[0.06]",
    bg: "gradient-card",
    glow: "",
    features: [
      "Up to 3 connected accounts",
      "Investments, banking and insurance tracking",
      "Net worth dashboard",
      "Estate document vault",
      "Mobile app",
      "Bank-level encryption",
    ],
  },
  private: {
    name: "Private",
    description: "For high net worth individuals",
    priceColor: "text-gradient-violet",
    cta: "bg-primary text-primary-foreground hover:bg-primary/90",
    accent: "text-primary",
    border: "border-primary/40",
    bg: "gradient-hero",
    glow: "shadow-[0_0_60px_-10px_oklch(0.68_0.13_295/0.45)]",
    features: [
      "Everything in Essential, plus",
      "Unlimited connected accounts",
      "Trust and estate suite",
      "Family vault",
      "AI insurance parser",
      "Priority support",
    ],
  },
  family: {
    name: "Family Office",
    description: "For ultra high net worth families and family offices",
    priceColor: "text-gradient-gold",
    cta: "border border-gold/50 bg-transparent text-gold hover:bg-gold/10",
    accent: "text-gold",
    border: "border-gold/40",
    bg: "gradient-card",
    glow: "shadow-[0_0_50px_-15px_oklch(0.82_0.12_85/0.3)]",
    features: [
      "Everything in Private, plus",
      "Unlimited family members",
      "Dedicated on-call wealth manager",
      "White-glove account aggregation — we set up your accounts for you",
      "Family governance facilitation — annual family meeting prep and agenda",
      "Consolidated multi-entity reporting — trusts, LLCs and foundations in one view",
      "Role-based access for trustees, CPA and attorneys with full audit log",
      "Multi-generational planning",
      "Cap table and exit planning",
      "Concierge support",
    ],
  },
} as const;

const TIER_ORDER: ReadonlyArray<keyof typeof TIER_META> = ["private", "essential", "family"];

export function IosPaywall() {
  const [billing, setBilling] = useState<Billing>("annual");
  const [packages, setPackages] = useState<IapPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const access = useAccess();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isRevenueCatConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const pkgs = await getIapPackages();
        if (!cancelled) setPackages(pkgs);
      } catch (err) {
        console.error("[IosPaywall] failed to load offerings", err);
        if (!cancelled) toast.error("Couldn't load membership tiers. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byTier = (tier: keyof typeof TIER_META) =>
    packages.find((p) => p.tierKey === tier && p.cadence === billing);

  const handleBuy = async (pkg: IapPackage) => {
    setBusy(pkg.identifier);
    // Safety net: StoreKit can occasionally hang (e.g. no sandbox account
    // signed in on the device). Make sure the button can't spin forever.
    const timeout = setTimeout(() => {
      setBusy((cur) => (cur === pkg.identifier ? null : cur));
      toast.error(
        "Apple is taking longer than expected. Make sure you're signed into a sandbox Apple ID in Settings → App Store, then try again.",
      );
    }, 60_000);
    try {
      await purchaseIapPackage(pkg);
      toast.success("Welcome — your subscription is active.");
      await access.refresh();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Purchase failed";
      if (msg !== "CANCELLED") toast.error(msg);
    } finally {
      clearTimeout(timeout);
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const { activeEntitlements } = await restoreIapPurchases();
      if (activeEntitlements.length > 0) {
        toast.success("Purchases restored.");
        await access.refresh();
      } else {
        toast("No previous purchases found on this Apple ID.");
      }
    } catch (err) {
      toast.error((err as Error)?.message ?? "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="text-center">
        <p className="label-mono">Membership</p>
        <h1 className="mt-2 font-serif text-[36px] leading-[1.05] text-foreground">
          Quiet confidence,
          <br />
          <span className="text-gradient-violet">priced accordingly.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          Three tiers built for serious wealth. Subscriptions are billed through your Apple ID and may be managed in Settings.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="mt-7 flex flex-col items-center gap-2">
        <div className="relative inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`relative z-10 rounded-full px-5 py-1.5 text-xs font-medium transition-colors ${
              billing === "monthly" ? "text-background" : "text-muted-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`relative z-10 rounded-full px-5 py-1.5 text-xs font-medium transition-colors ${
              billing === "annual" ? "text-background" : "text-muted-foreground"
            }`}
          >
            Annual
          </button>
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`absolute top-1 bottom-1 rounded-full bg-foreground ${
              billing === "monthly" ? "left-1 right-[calc(50%+2px)]" : "left-[calc(50%+2px)] right-1"
            }`}
          />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-success">
          Save up to 2 months
        </span>
      </div>

      {loading ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">Loading membership tiers…</p>
      ) : !isRevenueCatConfigured() ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          In-app purchases are not yet available. Please check back soon.
        </p>
      ) : packages.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          No membership tiers available right now. Please check back soon.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {TIER_ORDER.map((tierKey) => {
            const meta = TIER_META[tierKey];
            const pkg = byTier(tierKey);
            const highlighted = tierKey === "private";
            return (
              <motion.div
                key={tierKey}
                animate={highlighted ? { y: [0, -3, 0] } : undefined}
                transition={
                  highlighted ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : undefined
                }
                className={`relative overflow-hidden rounded-3xl border ${meta.border} ${meta.bg} ${meta.glow} p-6`}
              >
                {highlighted && (
                  <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-gold">
                    <Star className="h-3 w-3 fill-gold" strokeWidth={0} />
                    Most Popular
                  </div>
                )}
                <p className={`font-mono text-[11px] uppercase tracking-[0.22em] ${meta.accent}`}>
                  {meta.name}
                </p>
                <p className="mt-2 max-w-[80%] text-xs text-muted-foreground">
                  {meta.description}
                </p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className={`font-serif text-[40px] leading-none ${meta.priceColor}`}>
                    {pkg?.priceString ?? "—"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    /{billing === "annual" ? "yr" : "mo"}
                  </span>
                </div>

                <button
                  onClick={() => pkg && handleBuy(pkg)}
                  disabled={!pkg || busy !== null}
                  className={`mt-6 w-full rounded-full px-5 py-3 text-sm font-medium transition-all disabled:opacity-50 ${meta.cta}`}
                >
                  {busy === pkg?.identifier ? "Processing…" : "Subscribe"}
                </button>

                <ul className="mt-6 space-y-2.5">
                  {meta.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                          tierKey === "private"
                            ? "text-primary"
                            : tierKey === "family"
                              ? "text-gold"
                              : "text-muted-foreground"
                        }`}
                        strokeWidth={2.4}
                      />
                      <span className="text-sm leading-snug text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Restore Purchases — Apple requires this on every paid surface */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] px-5 py-2.5 text-xs font-medium text-foreground transition-all hover:border-white/[0.2] hover:bg-white/[0.06] disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {restoring ? "Restoring…" : "Restore Purchases"}
        </button>
        <p className="px-6 text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
          Payment is charged to your Apple ID at confirmation of purchase.
          Subscription auto-renews unless turned off at least 24 hours before the
          end of the current period. Manage or cancel in Settings → Apple ID →
          Subscriptions.
        </p>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </div>
      </div>
    </div>
  );
}
