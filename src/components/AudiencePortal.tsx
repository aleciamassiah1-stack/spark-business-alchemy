import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShieldCheck, Mail, type LucideIcon } from "lucide-react";
import { LegalFooter } from "@/components/LegalFooter";
import logoUrl from "@/assets/aether-logo.png";

export const DEMO_MAILTO =
  "mailto:team@aetherwealth.co?subject=Schedule%20a%20Private%20Demo&body=Hello%20%C3%86ther%2C%0A%0AI%27d%20like%20to%20schedule%20a%20private%20demo.";

export const CONTACT_MAILTO = "mailto:team@aetherwealth.co";

export type PortalContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  icon: LucideIcon;
  capabilities: { icon: LucideIcon; title: string; copy: string }[];
  outcomes: string[];
};

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function AudiencePortal({ content }: { content: PortalContent }) {
  const Icon = content.icon;
  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 0%, oklch(0.42 0.14 295 / 0.28) 0%, transparent 55%), radial-gradient(circle at 90% 30%, oklch(0.32 0.08 280 / 0.22) 0%, transparent 50%)",
        }}
      />

      <header className="relative z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoUrl} alt="Æther" className="h-7 w-7" />
            <span className="font-serif text-xl tracking-tight text-foreground">Æther</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link to="/" hash="who" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Who it's for
            </Link>
            <Link to="/" hash="solution" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Platform
            </Link>
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

      <main className="relative">
        {/* Hero */}
        <section className="relative px-6 pt-10 pb-20 md:px-10 md:pt-16 md:pb-24">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {content.eyebrow}
                </span>
              </div>

              <div className="mx-auto mt-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10">
                <Icon className="h-6 w-6 text-gold" />
              </div>

              <h1 className="mt-6 font-serif text-[40px] leading-[1.05] tracking-tight text-foreground md:text-[60px]">
                {content.title}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-foreground/80 md:text-xl">
                {content.subtitle}
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                {content.intro}
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={DEMO_MAILTO}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 glow-violet"
                >
                  Schedule a Demo <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-white/[0.06]"
                >
                  Back to Overview
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="relative px-6 py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-6xl">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease }}
              className="mx-auto max-w-2xl text-center font-serif text-[30px] leading-[1.1] tracking-tight text-foreground md:text-[42px]"
            >
              What Æther unlocks
            </motion.h2>

            <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.04] md:grid-cols-2 lg:grid-cols-3">
              {content.capabilities.map((f, i) => (
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

        {/* Outcomes */}
        <section className="relative px-6 py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-5xl">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease }}
              className="mx-auto max-w-2xl text-center font-serif text-[30px] leading-[1.1] tracking-tight text-foreground md:text-[42px]"
            >
              Outcomes you can expect
            </motion.h2>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.outcomes.map((b, i) => (
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

        {/* CTA */}
        <section className="relative px-6 pb-24 pt-8 md:px-10 md:pb-32">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease }}
              className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] gradient-hero p-10 text-center md:p-16"
            >
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
              <div className="relative">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10">
                  <ShieldCheck className="h-5 w-5 text-gold" />
                </div>
                <h2 className="mt-6 font-serif text-[34px] leading-[1.05] tracking-tight text-foreground md:text-[48px]">
                  See Æther in your practice
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
                  A private walkthrough tailored to how you serve families and stewards.
                </p>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={DEMO_MAILTO}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 glow-violet"
                  >
                    Request a Private Demo <ArrowRight className="h-4 w-4" />
                  </a>
                  <a
                    href={CONTACT_MAILTO}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-7 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-white/[0.06]"
                  >
                    <Mail className="h-4 w-4" /> Contact Æther
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
