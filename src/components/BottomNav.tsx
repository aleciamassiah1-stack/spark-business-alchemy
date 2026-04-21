import { Link, useLocation } from "@tanstack/react-router";
import { Home, TrendingUp, Shield, Scroll, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";

const items = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/portfolio", label: "Portfolio", icon: TrendingUp },
  { to: "/protect", label: "Protect", icon: Shield },
  { to: "/legacy", label: "Legacy", icon: Scroll },
  { to: "/more", label: "More", icon: MoreHorizontal },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 px-3 pb-3 pt-2">
      <div className="glass relative flex items-center justify-around rounded-full px-2 py-2 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
        {items.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5"
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full gradient-violet glow-violet"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={`relative z-10 h-[18px] w-[18px] transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
                strokeWidth={active ? 2.2 : 1.6}
              />
              <span
                className={`relative z-10 text-[10px] font-medium tracking-wide transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
