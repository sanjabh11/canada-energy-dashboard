---
description: Bounded autonomous loop wrapping the fable5-with-outreach skill for repeated marketing/outreach audits with verify/stop conditions
---

# Outreach Loop — Fable 5 Bounded Autonomous Marketing Audit

This workflow wraps the `fable5-with-outreach` skill in a bounded loop that
runs autonomously until all 9 marketing dimensions are complete or
diminishing returns are reached.

## When to Use

- Quarterly GTM readiness re-scoring
- Before product launches or pricing changes
- After competitor shifts or market changes
- When you want the marketing audit to run autonomously

## Prerequisites

- `fable5-with-outreach` skill installed in `~/.codeium/windsurf/skills/fable5-with-outreach/`
- `.fable5/STATE.md` directory exists (create if first run)
- Project has commercial docs (README, COMMERCIAL_SOURCE_OF_TRUTH, pricing pages)

## Loop Definition

**What to accomplish:** Full marketing/outreach/presales lifecycle audit across
all 9 dimensions using the fable5-with-outreach skill.

**How to verify:** Each finding must cite file:line and survive adversarial
refutation against competitor data and claim-boundary rules. Run:

```bash
// turbo
pnpm run check:claim-boundaries
pnpm run check:commercial-source
```

**What to do with what was learned:**
- Keep verified findings in the outreach audit report
- Discard refuted findings to the False Positive Log
- Update `.fable5/STATE.md` after each dimension

**When to stop:**
- All 9 marketing dimensions audited with exit criteria met, OR
- 3 consecutive dimension passes produce zero new findings, OR
- User explicitly stops the audit

## Execution Steps

1. **Read STATE.md** — Carry forward marketing facts and rules from prior audits.

2. **Run Phase M0 (Calibration)** — Read all commercial docs, pricing
   infrastructure, GTM code, outreach templates. Output Commercial Calibration
   Baseline (5-10 bullets).

3. **Run Phase M1 (Marketing Strategy & Positioning)** — Audit positioning
   statement against April Dunford framework, messaging hierarchy, claim-boundary
   discipline, competitive positioning.

4. **Checkpoint — Positioning Review** — Present positioning audit findings.
   Pause if positioning needs user input or if claim-boundary violations found.

5. **Run Phase M2 (Outreach & Engagement)** — Channel mix, cadence, compliance
   (CAN-SPAM, GDPR, CASL, LinkedIn ToS), dark funnel presence.

6. **Run Phase M3 (Pricing & Monetization)** — Value metric, tier design,
   price-to-value ratio, pricing governance.

7. **Run Phase M4 (Buyer Journey)** — Touchpoint matrix, drop-off analysis,
   analytics instrumentation.

8. **Run Phase M5 (Sales Enablement)** — 10 artifact types assessed.

9. **Run Phase M6 (GTM Readiness Gate)** — 8-dimension scorecard.
   **Checkpoint — GTM Readiness Gate** — Present scorecard. Pause if any
   dimension is NOT READY and needs user decision.

10. **Run Phase M7 (Customer Validation & Presales)** — Validation maturity,
    presales stage map, pipeline velocity, deal-stall, expansion.

11. **Run Phase M8 (Competitive Intelligence)** — Full matrix, 3+ competitors
    per dimension.

12. **Run Phase M9 (Improvement Plan)** — Gap-to-phase mapping, agent-executable
    tasks. **Requires user approval before any code changes.**

13. **Write STATE.md** — Update with marketing facts, rules, lessons.

14. **Write Deliverable** — Write `docs/audits/outreach-audit-{YYYY-MM-DD}.md`.

## Model Routing

| Role | Model | When |
|---|---|---|
| Orchestrator | Fable 5 | Positioning strategy, competitive intelligence, synthesis |
| Hard subtasks | Opus 4.8 | Pricing strategy, fallback from refusals |
| Workers | Sonnet 4.6 | Artifact audits, compliance checks, doc scans |
| Graders | Haiku 4.5 | Existence checks, claim-boundary verification |

## Safety

- If `stop_reason: "refusal"` occurs on competitive claims, retry on Opus 4.8
- Marketing findings must pass claim-boundary checks before entering the report
- Phase M9 implementation requires explicit user approval
- Never overclaim — if proof is missing, mark as [UNVERIFIED]
