# Æther — Full Desktop Dashboard View

Goal: make the app look and feel like a true desktop wealth dashboard at ≥ md, while preserving the existing mobile experience on small screens. One responsive codebase, no separate mobile/desktop forks.

## 1. New responsive shell

Create `src/components/AppShell.tsx` that replaces `MobileShell` for authenticated pages.

- Mobile (< md): renders today's layout — `max-w-[430px]`, title block, `BottomNav`, `LegalFooter`.
- Desktop (≥ md): renders a two-column layout
  - Left: persistent `AppSidebar` (shadcn `Sidebar`, `collapsible="icon"`) with Æther wordmark, profile switcher, primary nav (Home, Portfolio, Business, Legacy, Family, Connections, Notifications, More) and a secondary group (Pricing, Support, Sign out).
  - Right: `SidebarInset` with a slim top bar (page title, search, profile menu, sidebar trigger) and a centered `max-w-[1400px]` content area with generous padding.
- Same `title` / `subtitle` props as `MobileShell` so existing pages don't need rewrites.
- Uses `var(--sidebar-width)` syntax to avoid the Tailwind 4 sidebar overlap bug.
- `BottomNav` only renders below `md`; sidebar only renders at `md+`.

Add `src/components/AppSidebar.tsx` for the sidebar contents using `useRouterState` to highlight the active route.

## 2. Page migration

Swap `MobileShell` → `AppShell` in every authenticated route:
`portfolio.tsx`, `business.tsx`, `legacy.tsx`, `family.tsx`, `family-office.tsx`, `household.tsx`, `connections.tsx`, `beneficiaries.tsx`, `notifications.tsx`, `more.tsx`, `profile.tsx`, `preferences.tsx`, `timeline.tsx`, `intake.tsx`, `support.tsx`, `launch.tsx`, `eligibility.tsx`, `pricing.tsx`, `protect.tsx`, admin pages.

No business-logic changes. Just the wrapper.

## 3. Content widening at desktop

Inside pages, the existing single-column card stacks currently inherit `max-w-[430px]`. After the shell change they will sit in a wide area, so apply light responsive tweaks where the page is clearly a dashboard:

- `portfolio.tsx`: hero card + Financial Health Score side-by-side on `lg`; holdings list becomes a two-column grid on `xl`.
- `business.tsx`: KPI cards row uses `md:grid-cols-3`, body splits into main column + right rail on `lg`.
- `legacy.tsx`, `family.tsx`, `connections.tsx`: cards flow into `md:grid-cols-2 xl:grid-cols-3`.
- Other pages: keep single column but allow up to `max-w-3xl` so they don't look stranded.

All edits are presentation-only (Tailwind classes / wrapper grids). No data or logic changes.

## 4. Marketing site desktop pass

`MarketingHome.tsx` and the seven `portals.*.tsx` pages already use desktop-friendly grids but are tuned around a narrower hero. Light touch:

- Bump hero/section `max-w` from current value to `max-w-7xl` and increase horizontal padding at `lg`.
- Audience and partner card grids use `lg:grid-cols-4` so all four tiles sit on one row at desktop.
- Sticky top nav gets right-aligned secondary links (Pricing, Sign in, Request Demo) at `md+`.
- No copy changes, no new sections.

## 5. Out of scope

- No new features, data sources, or routes.
- No changes to auth, RLS, server functions, or backend.
- No redesign of individual card visuals beyond layout grids.

## Technical notes

- New files: `src/components/AppShell.tsx`, `src/components/AppSidebar.tsx`.
- Edited files: every authenticated route + `MarketingHome.tsx` + portal routes (className-only edits).
- Uses existing shadcn `Sidebar` primitives in `src/components/ui/sidebar.tsx`; no new dependencies.
- Tailwind class fix: always `w-[var(--sidebar-width)]`, never `w-[--sidebar-width]`.
- `MobileShell` stays in place as a thin re-export of `AppShell` so any unmigrated import keeps working during the swap.
