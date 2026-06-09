import { createFileRoute } from "@tanstack/react-router";
import { AudiencePortal } from "@/components/AudiencePortal";
import { PORTAL_CONTENT } from "@/lib/portals-content";

const content = PORTAL_CONTENT["family-offices"];

export const Route = createFileRoute("/portals/family-offices")({
  head: () => ({
    meta: [
      { title: `${content.title} — Æther` },
      { name: "description", content: content.subtitle },
      { property: "og:title", content: `Æther — ${content.eyebrow}` },
      { property: "og:description", content: content.subtitle },
      { property: "og:url", content: "https://aetherwealth.co/portals/family-offices" },
    ],
    links: [{ rel: "canonical", href: "https://aetherwealth.co/portals/family-offices" }],
  }),
  component: () => <AudiencePortal content={content} />,
});
