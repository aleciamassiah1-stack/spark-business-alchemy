import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "@/integrations/supabase/auth-helper";

// =================================================================
// AI classification of bank accounts -> business asset / liability
// =================================================================
//
// Pulls the user's already-connected aggregated_accounts plus a small
// sample of recent transactions per account, asks Lovable AI to:
//   1. decide which accounts look business-related
//   2. classify each as asset or liability
//   3. propose a clean display name + value
// Returns a structured list the Business page can merge into its
// assets / liabilities arrays.

export type BusinessAccountClassification = {
  accountId: string;          // aggregated_accounts.id
  isBusiness: boolean;
  classification: "asset" | "liability" | "unclear";
  assetType?: "Equipment" | "Real Estate" | "Receivables" | "Inventory" | "Other";
  liabilityType?: string;     // free-form (e.g. "Line of Credit", "SBA Loan")
  suggestedName: string;
  value: number;              // positive number; for liabilities = balance owed
  reasoning: string;
};

export type ClassifyBusinessAccountsResult = {
  ok: boolean;
  error: string | null;
  classifications: BusinessAccountClassification[];
  scannedAccountCount: number;
};

export const classifyBusinessAccounts = createServerFn({ method: "POST" }).handler(
  async (): Promise<ClassifyBusinessAccountsResult> => {
    const userId = await requireUserId();
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: "AI not configured",
        classifications: [],
        scannedAccountCount: 0,
      };
    }

    const { data: accounts, error: accErr } = await supabaseAdmin
      .from("aggregated_accounts")
      .select("id, name, official_name, type, subtype, current_balance, mask")
      .eq("user_id", userId);

    if (accErr) {
      return {
        ok: false,
        error: accErr.message,
        classifications: [],
        scannedAccountCount: 0,
      };
    }
    if (!accounts || accounts.length === 0) {
      return { ok: true, error: null, classifications: [], scannedAccountCount: 0 };
    }

    // Pull a small sample of recent transactions per account (helps the model
    // tell "personal checking" from "LLC operating account").
    const { data: txns } = await supabaseAdmin
      .from("aggregated_transactions")
      .select("account_id, name, merchant_name, amount, category, date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(400);

    const txByAcct = new Map<string, Array<Record<string, unknown>>>();
    for (const t of txns ?? []) {
      const list = txByAcct.get(t.account_id) ?? [];
      if (list.length < 8) {
        list.push({
          name: t.name,
          merchant: t.merchant_name,
          amount: t.amount,
          category: t.category,
          date: t.date,
        });
        txByAcct.set(t.account_id, list);
      }
    }

    const accountSummaries = accounts.map((a) => ({
      accountId: a.id,
      name: a.name,
      officialName: a.official_name,
      type: a.type,
      subtype: a.subtype,
      balance: Number(a.current_balance ?? 0),
      mask: a.mask,
      recentTransactions: txByAcct.get(a.id) ?? [],
    }));

    const systemPrompt = `You classify bank/financial accounts for a small-business owner's wealth dashboard. For each account decide:
- isBusiness: true if the account name, official name, or transactions clearly indicate a business / LLC / S-Corp / sole-prop operating account, business credit card, business loan, or business investment account. If it looks personal, return false.
- classification: "asset" for depository, investment, cash; "liability" for credit cards, loans, lines of credit, mortgages. Use "unclear" only when truly ambiguous.
- For assets pick assetType from Equipment | Real Estate | Receivables | Inventory | Other. Cash/operating accounts -> "Other". Business real-estate holdings -> "Real Estate".
- For liabilities give a short liabilityType like "Credit Card", "Line of Credit", "SBA Loan", "Equipment Loan", "Mortgage".
- value: a positive number. For deposits/investments use the current balance. For credit cards/loans use the absolute owed balance.
- suggestedName: a clean human label (e.g. "Chase Business Checking ••1234").
- reasoning: 1 short sentence.
Return one entry per input account, in the same order.`;

    const userPrompt = `Classify these accounts:\n${JSON.stringify(accountSummaries, null, 2)}`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_classifications",
            description: "Return per-account classification",
            parameters: {
              type: "object",
              properties: {
                classifications: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      accountId: { type: "string" },
                      isBusiness: { type: "boolean" },
                      classification: { type: "string", enum: ["asset", "liability", "unclear"] },
                      assetType: {
                        type: ["string", "null"],
                        enum: ["Equipment", "Real Estate", "Receivables", "Inventory", "Other", null],
                      },
                      liabilityType: { type: ["string", "null"] },
                      suggestedName: { type: "string" },
                      value: { type: "number" },
                      reasoning: { type: "string" },
                    },
                    required: [
                      "accountId",
                      "isBusiness",
                      "classification",
                      "suggestedName",
                      "value",
                      "reasoning",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["classifications"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_classifications" } },
    };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (res.status === 429) {
          return {
            ok: false,
            error: "AI rate limit reached. Try again shortly.",
            classifications: [],
            scannedAccountCount: accounts.length,
          };
        }
        if (res.status === 402) {
          return {
            ok: false,
            error: "AI credits exhausted. Add credits in workspace settings.",
            classifications: [],
            scannedAccountCount: accounts.length,
          };
        }
        const text = await res.text();
        console.error("classifyBusinessAccounts AI error", res.status, text);
        return {
          ok: false,
          error: `AI classification failed (${res.status})`,
          classifications: [],
          scannedAccountCount: accounts.length,
        };
      }

      const json = (await res.json()) as {
        choices?: Array<{
          message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
        }>;
      };
      const argsStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argsStr) {
        return {
          ok: false,
          error: "AI returned no result",
          classifications: [],
          scannedAccountCount: accounts.length,
        };
      }
      const parsed = JSON.parse(argsStr) as {
        classifications: BusinessAccountClassification[];
      };
      // Defensive: ensure every accountId we sent has at most one entry,
      // and any entries reference real accounts.
      const validIds = new Set(accounts.map((a) => a.id));
      const cleaned = (parsed.classifications ?? []).filter((c) => validIds.has(c.accountId));
      return {
        ok: true,
        error: null,
        classifications: cleaned,
        scannedAccountCount: accounts.length,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI classification failed";
      console.error("classifyBusinessAccounts error", msg);
      return {
        ok: false,
        error: msg,
        classifications: [],
        scannedAccountCount: accounts.length,
      };
    }
  },
);
