import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, AlertTriangle, X } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { LuxCard } from "@/components/LuxCard";
import { RequireOnboarding } from "@/components/RequireOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fmtCurrency } from "@/lib/format";
import {
  listBudgetsWithSpend,
  listCategories,
  upsertBudget,
  deleteBudget,
  upsertCategory,
  deleteCategory,
  type BudgetWithSpend,
  type BudgetCategory,
} from "@/lib/budgets.functions";

export const Route = createFileRoute("/budgets")({
  head: () => ({
    meta: [
      { title: "Budgets — Æther Wealth" },
      {
        name: "description",
        content:
          "Set monthly spending limits per category and track your progress against connected bank and card transactions.",
      },
      { property: "og:title", content: "Budgets — Æther Wealth" },
      {
        property: "og:description",
        content:
          "Monthly spending caps tied to your transactions, with progress and over-budget alerts.",
      },
      { property: "og:url", content: "https://aetherwealth.co/budgets" },
    ],
    links: [{ rel: "canonical", href: "https://aetherwealth.co/budgets" }],
  }),
  component: () => (
    <RequireOnboarding>
      <BudgetsPage />
    </RequireOnboarding>
  ),
});

function BudgetsPage() {
  const [items, setItems] = useState<BudgetWithSpend[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgetDialog, setBudgetDialog] = useState<{
    open: boolean;
    edit?: BudgetWithSpend;
  }>({ open: false });
  const [catDialog, setCatDialog] = useState<{
    open: boolean;
    edit?: BudgetCategory;
  }>({ open: false });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([listBudgetsWithSpend(), listCategories()]);
      setItems(b.items);
      setCategories(c.categories);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const usedCategoryIds = new Set(items.map((i) => i.budget.category_id));
  const availableCategories = categories.filter(
    (c) => !usedCategoryIds.has(c.id) || c.id === budgetDialog.edit?.budget.category_id,
  );

  async function handleDeleteBudget(id: string) {
    const r = await deleteBudget({ data: { id } });
    if (r.ok) {
      toast.success("Budget removed");
      reload();
    } else {
      toast.error(r.error ?? "Could not delete");
    }
  }

  async function handleDeleteCategory(c: BudgetCategory) {
    if (usedCategoryIds.has(c.id)) {
      toast.error("Remove the budget on this category first");
      return;
    }
    if (!confirm(`Delete category "${c.name}"?`)) return;
    const r = await deleteCategory({ data: { id: c.id } });
    if (r.ok) {
      toast.success("Category deleted");
      reload();
    } else {
      toast.error(r.error ?? "Could not delete");
    }
  }

  return (
    <MobileShell title="Budgets" subtitle="Monthly spending">
      <div className="space-y-4 px-5 pb-4">
        <LuxCard className="px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="label-mono">Active budgets</p>
              <p className="text-sm text-muted-foreground">
                Resets on the 1st of each month
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setBudgetDialog({ open: true })}
              disabled={availableCategories.length === 0}
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>

          {loading ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No budgets yet. Add one to start tracking.
            </p>
          ) : (
            <div className="space-y-4">
              {items.map((i) => {
                const over = i.pct >= 1;
                const warn = i.pct >= 0.8 && !over;
                return (
                  <div
                    key={i.budget.id}
                    className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {over && (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        )}
                        <span className="text-sm text-foreground">
                          {i.category.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Edit budget"
                          onClick={() => setBudgetDialog({ open: true, edit: i })}
                          className="rounded p-1 text-muted-foreground hover:bg-white/[0.04]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete budget"
                          onClick={() => handleDeleteBudget(i.budget.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-white/[0.04]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span
                        className={
                          over
                            ? "text-destructive"
                            : warn
                              ? "text-gold"
                              : "text-muted-foreground"
                        }
                      >
                        {fmtCurrency(i.spent_cents / 100)} spent
                      </span>
                      <span className="text-muted-foreground">
                        of {fmtCurrency(i.budget.amount_cents / 100)}
                      </span>
                    </div>
                    <Progress value={Math.min(100, Math.round(i.pct * 100))} />
                    {over && (
                      <p className="mt-1.5 text-[11px] text-destructive">
                        Over by{" "}
                        {fmtCurrency((i.spent_cents - i.budget.amount_cents) / 100)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </LuxCard>

        <LuxCard className="px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="label-mono">Categories</p>
              <p className="text-sm text-muted-foreground">
                Used to match transactions to budgets
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCatDialog({ open: true })}>
              <Plus className="mr-1 h-4 w-4" /> New
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="group flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] py-1 pl-3 pr-1 text-xs"
              >
                {c.color && (
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setCatDialog({ open: true, edit: c })}
                  className="text-foreground"
                >
                  {c.name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => handleDeleteCategory(c)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-white/[0.04]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </LuxCard>
      </div>

      <BudgetDialog
        open={budgetDialog.open}
        edit={budgetDialog.edit}
        categories={availableCategories}
        onClose={() => setBudgetDialog({ open: false })}
        onSaved={() => {
          setBudgetDialog({ open: false });
          reload();
        }}
      />
      <CategoryDialog
        open={catDialog.open}
        edit={catDialog.edit}
        onClose={() => setCatDialog({ open: false })}
        onSaved={() => {
          setCatDialog({ open: false });
          reload();
        }}
      />
    </MobileShell>
  );
}

function BudgetDialog({
  open,
  edit,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  edit?: BudgetWithSpend;
  categories: BudgetCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategoryId(edit?.budget.category_id ?? categories[0]?.id ?? "");
      setAmount(edit ? (edit.budget.amount_cents / 100).toString() : "");
    }
  }, [open, edit, categories]);

  async function handleSave() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!categoryId) return toast.error("Pick a category");
    if (!Number.isFinite(cents) || cents < 100) return toast.error("Enter a valid amount");
    setSaving(true);
    try {
      const r = await upsertBudget({
        data: {
          id: edit?.budget.id,
          category_id: categoryId,
          amount_cents: cents,
        },
      });
      if (r.ok) {
        toast.success("Budget saved");
        onSaved();
      } else {
        toast.error(r.error ?? "Could not save");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edit ? "Edit budget" : "New monthly budget"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Monthly limit (USD)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="300"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({
  open,
  edit,
  onClose,
  onSaved,
}: {
  open: boolean;
  edit?: BudgetCategory;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(edit?.name ?? "");
      setColor(edit?.color ?? "#8b5cf6");
    }
  }, [open, edit]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Enter a name");
    if (trimmed.length > 40) return toast.error("Name too long (max 40)");
    setSaving(true);
    try {
      const r = await upsertCategory({
        data: { id: edit?.id, name: trimmed, color },
      });
      if (r.ok) {
        toast.success(edit ? "Category updated" : "Category added");
        onSaved();
      } else {
        toast.error(r.error ?? "Could not save");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edit ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="e.g. Coffee"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-16 cursor-pointer rounded-md border border-input bg-transparent"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
