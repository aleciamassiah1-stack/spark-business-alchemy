import { vi } from "vitest";
import type { Session, User } from "@supabase/supabase-js";

type AuthListener = (event: string, session: Session | null) => void;

/**
 * Mock Supabase client that captures auth listeners and lets tests drive
 * `signUp` / `signInWithPassword` outcomes. Only the surface used by
 * src/lib/auth-context.tsx and src/components/Onboarding.tsx is implemented.
 */
export function createMockSupabase() {
  const listeners: AuthListener[] = [];
  let session: Session | null = null;

  const fakeUser = (email: string, fullName: string, phone: string): User =>
    ({
      id: "user-test-id",
      aud: "authenticated",
      email,
      app_metadata: {},
      user_metadata: { full_name: fullName, phone },
      created_at: new Date().toISOString(),
    }) as unknown as User;

  const fakeSession = (user: User): Session =>
    ({
      access_token: "fake.jwt",
      refresh_token: "fake.refresh",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user,
    }) as unknown as Session;

  const setSession = (next: Session | null) => {
    session = next;
    listeners.forEach((l) => l(next ? "SIGNED_IN" : "SIGNED_OUT", next));
  };

  const auth = {
    onAuthStateChange: vi.fn((cb: AuthListener) => {
      listeners.push(cb);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = listeners.indexOf(cb);
              if (idx >= 0) listeners.splice(idx, 1);
            },
          },
        },
      };
    }),
    getSession: vi.fn(async () => ({ data: { session } })),
    signUp: vi.fn(
      async ({
        email,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: { full_name?: string; phone?: string } };
      }) => {
        const user = fakeUser(
          email,
          options?.data?.full_name ?? "",
          options?.data?.phone ?? "",
        );
        const s = fakeSession(user);
        setSession(s);
        return { data: { user, session: s }, error: null };
      },
    ),
    signInWithPassword: vi.fn(
      async ({ email, password }: { email: string; password: string }) => {
        if (password === "wrong") {
          return { data: { user: null, session: null }, error: { message: "Invalid credentials" } };
        }
        const user = fakeUser(email, "Returning User", "+15555550100");
        const s = fakeSession(user);
        setSession(s);
        return { data: { user, session: s }, error: null };
      },
    ),
    signOut: vi.fn(async () => {
      setSession(null);
      return { error: null };
    }),
  };

  return {
    supabase: { auth },
    helpers: {
      setSession,
      currentSession: () => session,
      reset: () => {
        listeners.length = 0;
        session = null;
      },
    },
  };
}
