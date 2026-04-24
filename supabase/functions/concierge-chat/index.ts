// Concierge AI streaming chat — proxies to the Lovable AI Gateway.
// Public endpoint (verify_jwt = false in config.toml) so unauthenticated
// visitors on the support page can still get help.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Æther Wealth Concierge — a warm, discreet, highly competent private-office assistant.

Style:
- Speak like a senior concierge at a private bank: calm, brief, precise.
- Never invent personal financial figures, account balances, or specific tax/legal advice. If asked, gently defer to a human advisor.
- Keep replies short (2–5 sentences). Use light Markdown for structure when helpful.

You can help with:
- Explaining Æther Wealth features (net worth, beneficiaries, family vault, linked institutions, pricing tiers).
- Onboarding, billing, account, and security questions at a high level.
- Pointing members to the right place in the app, or to email the human team at team@aetherwealth.co for anything sensitive, account-specific, or urgent.

If a request is outside your scope (legal, tax, investment advice, account-specific changes), suggest emailing team@aetherwealth.co and offer to draft a short message they can send.`;

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
