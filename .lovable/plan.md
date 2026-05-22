## Goal

Today, the **Succession & Exit** section on `/business` is two compact cards (`SuccessionCard`, `ExitCard`) that expand into raw form fields (status dropdown, free-text "Attorney", manual 0–100 readiness slider, target valuation input, ISO date picker, strategy enum). For most business owners — who have never written a succession plan — this is intimidating, jargon-heavy, and gives no sense of *what to do next*. The readiness score is also self-reported, so it's meaningless.

This plan turns the section into a guided, opinionated planning experience that any owner can complete in 5 minutes, understand at a glance later, and trust.

## What the customer sees (new experience)

### 1. One unified "Legacy & Exit" hub card (replaces the two side-by-side cards)

A single hero card at the top of the section with:

- **Plain-English headline**: "Your business is **64% ready** for a smooth transition" (auto-calculated, not self-rated).
- **Two progress rings** side by side: *Succession readiness* and *Exit readiness*, each derived from a checklist (see Technical section).
- **One-line "what's next"**: e.g. *"Next step: Identify a successor"* with a CTA button that opens the relevant wizard step directly.
- **Status pill**: "Not started" / "In progress" / "Plan complete".

### 2. "Plan your transition" — a 5-step guided wizard

Replaces the bare form fields. Opens as a bottom sheet/modal with a progress bar across the top. Each step is one screen with **one question, plain language, and a short "Why this matters" tooltip**:

```text
Step 1 — When do you want to step away?
  ◯ Within 2 years   ◯ 3–5 years   ◯ 5–10 years   ◯ 10+ years   ◯ Not sure yet
  → sets targetDate

Step 2 — How do you imagine exiting?
  [Card pickers, each with a 1-line description + icon]
    • Sell to another company (M&A)
    • Pass to family (Family Transfer)
    • Sell to your team (MBO)
    • Take it public (IPO)
    • Still deciding
  → sets strategy

Step 3 — What's your target sale price?
  [Slider + input, pre-filled with current valuation × suggested multiple based on strategy]
  Helper: "Most M&A exits in your industry sell for 3–5× current valuation."
  → sets targetValuation

Step 4 — Who would take over if you stepped away tomorrow?
  • Successor name (optional)
  • Their current role
  • [ ] I have a signed buy-sell agreement
  • [ ] I have an estate/business attorney  → name field appears
  → sets successorName, successorRole, buySellSigned, attorney

Step 5 — Your transition plan
  Recap screen showing every answer, with edit buttons,
  the auto-calculated readiness, and a "Save plan" button.
  Also surfaces 2–3 personalized next actions:
    □ Draft a buy-sell agreement   (links to Documents → Buy-Sell)
    □ Upload your succession plan  (links to Documents)
    □ Talk to a concierge advisor  (links to /support)
```

The wizard is **resumable** — closing mid-flow saves progress, and the hub card shows "Resume plan (3 of 5)".

### 3. Collapsed view (after plan is saved)

The hub card becomes a clean summary:

```text
LEGACY & EXIT PLAN                                   [Edit plan]
─────────────────────────────────────────────────────
Exit in ~5 years  ·  Sell to another company
Target: $12.4M    ·  Successor: Catherine Whitfield

Succession readiness  ●●●●●○○  71%
Exit readiness        ●●●●○○○  52%

Next: Sign buy-sell agreement →
```

Tapping anywhere reopens the wizard at Step 5 (recap), not raw form fields.

### 4. "Why this matters" education

A small "?" icon next to the section title opens a one-screen explainer in plain English — what succession planning is, why owners regret skipping it, and that Aether keeps everything private. Removes the intimidation factor for first-time planners.

## Why this is better than today

| Today | New |
|---|---|
| Two cards with overlapping concepts | One hub, one plan |
| Self-rated readiness slider (meaningless) | Auto-calculated from real inputs |
| Raw form fields, finance jargon | Plain-English questions, one at a time |
| No sense of "what now?" | Always shows next action |
| Owner has to know what M&A / MBO / buy-sell mean | Each option has a 1-line description |
| Date as ISO picker | "Within 2 years" style chips |

## Technical section

**Files to change**
- `src/routes/business.tsx` — replace `SuccessionCard` and `ExitCard` (lines 1436–1670) with a new `LegacyExitHubCard` and a `TransitionPlanWizard` component. Update line 604–607 to render the new hub.
- `src/lib/business-store.ts` — add helpers:
  - `computeSuccessionReadiness(state): number` — derived from: successor named (25), role set (10), buy-sell signed (30), attorney named (15), status=Complete (20).
  - `computeExitReadiness(state): number` — derived from: targetDate set (20), strategy chosen (15), targetValuation set & > current (15), succession readiness ≥ 50 (20), valuation growth trend > 0 (10), key docs uploaded — Operating Agreement + Tax Return + Buy-Sell (20).
  - `nextTransitionAction(state): { label, target }` — picks first missing item in priority order.
  - Add `wizardProgress?: { step: number; completed: boolean }` to `BusinessState['succession']` (backward compatible, optional).
  - Keep `readinessScore` field for migration, but mark deprecated; computed values take precedence in UI.
- New file `src/components/TransitionPlanWizard.tsx` — bottom sheet wizard with 5 steps, uses existing `motion`/`AnimatePresence` patterns already in `business.tsx`, reuses `LuxCard`, `InlineField`, and the project's `luxe-input` styles. No new deps.
- New file `src/components/ReadinessRing.tsx` — small SVG ring component (no new deps).

**Behavior**
- Wizard state lives in component state; on each step's "Continue" it persists to the store via the existing `update()` helper so progress survives close.
- "Edit plan" reopens wizard at the recap step; individual "Edit" buttons jump to that step.
- All copy in plain English; finance terms get a one-line definition inline (e.g. "Buy-sell agreement — a contract that decides what happens to your share of the business if you exit, retire, or pass away").
- Demo seed (`seedDemoBusiness`) already populates these fields, so the new hub will render fully populated for the test account immediately.

**Out of scope (can be follow-ups)**
- AI-suggested successor based on org chart.
- Auto-fill target valuation from industry benchmarks (would need a data source).
- E-signature flow for buy-sell agreements.
- Server-side persistence (currently localStorage; matches the rest of the Business workspace).

## Visual style
Stays inside the existing dark luxury system — `LuxCard`, `gradient-violet`, `label-mono`, `font-serif` headings, `tabular-nums` for numbers. No new color tokens. Rings use existing `--primary` and `--gold` tokens.
