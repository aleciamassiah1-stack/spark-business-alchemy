/**
 * Plaid webhook verification (JWT/ES256).
 * Docs: https://plaid.com/docs/api/webhooks/webhook-verification/
 *
 * Verifies the Plaid-Verification header JWT against Plaid's public key,
 * which is fetched (and cached) from /webhook_verification_key/get.
 */
import { jwtVerify, importJWK, decodeProtectedHeader, type JWK } from "jose";
import { createHash } from "crypto";

const PLAID_BASE = () => {
  const env = (process.env.PLAID_ENV ?? "production").toLowerCase();
  return `https://${env}.plaid.com`;
};

type CachedKey = { jwk: JWK; expiresAt: number };
const keyCache = new Map<string, CachedKey>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function fetchPlaidJwk(kid: string): Promise<JWK | null> {
  const cached = keyCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) return cached.jwk;

  const client_id = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!client_id || !secret) {
    console.error("[plaid-verify] missing PLAID_CLIENT_ID/PLAID_SECRET");
    return null;
  }

  const res = await fetch(`${PLAID_BASE()}/webhook_verification_key/get`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id, secret, key_id: kid }),
  });
  if (!res.ok) {
    console.error("[plaid-verify] key fetch failed", res.status);
    return null;
  }
  const data = (await res.json()) as { key?: JWK & { expired_at?: string | null } };
  if (!data.key) return null;

  keyCache.set(kid, { jwk: data.key, expiresAt: Date.now() + CACHE_TTL_MS });
  return data.key;
}

/**
 * Verify a Plaid webhook request. Returns true if the request is authentic
 * and the body has not been tampered with.
 */
export async function verifyPlaidWebhook(
  signedJwt: string | null,
  rawBody: string,
): Promise<boolean> {
  if (!signedJwt) return false;

  let header: { alg?: string; kid?: string };
  try {
    header = decodeProtectedHeader(signedJwt) as { alg?: string; kid?: string };
  } catch {
    return false;
  }
  if (header.alg !== "ES256" || !header.kid) return false;

  const jwk = await fetchPlaidJwk(header.kid);
  if (!jwk) return false;

  let payload: { request_body_sha256?: string; iat?: number };
  try {
    const key = await importJWK(jwk, "ES256");
    const result = await jwtVerify(signedJwt, key, { algorithms: ["ES256"] });
    payload = result.payload as typeof payload;
  } catch (err) {
    console.warn("[plaid-verify] jwt verify failed", (err as Error).message);
    return false;
  }

  // Reject tokens older than 5 minutes (Plaid recommends checking iat)
  if (!payload.iat || Date.now() / 1000 - payload.iat > 5 * 60) return false;

  // Body integrity: header carries SHA-256 hex of the raw body
  const expected = payload.request_body_sha256;
  if (!expected) return false;
  const actual = createHash("sha256").update(rawBody).digest("hex");
  return expected.toLowerCase() === actual.toLowerCase();
}
