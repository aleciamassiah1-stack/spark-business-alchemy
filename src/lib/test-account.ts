import { useAuth } from "@/lib/auth-context";

/** Email of the single test account that retains demo "Whitfield" mock data. */
export const TEST_ACCOUNT_EMAIL = "angeliequep@gmail.com";

/** True when the signed-in user is the designated test account. */
export function useIsTestAccount(): boolean {
  const { user } = useAuth();
  return (user?.email ?? "").toLowerCase() === TEST_ACCOUNT_EMAIL;
}

/** Best-effort display name from auth metadata, falling back to the email local-part. */
export function displayNameFromUser(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null): string {
  if (!user) return "";
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const full =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    "";
  if (full) return full;
  const email = user.email ?? "";
  const local = email.split("@")[0] ?? "";
  if (!local) return "";
  // Title-case "jane.doe" / "jane_doe" -> "Jane Doe"
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

/** Two-letter initials for an avatar bubble. */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
