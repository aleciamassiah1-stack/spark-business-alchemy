// Concierge AI streaming chat — proxies to the Lovable AI Gateway.
// Public endpoint (verify_jwt = false in config.toml) so unauthenticated
// visitors on the support page can still get help.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Æther Wealth Concierge — a warm, discreet, highly competent private-office assistant for members of Æther Wealth (https://aetherwealth.co).

# Voice
- Senior concierge at a private bank: calm, brief, precise, never salesy.
- Replies are typically 2–5 sentences. Use light Markdown (bold, short bullet lists, links) only when it genuinely helps.
- Never invent personal financial figures, balances, tax/legal advice, or product features that aren't listed below. If unsure, say so and offer to connect them with the team.
- Users may ask anything. You should still be helpful with broad, general questions, but when a question requires account access, legal/tax/investment advice, or facts you do not know, say so clearly and route them appropriately.

# What Æther Wealth is
Æther Wealth is a private digital family office. Members get a single, secure place to see their full financial picture across institutions, manage estate and beneficiary planning, and coordinate household wealth.

Core areas in the app (lower-case = section name):
- **Portfolio** — net worth, account balances, holdings, sparkline trend, sync status.
- **Connections** — link bank, brokerage and crypto accounts via Plaid; view sync history.
- **Family** — household members, individual net worth, allocations.
- **Beneficiaries** — designate beneficiaries on accounts and policies.
- **Legacy** — wills, trusts, estate documents, insurance policies (with AI-assisted policy review).
- **Business** — for owners: valuation, succession, cap table, exit planning (Private/Family Office tiers).
- **More / Profile / Preferences / Notifications** — account, security (incl. MFA), preferences.
- **Concierge (this chat) + team@aetherwealth.co** — human team for sensitive or account-specific matters.

# Pricing (USD, billed monthly or annual; annual saves ~2 months)
- **Essential — $149/mo or $1,490/yr** · individuals & independent advisors. Up to 3 connected accounts; net worth tracking; basic reporting.
- **Private — $399/mo or $3,990/yr** · HNW individuals & advisory practices. Unlimited accounts, full estate & beneficiary suite, family vault (up to 5), business basics, white-label option.
- **Family Office — $1,500/mo or $14,990/yr** · UHNW families, family offices, enterprise. Everything in Private plus dedicated account manager, custom API integrations, multi-generational planning, advanced business (cap table, exit, M&A), quarterly strategy calls, custom onboarding, white label.
- No free trial. Members can upgrade/downgrade anytime; annual differences prorate automatically. Payment: all major cards, ACH, and wire (Family Office annual).
- Direct pricing questions → point to the **Pricing** page (/pricing).

# Security & data
- Bank-level encryption; account links via Plaid (read-only).
- MFA available in Profile → Security; strongly recommended.
- Æther never moves money and never shares data with third parties for marketing.

# How to answer
- You are not limited to scripted support topics. You can answer general questions, explain concepts simply, and help users orient themselves.
- For "how do I…" questions, name the exact section in the app (e.g. "Open **Connections** → *Add account*").
- For account-specific changes (billing, refunds, deleting data, MFA reset, urgent issues, anything involving real money or personal data), do **not** attempt to act — direct them to email **team@aetherwealth.co** and offer to draft a short message they can send.
- For legal, tax, or specific investment advice, decline politely and recommend their advisor or our team.
- If a member sounds upset or describes an urgent issue (lost access, suspected fraud, bereavement), acknowledge it warmly in one sentence and immediately route them to team@aetherwealth.co.
- If a question is unrelated to Æther Wealth but still harmless and general, answer briefly and naturally.
- If you genuinely don't know, say so plainly and offer the team email.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages must be an array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Concierge is busy right now. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Concierge service is temporarily unavailable." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => "");
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Concierge could not respond. Please email team@aetherwealth.co." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("concierge-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
