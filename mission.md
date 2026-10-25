# CEIP Fable 5 Controlled-Pilot Mission

**Mission type:** Tier 3, evidence-bound, security and deployment-sensitive
controlled-pilot decision

**Mission owner:** Architect/integrator (Codex)

**Repository writer:** Devin, one writer at a time; read-only auditors may run
checks and create reports but must not edit the shared checkout.

**Created:** 2026-10-22

**Mission status:** `PLANNED / NOT COMPLETE`

**Current decision:** repository CI evidence is defensible for the recorded
tree; documentation rebinding, independent reproduction, hosted controls,
owner approvals, manual quality evidence and buyer validation remain open.
Staging and pilot are **STOP**. This mission artifact grants no deployment,
restoration, billing, outreach or buyer authority.

The safe execution scope before owner gates is repository inspection, evidence
reconciliation, read-only testing, documentation, and preparation of owner
runbooks. No phase plan or mock runner output changes the current decision.

## Decision question

Can CEIP move from repository remediation to a controlled-pilot decision on the
exact reviewed tree, with independently reproducible engineering evidence,
named owner approval for hosted and compliance controls, and observed buyer
evidence?

The acceptable decision is **continue**, **pivot**, or **stop**. A green CI run
alone is not pilot approval.

## Finish line

The mission is complete only when all of the following are true:

1. The reviewed Git tree, dirty overlay, CI run, artifact ID, artifact digest,
   manifest, sidecar, and external job conclusions are mutually consistent.
2. Repository-owned security, data-integrity, calculation, billing, claims,
   quality, evidence-packaging, and positioning controls are implemented and
   verified at the proof layer claimed.
3. A clean-clone reproduction has regenerated the required coverage and
   browser evidence, or the inability to reproduce is explicitly recorded as
   an unresolved risk.
4. Supabase project identity and INC-001 key invalidation/log review are
   resolved by the owner before restoration or hosted testing.
5. Hosted migration order, RLS, direct-write denial, rate limits, retention,
   redacted logs, monitoring, backup/restore, rollback, Whop legacy access,
   and billing kill-switches are verified with synthetic data.
6. Privacy, CASL, billing, dependency, operations, and manual accessibility
   owners provide named approvals where required.
7. The eleven pre-registered buyer experiments have either produced their
   defined paid-commitment evidence or are honestly recorded as unrun,
   negative, inconclusive, or stopped.
8. G1–G23 and all 29 Fable dimensions have a current status, proof layer,
   evidence link, owner, and residual risk.
9. An independent judge finds no stale identity, proof-layer collapse,
   unsupported public claim, hidden critical failure, or unauthorized external
   action.

## Current baseline and authoritative evidence

These values are the starting snapshot for this mission. If any value changes,
the mission must rebind its documents before claiming current status.

| Item | Current value | Proof layer |
|---|---|---|
| Current exact-head source/CI subject | `fc133bc` / run `40214413753` | CI-verified; all four jobs successful |
| Prior code-bearing CI subject | `a460a82` / run `40071166986` | Historical CI-verified binding-gate change; evidence-binding was the staleness signal |
| Last completed exact-HEAD receipt before the current implementation overlay | `4967b72` / run `39990265678` | CI-verified predecessor; all four jobs successful |
| Current documentation subject | `fc133bc` / run `40214413753` | CI-verified exact-head receipt |
| Prior externally reviewed subject | `10ab812` / run `39641749404` | Historical independent review |
| Canonical current CI | [run 40214413753](https://github.com/sanjabh11/canada-energy-dashboard/actions/runs/40214413753) | GitHub job conclusions |
| Current artifact receipt | `12604898756`, digest `sha256:47f1b93bb27063ccd2791e95adb97f804f94694e906c63977336949ef9c08bea` | GitHub artifact API + downloaded ZIP digest + internal hash checks |
| CI jobs | `lint-typecheck`, `test`, `evidence-binding`, `build-and-smoke`: success | CI-verified |
| Manifest | `complete=true`, 9 required core evidence files plus 2 manual-assist payloads (11 hashed payloads), `missing_files=[]`, `jobs: not-recorded` | Artifact-verified; external jobs are authoritative |
| Manifest jobs field | `not-recorded`; external job results are authoritative | Explicit partial field |
| CI test evidence | 177 files, 1,329 tests, 22.55% lines | CI-verified |
| Browser evidence | Phase 0 35, Phase 6 80, wedge 80, a11y 110; zero unexpected across five projects | CI-verified |
| Local overlay | HEAD `fc133bc`; `coverage/lcov.info` deleted and zero-byte dump stubs remain untracked | Dirty worktree; intentionally preserved |
| Current document risk | `fc133bc` exact-head receipt is current; `e5261b2` and `389dad3` remain historical | Hosted proof and owner gates remain open |
| Hosted state | Supabase paused; project-ref mismatch unresolved | Owner-gated |
| Replacement-project security snapshot | `SUPABASE_SECURITY_BASELINE_2026-10-23.md`; 26 ERROR and 73 WARN findings plus 108 INFO findings | External observation; disposition and staging proof open |
| Buyer state | 0/11 experiments run | Human-gated |

The current repository subject for CI proof is `fc133bc`, and its exact-head
receipt is run `40214413753`. The earlier `e5261b2`/`40207778791` and
`389dad3`/`40073506314` receipts are
retained as historical evidence. The local checkout still carries the
intentional lcov deletion and zero-byte dump stubs; those dirty files are not
included in the CI proof and must remain preserved.

The incident register at `docs/security/SECRET_EXPOSURE_INCIDENTS.md` is the
authoritative security record. Do not inspect or print credential values.

The identity precedence is: Git objects and current worktree → GitHub job and
artifact records → current addendum → historical addenda. A proof applies only
to the commit and overlay it names. Never infer that a documentation descendant
inherits a source change's proof unless its own CI run covers it. Do not multiply
test counts across browsers unless the retained reports explicitly support that
calculation.

## Proof-layer vocabulary

Every status must use exactly one highest-proven layer:

`implemented` → `locally-tested` → `ci-verified` → `staging-verified` →
`owner-approved` → `buyer-validated`

The following are not interchangeable:

- Code presence is not a test result.
- A test definition is not a passing test.
- CI is not staging.
- Staging is not owner approval.
- Owner approval is not buyer validation.
- A free pilot, interview, or positive reply is not paid willingness-to-pay.

## Independent judge contract

The judge is a fresh-context reviewer or deterministic script that did not
author the evidence under review. It must:

1. Recompute the exact tree identity from Git objects and the dirty overlay.
2. Retrieve the CI artifact through GitHub, compare the GitHub digest with the
   downloaded ZIP, verify the manifest sidecar, and verify every listed file
   hash and size.
3. Check that the workflow's completeness gate fails for a partial artifact.
4. Re-run or independently reproduce the required test and browser evidence
   where the environment permits.
5. Attempt assertion inversion for fail-closed Whop identity, HMAC rejection,
   suppression, checkout kill-switch, and anonymous database writes.
6. Fuzz JWT shape and trust-boundary inputs.
7. Treat automated axe/reflow as partial WCAG evidence; require manual review
   for keyboard, focus, target size, forms/errors and screen-reader behavior.
8. Search the merged diff and active documents for stale bindings, generated
   artifact coupling, unsupported claims, test-only production paths, and
   contradictory status language.
9. Refuse to close INC-001, hosted Supabase, Whop deployment, CASL, manual
   WCAG, performance, or buyer gates without the named external evidence.
10. Check binary obligations rather than treating a subjective confidence
    percentage as completion: all dimensions dispositioned, all critical/high
    findings challenged, identities valid, and every unresolved item assigned
    a stop/reopen rule.
11. Emit separate verdicts for audit completeness, repository remediation,
    staging eligibility, and pilot eligibility, then emit
    `JUDGE_PASS`, `JUDGE_REVISE`, or `JUDGE_STOP` for the mission as a whole.

## Non-negotiable boundaries

- Never read, print, copy, rotate, or persist credential values.
- Never reset, clean, revert, overwrite, or restore the dirty checkout without
  explicit owner approval.
- Never unpause Supabase, apply hosted migrations, deploy, enable checkout,
  contact buyers, or send outreach from an agent lane.
- Keep Whop de-prioritized for acquisition; preserve only verified existing-
  customer access and billing management.
- Keep all external owner gates visibly open until their evidence exists.
- If a lane discovers a new critical defect, stop promotion and append the
  finding before starting another change.

## Fable 5 completeness contract

The repository Fable prompt is used as a coverage framework, with these
additional controls required by this mission:

| Fable area | Required evidence in this mission |
|---|---|
| Phase 0 calibration | Stack/config baseline, project rules, current tree identity |
| Phase 0.5 tooling | Tool inventory, missing-tool limits, CI/local distinction |
| Phase 1 quantitative discovery | Size, churn, gravity wells, orphan tests, top 15 features, segments |
| Phase 2 audit | Fifteen mandatory dimensions, file/line citations, refuter tally |
| Phase 3 market alignment | Segment fit, competitor sources, seller proposition, non-fixes |
| Phase 4 implementation plan | Self-contained tasks, runnable acceptance, rollback, dependencies |
| Phase 5 success verification | Exit checklist, completeness check, feature ratings, confidence and open questions |
| Extra CEIP controls | G1–G23 ledger, 29 dimensions, owner gates, artifact chain, buyer protocol |

No phase may be marked complete merely because its checklist was written.

## Multi-agent execution topology

The loop may use parallel **read-only** lanes, followed by a serialized write
lane and a separate judge:

| Lane | Role | Allowed output | Must not do |
|---|---|---|---|
| A | Evidence/repro auditor | Git/CI/artifact receipts, reproducibility results | Edit source or hosted state |
| B | Security/hosted-boundary auditor | Threat model, negative tests, owner runbook | Read secrets, unpause or migrate |
| C | Economics/Whop/claims auditor | Claim ledger, route checks, source register | Enable acquisition or billing |
| D | Quality/compliance auditor | WCAG/performance/CASL gap report | Contact buyers or approve legal gates |
| R | Adversarial refuter | Refuted, downgraded, survived findings | Author its own finding as sole proof |
| W | Devin write lane | One scoped repository change at a time | Overlap with another writer |
| I | Architect/integrator | Merge evidence, update plan and status | Upgrade an external gate without owner proof |
| J | Fresh-context judge | Final verdict and proof index | Reuse unverified claims from addenda |

Parallel lanes may read concurrently. Only W writes the shared checkout, and
only after I confirms file ownership and a checkpoint. A later phase may not
consume a failed or stale predecessor artifact as if it passed.

## Persistent Fable loop state

The loop state is append-only at:

`.phase-loop/ceip-controlled-pilot-mission.jsonl`

The local Fable runner's `--mock` mode is an orchestration smoke test only. It
does not prove this repository's tests, hosted state, compliance, or buyer
outcomes. If a verified real runner is unavailable, use this state file and the
phase ledger as the execution adapter and label all missing external evidence.

Each iteration records:

```json
{
  "iteration": 0,
  "phase": "P0",
  "baseline": "...",
  "one_change": "...",
  "checks": [{"command": "...", "status": "pass|fail|blocked|unverified"}],
  "evidence": ["path or external receipt"],
  "delta": "...",
  "reflection": "...",
  "decision": "continue|revise|stop|blocked_owner_gate",
  "next_adjustment": "...",
  "tree_identity": "...",
  "writer": "Devin|none"
}
```

One loop iteration makes one atomic change or one evidence operation. The
default maximum is 12 iterations per phase. The loop stops immediately on:

- `STOP_EVIDENCE_MISMATCH`
- `STOP_SECRET_OR_SECURITY_AMBIGUITY`
- `STOP_UNAUTHORIZED_EXTERNAL_ACTION`
- `BLOCKED_OWNER_GATE`
- `JUDGE_STOP`
- a failed critical CI/security/data-integrity gate
- a tree change not re-bound to a fresh CI run

The loop may close only with `MISSION_COMPLETE` after `JUDGE_PASS`; otherwise
the final state remains `BLOCKED_OWNER_GATE`, `UNVERIFIED`, or `STOP`.

## Phase plan

### P0 — Preserve and calibrate

1. Record `HEAD`, branch, status, tracked deletion, modified ledger, untracked
   inventory and current tree fingerprint without reading secrets.
2. Read `AGENTS.md`, the incident register, `goal.md`, current addenda, package
   and CI configuration, and this mission.
3. Classify the lcov deletion and phase-ledger modification; do not restore or
   discard either.
4. Inventory available tools and record JEV-blocked commands as blocked rather
   than passed.

**Checkpoint:** a preservation receipt exists and no unrelated file changed.

**Stop rule:** any request to reset, clean, expose a secret, or mutate a
hosted service stops the mission.

### P1 — Rebind current evidence

1. Update `goal.md` and the current audit addendum to the exact current HEAD,
   CI run, merge SHA, artifact ID/digest, tree fingerprint and manifest hash.
2. Record the dependency/source proof separately for `3766ca6`/`39726844686`,
   the documentation proof for `a460a82`/`40071166986`, and the older external
   review for `10ab812`/`39641749404`.
3. Mark `jobs: not-recorded` as a manifest limitation and cite external job
   conclusions separately.
4. Replace any statement that a locally blocked scan passed locally with its
   actual CI proof layer.
5. Preserve all historical runs as historical; do not rewrite them as current.
6. Add a stale-binding check that fails when active documents cite an older
   current milestone.

**Checkpoint:** active documents and current CI identity match; historical
records remain distinguishable.

**Stop rule:** any identity mismatch or missing artifact leaves P1 open.

### P2 — Independently reproduce the repository evidence

1. Create an isolated clean clone at the exact reviewed SHA.
2. Install with `pnpm install --frozen-lockfile` and documented synthetic,
   non-secret environment values only.
3. Run serial Vitest coverage into a unique output directory and verify the
   generated lcov is new and complete.
4. Run all five Playwright projects and retain JSON/report artifacts.
5. Compare deterministic hashes with CI; record expected nondeterminism rather
   than forcing byte equality.

**Checkpoint:** a clean-clone receipt links commands, exit codes, tree identity
and artifacts.

**Stop rule:** any unexplained test, coverage, browser or environment drift.

### P3 — Preserve and refute repository controls

1. Retain the artifact completeness gate, sidecar, negative partial-run
   fixture, assertion-inversion suite and JWT fuzz suite.
2. Verify the five highest-risk fail-closed properties using actual negative
   inputs, not only happy paths.
3. Confirm direct anonymous/authenticated lead writes are denied by migration
   policy while the server path remains valid.
4. Confirm dependency audit exceptions have owner, reachability, control and
   expiry evidence.
5. Run local checks only when permitted; otherwise cite exact CI results.

**Checkpoint:** every repository claim has a test, source contract, CI result,
or an explicit unverified label.

**Stop rule:** any security assertion is weakened, skipped, or made green by
raising a timeout or reducing coverage.

### P4 — Resolve the Supabase and hosted boundary

1. Resolved (2026-10-23): owner provisioned `qktgjpbifknqjpvrgkrj` as the
   authoritative replacement; 122+6 migrations replayed, 6,797 rows
   imported, 0 edge functions deployed. The `qnymb…`/`cwij…` question is
   superseded for the forward path; the register keeps `qnymb…` as the
   leak-site project of record.
2. Owner invalidates the leaked INC-001 key on `qnymbecjgeaoxsfphrti`
   (revoke/disable the service_role key or delete the project) and reviews
   access logs. Supabase guidance requires explicit key rotation/revocation;
   pausing alone is not sufficient.
3. Remaining on the new project: `.env` anon key, edge-function deploy
   allowlist, hosted RLS/migration-order/rate-limit/retention/rollback
   proofs, the current advisor-finding disposition in
   `docs/remediation/SUPABASE_SECURITY_BASELINE_2026-10-23.md`, and real
   backup exports.
4. Only then apply migrations before functions in a controlled staging project.
5. Verify RLS, direct-write denial, deduplication, rate limits, retention,
   provider region, redacted logs, monitoring, backup/restore and rollback
   using synthetic data.

**Checkpoint:** named owner evidence covers key invalidation, project identity,
migration order, data handling and rollback.

**Stop rule:** unresolved project identity, missing log review, or a request to
unpause/migrate from an agent lane.

### P5 — Keep Whop, billing, economics and claims honest

1. Verify existing-customer Whop identity and entitlements server-side; keep
   acquisition routes, listings, default provider behavior and new checkout
   disabled.
2. Verify `WHOP_CEIP_*` configuration and the edge deployment only through an
   owner-run hosted record.
3. Keep Direct Investment undetermined until a current official source exists.
4. Apply freshness and provenance to rates, currency, FX, exports, rankings and
   CTAs; preserve nulls instead of zero-filling unknown values.
5. Keep methane/landfill outputs screening-only until protocol conformance is
   evidenced.
6. Sweep public, SEO, sales and competitor copy for unsupported profit,
   timing, sellability, board-ready and capability claims.

**Checkpoint:** route, claim, calculation and currency tests show no unsupported
public outcome or buyer CTA.

**Stop rule:** stale or estimated inputs produce confident savings, ranking or
acquisition behavior.

### P6 — Complete human quality evidence

1. Retain the wording “automated axe + reflow audit.”
2. Run manual keyboard, focus order/visibility, target-size, forms/errors,
   contrast, screen-reader and 320/375/768/1280px reflow checks.
3. Measure deployed Web Vitals and bundle budgets, including the Redoc chunk.
4. Exercise public entry, ROI, notice, intake, confirmation, legacy Whop
   management and support journeys.

**Checkpoint:** an independent accessibility/performance report states exactly
what was tested and what remains untested.

**Stop rule:** no full WCAG 2.2 AA or performance claim from automated tests
alone.

### P7 — Obtain compliance and buyer evidence

1. Enforce one workspace-wide suppression registry and consent schema.
2. Obtain named CASL/privacy approval for basis, sender identity, unsubscribe,
   retention and templates before any outreach.
3. Keep all experiments pre-registered with segment, sample, quoted price,
   paid-commitment measure, stop rule and protected evidence handling.
4. A human business owner runs the experiments; agents do not contact buyers.
5. Record positive, negative, inconclusive and stopped outcomes without
   upgrading claims beyond the observed evidence.

**Checkpoint:** owner-approved compliance record and observed experiment records
exist; otherwise status remains blocked or 0/11.

**Stop rule:** missing consent evidence, suppressed contact, unapproved copy, or
free/positive responses being labelled paid validation.

### P8 — Judge, close out and decide

1. Re-run the exact-tree evidence and stale-binding checks after the final
   repository write.
2. Update G1–G23, the 29-dimension register, the proof-layer matrix and
   residual-risk register.
3. Have the fresh-context judge issue separate verdicts for audit completeness,
   repository remediation, staging eligibility and pilot eligibility, followed
   by `JUDGE_PASS`, `JUDGE_REVISE`, or `JUDGE_STOP`.
4. Record `continue`, `pivot`, or `stop` with owner, evidence and next review
   date.

**Checkpoint:** final decision is reproducible from the evidence index.

**Stop rule:** any critical evidence is stale, missing, self-referential or
contradicted by the hosted control plane.

## G1–G23 completion map

| Group | Current state | Required proof before closure |
|---|---|---|
| G1–G3 evidence/ledger/preservation | Partial | Current-tree rebinding, overlay receipt, independent reproduction |
| G4 secrets/incident | CI-verified; owner open | INC-001 invalidation, project identity and logs |
| G5–G7 billing/intake/privacy | Partial/hosted | Server allowlists, RLS, migration order, owner notice/retention approval |
| G8 report promise | Source-closed | Deployed-copy verification |
| G9–G11 economics/currency | Partial/open | Fresh authoritative rates, allocation state, currency/procurement proof |
| G12–G13 Whop/positioning | Partial/high | Existing-customer hosted journey and public-copy verification |
| G14–G15 buyer/CASL | Open/owner | Approval plus observed paid experiments |
| G16 claims/competitors | Partial/high | Dated primary sources and qualified copy |
| G17 dependency exception | CI-verified/maintenance | Named owner, reachability, controls and expiry |
| G18–G21 coverage/content/tracking/quality | CI-verified or partial | Clean-clone proof, exact parity, manual WCAG and deployed performance |
| G22 staging | Blocked | Owner-run staging, rollback and monitoring evidence |
| G23 audit scope | Partial | Evidence or bounded SHALLOW reason for every dimension |

## Fable 360-degree dimension coverage

The final judge must explicitly account for all 29 dimensions:

1. Business/product — success metric and buyer outcome.
2. User/customer — journey, device, localization and accessibility.
3. Architecture/layering — repository boundaries and data flows.
4. Code quality — complexity, dead code and error handling.
5. Security — threat model, trust boundaries and hosted controls.
6. Testing — assertion quality, coverage and reproduction.
7. Performance — deployed Web Vitals and bundle budgets.
8. Dependencies/supply chain — advisories, exceptions and licenses.
9. DevEx/operations — monitoring, alerts, backups and rollback.
10. Documentation/reality — current identities and claim ceilings.
11. WCAG 2.2 AA — automated plus manual evidence.
12. Future-proofing — extensibility and sustainability.
13. Ethical/safety — privacy, retention and harm review.
14. Legal/compliance — PIPA, CASL, procurement and owners.
15. Market alignment — segment fit and seller proposition.
16. Marketing/positioning — public and SEO consistency.
17. Outreach/engagement — consent, suppression and execution control.
18. Pricing/monetization — currency, provenance and WTP.
19. Customer discovery — observed experiments.
20. SOC 2/ISO governance — bounded control map, no certification claim.
21. Outreach positioning — cross-channel copy.
22. Outreach operations — executable approval path.
23. Outreach pricing — competitive paid evidence.
24. Buyer journey — awareness through expansion.
25. Sales enablement — qualified artifacts and claims.
26. GTM readiness — segment, workflow and owner approval.
27. Outreach validation — campaign outcomes.
28. Presales lifecycle — qualification through onboarding.
29. Competitive intelligence — three primary-source comparisons.

Each dimension must be labelled `DEEP`, `SHALLOW`, or `DEEP/PARTIAL`, with a
reason, evidence link, owner and next action. `DEEP` means examined, not passed.

## Primary research anchors

These sources establish the external standards used by the mission. They are
not substitutes for project-specific owner or deployment evidence.

- [Supabase legacy key rotation and revocation](https://supabase.com/kb/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd): legacy secrets require explicit migration/rotation/revocation; pausing a project is not treated as permanent invalidation.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): grants and RLS policies must be assessed together.
- [W3C WCAG 2.2 conformance](https://www.w3.org/WAI/WCAG22/Understanding/conformance): conformance testing combines automated and human evaluation.
- [CRTC CASL guidance](https://crtc.gc.ca/eng/com500/guide.htm): commercial electronic messages require consent, sender identification and unsubscribe handling.
- [GitHub Actions artifacts API](https://docs.github.com/en/rest/actions/artifacts?apiVersion=2026-03-10): artifact retrieval and digest metadata provide an external evidence oracle.

## Final handoff package

The integrator must deliver:

- current `goal.md` and this `mission.md` bound to the same tree and CI run;
- dated audit addendum and append-only Fable loop state;
- G1–G23 ledger and 29-dimension register;
- exact tree fingerprint, CI run IDs, artifact ID/digest, manifest and sidecar;
- clean-clone and browser/coverage receipts;
- owner-gated evidence list with responsible person and expiry;
- unresolved risks, false-positive log and rollback path;
- adherence rating and remaining-work estimate;
- final judge verdict and `continue/pivot/stop` decision.

## Mission-level success and failure semantics

`MISSION_COMPLETE` means the finish line and judge criteria passed. It does not
mean production launch. `BLOCKED_OWNER_GATE` is the correct result when the
repository is ready but a human, hosted, legal, accessibility or buyer gate is
missing. `STOP_EVIDENCE_MISMATCH` is the correct result when the tree, docs,
CI, artifact, control plane or claims disagree.
