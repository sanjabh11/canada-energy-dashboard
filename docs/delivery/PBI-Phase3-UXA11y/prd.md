# PBI-Phase3-UXA11y: Interaction & Accessibility Polish

## Problem

The portal now has a cohesive dark theme, but some interaction and accessibility details are still ad hoc:

- Keyboard focus and tab order are not consistently optimized across primary nav and hero areas.
- Some interactive elements lack clear focus states or ARIA labelling.
- Screen-reader and keyboard-only flows are not yet treated as first-class journeys.

## Goals

- Make primary navigation and hero areas feel "keyboard first" and screen-reader friendly.
- Establish simple, reusable patterns for focus states, aria labels, and landmarks that can be reused across dashboards.
- Reduce the gap between the visual design system and interaction/a11y behavior.

## In Scope (Phase 3 – Slice 1)

- Focus on **primary entry surfaces** only (e.g. main dashboard shell / Energy Data shell):
  - Ensure primary navigation and hero CTAs have sensible tab order.
  - Add or refine `aria-label`s where necessary.
  - Ensure there are visible focus indicators that meet contrast guidelines.
- Avoid large structural rewrites; work within existing component structure.

## Out of Scope (for Slice 1)

- Full WCAG audit of every dashboard.
- Refactors that significantly change routing or state management.
- Complex new components (e.g. custom focus traps, modal systems) beyond small targeted fixes.

## Success Criteria

- Keyboard user can:
  - Reach primary navigation controls and hero CTAs in a logical order.
  - See clear focus outlines on interactive elements.
  - Understand key actions via screen reader labels.
- No regressions in mouse/gesture interactions.

## Verification

- Manual keyboard-only walkthrough on the main dashboard shell and Energy Data shell.
- Quick screen-reader smoke test (e.g. VoiceOver or NVDA) for primary nav and hero sections.
