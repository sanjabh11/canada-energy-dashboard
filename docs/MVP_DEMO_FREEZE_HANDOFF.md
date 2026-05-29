# CEIP MVP Demo Freeze Handoff

> **Last updated:** April 30, 2026
> **Frozen demo host:** `https://canada-energy.netlify.app`

## Summary

- The CEIP MVP is frozen for sales-demo rehearsal on the existing Netlify host.
- No further bridge, burner-domain, VPS, London Hydro onboarding, Layer A/B/C evidence, or Supabase MCP work is in scope for this demo.
- The remaining demo risks are operator-side only:
  - stale browser-origin state
  - narrative drift / overclaim
- This handoff is grounded in:
  - [Top20.md](./Top20.md)
  - [UTILITYAPI_ADAPTER_BACKLOG.md](./UTILITYAPI_ADAPTER_BACKLOG.md)
  - [UTILITY_CONNECTOR_RUNTIME_VALIDATION.md](./UTILITY_CONNECTOR_RUNTIME_VALIDATION.md)

## Operator Demo Runbook

### Prep

1. Open a brand new Incognito or Private window.
2. Do not use your daily browser profile.
3. Pre-warm these five tabs in this exact order:
   - `https://canada-energy.netlify.app/utility-demand-forecast`
   - `https://canada-energy.netlify.app/regulatory-filing`
   - `https://canada-energy.netlify.app/utility-security`
   - `https://canada-energy.netlify.app/utilityapi-demo`
   - `https://canada-energy.netlify.app/forecast-benchmarking`
4. If any page looks stale or noisy, close the entire private window and reopen from scratch. Do not salvage an old tab.

### Presentation Track

1. `Tab 1 /utility-demand-forecast`
   - Message: `This is a filing-ready utility planning workflow, not a generic dashboard.`
   - Focus on the planning lane, scenario overlays, and export orientation.

2. `Tab 2 /regulatory-filing`
   - Message: `This reduces the manual conversion burden for OEB Chapter 5 DSP and AUC Rule 005 style submissions.`
   - Focus on packaging forecasts and asset evidence into reviewer-ready output.

3. `Tab 3 /utility-security`
   - Message: `This lowers procurement friction by making retention, revocation, custody, and review boundaries explicit.`
   - Use this page proactively before the buyer raises data-trust objections.

4. `Tab 4 /utilityapi-demo`
   - Click `Continue with Fixture Replay`.
   - Do not use live login in the customer demo.
   - Show:
     - `Status: replayed`
     - `Intervals: 48`
     - peak demand
     - average demand
     - `AI Upsampling Active: 60m -> 15m`
     - forecast preview
   - Message: `This preserves hourly energy truth while demonstrating Green Button XML parsing and forecast packaging in a safe sandbox.`

5. `Tab 5 /forecast-benchmarking`
   - Close with:
     - `MAE`
     - `MAPE`
     - `RMSE`
     - persistence baseline
     - seasonal-naive baseline
   - Message: `CEIP exposes trust metrics instead of asking the buyer to trust a black box.`

## Website Key Points

- CEIP is strongest as a set of buyer-specific proof lanes, not as a generic AI dashboard.
- The lead wedge is utility planning.
- The second strongest wedge is regulatory filing and export packaging.
- Trust is a product feature here; explicit boundaries matter more than overclaiming readiness.
- The UtilityAPI lane is valuable as a safe Green Button sandbox, not as evidence of production bridge approval.
- Alberta and Ontario specificity are strengths and should be stated plainly.
- The best demo moments are exportable artifacts, planning outputs, and benchmark transparency.

## Codex Freeze State

```text
CODEX INSTRUCTION: STATUS UPDATE AND FREEZE

The MVP is frozen on https://canada-energy.netlify.app.

1. INFRASTRUCTURE FROZEN: burner domain, VPS, Caddy staging, Layer A/B/C evidence, and all SSH/IP requests are indefinitely suspended.
2. LONDON HYDRO FROZEN: production utility onboarding and submission-grade bridge readiness are out of scope.
3. DEMO PATH LOCKED: Green Button rehearsal uses only /utilityapi-demo with "Continue with Fixture Replay". Live operator login is rehearsal-only, not customer-essential.
4. B2B MODE ACTIVE: Whop session bootstrapping and Paddle initialization are suppressed on core B2B proof routes.
5. CUSTOMER NARRATIVE LOCKED: lead only with the proof-pack pages in docs/Top20.md and do not overclaim original quarter-hour telemetry, production onboarding, or real customer data.
6. MVP NEXT STEP: no further implementation work is required for the demo. Only manual rehearsal, buyer-specific narration, and optional backstage operator login remain.
```

## Top 10 Freeze Scoreboard

| Rank | Feature | Public route | Readiness /5 | Band | Scene status |
|---:|---|---|---:|---|---|
| 1 | Utility Demand Forecasting Lane | `/utility-demand-forecast` | 4.2 | A: Core lead | Show |
| 2 | Regulatory Filing Templates | `/regulatory-filing` | 4.3 | A: Core lead | Show |
| 3 | Utility Security & Data-Handling Statement | `/utility-security` | 4.4 | A: Core lead | Show |
| 4 | Forecast Benchmarking Trust Layer | `/forecast-benchmarking` | 3.8 | A: Trust close | Show |
| 5 | Asset Health Index (CBRM-lite) | `/asset-health` | 4.0 | B: Follow-on proof | Reserve |
| 6 | UtilityAPI / Green Button Sandbox Demo | `/utilityapi-demo` | 4.1 | A: Sandbox proof | Show |
| 7 | TIER Compliance Savings Calculator | `/roi-calculator` | 4.1 | B: Alberta industrial follow-on | Reserve |
| 8 | Credit Banking Dashboard | `/credit-banking` | 3.8 | B: Carbon follow-on | Reserve |
| 9 | Alberta RRO Rate Watchdog | `/rate-watchdog` | 4.0 | C: Buyer-specific | Mention only |
| 10 | Shadow Billing Module | `/shadow-billing` | 3.9 | C: Buyer-specific | Mention only |

- `Show` means part of the main five-tab customer scene.
- `Reserve` means use only if the buyer expands into adjacent planning, compliance, or industrial pain.
- `Mention only` means do not pivot the core demo unless the buyer explicitly signals Alberta retail or bill-comparison interest.

## ML Models To Highlight

### Lead Models

- Utility planning forecast engine in [utilityForecasting.ts](../src/lib/utilityForecasting.ts)
  - transparent statistical forecast
  - holdout backtest
  - planning-lane framing
- Benchmark layer in [forecastBaselines.ts](../src/lib/forecastBaselines.ts)
  - persistence baseline
  - seasonal-naive baseline
  - `MAE`, `MAPE`, `RMSE`
  - skill-score proof

### Optional Appendix Models

- Alberta price and procurement risk surfaces
  - `rate-watchdog-v1` in [mlForecasting.ts](../supabase/functions/_shared/mlForecasting.ts)
  - price-spike and related advisory logic in [advancedForecasting.ts](../src/lib/advancedForecasting.ts)
- Simulator-calibrated technical appendix artifacts
  - `dispatch-pinn-v2` in [MANIFEST.md](../src/lib/modelWeights/MANIFEST.md)
  - `pv-gnn-v2` in [pv-gnn-v2.json](../src/lib/modelWeights/pv-gnn-v2.json)

### Narrative Guardrail

- Do not lead with simulator-trained artifacts.
- If discussed, state explicitly that real-world fine-tuning is still pending and that they are technical appendix material, not the primary MVP sales proof.

## What Not To Say

- Do not say London Hydro production onboarding is ready.
- Do not say Alectra production onboarding is ready.
- Do not say the UtilityAPI sandbox proves submission-grade bridge readiness.
- Do not imply real customer data is being used unless you are actually using it.
- Do not say the system has native 15-minute utility telemetry unless that exact dataset is present.

## Acceptance Checklist

- All five locked routes load from a fresh private window.
- `/utilityapi-demo` succeeds through fixture replay without authentication.
- The customer story stays anchored to planning usefulness, regulatory packaging, trust boundaries, and benchmark transparency.
- No sales narrative overclaims production bridge readiness, live utility onboarding, or real customer datasets.
