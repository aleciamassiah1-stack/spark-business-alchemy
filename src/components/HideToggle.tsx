import { Eye, EyeOff } from "lucide-react";
import { useWealth } from "@/lib/wealth-context";

export function HideToggle({ className = "" }: { className?: string }) {
  const { hideBalances, toggleHideBalances } = useWealth();
  return (
    <button
      onClick={toggleHideBalances}
      aria-label={hideBalances ? "Show balances" : "Hide balances"}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground transition-all hover:bg-white/[0.08] hover:text-foreground ${className}`}
    >
      {hideBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

export function MoneyText({
  value,
  className = "",
  fallback = "••••••",
}: {
  value: string;
  className?: string;
  fallback?: string;
}) {
  const { hideBalances } = useWealth();
  return <span className={className}>{hideBalances ? fallback : value}</span>;
}
