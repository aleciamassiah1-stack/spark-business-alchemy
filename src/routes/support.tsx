import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail, MessageCircle, Calendar, ExternalLink } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Concierge Support — Æther Wealth" },
      { name: "description", content: "Reach your private concierge team." },
    ],
  }),
  component: () => (
    <RequireOnboarding>
      <SupportPage />
    </RequireOnboarding>
  ),
});

function SupportPage() {
  return (
    <MobileShell title="Concierge" subtitle="Your private support line">
      <div className="flex flex-col gap-4 px-5 pb-6">
        <LuxCard className="px-5 py-5">
          <p className="label-mono mb-1">On call for you</p>
          <h2 className="font-serif text-2xl text-foreground">Eleanor Voss</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Senior Concierge · Available 24/7 worldwide
          </p>
        </LuxCard>

        <div>
          <p className="label-mono mb-2 px-1">Reach out</p>
          <LuxCard className="divide-y divide-white/[0.04]">
            <ContactRow
              icon={Phone}
              label="Call concierge"
              desc="+1 (212) 555 — 0188"
              href="tel:+12125550188"
            />
            <ContactRow
              icon={MessageCircle}
              label="Secure message"
              desc="Encrypted in-app chat"
              href="mailto:concierge@aether.example"
            />
            <ContactRow
              icon={Mail}
              label="Email concierge"
              desc="concierge@aether.example"
              href="mailto:concierge@aether.example"
            />
            <ContactRow
              icon={Calendar}
              label="Book a private review"
              desc="30 or 60 minutes, in person or video"
              href="mailto:concierge@aether.example?subject=Schedule%20a%20review"
            />
          </LuxCard>
        </div>

        <p className="px-1 text-center text-[11px] italic text-muted-foreground">
          Average response time · under 4 minutes.
        </p>
      </div>
    </MobileShell>
  );
}

function ContactRow({
  icon: Icon,
  label,
  desc,
  href,
}: {
  icon: typeof Phone;
  label: string;
  desc: string;
  href: string;
}) {
  return (
    <a href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}
