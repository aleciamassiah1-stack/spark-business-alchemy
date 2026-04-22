import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus, ChevronDown, X, Lock, Star } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { isStripeConfigured } from "@/lib/stripe";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Æther Wealth" },
      { name: "description", content: "Three tiers built for serious wealth. Essential, Private and Family Office." },
      { property: "og:title", content: "Pricing — Æther Wealth" },
      { property: "og:description", content: "Private banking-grade pricing for individuals, advisors and family offices." },
    ],
  }),
  component: PricingPage,
});

type Billing = "monthly" | "annual";

type Tier = {
  key: "essential" | "private" | "family";
  name: string;
  description: string;
  monthly: number;
  annual: number;
  monthlyEquivalent: number;
  savings: number;
  cta: string;
  ctaAction: "checkout" | "demo";
  features: string[];
  variant: "essential" | "private" | "family";
  priceIds?: { monthly: string; annual: string };
};

const TIERS: Tier[] = [
  {
    key: "essential",
    name: "Essential",
    description: "For individuals and independent advisors",
    monthly: 149,
    annual: 1490,
    monthlyEquivalent: 149,
    savings: 298,
    cta: "Get Started",
    ctaAction: "checkout",
    variant: "essential",
    priceIds: { monthly: "essential_monthly", annual: "essential_annual" },
    features: [
      "Up to 3 connected accounts",
      "Investments, banking and insurance tracking",
      "Net worth dashboard",
      "Estate document vault — up to 5 documents",
      "Mobile app — iOS and Android",
      "256-bit bank-level encryption",
      "Email support",
      "Up to 10 client profiles (B2B)",
    ],
  },
  {
    key: "private",
    name: "Private",
    description: "For high net worth individuals and wealth advisory practices",
    monthly: 399,
    annual: 3990,
    monthlyEquivalent: 399,
    savings: 798,
    cta: "Get Started",
    ctaAction: "checkout",
    variant: "private",
    priceIds: { monthly: "private_monthly", annual: "private_annual" },
    features: [
      "Everything in Essential, plus",
      "Unlimited connected accounts",
      "Full trust and estate suite",
      "Will and beneficiary manager",
      "Business section — valuation, financials, succession",
      "AI-powered insurance document parser",
      "Family vault — up to 5 members",
      "Real estate valuation — automatic Zillow sync",
      "Advisor on file",
      "Priority support — 24 hour response",
      "Up to 50 client profiles (B2B)",
      "White label ready (B2B)",
    ],
  },
  {
    key: "family",
    name: "Family Office",
    description: "For ultra high net worth families, private banks and enterprise firms",
    monthly: 1500,
    annual: 14990,
    monthlyEquivalent: 1500,
    savings: 3010,
    cta: "Request a Demo",
    ctaAction: "demo",
    variant: "family",
    features: [
      "Everything in Private, plus",
      "Unlimited family members and client profiles",
      "Full white label — your brand, your domain",
      "Dedicated account manager",
      "Custom API integrations",
      "Multi-generational legacy planning suite",
      "Advanced business — cap table, exit planning, M&A",
      "Quarterly strategy review calls",
      "Custom onboarding and data migration",
      "SLA guarantee — 99.9% uptime",
      "Concierge support — direct phone, 1 hour response",
      "On-site implementation available",
    ],
  },
];

const TRUST_SIGNALS = [
  "SOC 2 Type II Certified",
  "256-bit Encryption",
  "FINRA Compliant",
  "No free trial — serious platform for serious wealth",
  "Rated 4.9 on App Store",
];

type Row = { label: string; values: [string | boolean, string | boolean, string | boolean] };
type Section = { title: string; rows: Row[] };

const COMPARISON: Section[] = [
  {
    title: "Core Features",
    rows: [
      { label: "Net worth dashboard", values: [true, true, true] },
      { label: "Mobile app (iOS / Android)", values: [true, true, true] },
      { label: "256-bit encryption", values: [true, true, true] },
      { label: "Connected accounts", values: ["Up to 3", "Unlimited", "Unlimited"] },
    ],
  },
  {
    title: "Wealth Management",
    rows: [
      { label: "Investments & banking", values: [true, true, true] },
      { label: "Insurance tracking", values: [true, true, true] },
      { label: "AI insurance parser", values: [false, true, true] },
      { label: "Real estate Zillow sync", values: [false, true, true] },
      { label: "Advisor on file", values: [false, true, true] },
    ],
  },
  {
    title: "Estate & Legacy",
    rows: [
      { label: "Estate document vault", values: ["Up to 5", "Unlimited", "Unlimited"] },
      { label: "Will & beneficiary manager", values: [false, true, true] },
      { label: "Family vault", values: [false, "Up to 5", "Unlimited"] },
      { label: "Multi-generational planning", values: [false, false, true] },
    ],
  },
  {
    title: "Business",
    rows: [
      { label: "Valuation & financials", values: [false, true, true] },
      { label: "Succession documents", values: [false, true, true] },
      { label: "Cap table & exit planning", values: [false, false, true] },
      { label: "M&A readiness", values: [false, false, true] },
    ],
  },
  {
    title: "Support",
    rows: [
      { label: "Email support", values: [true, true, true] },
      { label: "Priority response", values: [false, "24 hours", "1 hour"] },
      { label: "Dedicated account manager", values: [false, false, true] },
      { label: "Quarterly strategy reviews", values: [false, false, true] },
    ],
  },
  {
    title: "B2B",
    rows: [
      { label: "Client profiles", values: ["Up to 10", "Up to 50", "Unlimited"] },
      { label: "White label", values: [false, "Ready", "Full"] },
      { label: "Custom API integrations", values: [false, false, true] },
      { label: "SLA guarantee", values: [false, false, "99.9%"] },
    ],
  },
];

const FAQS = [
  {
    q: "Is there a free trial?",
    a: "No. We are a premium platform built for serious wealth management. Every tier begins with your first payment and delivers full value from day one.",
  },
  {
    q: "Can I switch tiers?",
    a: "Yes. Upgrade or downgrade at any time. Annual plan differences are prorated automatically.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit cards, ACH bank transfer, and wire transfer for Family Office annual plans.",
  },
  {
    q: "Is my financial data secure?",
    a: "All data is encrypted with 256-bit AES at rest and TLS 1.3 in transit. We are SOC 2 Type II certified and FINRA compliant. We never sell your data.",
  },
  {
    q: "What does white label mean for B2B?",
    a: "Your firm's name, logo, colors and domain. Your clients never see our brand. Available on Private and Family Office tiers.",
  },
  {
    q: "How does the Family Office demo work?",
    a: "A member of our team will contact you within 24 hours to schedule a personalized walkthrough tailored to your firm's specific needs.",
  },
];

function PricingPage() {
  const [billing, setBilling] = useState<Billing>("annual");
  const [demoOpen, setDemoOpen] = useState(false);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const { user } = useAuth();

  const handleCta = (tier: Tier) => {
    if (tier.ctaAction === "demo") {
      setDemoOpen(true);
      return;
    }
    if (!isStripeConfigured()) {
      toast.error("Payments are not configured yet");
      return;
    }
    if (!tier.priceIds) {
      toast.error("This plan is not available for self-checkout");
      return;
    }
    const priceId = billing === "annual" ? tier.priceIds.annual : tier.priceIds.monthly;
    setCheckoutPriceId(priceId);
  };

  return (
    <MobileShell>
      <div className="px-5 pt-8 pb-10">
        {/* Header */}
        <div className="text-center">
          <p className="label-mono">Pricing</p>
          <h1 className="mt-2 font-serif text-[36px] leading-[1.05] text-foreground">
            Quiet confidence,
            <br />
            <span className="text-gradient-violet">priced accordingly.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            Three tiers built for serious wealth. No free trial, no gimmicks — full value from day one.
          </p>
        </div>

        {/* Billing toggle */}
        <BillingToggle billing={billing} onChange={setBilling} />

        {/* Trust bar */}
        <div className="mt-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
            {TRUST_SIGNALS.map((t) => (
              <li
                key={t}
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing cards */}
        <div className="mt-8 flex flex-col gap-4">
          {/* On mobile we want Private first per spec */}
          <PricingCard tier={TIERS[1]} billing={billing} onCta={handleCta} highlighted />
          <PricingCard tier={TIERS[0]} billing={billing} onCta={handleCta} />
          <PricingCard tier={TIERS[2]} billing={billing} onCta={handleCta} />
        </div>

        {/* Comparison table */}
        <ComparisonTable />

        {/* FAQ */}
        <div className="mt-12">
          <p className="label-mono text-center">FAQ</p>
          <h2 className="mt-2 text-center font-serif text-[28px] leading-tight text-foreground">
            Questions, answered.
          </h2>
          <div className="mt-6 space-y-3">
            {FAQS.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </div>

        {/* Closing statement */}
        <div className="mt-14 text-center">
          <h3 className="mx-auto max-w-sm font-serif text-[28px] leading-[1.15] text-foreground">
            Your wealth deserves more than a spreadsheet.
          </h3>
          <p className="mx-auto mt-3 max-w-xs font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Join the firms and families who manage everything in one place.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => handleCta(TIERS[0])}
              className="rounded-full border border-white/[0.12] bg-white/[0.03] px-6 py-3 text-sm font-medium text-foreground transition-all hover:border-white/[0.2] hover:bg-white/[0.06]"
            >
              Start with Essential
            </button>
            <button
              onClick={() => setDemoOpen(true)}
              className="rounded-full gradient-gold px-6 py-3 text-sm font-medium text-background transition-all hover:opacity-90"
            >
              Talk to us about Family Office
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
      </AnimatePresence>
    </MobileShell>
  );
}

function BillingToggle({ billing, onChange }: { billing: Billing; onChange: (b: Billing) => void }) {
  return (
    <div className="mt-7 flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
        <button
          onClick={() => onChange("monthly")}
          className={`relative z-10 rounded-full px-5 py-1.5 text-xs font-medium transition-colors ${
            billing === "monthly" ? "text-background" : "text-muted-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => onChange("annual")}
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
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const start = display;
    const end = value;
    if (start === end) return;
    const duration = 450;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(start + (end - start) * eased);
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display.toLocaleString("en-US")}</>;
}

function PricingCard({
  tier,
  billing,
  onCta,
  highlighted = false,
}: {
  tier: Tier;
  billing: Billing;
  onCta: (t: Tier) => void;
  highlighted?: boolean;
}) {
  const price = billing === "annual" ? tier.annual : tier.monthly;
  const subline =
    billing === "annual"
      ? `or $${tier.monthlyEquivalent.toLocaleString()}/month`
      : `billed monthly`;

  const variantStyles = {
    essential: {
      border: "border-white/[0.06]",
      bg: "gradient-card",
      glow: "",
      priceColor: "text-foreground",
      cta: "border border-white/[0.18] bg-transparent text-foreground hover:bg-white/[0.06] hover:border-white/[0.28]",
      nameAccent: "text-muted-foreground",
    },
    private: {
      border: "border-primary/40",
      bg: "gradient-hero",
      glow: "shadow-[0_0_60px_-10px_oklch(0.68_0.13_295/0.45)]",
      priceColor: "text-gradient-violet",
      cta: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_30px_-5px_oklch(0.68_0.13_295/0.6)]",
      nameAccent: "text-primary",
    },
    family: {
      border: "border-gold/40",
      bg: "gradient-card",
      glow: "shadow-[0_0_50px_-15px_oklch(0.82_0.12_85/0.3)]",
      priceColor: "text-gradient-gold",
      cta: "border border-gold/50 bg-transparent text-gold hover:bg-gold/10 hover:border-gold/80",
      nameAccent: "text-gold",
    },
  }[tier.variant];

  return (
    <motion.div
      animate={highlighted ? { y: [0, -3, 0] } : undefined}
      transition={highlighted ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : undefined}
      className={`relative overflow-hidden rounded-3xl border ${variantStyles.border} ${variantStyles.bg} ${variantStyles.glow} p-6 ${
        highlighted ? "scale-[1.01]" : ""
      }`}
    >
      {highlighted && (
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-gold">
          <Star className="h-3 w-3 fill-gold" strokeWidth={0} />
          Most Popular
        </div>
      )}

      {/* Header */}
      <p
        className={`font-mono text-[11px] uppercase tracking-[0.22em] ${variantStyles.nameAccent}`}
      >
        {tier.name}
      </p>
      <p className="mt-2 max-w-[80%] text-xs text-muted-foreground">{tier.description}</p>

      {/* Price */}
      <div className="mt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={billing}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-baseline gap-1"
          >
            <span className={`font-serif text-[44px] leading-none ${variantStyles.priceColor}`}>
              $<AnimatedNumber value={price} />
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              /{billing === "annual" ? "yr" : "mo"}
            </span>
          </motion.div>
        </AnimatePresence>
        <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
          {billing === "annual" ? subline : "billed monthly"}
        </p>
        {billing === "annual" && (
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 font-mono text-[10px] font-medium text-success">
            Save ${tier.savings.toLocaleString()}
          </span>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={() => onCta(tier)}
        className={`mt-6 w-full rounded-full px-5 py-3 text-sm font-medium transition-all ${variantStyles.cta}`}
      >
        {tier.cta}
      </button>

      {/* Features */}
      <ul className="mt-6 space-y-2.5">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <Check
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                tier.variant === "private"
                  ? "text-primary"
                  : tier.variant === "family"
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
}

function ComparisonTable() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(COMPARISON.map((s) => [s.title, true])),
  );

  const toggle = (title: string) =>
    setOpenSections((s) => ({ ...s, [title]: !s[title] }));

  const renderValue = (v: string | boolean) => {
    if (v === true)
      return <Check className="mx-auto h-3.5 w-3.5 text-foreground" strokeWidth={2.4} />;
    if (v === false)
      return <Minus className="mx-auto h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={2} />;
    return (
      <span className="block text-center font-mono text-[10px] text-foreground/80">{v}</span>
    );
  };

  return (
    <div className="mt-12">
      <p className="label-mono text-center">Compare tiers</p>
      <h2 className="mt-2 text-center font-serif text-[28px] leading-tight text-foreground">
        Side by side.
      </h2>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06] gradient-card">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 grid grid-cols-[1.4fr_repeat(3,1fr)] gap-1 border-b border-white/[0.06] bg-surface/95 px-3 py-3 backdrop-blur">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Feature
          </span>
          <span className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Essential
          </span>
          <span className="text-center font-mono text-[10px] uppercase tracking-wider text-primary">
            Private
          </span>
          <span className="text-center font-mono text-[10px] uppercase tracking-wider text-gold">
            Family
          </span>
        </div>

        {COMPARISON.map((section) => {
          const open = openSections[section.title];
          return (
            <div key={section.title} className="border-b border-white/[0.04] last:border-b-0">
              <button
                onClick={() => toggle(section.title)}
                className="flex w-full items-center justify-between px-3 py-3 transition-colors hover:bg-white/[0.02]"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/90">
                  {section.title}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    {section.rows.map((row, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1.4fr_repeat(3,1fr)] items-center gap-1 border-t border-white/[0.03] px-3 py-2.5"
                      >
                        <span className="text-xs text-foreground/80">{row.label}</span>
                        <div>{renderValue(row.values[0])}</div>
                        <div>{renderValue(row.values[1])}</div>
                        <div>{renderValue(row.values[2])}</div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] gradient-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="text-sm text-foreground">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-xs leading-relaxed text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DemoModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(onClose, 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gold/30 gradient-card p-6 shadow-elevated"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <Check className="h-6 w-6 text-success" />
            </div>
            <h3 className="mt-4 font-serif text-2xl text-foreground">Thank you</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll reach out within 24 hours.
            </p>
          </div>
        ) : (
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
              Family Office
            </p>
            <h3 className="mt-2 font-serif text-2xl text-foreground">Request a private demo</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">
              A member of our team will contact you within 24 hours.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <Field label="Name" name="name" placeholder="James Whitfield" required />
              <Field label="Firm" name="firm" placeholder="Whitfield Capital" required />
              <Field
                label="Email"
                name="email"
                type="email"
                placeholder="james@whitfield.capital"
                required
              />
              <SelectField
                label="AUM range"
                name="aum"
                options={[
                  "Under $50M",
                  "$50M – $250M",
                  "$250M – $1B",
                  "$1B – $5B",
                  "Over $5B",
                ]}
              />
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Message
                </label>
                <textarea
                  name="message"
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-gold/40 focus:outline-none"
                  placeholder="Tell us about your firm…"
                />
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-full gradient-gold px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Request Demo
              </button>
              <p className="text-center font-mono text-[10px] text-muted-foreground">
                <Lock className="mr-1 inline h-3 w-3" />
                Your information is encrypted and never shared.
              </p>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-gold/40 focus:outline-none"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </label>
      <select
        name={name}
        className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-foreground focus:border-gold/40 focus:outline-none"
        defaultValue=""
      >
        <option value="" disabled>
          Select range
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-background">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
