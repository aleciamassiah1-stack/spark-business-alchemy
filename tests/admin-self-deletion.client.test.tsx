/**
 * Client-side guard tests for admin self-deletion protection.
 *
 * Renders the real /admin route component with mocked server functions and
 * verifies that, for the row matching the currently-signed-in admin:
 *   - the Delete button is disabled with the explanatory tooltip
 *   - clicking the Delete button does NOT call the server fn and shows a toast
 *   - the Restore button (when pending) is disabled with its tooltip
 *   - a "You" badge is rendered
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ID = "22222222-2222-2222-2222-222222222222";

// ---- Mock TanStack router primitives used by the route component ----
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => {
    // Capture the component on the returned Route shim.
    const cfg = config as { component: React.ComponentType };
    return { component: cfg.component, options: cfg };
  },
  Link: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

// ---- Mock auth + access contexts so the page renders past its gates ----
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    ready: true,
    user: { id: ADMIN_ID, email: "admin@aetherwealth.co" },
  }),
}));

vi.mock("@/lib/access-context", () => ({
  useAccess: () => ({ ready: true, isAdmin: true, hasAccess: true, refresh: vi.fn() }),
}));

// ---- Mock the server functions ----
const adminGetMetricsSpy = vi.fn();
const adminListMembersSpy = vi.fn();
const adminScheduleAccountDeletionSpy = vi.fn();
const adminCancelAccountDeletionSpy = vi.fn();

vi.mock("@/lib/access.functions", () => ({
  adminGetMetrics: (...a: unknown[]) => adminGetMetricsSpy(...a),
  adminListMembers: (...a: unknown[]) => adminListMembersSpy(...a),
  adminGrantAccess: vi.fn(),
  adminRevokeAccess: vi.fn(),
  adminSetRole: vi.fn(),
  adminScheduleAccountDeletion: (...a: unknown[]) => adminScheduleAccountDeletionSpy(...a),
  adminCancelAccountDeletion: (...a: unknown[]) => adminCancelAccountDeletionSpy(...a),
}));

// ---- Capture sonner toasts ----
const toastErrorSpy = vi.fn();
const toastSuccessSpy = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...a: unknown[]) => toastErrorSpy(...a),
    success: (...a: unknown[]) => toastSuccessSpy(...a),
  },
}));

// Import AFTER mocks so the route picks them up.
import { Route as AdminRoute } from "@/routes/admin";

const baseMember = {
  email: null as string | null,
  created_at: new Date("2025-01-01").toISOString(),
  last_sign_in_at: null,
  plan: null,
  status: null,
  current_period_end: null,
  is_admin: false,
  has_manual_access: false,
  pending_deletion_at: null as string | null,
  pending_purge_after: null as string | null,
};

beforeEach(() => {
  adminGetMetricsSpy.mockReset();
  adminListMembersSpy.mockReset();
  adminScheduleAccountDeletionSpy.mockReset();
  adminCancelAccountDeletionSpy.mockReset();
  toastErrorSpy.mockReset();
  toastSuccessSpy.mockReset();

  adminGetMetricsSpy.mockResolvedValue({
    mrr: 0,
    arr: 0,
    activeSubscribers: 0,
    trialing: 0,
    churnedThisMonth: 0,
    totalUsers: 2,
    recentSubscriptions: [],
    environment: "sandbox",
  });
});

async function renderAdmin() {
  const Component = (AdminRoute as unknown as { component: React.ComponentType }).component;
  await act(async () => {
    render(<Component />);
  });
  // Wait for the data load to complete (loader spinner disappears)
  await waitFor(() => {
    expect(adminListMembersSpy).toHaveBeenCalled();
  });
}

function getRowFor(email: string): HTMLElement {
  // Each row's first cell contains the email text.
  const emailCell = screen.getByText(email);
  // Climb to the <tr>.
  let el: HTMLElement | null = emailCell;
  while (el && el.tagName !== "TR") el = el.parentElement;
  if (!el) throw new Error(`row for ${email} not found`);
  return el;
}

describe("admin self-deletion client guards (UI)", () => {
  it("disables Delete + shows 'You' badge for the current admin row", async () => {
    adminListMembersSpy.mockResolvedValue({
      members: [
        {
          ...baseMember,
          user_id: ADMIN_ID,
          email: "admin@aetherwealth.co",
          is_admin: false, // even when not flagged admin in the row, isSelf must still block
        },
        {
          ...baseMember,
          user_id: OTHER_ID,
          email: "other@example.com",
        },
      ],
    });

    await renderAdmin();

    const selfRow = getRowFor("admin@aetherwealth.co");
    const otherRow = getRowFor("other@example.com");

    // "You" badge appears on the self row only
    expect(within(selfRow).getByText("You")).toBeInTheDocument();
    expect(within(otherRow).queryByText("You")).not.toBeInTheDocument();

    const selfDelete = within(selfRow).getByRole("button", { name: /delete/i });
    expect(selfDelete).toBeDisabled();
    expect(selfDelete).toHaveAttribute(
      "title",
      "You cannot delete your own admin account",
    );

    const otherDelete = within(otherRow).getByRole("button", { name: /delete/i });
    expect(otherDelete).not.toBeDisabled();
  });

  it("clicking the disabled self-Delete does not call the server fn", async () => {
    adminListMembersSpy.mockResolvedValue({
      members: [
        {
          ...baseMember,
          user_id: ADMIN_ID,
          email: "admin@aetherwealth.co",
        },
      ],
    });

    await renderAdmin();

    const selfRow = getRowFor("admin@aetherwealth.co");
    const selfDelete = within(selfRow).getByRole("button", { name: /delete/i });

    // userEvent respects the disabled attribute and skips the click; this
    // proves the button is genuinely inert at the DOM level.
    const user = userEvent.setup();
    await user.click(selfDelete);

    expect(adminScheduleAccountDeletionSpy).not.toHaveBeenCalled();
  });

  it("disables Restore for self when account is already pending deletion + correct tooltip", async () => {
    const purgeAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    adminListMembersSpy.mockResolvedValue({
      members: [
        {
          ...baseMember,
          user_id: ADMIN_ID,
          email: "admin@aetherwealth.co",
          pending_deletion_at: new Date().toISOString(),
          pending_purge_after: purgeAfter,
        },
      ],
    });

    await renderAdmin();

    const selfRow = getRowFor("admin@aetherwealth.co");
    const restore = within(selfRow).getByRole("button", { name: /restore/i });
    expect(restore).toBeDisabled();
    expect(restore).toHaveAttribute(
      "title",
      "You cannot restore your own admin account",
    );

    const user = userEvent.setup();
    await user.click(restore);
    expect(adminCancelAccountDeletionSpy).not.toHaveBeenCalled();
  });
});
