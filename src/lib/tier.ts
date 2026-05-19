// Single source of truth for subscription tiers.
//
// Tier is derived from the Stripe price_id (which is stable across sandbox/live
// — see lovable_external_id in the webhook). Admins and manual-access grants
// default to the highest tier ("family") so internal accounts always see the
// full surface area.

export type Tier = "essential" | "private" | "family";

export const PRICE_TO_TIER: Record<string, Tier> = {
  essential_monthly: "essential",
  essential_annual: "essential",
  private_monthly: "private",
  private_annual: "private",
  family_monthly: "family",
  family_annual: "family",
  family_monthly_v2: "family",
  family_annual_v2: "family",
};

export type TierLimits = {
  /** Max linked financial institutions (Plaid items). null = unlimited. */
  maxInstitutions: number | null;
  /** Max manual family-vault members. 0 = feature locked. null = unlimited. */
  maxFamilyMembers: number | null;
};

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  essential: { maxInstitutions: 3, maxFamilyMembers: 0 },
  private: { maxInstitutions: null, maxFamilyMembers: 5 },
  family: { maxInstitutions: null, maxFamilyMembers: null },
};

export function tierFromPriceId(priceId: string | null | undefined): Tier | null {
  if (!priceId) return null;
  return PRICE_TO_TIER[priceId] ?? null;
}

export function limitsForTier(tier: Tier | null): TierLimits {
  // Locked-out users (no tier) see the same caps as Essential, just with
  // access denied at a higher layer. UI components reading `limits` directly
  // get a sensible fallback rather than `null` everywhere.
  if (!tier) return TIER_LIMITS.essential;
  return TIER_LIMITS[tier];
}

export const TIER_LABEL: Record<Tier, string> = {
  essential: "Essential",
  private: "Private",
  family: "Family Office",
};
