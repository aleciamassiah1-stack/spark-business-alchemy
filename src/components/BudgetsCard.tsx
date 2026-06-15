import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Wallet, ArrowRight, AlertTriangle } from "lucide-react";
import { LuxCard } from "@/components/LuxCard";
import { Progress } from "@/components/ui/progress";
import { listBudgetsWithSpend, type BudgetWithSpend } from "@/lib/budgets.functions";
import { fmtCurrency } from "@/lib/format";

export function BudgetsCard() {
  const [items, setItems] = useState<BudgetWithSpend[] | null>(null);

  useEffect(() => {
    let alive = true;
    listBudgetsWithSpend()
      .then((r) => {
        if (alive) setItems(r.items);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (items === null) return null;

  const overCount = items.filter((i) => i.pct >= 1).length;
  const top = items.slice(0, 3);

  return (
    <LuxCard className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="label-mono">This month's budgets</p>
            <p className="text-sm text-foreground">
              {items.length === 0
                ? "Set monthly spending caps"
                : overCount > 0
                  ? `${overCount} over budget`
                  : "On track"}
            </p>
          </div>
        </div>
        <Link
          to="/budgets"
          className="flex items-center gap-1 text-xs text-primary"
        >
          Manage <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {items.length === 0 ? (
        <Link
          to="/budgets"
          className="block rounded-xl border border-dashed border-white/10 px-4 py-3 text-center text-xs text-muted-foreground hover:bg-white/[0.02]"
        >
          + Add your first budget
        </Link>
      ) : (
        <div className="space-y-3">
          {top.map((i) => {
            const over = i.pct >= 1;
            const warn = i.pct >= 0.8 && !over;
            return (
              <div key={i.budget.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-foreground">
                    {over && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    {i.category.name}
                  </span>
                  <span
                    className={
                      over
                        ? "text-destructive"
                        : warn
                          ? "text-gold"
                          : "text-muted-foreground"
                    }
                  >
                    {fmtCurrency(i.spent_cents / 100)} /{" "}
                    {fmtCurrency(i.budget.amount_cents / 100)}
                  </span>
                </div>
                <Progress value={Math.min(100, Math.round(i.pct * 100))} />
              </div>
            );
          })}
        </div>
      )}
    </LuxCard>
  );
}
