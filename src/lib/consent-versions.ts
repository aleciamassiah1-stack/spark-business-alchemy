// Centralized consent versions. Bump these whenever the underlying policy
// language materially changes; the consent audit trail records which version
// the user accepted at each point in time.
export const CONSENT_VERSIONS = {
  terms: "2026-04-23",
  privacy: "2026-05-08",
  plaid_disclosure: "2026-05-08",
} as const;

export type ConsentKind = keyof typeof CONSENT_VERSIONS;

const STORAGE_PREFIX = "aether.consent.";

export function hasLocalConsent(kind: ConsentKind): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${kind}`) === CONSENT_VERSIONS[kind];
  } catch {
    return false;
  }
}

export function markLocalConsent(kind: ConsentKind): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${kind}`, CONSENT_VERSIONS[kind]);
  } catch {
    // ignore (private mode etc.)
  }
}
