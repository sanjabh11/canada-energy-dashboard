# PRD: Phase 2 Dark Theme Finalization

## 1. Problem Statement
Phase 1 successfully converted P0/P1 dashboards to a dark theme. However, system utilities (Error boundaries, badges), AI surfaces (Chat, Search), and secondary dashboards remain inconsistent (light theme or mixed). This creates a disjointed user experience.

## 2. Goals
- **Visual Consistency:** Ensure all application surfaces (primary, secondary, utility) share the same dark aesthetic.
- **System Hardening:** Replace ad-hoc styles with design tokens (`card`, `text-primary`, etc.).
- **Performance:** Resolve bundling warnings related to shared config usage in AI components.

## 3. Scope
### In Scope
- **Workstream 1:** Design Tokens & Primitives.
- **Workstream 2:** Utilities & AI Surfaces (Error Boundary, DataQualityBadge, OpsHealthPanel, EnergyAdvisorChat, InnovationSearch).
- **Workstream 3:** Secondary Dashboards (Tiered rollout).
- **Workstream 4:** Dense Tables & Trackers.
- **Workstream 5:** Performance/Bundling hygiene.

### Out of Scope
- Complete redesign of legacy prototypes (only shell updates required).
- New feature development.

## 4. Success Metrics
- Zero instances of `bg-white` on root containers in target components.
- `npm run build` completes without dynamic/static import warnings for `config.ts`.
- Visual QA passes on all modified routes.
