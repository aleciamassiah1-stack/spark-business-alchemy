import { motion } from "framer-motion";
import shot01 from "@/assets/marketing/01-net-worth.jpg";
import shot02 from "@/assets/marketing/02-portfolio.jpg";
import shot03 from "@/assets/marketing/03-family.jpg";
import shot04 from "@/assets/marketing/04-real-estate.jpg";
import shot05 from "@/assets/marketing/05-protect.jpg";
import shot06 from "@/assets/marketing/06-legacy.jpg";
import shot07 from "@/assets/marketing/07-business.jpg";
import shot08 from "@/assets/marketing/08-connections.jpg";
import shot09 from "@/assets/marketing/09-timeline.jpg";
import shot10 from "@/assets/marketing/10-pricing.jpg";

type Shot = { src: string; label: string; caption: string };

const shots: Shot[] = [
  { src: shot01, label: "Net Worth", caption: "Every account, one elegant view." },
  { src: shot02, label: "Portfolio", caption: "Holdings and performance, live." },
  { src: shot03, label: "Family Vault", caption: "Wealth across generations." },
  { src: shot04, label: "Real Estate", caption: "Property values, automatically." },
  { src: shot05, label: "Protection", caption: "Every policy in one vault." },
  { src: shot06, label: "Estate & Legacy", caption: "Wills, trusts, directives." },
  { src: shot07, label: "Business Equity", caption: "Track your company value." },
  { src: shot08, label: "Connections", caption: "Bank-grade Plaid sync." },
  { src: shot09, label: "Timeline", caption: "36 months of growth, visualized." },
  { src: shot10, label: "Membership", caption: "Built for every tier of wealth." },
];

export function MarketingGallery() {
  return (
    <section
      aria-label="Product preview"
      className="relative w-full max-w-[1100px] py-16"
    >
      <div className="mb-10 text-center">
        <p className="label-mono mb-2">A glimpse inside</p>
        <h2 className="font-serif text-[28px] leading-tight text-foreground sm:text-[34px]">
          Ten screens. <span className="text-gradient-violet">One private vault.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-[420px] text-sm text-muted-foreground">
          Preview the experience before you sign up — every dollar, every document,
          every decision, beautifully organized.
        </p>
      </div>

      {/* Horizontal scroller on mobile, grid on desktop */}
      <div className="-mx-6 overflow-x-auto px-6 pb-2 sm:mx-0 sm:overflow-visible sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-4 sm:grid sm:grid-cols-2 sm:gap-5 lg:grid-cols-5">
          {shots.map((shot, i) => (
            <motion.figure
              key={shot.src}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.6,
                delay: Math.min(i * 0.05, 0.3),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group relative shrink-0 snap-center overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] sm:shrink"
              style={{ width: "min(72vw, 240px)" }}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={shot.src}
                  alt={`${shot.label} — ${shot.caption}`}
                  loading="lazy"
                  width={1024}
                  height={1280}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
              </div>
              <figcaption className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/80">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-0.5 font-serif text-base text-foreground">{shot.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{shot.caption}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Crafted for the discerning · iOS · Web · iPad
      </p>
    </section>
  );
}
