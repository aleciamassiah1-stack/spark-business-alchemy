import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { LegalFooter } from "./LegalFooter";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { motion } from "framer-motion";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

/**
 * Responsive app shell.
 * - Mobile (<md): original max-w-[430px] column with BottomNav (unchanged feel).
 * - Desktop (md+): persistent sidebar + top bar + wide content area.
 */
export function MobileShell({ children, title, subtitle }: Props) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
        {/* Desktop sidebar (hidden on mobile via shadcn primitive) */}
        <AppSidebar />

        <SidebarInset className="min-w-0 bg-transparent">
          {/* Desktop top bar */}
          <header className="sticky top-0 z-30 hidden h-14 items-center gap-3 border-b border-white/[0.06] bg-background/80 px-6 backdrop-blur-md md:flex">
            <SidebarTrigger className="-ml-1" />
            <div className="min-w-0 flex-1">
              {subtitle && <p className="label-mono !text-[10px]">{subtitle}</p>}
              {title && (
                <p
                  aria-hidden="true"
                  className="truncate font-serif text-xl leading-tight text-foreground"
                >
                  {title}
                </p>
              )}
            </div>
            <ProfileSwitcher />
          </header>

          {/* Mobile column wrapper — keeps every page's existing layout untouched */}
          <div className="mx-auto w-full md:max-w-[1400px] md:px-6 md:py-6">
            <div className="mx-auto w-full max-w-[430px] pb-28 md:max-w-none md:pb-10">
              {(title || subtitle) && (
                <header className="px-5 pb-2 pt-6 md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {subtitle && <p className="label-mono">{subtitle}</p>}
                      {title && (
                        <h1 className="font-serif text-[34px] leading-tight text-foreground">
                          {title}
                        </h1>
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
          </div>
        </SidebarInset>

        {/* Mobile bottom nav stays */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
