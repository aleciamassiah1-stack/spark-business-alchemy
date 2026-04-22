/**
 * Server-side guard tests for admin self-deletion protection.
 *
 * Verifies that adminScheduleAccountDeletion / adminCancelAccountDeletion
 * throw with a clear, user-facing message when an admin targets their own
 * user_id, and never touch the database in that case.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ID = "22222222-2222-2222-2222-222222222222";

// Mock auth-helper so requireUserId() returns our admin id without needing
// an HTTP request context.
vi.mock("@/integrations/supabase/auth-helper", () => ({
  getCurrentUserId: vi.fn(async () => ADMIN_ID),
  requireUserId: vi.fn(async () => ADMIN_ID),
}));

// Mock the admin Supabase client. requireAdmin() does a select on user_roles;
// every other DB call should NOT happen on the self-deletion path, so we make
// upsert/delete throw if reached.
const upsertSpy = vi.fn(() => {
  throw new Error("DB upsert should not be called for self-deletion");
});
const deleteEqSpy = vi.fn(() => {
  throw new Error("DB delete should not be called for self-cancellation");
});
const getUserByIdSpy = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => {
  const adminRoleRow = { role: "admin" };
  return {
    supabaseAdmin: {
      from: (table: string) => {
        if (table === "user_roles") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({ maybeSingle: async () => ({ data: adminRoleRow }) }),
              }),
            }),
          };
        }
        if (table === "pending_account_deletions") {
          return {
            upsert: upsertSpy,
            delete: () => ({ eq: deleteEqSpy }),
          };
        }
        return {};
      },
      auth: {
        admin: {
          getUserById: (...args: unknown[]) => getUserByIdSpy(...args),
        },
      },
    },
  };
});

import {
  adminScheduleAccountDeletion,
  adminCancelAccountDeletion,
} from "@/lib/access.functions";

beforeEach(() => {
  upsertSpy.mockClear();
  deleteEqSpy.mockClear();
  getUserByIdSpy.mockReset();
});

describe("admin self-deletion server guards", () => {
  it("schedule: rejects when admin targets themselves with the exact UI message", async () => {
    await expect(
      adminScheduleAccountDeletion({ data: { userId: ADMIN_ID } }),
    ).rejects.toThrow("You cannot schedule deletion of your own admin account");

    expect(upsertSpy).not.toHaveBeenCalled();
    expect(getUserByIdSpy).not.toHaveBeenCalled();
  });

  it("cancel: rejects when admin targets themselves with the exact UI message", async () => {
    await expect(
      adminCancelAccountDeletion({ data: { userId: ADMIN_ID } }),
    ).rejects.toThrow("You cannot cancel deletion of your own admin account");

    expect(deleteEqSpy).not.toHaveBeenCalled();
  });

  it("schedule: proceeds past the self-check for a different user (DB is reached)", async () => {
    // We don't assert the exact return shape here (the createServerFn
    // wrapper may envelope it). We only need to prove the guard does NOT
    // short-circuit for a different user — i.e., the auth lookup runs.
    getUserByIdSpy.mockResolvedValueOnce({
      data: { user: { email: "victim@example.com" } },
      error: null,
    });
    upsertSpy.mockImplementationOnce(async () => ({ error: null }));

    await adminScheduleAccountDeletion({ data: { userId: OTHER_ID } }).catch(() => {
      // Ignore wrapper/envelope errors — we only care that the guard let it through.
    });

    expect(getUserByIdSpy).toHaveBeenCalledTimes(1);
  });
});
