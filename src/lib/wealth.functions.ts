import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId, getCurrentUserId } from "@/integrations/supabase/auth-helper";
import { resolveActiveProfileId } from "./active-profile.server";

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
  beds: z.number().min(0).max(50).optional().nullable(),
  baths: z.number().min(0).max(50).optional().nullable(),
  sqft: z.number().min(0).max(1_000_000).optional().nullable(),
  image_url: z.string().trim().max(2048).url().optional().nullable(),
});

export const listProperties = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  if (!userId) return { properties: [], error: null as string | null };
  const profileId = await resolveActiveProfileId(userId);
  const { data, error } = await supabaseAdmin
    .from("properties")
    .select("*")
    .eq("user_id", profileId)
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
      beds?: number | null;
      baths?: number | null;
      sqft?: number | null;
      image_url?: string | null;
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
      beds: data.beds ?? null,
      baths: data.baths ?? null,
      sqft: data.sqft ?? null,
      image_url: data.image_url ?? null,
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

// =================================================================
// RentCast AVM (live, free tier — 50 calls/month)
// =================================================================

export const estimatePropertyValueRentCast = createServerFn({ method: "POST" })
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
    const apiKey = process.env.RENTCAST_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "RentCast not configured. Add RENTCAST_API_KEY.",
        valuation: null as PropertyValuation | null,
      };
    }

    // RentCast expects propertyType values like: Single Family, Condo, Townhouse, Manufactured, Multi-Family, Apartment, Land
    const ptMap: Record<string, string> = {
      residential: "Single Family",
      single_family: "Single Family",
      condo: "Condo",
      townhouse: "Townhouse",
      multi_family: "Multi-Family",
      apartment: "Apartment",
      land: "Land",
    };
    const propertyType = ptMap[(data.property_type ?? "").toLowerCase()] ?? "Single Family";

    const params = new URLSearchParams();
    params.set("address", data.address);
    params.set("propertyType", propertyType);
    if (data.beds != null) params.set("bedrooms", String(data.beds));
    if (data.baths != null) params.set("bathrooms", String(data.baths));
    if (data.sqft != null) params.set("squareFootage", String(Math.round(data.sqft)));
    params.set("compCount", "5");

    try {
      const res = await fetch(`https://api.rentcast.io/v1/avm/value?${params.toString()}`, {
        method: "GET",
        headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("RentCast AVM error:", res.status, text);
        if (res.status === 401) {
          return { ok: false as const, error: "Invalid RentCast API key.", valuation: null };
        }
        if (res.status === 429) {
          return {
            ok: false as const,
            error: "RentCast rate limit / monthly quota reached.",
            valuation: null,
          };
        }
        if (res.status === 404) {
          return {
            ok: false as const,
            error: "RentCast couldn't find this address. Try a fuller street address.",
            valuation: null,
          };
        }
        return { ok: false as const, error: `RentCast failed (${res.status})`, valuation: null };
      }

      type RcComp = {
        formattedAddress?: string;
        addressLine1?: string;
        price?: number;
        listedDate?: string;
        removedDate?: string;
        lastSeenDate?: string;
        bedrooms?: number;
        bathrooms?: number;
        squareFootage?: number;
        distance?: number;
        correlation?: number;
      };
      const json = (await res.json()) as {
        price?: number;
        priceRangeLow?: number;
        priceRangeHigh?: number;
        comparables?: RcComp[];
      };

      if (typeof json.price !== "number") {
        return {
          ok: false as const,
          error: "RentCast returned no estimate for this address.",
          valuation: null,
        };
      }

      const estimated = Math.round(json.price);
      const low = Math.round(json.priceRangeLow ?? estimated * 0.95);
      const high = Math.round(json.priceRangeHigh ?? estimated * 1.05);
      const spread = estimated > 0 ? (high - low) / estimated : 1;
      const confidence: "low" | "medium" | "high" =
        spread <= 0.1 ? "high" : spread <= 0.2 ? "medium" : "low";

      const ppsf =
        data.sqft && data.sqft > 0 ? Math.round(estimated / data.sqft) : null;

      const comps = (json.comparables ?? []).slice(0, 5).map((c) => ({
        address: c.formattedAddress ?? c.addressLine1 ?? "Unknown address",
        sold_price: Math.round(c.price ?? 0),
        distance_mi: typeof c.distance === "number" ? Number(c.distance.toFixed(2)) : null,
        beds: c.bedrooms ?? null,
        baths: c.bathrooms ?? null,
        sqft: c.squareFootage ?? null,
        note: c.listedDate
          ? `Listed ${new Date(c.listedDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
          : null,
      }));

      const valuation: PropertyValuation = {
        estimated_value: estimated,
        value_low: low,
        value_high: high,
        confidence,
        price_per_sqft: ppsf,
        comps,
        market_summary: `RentCast AVM based on ${comps.length} recent comparable ${comps.length === 1 ? "sale" : "sales"} within the local market. Range reflects model uncertainty (${Math.round(spread * 100)}% spread).`,
        assumptions: `Property type: ${propertyType}${data.beds ? ` · ${data.beds} bed` : ""}${data.baths ? ` · ${data.baths} bath` : ""}${data.sqft ? ` · ${Math.round(data.sqft).toLocaleString()} sqft` : ""}.`,
      };

      return { ok: true as const, error: null, valuation };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "RentCast request failed";
      console.error("estimatePropertyValueRentCast error:", msg);
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
  status: z.string().trim().max(30).default("active"),
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
      status?: string;
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
        status: rest.status ?? "active",
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
      status: data.status,
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
          base64: z
            .string()
            .min(10)
            .max(14_000_000) // ~10 MB decoded payload ceiling
            .regex(/^[A-Za-z0-9+/=\s]+$/, "Invalid base64 payload"),
          mimeType: z
            .string()
            .trim()
            .min(3)
            .max(80)
            .refine(
              (v) =>
                v === "application/pdf" ||
                v === "image/jpeg" ||
                v === "image/png" ||
                v === "image/webp",
              "Unsupported mime type",
            ),
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

export type EstateExtraction = {
  document_type: "will" | "healthcare_directive" | "power_of_attorney" | "trust" | "other";
  suggested_title: string;
  signed_date?: string | null;
  expiration_date?: string | null;
  grantor?: string | null;
  executor?: string | null;
  trustees?: string[];
  beneficiaries?: string[];
  notes?: string | null;
};

// AI parse estate document PDF — extracts type, parties, beneficiaries, dates
export const parseEstatePdf = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { fileName: string; base64: string; mimeType: string }) =>
      z
        .object({
          fileName: z.string().trim().min(1).max(255),
          base64: z
            .string()
            .min(10)
            .max(14_000_000)
            .regex(/^[A-Za-z0-9+/=\s]+$/, "Invalid base64 payload"),
          mimeType: z
            .string()
            .trim()
            .min(3)
            .max(80)
            .refine(
              (v) =>
                v === "application/pdf" ||
                v === "image/jpeg" ||
                v === "image/png" ||
                v === "image/webp",
              "Unsupported mime type",
            ),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    await requireUserId();
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "LOVABLE_API_KEY not configured",
        extracted: null as null | EstateExtraction,
      };
    }

    const systemPrompt = `You extract structured data from US estate planning documents — last will & testament, revocable/irrevocable trusts, durable power of attorney, healthcare directive/living will. Be precise. If a field is not present, return null. Dates must be ISO YYYY-MM-DD. Lists must contain full names only.`;
    const userPrompt = `Extract the key parties and details from this estate document. Return ONLY the structured data via the tool call.`;

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
            name: "extract_estate_document",
            description: "Extract structured estate document fields",
            parameters: {
              type: "object",
              properties: {
                document_type: {
                  type: "string",
                  enum: ["will", "healthcare_directive", "power_of_attorney", "trust", "other"],
                  description: "Detected document type",
                },
                suggested_title: {
                  type: "string",
                  description: "Short human-readable title, e.g. 'Last Will & Testament of Jane Doe'",
                },
                signed_date: { type: ["string", "null"], description: "ISO date the document was executed" },
                expiration_date: { type: ["string", "null"], description: "ISO date the document expires, if any" },
                grantor: { type: ["string", "null"], description: "Testator / grantor / principal full name" },
                executor: {
                  type: ["string", "null"],
                  description: "Named executor / personal representative / attorney-in-fact / healthcare agent",
                },
                trustees: {
                  type: "array",
                  items: { type: "string" },
                  description: "Named trustees (trusts only)",
                },
                beneficiaries: {
                  type: "array",
                  items: { type: "string" },
                  description: "Named beneficiaries / heirs",
                },
                notes: { type: ["string", "null"], description: "Short note on extraction confidence or caveats" },
              },
              required: ["document_type", "suggested_title"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_estate_document" } },
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
        console.error("Lovable AI estate parse error:", res.status, text);
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

      const parsed = JSON.parse(argsStr) as EstateExtraction;
      return { ok: true as const, error: null, extracted: parsed };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI parse failed";
      console.error("parseEstatePdf error:", msg);
      return { ok: false as const, error: msg, extracted: null };
    }
  });



// =================================================================
// Tax Return AI Extraction
// =================================================================

export type TaxFormType =
  | "1120"
  | "1120-S"
  | "1065"
  | "Schedule C"
  | "Schedule L"
  | "Schedule K-1"
  | "Schedule E"
  | "Schedule M-1"
  | "Schedule M-2"
  | "Form 4562"
  | "1040"
  | "other";

export type TaxReturnExtraction = {
  form_type: TaxFormType; // detected form / schedule
  is_schedule: boolean; // true when this is an attachment, not a primary return
  tax_year: number | null;
  business_name: string | null;
  revenue: number | null; // gross receipts / total revenue
  cost_of_goods_sold: number | null;
  total_expenses: number | null;
  net_profit: number | null; // ordinary business income / net income
  total_assets: number | null; // Schedule L
  total_liabilities: number | null; // Schedule L
  depreciation: number | null;
  officer_compensation: number | null;
  // Schedule-specific values that may appear on attachments
  k1_ordinary_income: number | null; // K-1 box 1 ordinary business income share
  k1_ownership_pct: number | null; // K-1 partner/shareholder %
  sch_e_net_income: number | null; // Schedule E net income from partnerships/S-corps
  notes: string | null;
};

export type TaxReturnSource = {
  fileName: string;
  form_type: TaxFormType;
  is_schedule: boolean;
  tax_year: number | null;
  used_fields: string[]; // which aggregated fields this source contributed to
  error: string | null;
};

export type TaxReturnAggregated = {
  form_type: TaxFormType; // primary detected form
  tax_year: number | null;
  business_name: string | null;
  revenue: number | null;
  cost_of_goods_sold: number | null;
  total_expenses: number | null;
  net_profit: number | null;
  total_assets: number | null;
  total_liabilities: number | null;
  depreciation: number | null;
  officer_compensation: number | null;
  notes: string | null;
  sources: TaxReturnSource[];
};

// AI parse a tax return PDF — accepts base64 PDF/image, returns extracted financials.
export const parseTaxReturnPdf = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { fileName: string; base64: string; mimeType: string }) =>
      z
        .object({
          fileName: z.string().trim().min(1).max(255),
          base64: z
            .string()
            .min(10)
            .max(14_000_000)
            .regex(/^[A-Za-z0-9+/=\s]+$/, "Invalid base64 payload"),
          mimeType: z
            .string()
            .trim()
            .min(3)
            .max(80)
            .refine(
              (v) =>
                v === "application/pdf" ||
                v === "image/jpeg" ||
                v === "image/png" ||
                v === "image/webp",
              "Unsupported mime type",
            ),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    await requireUserId();
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "LOVABLE_API_KEY not configured",
        extracted: null as null | TaxReturnExtraction,
      };
    }

    const systemPrompt = `You are a precise extraction assistant for US business tax returns and their schedules. The document may be a primary return (Form 1120, 1120-S, 1065, Schedule C of 1040) OR an attached schedule (Schedule L balance sheet, Schedule K-1 partner/shareholder share, Schedule E supplemental income, Schedule M-1/M-2 reconciliation, Form 4562 depreciation).

Detection rules:
- Set form_type to the most specific form printed on the document.
- Set is_schedule=true when the document is a schedule/attachment, not a primary return.
- Schedule L → fill total_assets and total_liabilities (end-of-year column) only.
- Schedule K-1 → fill k1_ordinary_income (box 1) and k1_ownership_pct (profit %); leave revenue/net_profit null.
- Schedule E → fill sch_e_net_income (Part II totals).
- Form 4562 → fill depreciation only.
- Schedule M-1/M-2 → fill notes describing reconciliation; leave numerics null.

Extract numbers as plain USD (no symbols, commas, or thousands separators). If a value is not present or unreadable, return null — never guess. For revenue prefer Line 1a (Gross receipts or sales) less returns/allowances if shown, otherwise total revenue. For net_profit use ordinary business income (Form 1120 Line 28, Form 1120-S Line 21, Form 1065 Line 22, or Schedule C Line 31).`;
    const userPrompt = `Extract the structured financials from this tax document. Return ONLY the structured data via the tool call.`;

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
            name: "extract_tax_return",
            description: "Extract structured financials from a US business tax return or schedule.",
            parameters: {
              type: "object",
              properties: {
                form_type: {
                  type: "string",
                  enum: [
                    "1120",
                    "1120-S",
                    "1065",
                    "Schedule C",
                    "Schedule L",
                    "Schedule K-1",
                    "Schedule E",
                    "Schedule M-1",
                    "Schedule M-2",
                    "Form 4562",
                    "1040",
                    "other",
                  ],
                  description: "Detected tax form or schedule",
                },
                is_schedule: {
                  type: "boolean",
                  description: "True when the document is an attached schedule, not a primary return",
                },
                tax_year: { type: ["number", "null"], description: "Tax year (e.g. 2023)" },
                business_name: { type: ["string", "null"] },
                revenue: { type: ["number", "null"], description: "Gross receipts / total revenue in USD" },
                cost_of_goods_sold: { type: ["number", "null"] },
                total_expenses: { type: ["number", "null"] },
                net_profit: { type: ["number", "null"], description: "Ordinary business income / net income in USD" },
                total_assets: { type: ["number", "null"], description: "Schedule L end-of-year total assets" },
                total_liabilities: { type: ["number", "null"], description: "Schedule L end-of-year total liabilities" },
                depreciation: { type: ["number", "null"] },
                officer_compensation: { type: ["number", "null"] },
                k1_ordinary_income: { type: ["number", "null"], description: "K-1 box 1 ordinary business income share" },
                k1_ownership_pct: { type: ["number", "null"], description: "K-1 partner/shareholder profit percentage 0-100" },
                sch_e_net_income: { type: ["number", "null"], description: "Schedule E net income from partnerships/S-corps" },
                notes: { type: ["string", "null"], description: "Short note on extraction confidence or caveats" },
              },
              required: ["form_type", "is_schedule"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_tax_return" } },
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
        console.error("Lovable AI tax return error:", res.status, text);
        return {
          ok: false as const,
          error: `AI parser failed (${res.status})`,
          extracted: null,
        };
      }

      const json = (await res.json()) as {
        choices?: Array<{
          message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
        }>;
      };

      const argsStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argsStr) {
        return { ok: false as const, error: "AI returned no extraction", extracted: null };
      }

      const parsed = JSON.parse(argsStr) as TaxReturnExtraction;
      return { ok: true as const, error: null, extracted: parsed };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI parse failed";
      console.error("parseTaxReturnPdf error:", msg);
      return { ok: false as const, error: msg, extracted: null };
    }
  });

// Parse multiple tax return / schedule PDFs in one call and aggregate them into
// a single set of financials. Primary forms (1120/1120-S/1065/Schedule C) provide
// top-line revenue/net_profit; Schedule L provides balance sheet; K-1s sum up to
// supplement net_profit when no primary return is present.
export const parseTaxReturnDocuments = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { files: Array<{ fileName: string; base64: string; mimeType: string }> }) =>
      z
        .object({
          files: z
            .array(
              z.object({
                fileName: z.string().trim().min(1).max(255),
                base64: z
                  .string()
                  .min(10)
                  .max(14_000_000)
                  .regex(/^[A-Za-z0-9+/=\s]+$/, "Invalid base64 payload"),
                mimeType: z
                  .string()
                  .trim()
                  .min(3)
                  .max(80)
                  .refine(
                    (v) =>
                      v === "application/pdf" ||
                      v === "image/jpeg" ||
                      v === "image/png" ||
                      v === "image/webp",
                    "Unsupported mime type",
                  ),
              }),
            )
            .min(1)
            .max(8),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    await requireUserId();
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "LOVABLE_API_KEY not configured",
        aggregated: null as TaxReturnAggregated | null,
      };
    }

    // Process all files in parallel — each file calls parseTaxReturnPdf's handler
    // logic. We re-use the same server function via direct invocation by reading
    // its handler indirectly: call .fn equivalent by invoking through fetch is
    // overkill; instead inline the per-file extraction by calling the existing
    // exported function.
    const perFile = await Promise.all(
      data.files.map(async (f) => {
        try {
          const res = await parseTaxReturnPdf({
            data: { fileName: f.fileName, base64: f.base64, mimeType: f.mimeType },
          });
          return { file: f, result: res };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "parse failed";
          return {
            file: f,
            result: {
              ok: false as const,
              error: msg,
              extracted: null as TaxReturnExtraction | null,
            },
          };
        }
      }),
    );

    const sources: TaxReturnSource[] = [];
    const extractions: Array<{ fileName: string; e: TaxReturnExtraction }> = [];
    for (const item of perFile) {
      if (item.result.ok && item.result.extracted) {
        const e = item.result.extracted;
        extractions.push({ fileName: item.file.fileName, e });
        sources.push({
          fileName: item.file.fileName,
          form_type: e.form_type,
          is_schedule: !!e.is_schedule,
          tax_year: e.tax_year ?? null,
          used_fields: [],
          error: null,
        });
      } else {
        sources.push({
          fileName: item.file.fileName,
          form_type: "other",
          is_schedule: false,
          tax_year: null,
          used_fields: [],
          error: item.result.error ?? "parse failed",
        });
      }
    }

    if (extractions.length === 0) {
      return {
        ok: false as const,
        error: "No documents could be parsed.",
        aggregated: { ...emptyAggregated(), sources } as TaxReturnAggregated,
      };
    }

    // Decide primary return: prefer 1120/1120-S/1065/Schedule C (not flagged as schedule)
    const primaryFormPriority: TaxFormType[] = ["1120", "1120-S", "1065", "Schedule C", "1040"];
    const primaryIdx = extractions.findIndex(
      (x) => !x.e.is_schedule && primaryFormPriority.includes(x.e.form_type),
    );
    const primary = primaryIdx >= 0 ? extractions[primaryIdx] : extractions[0];

    const agg: TaxReturnAggregated = {
      form_type: primary.e.form_type,
      tax_year: primary.e.tax_year ?? null,
      business_name: primary.e.business_name ?? null,
      revenue: null,
      cost_of_goods_sold: null,
      total_expenses: null,
      net_profit: null,
      total_assets: null,
      total_liabilities: null,
      depreciation: null,
      officer_compensation: null,
      notes: null,
      sources,
    };

    // Helper to record which file contributed which field
    const credit = (fileName: string, field: string) => {
      const s = sources.find((x) => x.fileName === fileName);
      if (s && !s.used_fields.includes(field)) s.used_fields.push(field);
    };

    // Top-line numerics: take from primary, else fall back to any extraction
    const pickFirst = <K extends keyof TaxReturnExtraction>(field: K): { val: TaxReturnExtraction[K]; src: string | null } => {
      // Primary first
      const p = primary.e[field];
      if (p != null) return { val: p, src: primary.fileName };
      for (const x of extractions) {
        if (x === primary) continue;
        const v = x.e[field];
        if (v != null) return { val: v, src: x.fileName };
      }
      return { val: null as TaxReturnExtraction[K], src: null };
    };

    for (const f of [
      "revenue",
      "cost_of_goods_sold",
      "total_expenses",
      "net_profit",
      "depreciation",
      "officer_compensation",
    ] as const) {
      const { val, src } = pickFirst(f);
      if (val != null && src) {
        (agg as unknown as Record<string, number | null | string>)[f] = val as number;
        credit(src, f);
      }
    }

    // Balance sheet: prefer the extraction that explicitly carries Schedule L
    // values (highest precedence: a Schedule L attachment).
    const schedL = extractions.find((x) => x.e.form_type === "Schedule L");
    const balanceSrc =
      schedL ??
      extractions.find((x) => x.e.total_assets != null || x.e.total_liabilities != null);
    if (balanceSrc) {
      if (balanceSrc.e.total_assets != null) {
        agg.total_assets = balanceSrc.e.total_assets;
        credit(balanceSrc.fileName, "total_assets");
      }
      if (balanceSrc.e.total_liabilities != null) {
        agg.total_liabilities = balanceSrc.e.total_liabilities;
        credit(balanceSrc.fileName, "total_liabilities");
      }
    }

    // K-1 supplementation: if no primary net_profit but K-1s present, sum their
    // ordinary income shares as the user's share of pass-through income.
    if (agg.net_profit == null) {
      const k1s = extractions.filter(
        (x) => x.e.form_type === "Schedule K-1" && x.e.k1_ordinary_income != null,
      );
      if (k1s.length > 0) {
        const sum = k1s.reduce((s, x) => s + (x.e.k1_ordinary_income ?? 0), 0);
        agg.net_profit = sum;
        for (const x of k1s) credit(x.fileName, "net_profit");
      }
    }

    // Schedule E backfill for net_profit if still missing
    if (agg.net_profit == null) {
      const schE = extractions.find(
        (x) => x.e.form_type === "Schedule E" && x.e.sch_e_net_income != null,
      );
      if (schE) {
        agg.net_profit = schE.e.sch_e_net_income;
        credit(schE.fileName, "net_profit");
      }
    }

    // Aggregate notes: prefix each with the form type so the user sees source
    const noteLines = extractions
      .filter((x) => x.e.notes && x.e.notes.trim().length > 0)
      .map((x) => `${x.e.form_type}: ${x.e.notes}`);
    agg.notes = noteLines.length > 0 ? noteLines.join(" · ") : null;

    return { ok: true as const, error: null, aggregated: agg };
  });

function emptyAggregated(): TaxReturnAggregated {
  return {
    form_type: "other",
    tax_year: null,
    business_name: null,
    revenue: null,
    cost_of_goods_sold: null,
    total_expenses: null,
    net_profit: null,
    total_assets: null,
    total_liabilities: null,
    depreciation: null,
    officer_compensation: null,
    notes: null,
    sources: [],
  };
}

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

// Mint a fresh short-lived signed URL for a wealth document the caller owns
export const getWealthDocumentSignedUrl = createServerFn({ method: "POST" })
  .inputValidator((input: { path: string }) =>
    z.object({ path: z.string().trim().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const userId = await requireUserId();
      // Path must live under the caller's folder
      if (!data.path.startsWith(`${userId}/`)) {
        return { ok: false as const, url: null, error: "Forbidden" };
      }
      const { data: signed, error } = await supabaseAdmin.storage
        .from("wealth-documents")
        .createSignedUrl(data.path, 60 * 10);
      if (error || !signed?.signedUrl) {
        return { ok: false as const, url: null, error: error?.message ?? "Not found" };
      }
      return { ok: true as const, url: signed.signedUrl, error: null as string | null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load document";
      return { ok: false as const, url: null, error: msg };
    }
  });

// Upload a property hero image to the public property-images bucket and return its public URL
export const uploadPropertyImage = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { fileName: string; base64: string; mimeType: string }) =>
      z
        .object({
          fileName: z.string().trim().min(1).max(255),
          base64: z.string().min(10),
          mimeType: z
            .string()
            .trim()
            .max(80)
            .regex(/^image\/(jpeg|jpg|png|webp|heic|heif)$/i, "Image only"),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const userId = await requireUserId();
      const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${Date.now()}_${safeName}`;
      const buf = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
      const { error } = await supabaseAdmin.storage
        .from("property-images")
        .upload(path, buf, { contentType: data.mimeType, upsert: false });
      if (error) return { ok: false as const, url: null, error: error.message };
      const { data: pub } = supabaseAdmin.storage.from("property-images").getPublicUrl(path);
      return { ok: true as const, url: pub.publicUrl, error: null as string | null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      return { ok: false as const, url: null, error: msg };
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
      await supabaseAdmin.from("aggregated_liabilities").delete().in("account_id", acctIds);
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
