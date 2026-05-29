# CEIP Commercial Source Of Truth

> Date: May 29, 2026
> Purpose: define which docs can be used for current sales, outreach, pilot scoping, and public positioning.
> Rule: when this file conflicts with older research, outreach, PRD, or monetization notes, this file and the active docs below win.

## Active Commercial Sources

Use these files for current CEIP positioning:

| File | Role | Required boundary |
|---|---|---|
| [Top20.md](./Top20.md) | Ranked product and USP source of truth. | Strategy confidence is 90-92%; 95% needs buyer-supplied pilot evidence. |
| [CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md](./CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md) | Adversarial confidence audit. | Do not convert confidence estimates into market-outcome claims. |
| [PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md](./PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md) | Buyer evidence intake and 14-day pilot acceptance checklist. | No feature rating increase without matching buyer evidence. |
| [MVP_DEMO_FREEZE_HANDOFF.md](./MVP_DEMO_FREEZE_HANDOFF.md) | Demo runbook and customer narrative boundary. | UtilityAPI remains fixture/sandbox; no production onboarding claims. |
| [HERMES_OUTREACH_OPERATING_PLAN.md](./HERMES_OUTREACH_OPERATING_PLAN.md) | Manual outreach operating plan. | Proof-pack pilot outreach only; stop conditions apply. |
| [growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md](./growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md) | Current outreach copy library. | Lead with proof packs, not broad dashboards or generic AI. |
| [growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md](./growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md) | Email/LinkedIn and pilot templates. | Must name route, input data, artifact, caveat, and decision criteria. |

## Approved Lead Positioning

Use this wording:

> CEIP is a Canadian utility and Alberta TIER proof-pack product that turns forecasts, filing evidence, benchmark transparency, compliance scenarios, credit ledgers, asset triage, security review, billing checks, and large-load assumptions into buyer-ready artifacts.

Do not replace this with:

- "many dashboards plus AI"
- "AI/GPU forecasting platform"
- "production utility bridge"
- "SOC 2 certified utility platform"
- "OCAP-compliant sovereignty infrastructure"
- "live TIER market pricing"
- "engineering approval or power-flow platform"
- "accurate avalanche prediction" in this repository

## Stale Or Historical Research

The following docs may contain useful research, but they are **not** current commercial source of truth. Do not copy claims from them into outreach, pricing, PR copy, demos, or public pages unless reconciled against the active docs above.

| Historical file | Risk to watch |
|---|---|
| [DEEP_RESEARCH_GTM_STRATEGY_2026.md](./DEEP_RESEARCH_GTM_STRATEGY_2026.md) | Broad AI, real-time, and OCAP-compliant claims. |
| [DEEP_RESEARCH_MARKET_ALIGNMENT_GTM_2026.md](./DEEP_RESEARCH_MARKET_ALIGNMENT_GTM_2026.md) | Enterprise compliance and SOC2 expectations. |
| [Ph8_PRD.md](./Ph8_PRD.md) | AI-powered platform framing and broad PRD claims. |
| [Ph8_micro_niche.md](./Ph8_micro_niche.md) | Older AI-powered and SOC2 framing. |
| [ValueProposition.md](./ValueProposition.md) | OCAP-compliant and private-node positioning beyond current proof. |
| [ValueProposition_whop.md](./ValueProposition_whop.md) | Older Whop/product framing. |
| [Grok_suggestions.md](./Grok_suggestions.md) | High-confidence claims not tied to current route proof. |
| [ADVERSARIAL_USP_ANALYSIS.md](./ADVERSARIAL_USP_ANALYSIS.md) | Useful critique, not final positioning. |
| [COMET_OUTREACH_STRATEGY.md](./COMET_OUTREACH_STRATEGY.md) | Older outreach language and early-access claims. |
| [COMET_OUTREACH_STRATEGY_V2.md](./COMET_OUTREACH_STRATEGY_V2.md) | Older outreach language. |
| [whop_skill.md](./whop_skill.md) | Consumer/Whop AI-powered language. |
| [Whop_analysis.md](./Whop_analysis.md) | Whop-specific marketing notes. |
| [PRD_PRODUCTION_MONETIZATION.md](./PRD_PRODUCTION_MONETIZATION.md) | Production monetization assumptions and certification roadmap. |
| [OEB_SANDBOX_PROPOSAL.md](./OEB_SANDBOX_PROPOSAL.md) | Sandbox proposal language that may sound stronger than current proof. |
| [FEASIBILITY_ANALYSIS_PRODUCTION_USE_CASES.md](./FEASIBILITY_ANALYSIS_PRODUCTION_USE_CASES.md) | Production use-case analysis beyond current sales lane. |
| [monetization.md](./monetization.md) | Older enterprise/compliance sales assumptions. |
| [Final_gaps.md](./Final_gaps.md) | Broad future-state claims. |
| [UI_allpages.md](./UI_allpages.md) | UI inventory with broad real-time/AI wording. |
| [Linkedin_artical.md](./Linkedin_artical.md) | Article draft with older automation and world-class framing. |

## Claim Translation Table

| Old phrase | Current allowed replacement |
|---|---|
| AI-powered forecasting platform | transparent forecast proof pack with benchmark appendix |
| GPU forecasting | deferred research option; not a lead feature |
| real-time AESO/IESO platform | live-when-available data with fallback and freshness labels |
| OCAP-compliant data sovereignty | OCAP-aligned workflow language with owner-supplied governance markers |
| SOC 2 certified | security review pack; certification not claimed |
| production utility bridge | UtilityAPI/Green Button sandbox unless approval evidence exists |
| regulator-ready filing automation | filing-prep proof pack and reviewer checklist |
| engineering approval / power-flow | planning overlay only |
| guaranteed savings | source-dated planning estimate with buyer validation required |

## Review Workflow

Before sending outreach or publishing copy:

1. Start with `Top20.md`.
2. Check the confidence audit.
3. Use the pilot evidence checklist if the copy implies buyer proof.
4. Run:

```bash
pnpm run check:commercial-source
pnpm run check:claim-boundaries
```

5. If a stale doc is useful, copy only the underlying research question, not its marketing claim.

## Completion Boundary

This file does not make stale research false or useless. It prevents stale research from becoming current commercial truth without reconciliation.
