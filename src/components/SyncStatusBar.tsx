import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useWealth } from "@/lib/wealth-context";

export function SyncStatusBar() {
  const { syncing, syncMessage } = useWealth();
  return (
    <AnimatePresence>
      {syncing && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed left-1/2 top-0 z-50 w-full max-w-[430px] -translate-x-1/2 px-3 pt-2"
        >
          <div className="glass flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-primary shadow-lg">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span className="font-mono text-[11px]">
              {syncMessage ?? "Syncing your accounts…"}
            </span>
            <div className="ml-auto h-1 w-12 overflow-hidden rounded-full bg-white/10">
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="h-full w-1/2 bg-primary"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
