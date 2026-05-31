> **Historical / reconcile-first note (June 1, 2026):** This May 31 audit is superseded by [CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md](./CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md), [COMMERCIAL_SOURCE_OF_TRUTH.md](./COMMERCIAL_SOURCE_OF_TRUTH.md), [Top20.md](./Top20.md), and [PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md](./PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md). Do not use this file for current confidence scores, top-10 rankings, route proof, verification status, public metadata status, or outreach copy.

# CEIP 95% Confidence Audit - Superseded Stub

This file is retained only to prevent the older May 31 audit artifact from being mistaken for current commercial or strategy truth.

## Current Replacement

Use [CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md](./CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md) as the current strategy-direction audit and gap roadmap.

That active roadmap reflects the later proof-pack hardening, active top-10 realignment, release-readiness checks, GA/ICI and BYO-CSV promotion into the active top 10, and the current buyer-evidence boundary.

## Superseded Claims

The original version of this file contained stale findings that should not be reused:

| Superseded item | Current handling |
|---|---|
| Commands not run / static-only verification | Later phases ran claim-boundary, commercial-source, pilot-template, public-metadata, TypeScript, Vitest slices, build, bundle, and local preview checks. |
| Local `index.html`, manifest, JSON-LD, and claim-guard gaps | Local source and release-readiness guards are now proof-pack aligned; production deploy remains separately gated. |
| 70 / 100 confidence cap | Current strategy-direction score is maintained in the active roadmap and remains below market-confidence 95% until buyer evidence passes. |
| API and large-load as top-10 proof packs | API and large-load are reserve/support surfaces; GA/ICI 5CP and BYO-CSV privacy proof are active top-10 wedges. |
| Old live-production metadata assertions | Live parity still requires explicit deploy approval and post-deploy verification; local source truth is tracked in the active roadmap and release checks. |

## Still Current

The buyer-evidence blocker remains current. CEIP must not claim 95% market confidence until a real filled buyer-evidence register passes:

```bash
pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts
```

Fixtures, templates, sample registers, static docs, and green builds do not satisfy this gate.
