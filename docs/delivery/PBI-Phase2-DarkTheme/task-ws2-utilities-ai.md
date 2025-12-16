# Task: Workstream 2 - Utilities & AI Surfaces

**ID:** PBI-Phase2-DarkTheme-Task-WS2
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** InProgress
**Owner:** AI_Agent

## 1. Context
System utilities and AI components currently use legacy light-theme styles (`bg-white`, `text-gray-900`). This task focuses on converting these high-visibility components to the standard dark theme (`card`, `bg-primary`, semantic text).

## 2. Affected Files
- `src/components/ErrorBoundary.tsx`
- `src/components/DataQualityBadge.tsx`
- `src/components/OpsHealthPanel.tsx`
- `src/components/EnergyAdvisorChat.tsx`
- `src/components/InnovationSearch.tsx` (if applicable)
- `src/lib/config.ts` (Import cleanup)

## 3. Proposed Changes

### A. Utilities
1.  **ErrorBoundary.tsx**
    *   Replace `bg-white` container with `card`.
    *   Replace `bg-slate-50` page background with `bg-primary`.
    *   Update text colors to `text-primary/secondary`.

2.  **DataQualityBadge.tsx**
    *   Replace `bg-white` with `bg-secondary` or `card` variant.
    *   Ensure it nests correctly inside other dark cards.

3.  **OpsHealthPanel.tsx**
    *   Convert `border-2` light tiles to `bg-secondary` or `card-metric` style.
    *   Remove `bg-gray-50` backgrounds.

### B. AI Surfaces
1.  **EnergyAdvisorChat.tsx**
    *   Convert main container to `card` (dark).
    *   Update message bubbles:
        *   User: Keep `bg-electric` (or standard user color).
        *   AI: Switch from `bg-gray-100` to `bg-secondary` / `card`.
    *   Input area: Dark background + proper borders.
    *   **Performance:** Resolve `config.ts` import warning (dynamic vs static).

## 4. Acceptance Criteria
- [ ] `ErrorBoundary` renders a dark card on a dark page.
- [ ] `DataQualityBadge` is legible on dark backgrounds.
- [ ] `OpsHealthPanel` aligns with `RealTimeDashboard` aesthetics.
- [ ] `EnergyAdvisorChat` looks integrated (no white backgrounds).
- [ ] No "dynamic import will not move module" warning for `config.ts` during build.

## 5. Test Plan
1.  **Visual Check:**
    *   Manually verify `EnergyAdvisorChat` (via `/advisor` or embedded).
    *   Trigger an error to view `ErrorBoundary`.
    *   Inspect `DataQualityBadge` on `RenewableOptimizationHub`.
2.  **Build Check:**
    *   Run `npm run build` to confirm warning removal.
