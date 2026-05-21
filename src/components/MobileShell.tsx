import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { LegalFooter } from "./LegalFooter";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { motion } from "framer-motion";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function MobileShell({ children, title, subtitle }: Props) {
  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto bg-background text-foreground [-webkit-overflow-scrolling:touch]">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[430px] pb-28">
        {(title || subtitle) && (
          <header className="px-5 pb-2 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {subtitle && <p className="label-mono">{subtitle}</p>}
                {title && (
                  <h1 className="font-serif text-[34px] leading-tight text-foreground">{title}</h1>
                )}
              </div>
              <ProfileSwitcher className="mt-1 shrink-0" />
            </div>
          </header>
        )}
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.main>
        <LegalFooter withBottomNavSpacing />
      </div>
      <BottomNav />
    </div>
  );
}

