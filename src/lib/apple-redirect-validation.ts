/**
 * Runtime validation that the Apple OAuth redirect URL used by this app
 * matches an origin that the managed Lovable Cloud OAuth client has been
 * configured to allow for "Sign in with Apple".
 *
 * Apple rejects unknown redirect URLs with `invalid_request` ("Invalid client
 * id or web redirect url."), which is a confusing error for end-users. This
 * helper surfaces a clear, actionable message *before* we hand off to Apple.
 *
 * The allowlist mirrors the redirect URLs registered with the Lovable Cloud
 * managed Apple OAuth client. Update it whenever a new custom domain is added
 * to the project and registered with the OAuth client.
 */

// Origins registered with the managed Apple OAuth client for this project.
// Wildcards are matched via `endsWith` on the suffix after `*`.
const ALLOWED_APPLE_REDIRECT_ORIGINS: ReadonlyArray<string> = [
  "https://aetherwealth.co",
  "https://www.aetherwealth.co",
  "https://spark-business-alchemy.lovable.app",
  // Lovable preview / sandbox subdomains (any preview build for this project).
  "*.lovable.app",
  "*.lovableproject.com",
];

function originMatches(origin: string, pattern: string): boolean {
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1); // ".lovable.app"
    try {
      const host = new URL(origin).hostname;
      return host.endsWith(suffix.slice(1)) || host === suffix.slice(2);
    } catch {
      return false;
    }
  }
  return origin === pattern;
}

export class AppleRedirectMismatchError extends Error {
  constructor(public readonly origin: string) {
    super(
      `Sign in with Apple isn't available on ${origin}. ` +
        `This domain isn't registered with the Apple OAuth client. ` +
        `Open the app on aetherwealth.co (or a registered Lovable URL) and try again.`,
    );
    this.name = "AppleRedirectMismatchError";
  }
}

/**
 * Throws `AppleRedirectMismatchError` if `redirectUri`'s origin isn't in the
 * allowlist of origins registered with the managed Apple OAuth client.
 */
export function validateAppleRedirectUri(redirectUri: string): void {
  let origin: string;
  try {
    origin = new URL(redirectUri).origin;
  } catch {
    throw new AppleRedirectMismatchError(redirectUri);
  }

  const allowed = ALLOWED_APPLE_REDIRECT_ORIGINS.some((pattern) =>
    originMatches(origin, pattern),
  );

  if (!allowed) {
    throw new AppleRedirectMismatchError(origin);
  }
}
