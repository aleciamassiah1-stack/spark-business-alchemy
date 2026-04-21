import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId, getCurrentUserId } from "@/integrations/supabase/auth-helper";

// =================================================================
// Properties (real estate) — scoped to authenticated user
// =================================================================

const propertyInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(300),
  property_type: z.string().trim().max(40).default("residential"),
  estimated_value: z.number().min(0).max(1_000_000_000),
  mortgage_balance: z.number().min(0).max(1_000_000_000).default(0),
  purchase_price: z.number().min(0).max(1_000_000_000).optional().nullable(),
  purchase_date: z.string().optional().nullable(),
});

export const listProperties = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return { properties: [], error: null as string | null };
  const { data, error } = await supabaseAdmin
    .from("properties")
    .select("*")
    .eq("user_id", userId)
    .order("estimated_value", { ascending: false });
  return { properties: data ?? [], error: error?.message ?? null };
});

export const upsertProperty = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      address: string;
      property_type?: string;
      estimated_value: number;
      mortgage_balance?: number;
      purchase_price?: number | null;
      purchase_date?: string | null;
    }) => {
      const { id, ...rest } = input;
      const parsed = propertyInputSchema.parse({
        ...rest,
        property_type: rest.property_type ?? "residential",
        mortgage_balance: rest.mortgage_balance ?? 0,
      });
      return { id, ...parsed };
    },
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const payload = {
      user_id: userId,
      name: data.name,
      address: data.address,
      property_type: data.property_type,
      estimated_value: data.estimated_value,
      mortgage_balance: data.mortgage_balance,
      purchase_price: data.purchase_price ?? null,
      purchase_date: data.purchase_date ?? null,
      last_valued_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("properties")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId);
      return { ok: !error, error: error?.message ?? null, id: data.id as string | null };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("properties")
      .insert(payload)
      .select("id")
      .single();
    return { ok: !error, error: error?.message ?? null, id: inserted?.id ?? null };
  });

export const deleteProperty = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { error } = await supabaseAdmin
      .from("properties")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: !error, error: error?.message ?? null };
  });

// =================================================================
// AI Property Valuation (Zillow alternative — Lovable AI / Gemini)
// =================================================================

export type PropertyValuation = {
  estimated_value: number;
  value_low: number;
  value_high: number;
  confidence: "low" | "medium" | "high";
  price_per_sqft: number | null;
  comps: Array<{
    address: string;
    sold_price: number;
    distance_mi: number | null;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    note: string | null;
  }>;
  market_summary: string;
  assumptions: string;
};

export const estimatePropertyValue = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      address: string;
      beds?: number | null;
      baths?: number | null;
      sqft?: number | null;
      property_type?: string;
    }) =>
      z
        .object({
          address: z.string().trim().min(5).max(300),
          beds: z.number().min(0).max(50).optional().nullable(),
          baths: z.number().min(0).max(50).optional().nullable(),
          sqft: z.number().min(0).max(1_000_000).optional().nullable(),
          property_type: z.string().trim().max(40).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    await requireUserId();
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "AI valuation not configured",
        valuation: null as PropertyValuation | null,
      };
    }

    const detail = [
      data.property_type ? `Type: ${data.property_type}` : null,
      data.beds ? `${data.beds} bed` : null,
      data.baths ? `${data.baths} bath` : null,
      data.sqft ? `${data.sqft} sqft` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const systemPrompt = `You are a US residential real-estate valuation assistant. Given an address (and optionally beds/baths/sqft), produce a realistic AVM-style estimate using your knowledge of the location, recent comparable sales, and local price-per-sqft norms. Always return a numeric estimate even when the address is vague — bias toward the median for the city/ZIP. Provide 3-5 plausible recent comparable sales (real-sounding street names in the same neighborhood; mark these as illustrative if you are not certain). Keep numbers realistic (no symbols). Confidence reflects how specific the address is and how well-known the area is.`;

    const userPrompt = `Estimate the current market value for this property:\n\nAddress: ${data.address}${detail ? `\nDetails: ${detail}` : ""}\n\nReturn the structured valuation via the tool call.`;

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
            name: "return_property_valuation",
            description: "Return a structured AVM-style property valuation",
            parameters: {
              type: "object",
              properties: {
                estimated_value: { type: "number", description: "Best estimate in USD" },
                value_low: { type: "number", description: "Low end of likely range, USD" },
                value_high: { type: "number", description: "High end of likely range, USD" },
                confidence: { type: "string", enum: ["low", "medium", "high"] },
                price_per_sqft: { type: ["number", "null"] },
                comps: {
                  type: "array",
                  minItems: 0,
                  maxItems: 5,
                  items: {
                    type: "object",
                    properties: {
                      address: { type: "string" },
                      sold_price: { type: "number" },
                      distance_mi: { type: ["number", "null"] },
                      beds: { type: ["number", "null"] },
                      baths: { type: ["number", "null"] },
                      sqft: { type: ["number", "null"] },
                      note: { type: ["string", "null"] },
                    },
                    required: ["address", "sold_price"],
                    additionalProperties: false,
                  },
                },
                market_summary: {
                  type: "string",
                  description: "1-2 sentences on the local market trend",
                },
                assumptions: {
                  type: "string",
                  description: "What you assumed (e.g. typical sqft, condition)",
                },
              },
              required: [
                "estimated_value",
                "value_low",
                "value_high",
                "confidence",
                "comps",
                "market_summary",
                "assumptions",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_property_valuation" } },
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
            ok: false as const,
            error: "Rate limit reached. Please try again in a moment.",
            valuation: null,
          };
        }
        if (res.status === 402) {
          return {
            ok: false as const,
            error: "AI credits exhausted. Add credits in workspace settings.",
            valuation: null,
          };
        }
        const text = await res.text();
        console.error("AI valuation error:", res.status, text);
        return {
          ok: false as const,
          error: `AI valuation failed (${res.status})`,
          valuation: null,
        };
      }

      const json = (await res.json()) as {
        choices?: Array<{
          message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
        }>;
      };
      const argsStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argsStr) {
        return { ok: false as const, error: "AI returned no estimate", valuation: null };
      }
      const parsed = JSON.parse(argsStr) as PropertyValuation;
      return { ok: true as const, error: null, valuation: parsed };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI valuation failed";
      console.error("estimatePropertyValue error:", msg);
      return { ok: false as const, error: msg, valuation: null };
    }
  });

// Save a valuation snapshot to a property's history
export const savePropertyValuation = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      property_id: string;
      valuation: PropertyValuation;
      input_address?: string | null;
      input_beds?: number | null;
      input_baths?: number | null;
      input_sqft?: number | null;
      source?: string;
    }) =>
      z
        .object({
          property_id: z.string().uuid(),
          valuation: z.object({
            estimated_value: z.number(),
            value_low: z.number(),
            value_high: z.number(),
            confidence: z.enum(["low", "medium", "high"]),
            price_per_sqft: z.number().nullable(),
            comps: z.array(z.any()),
            market_summary: z.string(),
            assumptions: z.string(),
          }),
          input_address: z.string().max(300).optional().nullable(),
          input_beds: z.number().optional().nullable(),
          input_baths: z.number().optional().nullable(),
          input_sqft: z.number().optional().nullable(),
          source: z.string().max(20).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    // verify property ownership
    const { data: prop, error: propErr } = await supabaseAdmin
      .from("properties")
      .select("id")
      .eq("id", data.property_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (propErr || !prop) {
      return { ok: false as const, error: "Property not found", id: null as string | null };
    }
    const v = data.valuation;
    const { data: inserted, error } = await supabaseAdmin
      .from("property_valuations")
      .insert({
        user_id: userId,
        property_id: data.property_id,
        estimated_value: v.estimated_value,
        value_low: v.value_low,
        value_high: v.value_high,
        confidence: v.confidence,
        price_per_sqft: v.price_per_sqft,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comps: (v.comps ?? []) as any,
        market_summary: v.market_summary,
        assumptions: v.assumptions,
        input_address: data.input_address ?? null,
        input_beds: data.input_beds ?? null,
        input_baths: data.input_baths ?? null,
        input_sqft: data.input_sqft ?? null,
        source: data.source ?? "ai",
      })
      .select("id")
      .single();
    return { ok: !error, error: error?.message ?? null, id: inserted?.id ?? null };
  });

// List valuation history for a property (most recent first)
export const listPropertyValuations = createServerFn({ method: "POST" })
  .inputValidator((input: { property_id: string }) =>
    z.object({ property_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId();
    if (!userId) return { valuations: [], error: null as string | null };
    const { data: rows, error } = await supabaseAdmin
      .from("property_valuations")
      .select("*")
      .eq("user_id", userId)
      .eq("property_id", data.property_id)
      .order("created_at", { ascending: false })
      .limit(50);
    return { valuations: rows ?? [], error: error?.message ?? null };
  });

export const deletePropertyValuation = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { error } = await supabaseAdmin
      .from("property_valuations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: !error, error: error?.message ?? null };
  });

// =================================================================
// Insurance Policies
// =================================================================

export const listInsurancePolicies = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return { policies: [], error: null as string | null };
  const { data, error } = await supabaseAdmin
    .from("insurance_policies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { policies: data ?? [], error: error?.message ?? null };
});

const insuranceInputSchema = z.object({
  policy_type: z.string().trim().min(1).max(40),
  insurer_name: z.string().trim().min(1).max(120),
  policy_number: z.string().trim().max(80).optional().nullable(),
  coverage_amount: z.number().min(0).max(1_000_000_000).optional().nullable(),
  premium_amount: z.number().min(0).max(10_000_000).optional().nullable(),
  premium_frequency: z.string().trim().max(30).default("monthly"),
  renewal_date: z.string().optional().nullable(),
  beneficiaries: z.array(z.string().trim().max(120)).max(20).default([]),
});

export const upsertInsurancePolicy = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      policy_type: string;
      insurer_name: string;
      policy_number?: string | null;
      coverage_amount?: number | null;
      premium_amount?: number | null;
      premium_frequency?: string;
      renewal_date?: string | null;
      beneficiaries?: string[];
      document_path?: string | null;
      document_url?: string | null;
      parsed_by_ai?: boolean;
      raw_extraction?: unknown;
    }) => {
      const { id, document_path, document_url, parsed_by_ai, raw_extraction, ...rest } = input;
      const parsed = insuranceInputSchema.parse({
        ...rest,
        premium_frequency: rest.premium_frequency ?? "monthly",
        beneficiaries: rest.beneficiaries ?? [],
      });
      return {
        id,
        document_path: document_path ?? null,
        document_url: document_url ?? null,
        parsed_by_ai: parsed_by_ai ?? false,
        raw_extraction: (raw_extraction ?? null) as unknown,
        ...parsed,
      };
    },
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const payload = {
      user_id: userId,
      policy_type: data.policy_type,
      insurer_name: data.insurer_name,
      policy_number: data.policy_number ?? null,
      coverage_amount: data.coverage_amount ?? null,
      premium_amount: data.premium_amount ?? null,
      premium_frequency: data.premium_frequency,
      renewal_date: data.renewal_date ?? null,
      beneficiaries: data.beneficiaries,
      document_path: data.document_path,
      document_url: data.document_url,
      parsed_by_ai: data.parsed_by_ai,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      raw_extraction: data.raw_extraction as any,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("insurance_policies")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId);
      return { ok: !error, error: error?.message ?? null };
    }
    const { error } = await supabaseAdmin.from("insurance_policies").insert(payload);
    return { ok: !error, error: error?.message ?? null };
  });

export const deleteInsurancePolicy = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { error } = await supabaseAdmin
      .from("insurance_policies")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: !error, error: error?.message ?? null };
  });

// AI parse insurance PDF — accepts base64 PDF, returns extracted fields
export const parseInsurancePdf = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { fileName: string; base64: string; mimeType: string }) =>
      z
        .object({
          fileName: z.string().trim().min(1).max(255),
          base64: z.string().min(10),
          mimeType: z.string().trim().min(3).max(80),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    await requireUserId(); // gate the AI call behind auth
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "LOVABLE_API_KEY not configured",
        extracted: null as null | InsuranceExtraction,
      };
    }

    const systemPrompt = `You extract structured data from insurance policy documents. Be precise. If a field is not present, return null. Coverage and premium amounts must be numeric (no currency symbols).`;
    const userPrompt = `Extract the key details from this insurance policy document. Return ONLY the structured data via the tool call.`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: `data:${data.mimeType};base64,${data.base64}` },
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_insurance_policy",
            description: "Extract structured insurance policy fields",
            parameters: {
              type: "object",
              properties: {
                policy_type: {
                  type: "string",
                  enum: ["life", "auto", "home", "umbrella", "health", "disability", "other"],
                  description: "Category of the policy",
                },
                insurer_name: { type: "string", description: "Name of the insurance company" },
                policy_number: { type: ["string", "null"] },
                coverage_amount: {
                  type: ["number", "null"],
                  description: "Total coverage / death benefit / sum insured in USD",
                },
                premium_amount: {
                  type: ["number", "null"],
                  description: "Premium per period in USD",
                },
                premium_frequency: {
                  type: "string",
                  enum: ["monthly", "quarterly", "semi-annual", "annual", "unknown"],
                },
                renewal_date: {
                  type: ["string", "null"],
                  description: "ISO date YYYY-MM-DD of next renewal",
                },
                beneficiaries: {
                  type: "array",
                  items: { type: "string" },
                  description: "Named beneficiaries if listed",
                },
              },
              required: ["policy_type", "insurer_name"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_insurance_policy" } },
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
        const text = await res.text();
        if (res.status === 429) {
          return {
            ok: false as const,
            error: "Rate limit reached on AI parser. Please try again in a moment.",
            extracted: null,
          };
        }
        if (res.status === 402) {
          return {
            ok: false as const,
            error: "AI credits exhausted. Add credits in workspace settings.",
            extracted: null,
          };
        }
        console.error("Lovable AI error:", res.status, text);
        return {
          ok: false as const,
          error: `AI parser failed (${res.status})`,
          extracted: null,
        };
      }

      const json = (await res.json()) as {
        choices?: Array<{
          message?: {
            tool_calls?: Array<{ function?: { arguments?: string } }>;
          };
        }>;
      };

      const argsStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argsStr) {
        return { ok: false as const, error: "AI returned no extraction", extracted: null };
      }

      const parsed = JSON.parse(argsStr) as InsuranceExtraction;
      return { ok: true as const, error: null, extracted: parsed };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI parse failed";
      console.error("parseInsurancePdf error:", msg);
      return { ok: false as const, error: msg, extracted: null };
    }
  });

export type InsuranceExtraction = {
  policy_type: string;
  insurer_name: string;
  policy_number?: string | null;
  coverage_amount?: number | null;
  premium_amount?: number | null;
  premium_frequency?: string;
  renewal_date?: string | null;
  beneficiaries?: string[];
};

// =================================================================
// Estate Documents
// =================================================================

export const listEstateDocuments = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return { documents: [], error: null as string | null };
  const { data, error } = await supabaseAdmin
    .from("estate_documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { documents: data ?? [], error: error?.message ?? null };
});

export const upsertEstateDocument = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      document_type: string;
      title: string;
      status?: string;
      signed_date?: string | null;
      expiration_date?: string | null;
      notes?: string | null;
      document_path?: string | null;
      document_url?: string | null;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          document_type: z
            .enum(["will", "healthcare_directive", "power_of_attorney", "trust", "other"]),
          title: z.string().trim().min(1).max(160),
          status: z.enum(["current", "needs_review", "expired"]).default("current"),
          signed_date: z.string().optional().nullable(),
          expiration_date: z.string().optional().nullable(),
          notes: z.string().trim().max(1000).optional().nullable(),
          document_path: z.string().max(500).optional().nullable(),
          document_url: z.string().max(1000).optional().nullable(),
        })
        .parse({ ...input, status: input.status ?? "current" }),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const payload = {
      user_id: userId,
      document_type: data.document_type,
      title: data.title,
      status: data.status,
      signed_date: data.signed_date ?? null,
      expiration_date: data.expiration_date ?? null,
      notes: data.notes ?? null,
      document_path: data.document_path ?? null,
      document_url: data.document_url ?? null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("estate_documents")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId);
      return { ok: !error, error: error?.message ?? null };
    }
    const { error } = await supabaseAdmin.from("estate_documents").insert(payload);
    return { ok: !error, error: error?.message ?? null };
  });

export const deleteEstateDocument = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { error } = await supabaseAdmin
      .from("estate_documents")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: !error, error: error?.message ?? null };
  });

// =================================================================
// Document upload (server-side, accepts base64) — stored under user folder
// =================================================================

export const uploadWealthDocument = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { folder: string; fileName: string; base64: string; mimeType: string }) =>
      z
        .object({
          folder: z.enum(["insurance", "estate"]),
          fileName: z.string().trim().min(1).max(255),
          base64: z.string().min(10),
          mimeType: z.string().trim().max(80),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const userId = await requireUserId();
      const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      // Storage RLS requires `${user_id}/...` as the top-level folder
      const path = `${userId}/${data.folder}/${Date.now()}_${safeName}`;
      const buf = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
      const { error } = await supabaseAdmin.storage
        .from("wealth-documents")
        .upload(path, buf, { contentType: data.mimeType, upsert: false });
      if (error) return { ok: false as const, path: null, url: null, error: error.message };
      const { data: signed } = await supabaseAdmin.storage
        .from("wealth-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      return {
        ok: true as const,
        path,
        url: signed?.signedUrl ?? null,
        error: null as string | null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      return { ok: false as const, path: null, url: null, error: msg };
    }
  });

// =================================================================
// Demo mode — seed mock institutions / clear demo (per user)
// =================================================================

const DEMO_INSTITUTIONS = [
  {
    id: "demo_chase",
    name: "Chase",
    accounts: [
      { name: "Sapphire Checking", type: "depository", subtype: "checking", balance: 84_320, mask: "4421" },
      { name: "Premier Savings", type: "depository", subtype: "savings", balance: 215_700, mask: "9912" },
    ],
  },
  {
    id: "demo_fidelity",
    name: "Fidelity",
    accounts: [
      { name: "Brokerage", type: "investment", subtype: "brokerage", balance: 1_245_800, mask: "8821" },
      { name: "Roth IRA", type: "investment", subtype: "ira", balance: 318_400, mask: "7745" },
    ],
    holdings: [
      { ticker: "VTI", name: "Vanguard Total Market", quantity: 2400, price: 268.42, type: "etf" },
      { ticker: "AAPL", name: "Apple Inc.", quantity: 850, price: 224.18, type: "equity" },
      { ticker: "MSFT", name: "Microsoft", quantity: 520, price: 428.5, type: "equity" },
    ],
  },
  {
    id: "demo_schwab",
    name: "Charles Schwab",
    accounts: [
      { name: "Schwab One", type: "investment", subtype: "brokerage", balance: 612_000, mask: "3344" },
    ],
    holdings: [
      { ticker: "VXUS", name: "Vanguard International", quantity: 1800, price: 64.2, type: "etf" },
      { ticker: "BND", name: "Vanguard Bond", quantity: 3200, price: 73.84, type: "fixed income" },
    ],
  },
  {
    id: "demo_coinbase",
    name: "Coinbase",
    accounts: [
      { name: "Crypto Wallet", type: "investment", subtype: "crypto", balance: 142_300, mask: "9988" },
    ],
    holdings: [
      { ticker: "BTC", name: "Bitcoin", quantity: 1.85, price: 67_400, type: "cryptocurrency" },
      { ticker: "ETH", name: "Ethereum", quantity: 12.4, price: 3_280, type: "cryptocurrency" },
    ],
  },
];

export const seedDemoData = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const userId = await requireUserId();
    for (const inst of DEMO_INSTITUTIONS) {
      // Per-user demo item id so multiple users can each have their own demo
      const demoItemId = `demo_${userId}_${inst.id}`;
      const { data: item, error: itemErr } = await supabaseAdmin
        .from("plaid_items")
        .upsert(
          {
            user_id: userId,
            item_id: demoItemId,
            access_token: "demo-no-token",
            institution_id: inst.id,
            institution_name: `${inst.name} (Demo)`,
            status: "active",
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "item_id" },
        )
        .select("id")
        .single();
      if (itemErr || !item) continue;

      // accounts
      const accountRows = inst.accounts.map((a, idx) => ({
        user_id: userId,
        item_id: item.id,
        plaid_account_id: `${userId}_${inst.id}_acct_${idx}`,
        name: a.name,
        official_name: `${inst.name} ${a.name}`,
        mask: a.mask,
        type: a.type,
        subtype: a.subtype,
        current_balance: a.balance,
        available_balance: a.balance,
        iso_currency_code: "USD",
        last_synced_at: new Date().toISOString(),
      }));
      await supabaseAdmin
        .from("aggregated_accounts")
        .upsert(accountRows, { onConflict: "plaid_account_id" });

      if (inst.holdings && inst.holdings.length > 0) {
        const { data: acctsBack } = await supabaseAdmin
          .from("aggregated_accounts")
          .select("id, plaid_account_id")
          .eq("item_id", item.id);
        const firstInvestmentAcct = acctsBack?.find(
          (a) => accountRows.find((r) => r.plaid_account_id === a.plaid_account_id)?.type === "investment",
        );
        if (firstInvestmentAcct) {
          await supabaseAdmin
            .from("aggregated_holdings")
            .delete()
            .eq("account_id", firstInvestmentAcct.id);
          const holdingRows = inst.holdings.map((h) => ({
            user_id: userId,
            account_id: firstInvestmentAcct.id,
            security_id: `${inst.id}_${h.ticker}`,
            ticker: h.ticker,
            name: h.name,
            type: h.type,
            quantity: h.quantity,
            institution_price: h.price,
            institution_value: h.price * h.quantity,
            cost_basis: h.price * h.quantity * 0.78,
            iso_currency_code: "USD",
            last_synced_at: new Date().toISOString(),
          }));
          await supabaseAdmin.from("aggregated_holdings").insert(holdingRows);
        }
      }
    }

    // Demo transactions on the first depository account
    const { data: depositoryAccts } = await supabaseAdmin
      .from("aggregated_accounts")
      .select("id, plaid_account_id")
      .eq("user_id", userId)
      .eq("type", "depository")
      .like("plaid_account_id", `${userId}_%`);

    if (depositoryAccts && depositoryAccts.length > 0) {
      const acctId = depositoryAccts[0].id;
      const today = new Date();
      const txs = [
        { name: "Salary deposit", merchant: "Whitfield Holdings LLC", amount: -18_500, category: "INCOME", days: 1 },
        { name: "Whole Foods Market", merchant: "Whole Foods", amount: 284.5, category: "FOOD_AND_DRINK", days: 2 },
        { name: "Tesla supercharger", merchant: "Tesla", amount: 38.2, category: "TRANSPORTATION", days: 3 },
        { name: "Amazon", merchant: "Amazon", amount: 142.99, category: "GENERAL_MERCHANDISE", days: 4 },
        { name: "Equinox membership", merchant: "Equinox", amount: 285, category: "PERSONAL_CARE", days: 5 },
        { name: "Dividend — VTI", merchant: "Vanguard", amount: -842, category: "INCOME", days: 6 },
        { name: "Soho House", merchant: "Soho House", amount: 384, category: "ENTERTAINMENT", days: 7 },
        { name: "Delta Airlines", merchant: "Delta", amount: 1_240, category: "TRAVEL", days: 9 },
      ];
      const txRows = txs.map((t, idx) => {
        const d = new Date(today);
        d.setDate(d.getDate() - t.days);
        return {
          user_id: userId,
          plaid_transaction_id: `demo_${userId}_tx_${idx}`,
          account_id: acctId,
          amount: t.amount,
          iso_currency_code: "USD",
          date: d.toISOString().slice(0, 10),
          name: t.name,
          merchant_name: t.merchant,
          category: t.category,
          category_detailed: t.category,
          payment_channel: "in store",
          pending: false,
          logo_url: null,
        };
      });
      await supabaseAdmin
        .from("aggregated_transactions")
        .upsert(txRows, { onConflict: "plaid_transaction_id" });
    }

    return { ok: true as const, error: null as string | null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Demo seed failed";
    return { ok: false as const, error: msg };
  }
});

export const clearDemoData = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const userId = await requireUserId();
    const { data: demoItems } = await supabaseAdmin
      .from("plaid_items")
      .select("id")
      .eq("user_id", userId)
      .like("item_id", `demo_${userId}_%`);
    const ids = (demoItems ?? []).map((i) => i.id);
    if (ids.length === 0) return { ok: true as const, error: null };
    const { data: accts } = await supabaseAdmin
      .from("aggregated_accounts")
      .select("id")
      .in("item_id", ids);
    const acctIds = (accts ?? []).map((a) => a.id);
    if (acctIds.length > 0) {
      await supabaseAdmin.from("aggregated_holdings").delete().in("account_id", acctIds);
      await supabaseAdmin.from("aggregated_transactions").delete().in("account_id", acctIds);
    }
    await supabaseAdmin.from("aggregated_accounts").delete().in("item_id", ids);
    await supabaseAdmin.from("plaid_items").delete().in("id", ids);
    return { ok: true as const, error: null as string | null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Clear demo failed";
    return { ok: false as const, error: msg };
  }
});
