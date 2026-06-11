import { createFileRoute } from "@tanstack/react-router";
import { AudiencePortal } from "@/components/AudiencePortal";
import { PORTAL_CONTENT } from "@/lib/portals-content";

const content = PORTAL_CONTENT["advisors"];

export const Route = createFileRoute("/portals/advisors")({
  head: () => ({
    meta: [
      { title: "For Financial Advisors — Æther Wealth" },
      { name: "description", content: content.subtitle },
      { property: "og:title", content: `Æther — ${content.eyebrow}` },
      { property: "og:description", content: content.subtitle },
      { property: "og:url", content: "https://aetherwealth.co/portals/advisors" },
    ],
    links: [{ rel: "canonical", href: "https://aetherwealth.co/portals/advisors" }],
  }),
  component: () => <AudiencePortal content={content} />,
});
