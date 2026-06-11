# Scenario Substrate Architecture

## Overview

The CEIP Futures Workbench uses a "substrate" pattern: a set of shared contracts and services (B01–B13) that all proof-packs and commercial routes consume. This prevents duplicate data-fetching, ensures provenance traceability, and makes test failures observable.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Commercial Claim Boundary                      │
│              (Phase4RouteGuard - B16)                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────────┐
        │                  │                       │
   Proof-Packs          Workbench UI          Copilot (B18)
   (B17 substrate)      (B14 UI)              /copilot route
        │                  │                       │
        └──────────────────┴──────────────────────┘
                           │ consume
        ┌──────────────────┼──────────────────────────────┐
        │     S U B S T R A T E                           │
        │                                                  │
        │  B01 Scenario Types     B09 AgentHardening       │
        │  B02 Provenance V2      B10 SensitivityEngine    │
        │  B03 DB Schema          B11 UncertaintyEngine    │
        │  B04 OpenAPI Routes     B12 ScenarioComparator   │
        │  B05 Connectors         B13 ExportPipeline       │
        │  B06 Validators         B17 ProofPackSubstrate   │
        │  B07 PolicyGraph        B19 ScenarioCache        │
        │  B08 HybridSearch       B20 AuditTrailManifest   │
        └──────────────────────────────────────────────────┘
```

## Key Contracts

### Scenario Identity (B01)
Every scenario is identified by two immutable values:
- `id`: UUID assigned at creation
- `hash`: `hashScenario(assumptions)` — SHA-256 of the canonical JSON of assumptions, stable across runs

The hash is the primary cache key (B19 ScenarioCache) and the root of the provenance chain (B17 SubstrateAttachment).

### Provenance Chain (B02 + B17)
Every proof artifact carries a `provenanceChain: ProvenanceChainEntry[]` that records:
1. Which connectors (B05) contributed data
2. The trust tier of each source (official_historical → demo)
3. Content hashes for tamper detection

`attachSubstrateToProofPack()` stamps this chain onto any `ProofPackBundle`.

### Fallback Modes (B09)
`withFallback(live, stale, demo)` implements graceful degradation:
1. Try live connector data (circuit breaker: CLOSED)
2. On failure, serve stale cache (B19 ScenarioCache)
3. On stale miss, serve demo data
4. Circuit moves to OPEN after 3 failures; retries after `exponentialBackoffDelay()`

### Data Flow for a Scenario Run

```
User input
    → ScenarioWorkbenchPage (B14)
    → hashScenario(assumptions) → check ScenarioCache (B19)
    → if hit: return cached outcome
    → if miss: run SensitivityEngine (B10) / UncertaintyEngine (B11)
    → ScenarioComparator (B12) if comparing
    → attach ProofPackSubstrate (B17) with connector provenance
    → exportBundle (B13) → buildAuditManifest (B20)
    → store in ScenarioCache (B19) with LIVE_TTL_MS
    → deliver to UI / export
```

## Feature Flags

| Flag | Env Var | Controls |
|------|---------|---------|
| Phase 4 access | `VITE_ENABLE_PHASE4_EXPERIMENTS=true` | All workbench, copilot, freshness routes |
| Real git tests | `REAL_GIT=true` | git-backed test suites (skip in CI by default) |

## Connector Registry (B05)

| ID | Source | Trust Tier | SLA |
|----|--------|------------|-----|
| `statcan` | Statistics Canada WDS | official_historical | 24h |
| `cer` | CER Energy Futures 2026 CSV | official_projection | 7d |
| `eccc-npri` | ECCC NPRI via ArcGIS | official_historical | 24h |
| `aeso` | AESO Pool Price API | official_historical | 15min |
| `ieso` | IESO Hourly Generation CSV | official_historical | 1h |

## Test Clusters (B21)

| Cluster | Files | Skip Condition |
|---------|-------|----------------|
| DOM/Browser API | authGuestRefresh, clientEnvSafety, runtimeRouteMode | Never skip |
| Git-backed | branchReviewReadiness, unmergedBranchReadiness, githubRepoMetadata | `SKIP_GIT_TESTS=true` |
| Supabase Edge | utilityConnectorRuntime, utilityApiDemoEndpoint/Runtime | Never skip (mocked) |
| B17-B20 new | proofPackSubstrate, scenarioCache, auditTrailManifest, copilotTools | Never skip |
