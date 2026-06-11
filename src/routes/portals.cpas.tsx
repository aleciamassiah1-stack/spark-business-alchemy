import { createFileRoute } from "@tanstack/react-router";
import { AudiencePortal } from "@/components/AudiencePortal";
import { PORTAL_CONTENT } from "@/lib/portals-content";

const content = PORTAL_CONTENT["cpas"];

export const Route = createFileRoute("/portals/cpas")({
  head: () => ({
    meta: [
      { title: `${content.title} — Æther Wealth` },
      { name: "description", content: content.subtitle },
      { property: "og:title", content: `Æther Wealth — ${content.eyebrow}` },
      { property: "og:description", content: content.subtitle },
      { property: "og:url", content: "https://aetherwealth.co/portals/cpas" },
    ],
    links: [{ rel: "canonical", href: "https://aetherwealth.co/portals/cpas" }],
  }),
  component: () => <AudiencePortal content={content} />,
});
