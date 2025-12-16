# PBI-Phase3-DesignSystem: Design System & Component Library

## Problem

The dark theme and layout patterns are now broadly applied across dashboards, but the underlying design tokens and layout helpers are still partially tied to legacy light-theme utilities (e.g. `bg-white`, `text-slate-*` in `src/lib/ui/layout.ts`). This makes it harder to:

- Evolve the visual system without one-off sweeps.
- Keep new dashboards consistent with the canonical patterns.
- Share primitives across Phase 3 UX and future feature work.

## Goals

- Establish `src/lib/ui/layout.ts` as the **single source of truth** for page, section, card, and typography primitives.
- Ensure all exported layout/typography helpers map to **dark-theme semantic tokens** (e.g. `card`, `bg-primary`, `bg-secondary`, `text-primary`, `text-secondary`, `text-tertiary`).
- Reduce direct usage of raw Tailwind neutrals (`bg-white`, `text-slate-*`, `border-slate-*`) in favor of semantic tokens.

## In Scope (Phase 3 – Slice 1)

- Update `CONTAINER_CLASSES.card*` to use the shared `card` primitive and dark-theme border/background tokens.
- Update `TEXT_CLASSES` to use semantic text classes instead of `text-slate-*`.
- Keep grid/breakpoint utilities and chart sizing as-is (layout only, no behavioral change).
- Avoid touching individual page components beyond what is required to keep them compiling and visually sensible.

## Out of Scope (for Slice 1)

- Refactoring every page to use `TEXT_CLASSES` and card helpers consistently (will be done in later slices).
- Introducing new complex components (tab systems, sidebars, wizards).
- Any data or API behavior changes.

## Success Criteria

- `src/lib/ui/layout.ts` no longer references `bg-white` or `text-slate-*` in card/typography helpers.
- RealTime and Analytics dashboards render headings/body text with semantic `text-primary` / `text-secondary` while remaining legible in dark theme.
- No TypeScript or runtime errors introduced by the refactor.

## Verification

- Manual smoke test of:
  - Real-time dashboard main view (check headings, body text, cards).
  - Analytics & Trends dashboard (check section headings and body text).
- Optional: quick visual check of any component importing `CONTAINER_CLASSES` or `TEXT_CLASSES` (About, EnergyData, InvestmentCards).
