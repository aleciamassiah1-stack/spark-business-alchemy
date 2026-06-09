import { createFileRoute } from "@tanstack/react-router";
import { AudiencePortal } from "@/components/AudiencePortal";
import { PORTAL_CONTENT } from "@/lib/portals-content";

const content = PORTAL_CONTENT["families"];

export const Route = createFileRoute("/portals/families")({
  head: () => ({
    meta: [
      { title: `${content.title} — Æther` },
      { name: "description", content: content.subtitle },
      { property: "og:title", content: `Æther — ${content.eyebrow}` },
      { property: "og:description", content: content.subtitle },
      { property: "og:url", content: "https://aetherwealth.co/portals/families" },
    ],
    links: [{ rel: "canonical", href: "https://aetherwealth.co/portals/families" }],
  }),
  component: () => <AudiencePortal content={content} />,
});
