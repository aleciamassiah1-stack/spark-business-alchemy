import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  Scroll,
  Home as HomeIcon,
  Umbrella,
  Users,
  UserCheck,
  Lock,
  FileText,
  Briefcase,
  Building2,
  Calculator,
  HeartHandshake,
  Landmark,
  ClipboardList,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { LegalFooter } from "@/components/LegalFooter";
import logoUrl from "@/assets/aether-logo.png";

const DEMO_MAILTO =
  "mailto:demo@aetherwealth.co?subject=Schedule%20a%20Private%20Demo&body=Hello%20%C3%86ther%2C%0A%0AI%27d%20like%20to%20schedule%20a%20private%20demo.";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
} as const;

export function MarketingHome() {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-background text-foreground">
      {/* Ambient luxury backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 0%, oklch(0.42 0.14 295 / 0.28) 0%, transparent 55%), radial-gradient(circle at 90% 30%, oklch(0.32 0.08 280 / 0.22) 0%, transparent 50%)",
        }}
      />

      <Nav />

      <main className="relative">
        <Hero />
        <Audiences />
        <Problem />
        <Solution />
        <Benefits />
        <Partners />
        <FinalCta />
      </main>

      <LegalFooter />
    </div>
  );
}

/* ------------------------------ Nav ------------------------------ */

function Nav() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoUrl} alt="Æther" className="h-7 w-7" />
          <span className="font-serif text-xl tracking-tight text-foreground">Æther</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#who" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Who it's for
          </a>
          <a href="#solution" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Platform
          </a>
          <a href="#partners" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Partners
          </a>
          <Link to="/signin" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
        </nav>
        <a
          href={DEMO_MAILTO}
          className="hidden items-center gap-1.5 rounded-full bg-foreground/95 px-4 py-2 text-xs font-medium text-background transition-all hover:bg-foreground md:inline-flex"
        >
          Schedule a Demo <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </header>
  );
}

/* ------------------------------ Hero ------------------------------ */

function Hero() {
  return (
    <section className="relative px-6 pt-10 pb-24 md:px-10 md:pt-20 md:pb-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Family Legacy Management
            </span>
          </div>

          <h1 className="mt-6 font-serif text-[44px] leading-[1.05] tracking-tight text-foreground md:text-[64px]">
            The Operating System for{" "}
            <span className="text-gradient-violet">Family Legacy Management</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/80 md:text-xl">
            Organize your financial, legal, property, insurance, and family information in one
            secure platform.
          </p>

          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Æther helps families, advisors, attorneys, and family offices centralize important
            information, simplify succession planning, and preserve what matters most.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={DEMO_MAILTO}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 glow-violet"
            >
              Schedule a Demo <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#solution"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-white/[0.06]"
            >
              Learn More
            </a>
          </div>

          <div className="mt-10 flex items-center gap-6 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Enterprise security
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Bank-grade encryption
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> SOC 2 aligned
            </span>
          </div>
        </motion.div>

        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  const items: Array<{ icon: typeof Scroll; label: string; meta: string; tone: string }> = [
    { icon: Scroll, label: "Estate Documents", meta: "12 current", tone: "text-primary" },
    { icon: HomeIcon, label: "Properties", meta: "4 holdings", tone: "text-gold" },
    { icon: Umbrella, label: "Insurance Policies", meta: "$8.4M coverage", tone: "text-violet-glow" },
    { icon: UserCheck, label: "Advisors", meta: "6 connected", tone: "text-primary" },
    { icon: Users, label: "Family Contacts", meta: "18 members", tone: "text-violet-glow" },
    { icon: HeartHandshake, label: "Beneficiaries", meta: "Up to date", tone: "text-gold" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-3xl" />
      <div className="gradient-card relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] p-6 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.7)] md:p-7">
        {/* Mock chrome */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            Legacy Vault · Whitfield Family
          </span>
        </div>

        {/* Header card */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Family Readiness
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <p className="font-serif text-4xl text-foreground">94%</p>
              <p className="mt-1 text-xs text-muted-foreground">All core documents current</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
              <ShieldCheck className="h-6 w-6 text-gold" />
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "94%" }}
              transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="h-full gradient-violet"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {items.map((it, i) => (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.07 }}
              className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                <it.icon className={`h-4 w-4 ${it.tone}`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] text-foreground">{it.label}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{it.meta}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Vault row */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[oklch(0.20_0.025_280)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] text-foreground">Secure Vault</p>
              <p className="font-mono text-[10px] text-muted-foreground">AES-256 · Audit log enabled</p>
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Active</span>
        </div>
      </div>
    </motion.div>
  );
}

/* --------------------------- Section helpers --------------------------- */

function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
      {eyebrow && (
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 font-serif text-[34px] leading-[1.08] tracking-tight text-foreground md:text-[48px]">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

/* --------------------------- Section 2: Audiences --------------------------- */

function Audiences() {
  const cards = [
    {
      icon: Users,
      title: "Families",
      copy: "Keep everything important organized and accessible.",
    },
    {
      icon: Scroll,
      title: "Estate Planning Attorneys",
      copy: "Extend client relationships beyond the estate plan.",
    },
    {
      icon: Briefcase,
      title: "Financial Advisors",
      copy: "Deliver a premium client experience and strengthen retention.",
    },
    {
      icon: Landmark,
      title: "Family Offices",
      copy: "Manage complex family information from a single source of truth.",
    },
  ];

  return (
    <section id="who" className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHead eyebrow="Who Æther Serves" title="Built for the people who steward legacy." />
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group gradient-card relative overflow-hidden rounded-2xl border border-white/[0.06] p-7 transition-all hover:border-white/[0.14]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform group-hover:scale-105">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-serif text-xl text-foreground">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.copy}</p>
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Section 3: Problem --------------------------- */

function Problem() {
  const items = [
    "Estate plans become outdated",
    "Critical documents are difficult to locate",
    "Families struggle to coordinate information",
    "Advisors work from incomplete records",
    "Beneficiary information changes over time",
  ];

  return (
    <section className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHead
          eyebrow="The Problem"
          title="Important Information Is Scattered"
          subtitle="Across drawers, inboxes, advisors, and decades. When it's needed most, it's hardest to find."
        />
        <div className="mt-14 grid gap-3 md:grid-cols-2">
          {items.map((t, i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-[15px] leading-relaxed text-foreground/90">{t}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Section 4: Solution --------------------------- */

function Solution() {
  const features = [
    {
      icon: Lock,
      title: "Family Legacy Vault",
      copy: "Secure storage for estate and legal documents.",
    },
    {
      icon: HomeIcon,
      title: "Asset Inventory",
      copy: "Track real estate, businesses, insurance, and financial assets.",
    },
    {
      icon: Users,
      title: "Family Directory",
      copy: "Manage beneficiaries, trustees, executors, and key contacts.",
    },
    {
      icon: UserCheck,
      title: "Advisor Coordination",
      copy: "Keep attorneys, CPAs, insurance professionals, and advisors connected.",
    },
    {
      icon: ClipboardList,
      title: "Annual Review Workflows",
      copy: "Ensure information remains current over time.",
    },
    {
      icon: ShieldCheck,
      title: "Secure Access Controls",
      copy: "Protect sensitive information with enterprise-grade security.",
    },
  ];

  return (
    <section id="solution" className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHead eyebrow="The Solution" title="Everything In One Secure Platform" />
        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.04] md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="gradient-card group relative p-8 transition-all hover:bg-white/[0.03]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04] text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-serif text-xl text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.copy}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Section 5: Benefits --------------------------- */

function Benefits() {
  const benefits = [
    "Preserve family knowledge",
    "Improve organization",
    "Reduce administrative burden",
    "Strengthen succession planning",
    "Create continuity across generations",
    "Provide peace of mind",
  ];

  return (
    <section className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHead
          eyebrow="Benefits"
          title="Designed For Long-Term Stewardship"
          subtitle="A platform shaped by how families actually pass things on — quietly, carefully, and with intention."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
              <p className="text-[15px] text-foreground">{b}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Section 6: Partners --------------------------- */

function Partners() {
  const partners = [
    { icon: Scroll, label: "Estate Planning Attorneys" },
    { icon: Briefcase, label: "Financial Advisors" },
    { icon: Landmark, label: "Family Offices" },
    { icon: Calculator, label: "CPAs" },
    { icon: Umbrella, label: "Insurance Professionals" },
    { icon: Building2, label: "Household Managers" },
  ];

  return (
    <section id="partners" className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          eyebrow="Premium Professional Partners"
          title="Built for Families and Their Trusted Advisors"
        />
        <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.04] sm:grid-cols-3">
          {partners.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="gradient-card flex flex-col items-center justify-center gap-3 px-6 py-10 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/20 bg-gold/5 text-gold">
                <p.icon className="h-5 w-5" />
              </div>
              <p className="font-serif text-base text-foreground">{p.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Section 7: Final CTA --------------------------- */

function FinalCta() {
  return (
    <section className="relative px-6 pb-24 pt-12 md:px-10 md:pb-32">
      <div className="mx-auto max-w-5xl">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] gradient-hero p-10 text-center md:p-16"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />

          <div className="relative">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10">
              <ShieldCheck className="h-5 w-5 text-gold" />
            </div>
            <h2 className="mt-6 font-serif text-[36px] leading-[1.05] tracking-tight text-foreground md:text-[54px]">
              Protect What Matters Most
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
              Æther provides a secure foundation for your family's financial, legal, and legacy
              information.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href={DEMO_MAILTO}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 glow-violet"
              >
                Request a Private Demo <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="mailto:hello@aetherwealth.co"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-7 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-white/[0.06]"
              >
                <Mail className="h-4 w-4" /> Contact Æther
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Silence unused import warning for FileText in case of future use
void FileText;
