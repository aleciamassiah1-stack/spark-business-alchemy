export const fmtCurrency = (n: number, opts: { decimals?: number; compact?: boolean } = {}) => {
  const { decimals = 0, compact = false } = opts;
  if (compact && Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2)}M`;
  }
  if (compact && Math.abs(n) >= 1_000) {
    return `$${(n / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
};

export const fmtPct = (n: number, decimals = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
