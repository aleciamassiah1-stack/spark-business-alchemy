import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, Plus, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { LuxCard } from "@/components/LuxCard";
import { seedDemoData, clearDemoData } from "@/lib/demo.functions";

type Props = {
  /** Show the "Remove demo data" button instead of the seeder. */
  hasDemo: boolean;
  /** Called after a successful seed or clear so the caller can refresh. */
  onChange: () => void | Promise<void>;
};

export function DemoSeederCard({ hasDemo, onChange }: Props) {
  const seed = useServerFn(seedDemoData);
  const clear = useServerFn(clearDemoData);
  const [busy, setBusy] = useState<"seed" | "clear" | null>(null);

  const runSeed = async () => {
    setBusy("seed");
    try {
      await seed();
      toast.success("Sample data loaded", {
        description: "Explore the app, then remove it any time.",
      });
      await onChange();
    } catch (e) {
      toast.error("Couldn't load sample data.", {
        description: (e as Error).message,
      });
    } finally {
      setBusy(null);
    }
  };

  const runClear = async () => {
    setBusy("clear");
    try {
      await clear();
      toast.success("Sample data removed");
      await onChange();
    } catch (e) {
      toast.error("Couldn't remove sample data.", {
        description: (e as Error).message,
      });
    } finally {
      setBusy(null);
    }
  };

  if (hasDemo) {
    return (
      <button
        onClick={runClear}
        disabled={busy !== null}
        className="flex w-full items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        {busy === "clear" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Remove sample data
      </button>
    );
  }

  return (
    <LuxCard className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-violet glow-violet">
          <Sparkles className="h-4 w-4 text-foreground" />
        </div>
        <div className="flex-1">
          <p className="font-serif text-base text-foreground">Try it with sample data</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            One bank, a brokerage, a property, a policy, an estate doc and a family member —
            removable any time.
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={runSeed}
          disabled={busy !== null}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full gradient-violet px-3 py-2.5 text-xs font-medium text-foreground glow-violet disabled:opacity-60"
        >
          {busy === "seed" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Load sample data
        </button>
        <Link
          to="/connections"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Connect real account
        </Link>
      </div>
    </LuxCard>
  );
}
