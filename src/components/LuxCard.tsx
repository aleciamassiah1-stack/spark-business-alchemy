import { type ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
};

export function LuxCard({ children, className = "", delay = 0, onClick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={`gradient-card relative overflow-hidden rounded-2xl border border-white/[0.06] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] ${onClick ? "cursor-pointer active:scale-[0.99] transition-transform" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}
