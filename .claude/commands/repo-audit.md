---
name: fable5-prompt
description: Principal-level 360-degree code repository audit using Fable 5 parallel subagent architecture, adversarial verification, market segment alignment, and agent-executable task plans. Includes per-phase deep research protocols, exit criteria checklists, top 15 feature-to-market suitability cross-verification, seller proposition improvements, and new feature rating table (scale of 5). Optimized from 18 research sources (June-July 2026). Use when auditing any web app codebase for gaps, security, performance, architecture, marketability, and improvement planning.
origin: ECC
tools: Read, Write, Edit, Bash, Grep, Glob
---

# Fable5 Prompt: 360-Degree Repository Audit

A Fable 5-architecture audit skill that produces principal-engineer-level codebase reviews with evidence-based findings, adversarial verification, market segment alignment, and agent-executable improvement plans.

## When to Activate

**Use when:**
- Auditing a codebase for quality, security, performance, or architecture gaps
- Preparing a codebase for production launch or investor due diligence
- Performing periodic technical debt assessment
- Onboarding to an unfamiliar codebase (the audit produces a repo map)
- Pre-acquisition or pre-merge code review
- Sprint zero / greenfield project health check
- Evaluating marketability and seller proposition strength
- User says "audit", "review this repo", "find gaps", "improve this codebase"

**Do not use for:**
- Single-file bug fixes (use `coding-judgment` instead)
- Security-only deep dives (use `security-best-practices` instead)
- Performance profiling with live metrics (use `perf-ratchet` instead)
- Simple code review of a PR diff (use `ecc-code-review` instead)

## Platform Compatibility

This skill works across:
- **Claude Code** — via `~/.claude/skills/fable5-prompt/`
- **Codex** — via `~/.codex/skills/fable5-prompt/`
- **Windsurf/Devin** — via `~/.codeium/windsurf/skills/fable5-prompt/`
- **Anti Gravity** — via `~/.antigravity/skills/fable5-prompt/`
- **Any agent** — copy `prompt-template.md` into your tool

## Audit Focus (optional)

Accepts an optional focus argument to narrow scope:
- No argument — full 360-degree audit
- `security` — security-focused audit only
- `performance` — performance-focused audit only
- `src/billing` — audit a specific subdirectory
- `auth` — audit a specific concern across the codebase
- `market` — marketability and seller proposition audit only

---

## Context — why this audit exists

This audit becomes the work queue for future agent sessions: each task produced
will be handed to a fresh agent with no other context. Audit accordingly —
truth over reassurance; a flattering report is worthless.

## Ground rules (non-negotiable)

- Every finding cites file:line you actually read this session. If you can't
  verify a claim, label it [UNVERIFIED] — never guess. If something is not
  present in the provided files, say "not found" — do not infer or reconstruct.
- Quote the exact line(s) from the code. Do not paraphrase code content.
- Before reporting progress, audit each claim against a tool result from this
  session. Only report work you can point to evidence for; if something is not
  yet verified, say so explicitly. Report outcomes faithfully: if tests fail,
  say so with the output; if a step was skipped, say that; when something is
  done and verified, state it plainly without hedging.
- Analysis only for Phases 0–3. Do not modify code, config, or dependencies.
  The only file you create is the report. Phase 4 implementation requires
  explicit user approval.
- Don't just read claims of health — observe them. Run the repo's own read-only
  commands (install, lint, type-check, test suite, dependency audit) where
  practical, and report outcomes faithfully.
- Calibrate to the project's maturity — don't demand enterprise rigor of a
  prototype. If the repo is large, go deep on the core 20% that does 80% of
  the work, and say what you skipped.
- Prefer 15 high-confidence findings over 50 speculative ones. Separate facts
  from judgments. Label each finding as [FACT] or [JUDGMENT]. If a dimension
  is healthy, say so in one sentence and move on. List genuine strengths too.
- Don't add features, refactor, or introduce abstractions beyond what the task
  requires. A bug fix doesn't need surrounding cleanup. Do the simplest thing
  that works well.
- When you have enough information to act, act. Do not re-derive facts already
  established, re-litigate decisions, or narrate options you will not pursue.
- Tag every finding with an ID: {DIM}-{number} (e.g., SEC-1, ARCH-3, PERF-2).
- **Research before judging** — both the codebase AND the internet. For every
  audit dimension, verify current implementation against state-of-the-art best
  practices, latest frameworks, and scientific frameworks available today. Do
  not rely on training data alone for rapidly evolving domains.

## How to work (Fable 5 parallel subagent architecture)

- Fan out parallel subagents: Explore agents for discovery first, then one
  auditor per audit dimension, spawned as a single parallel batch. Each
  subagent gets the repo map so it doesn't re-derive it. Keep synthesizing
  while they run. Intervene if a subagent goes off track or is missing
  relevant context.
- Adversarial verification: before any Critical or High finding enters the
  report, a fresh-context subagent must try to refute it against the actual
  code. Drop or downgrade findings that don't survive. Record the refuter
  tally (findings refuted / downgraded / survived).
- Mine git history, not just the snapshot: high-churn × high-complexity files,
  bug-fix-dense modules, abandoned directories, age of TODO/FIXME comments.
- Work end to end without checking in — this is read-only and safe. When you
  have enough information to act, act.
- If a repo tool (pnpm, yarn, linter) is missing from PATH, try corepack or
  version-manager shims (mise, asdf, nvm) before concluding it's absent.
- Safety note: Fable 5 runs safety classifiers that may trigger on benign
  defensive security work. If stop_reason: "refusal" occurs, retry on
  Opus 4.8 via fallback.

## Effort levels

Use effort as the primary control for intelligence vs latency vs cost:
- **high** — default for most tasks
- **xhigh** — security, architecture, and market research dimensions where capability matters most
- **medium** — routine dimensions (docs, style, naming)
- **low** — quick scans or re-verification of already-audited areas

## Deep Research Protocol (applies to EVERY phase)

Each phase has a compulsory research track and an optional deeper research option.

### Compulsory research (every phase)
- **Codebase research**: Read actual files, configs, docs, tests, git history.
  Do not skim — read deeply enough to understand the work done and the intent
  behind it. Understand WHAT was built, WHY it was built that way, and HOW it
  works end-to-end.
- **Internet research**: For each phase's focus area, search the internet to
  verify that the codebase follows best-of-class, latest scientific frameworks,
  tools, mechanisms, and processes available today. Check:
  - Official documentation for frameworks/libraries used
  - Industry best practices and standards (OWASP, WCAG, NIST, etc.)
  - Academic/scientific papers for domain-specific patterns
  - Competitor implementations and market benchmarks
  - Recent conference talks and community discussions

### Optional "Go Deeper" (available every phase)
When the compulsory research reveals gaps or uncertainty, activate "Go Deeper":
- Switch to **xhigh** effort for that dimension
- Spawn a dedicated research subagent with web search access
- Search academic sources (Google Scholar, arXiv, IEEE)
- Search government/regulatory sources for compliance dimensions
- Search competitor product pages and technical blogs
- Cross-reference at least 3 independent sources before concluding
- Record all sources consulted in the audit report

## Market Segment Framework

Before auditing features, identify the market segments this codebase serves.

### How to identify market segments
1. Read README.md, docs/COMMERCIAL_SOURCE_OF_TRUTH.md (or equivalent),
   package.json description, landing pages, pricing pages
2. Extract explicit target audiences (e.g., "municipal utilities", "energy
   consultants", "industrial TIER compliance buyers")
3. Infer implicit audiences from feature set (e.g., auth flows, API access
   tiers, data export formats)
4. List each segment with: name, size estimate, primary need, budget range,
   decision criteria, and current satisfaction level with this product

### Market segment table (produced in Phase 1)
| Segment | Size | Primary Need | Budget | Decision Criteria | Current Fit (1-5) |
|---|---|---|---|---|---|

## Mandatory 360-Degree Audit Dimensions

Fan out one subagent per dimension. Each produces its own findings section.
Label each dimension [DEEP] or [SHALLOW] with justification for shallow reviews.

1. **Business/Product**: Goals, objectives, success metrics, stakeholder alignment
2. **User/Customer**: Personas, journeys, accessibility, localization, device diversity
3. **Architecture & Layering**: Code structure, data flows, coupling, circular deps, boundaries
4. **Code Quality**: Duplication, dead code, complexity hotspots, swallowed errors, type-safety
5. **Security**: Construct threat model first (assets, attack surfaces, trust boundaries, threat actors). Then audit OWASP Top 10 with file:line evidence
6. **Testing**: Gaps around core logic, tests that assert nothing, coverage on critical paths
7. **Performance**: N+1 queries, blocking calls in async paths, unbounded growth, bundle size
8. **Dependencies & Supply Chain**: Known CVEs, hallucinated packages, outdated versions, lockfile hygiene, license compatibility
9. **DevEx & Ops**: Build friction, CI gaps, observability, deployment story, monitoring/alerting
10. **Documentation vs Reality**: README accuracy, API docs vs implementation, stale docs
11. **Accessibility (WCAG 2.2 AA)**: Semantic HTML, ARIA, keyboard nav, contrast, focus management
12. **Future-Proofing**: Extensibility, emerging tech alignment, sustainability
13. **Ethical/Safety**: Disclaimers, bias, responsible AI, data privacy
14. **Legal & Compliance**: Licensing, open-source compatibility, regulatory boundaries
15. **Market Alignment & Seller Proposition**: Feature-to-segment fit, marketability gaps, competitive positioning, pricing alignment, buyer-ready artifact quality

---

## Phase 0 — Calibration (read before judging)

Read the project's own rules before applying any of your own.

- Read every config file: package.json, tsconfig.json, .eslintrc, vite.config,
  tailwind.config, netlify.toml, CLAUDE.md, README.md, CONTRIBUTING.md, docs/
- Note: language versions, framework versions, disabled lint rules, documented
  patterns, intentional deviations from defaults
- **Deep research**: Search internet for latest best practices for this stack
  (framework version, language version). Verify project's choices are current.
- Output: A Calibration Baseline (5-10 bullets) — this is what you audit AGAINST

### Phase 0 Exit Criteria Checklist
Before advancing to Phase 0.5, confirm:
- [ ] All config files read and summarized in Calibration Baseline
- [ ] Language/framework versions noted
- [ ] Disabled lint rules and documented deviations noted
- [ ] Internet verified: project's stack choices are current (or gaps noted)
- [ ] Calibration Baseline has 5-10 bullets
- [ ] **Exit criteria met: Y/N** (if N, list unmet items)

## Phase 0.5 — Tooling Discovery

Check what's installed before planning the audit. Don't assume.

```bash
# Linters & formatters
which eslint prettier tsc 2>/dev/null
# Test runners
which vitest jest playwright 2>/dev/null
# Security
which npm audit semgrep 2>/dev/null
# Git
git log --oneline -1
```

- **Deep research**: Search for any newer/better tools in each category that
  the project should consider adopting (e.g., biome vs eslint, vitest vs jest).
- Adapt later phases to use only tools that exist. Note missing tools as **Gaps**.

### Phase 0.5 Exit Criteria Checklist
Before advancing to Phase 1, confirm:
- [ ] All available tools discovered and listed
- [ ] Missing tools noted as Gaps with install commands
- [ ] Internet verified: no significantly better tool alternatives missed
- [ ] Git history accessible (latest commit SHA recorded)
- [ ] **Exit criteria met: Y/N** (if N, list unmet items)

## Phase 1 — Quantitative Discovery & Feature Analysis (hard numbers first)

### 1A. Size & Complexity
- Top 15 largest source files by LOC (exclude generated/vendored/lockfiles)
- Functions exceeding ~50 lines or nesting depth >3
- God modules: files with >5 class definitions or >15 top-level functions

### 1B. Churn & Gravity Wells
```bash
git log --format=format: --name-only --since="3 months ago" \
  | grep -v '^$' | sort | uniq -c | sort -nr | head -n 20
```
- Refactor Priority Score = lines_of_code x commits_last_3_months
- Gravity Wells = files in top decile for BOTH size and churn -> Phase 2 priority targets

### 1C. Test Coverage Mapping
- For each source module, check if a test file exists. List orphans.
- Critical paths (auth, payments, data mutations, error boundaries) without test assertions
- Cross-reference: Gravity Wells without tests = highest-risk items

### 1D. Lint & Type Baseline
- Run project's own configured tools. Record error/warning counts as baseline.
- Project-wide rule suppressions — judge whether still justified

### 1E. Top 15 Key Features (A/B/C Categorization)
Exhaustively explore the codebase to identify the Top 15 functionalities:
- **A (Mission-Critical)**: Must work perfectly for core value delivery (5-7 features)
- **B (High-Value)**: Strongly expected for user satisfaction (5-7 features)
- **C (Enhancements)**: Valuable but lower priority (3-5 features)

For each feature, record:
| # | Feature | Category | Entry Point (file:line) | Status | Test Coverage | Market Segments Served |

### 1F. Market Segment Identification
- Read README, docs, landing pages, pricing pages, commercial docs
- Identify all relevant market segments (see Market Segment Framework above)
- For each segment, assess current fit on scale of 1-5

### 1G. Feature-to-Segment Suitability Cross-Verification
Cross-verify each of the Top 15 features against each market segment:

| Feature | Segment 1 Fit (1-5) | Segment 2 Fit (1-5) | Segment 3 Fit (1-5) | Suitability Gap |
|---|---|---|---|---|

- A feature scoring <=3 for its primary segment is a suitability gap
- A segment with no A-category features serving it is a market gap
- **Deep research**: Search internet for what competitors offer each segment.
  Verify our feature set is competitive. Note missed opportunities.

### 1H. Checkpoint — Scope Gate
After Phase 1, stop and present:
- The Calibration Baseline
- The Refactor Priority Score ranking (top 15)
- Gaps in tooling
- Top 15 Key Features (A/B/C) with market segment mapping
- Market Segment table with current fit ratings
- Feature-to-Segment Suitability Matrix with gaps highlighted
- A proposed Phase 2 scope: which 5-10 modules get deep dive

Wait for user confirmation if repo >500 source files or >100K LOC. Otherwise proceed.

### Phase 1 Exit Criteria Checklist
Before advancing to Phase 2, confirm:
- [ ] Top 15 largest files identified
- [ ] Gravity Wells computed (LOC x churn)
- [ ] Test coverage mapping complete (orphans listed)
- [ ] Lint/type baseline recorded
- [ ] Top 15 Key Features identified and categorized (A/B/C)
- [ ] Market segments identified with fit ratings (1-5)
- [ ] Feature-to-Segment Suitability Matrix complete
- [ ] Suitability gaps highlighted
- [ ] Internet research: competitor features compared
- [ ] Proposed Phase 2 scope defined (5-10 modules)
- [ ] **Exit criteria met: Y/N** (if N, list unmet items)

## Phase 2 — Audit (parallel subagents, adversarially verified, deep research per dimension)

One subagent per dimension. Each finding:
- **What**: the issue
- **Where**: file:line (MANDATORY)
- **Why it matters**: impact on users/business/market segments
- **Severity**: Critical / High / Medium / Low
- **Confidence**: High / Medium / Low
- **Fact or Judgment**: [FACT] or [JUDGMENT]
- **Finding ID**: {DIM}-{number}
- **Market Segment Impact**: Which segments are affected and how

### Deep Research per Dimension
Each dimension subagent MUST:
1. Read the relevant code deeply (not skim)
2. Search internet for best-of-class practices for that dimension
3. Verify current implementation against latest standards
4. Note any tools, mechanisms, or processes the project should adopt
5. Record sources consulted

### Severity Tiers

| Tier | Criteria |
|---|---|
| Critical | Active exploit possible, data corruption, production-down. Fix this week. |
| High | Significant correctness risk, Gravity Well with no tests. Fix this sprint. |
| Medium | Maintainability hazard, duplication, architectural drift. Fix this quarter. |
| Low | Style, naming, dead code, missing docstrings. Fix opportunistically. |

### AI-Generated Code Identification

Flag files likely AI-generated (generic naming, overly optimistic error handling,
unused abstractions, duplicated helpers). These get heightened review for:
hallucinated APIs, optimistic error handling, fake abstractions, dead paths.

### Phase 2 Exit Criteria Checklist
Before advancing to Phase 3, confirm:
- [ ] All 15 dimensions audited (or justified [SHALLOW] with reason)
- [ ] Every finding has file:line citation
- [ ] Adversarial verification completed (refuter tally recorded)
- [ ] Each dimension has internet research sources recorded
- [ ] Market Segment Impact assessed for each Critical/High finding
- [ ] AI-generated code flagged and heightened-reviewed
- [ ] False positive log started (2-5 dismissed issues)
- [ ] **Exit criteria met: Y/N** (if N, list unmet items)

## Phase 3 — Improvement Strategy & Market Alignment

### 3A. Themes
- The 3-5 themes that explain most findings
- Target state and the principle behind it per theme
- What you are NOT fixing and why (effort vs payoff)
- "Done" defined as measurable signals (e.g., "CI fails on lint errors",
  "core-path coverage >= 80%")

### 3B. Market Alignment Improvements
For each market segment identified in Phase 1F:
- What code improvements would align the app better to this segment?
- What features are missing that competitors offer this segment?
- What seller proposition improvements would make this more marketable?
- What buyer-ready artifacts need strengthening?

| Segment | Current Fit (1-5) | Proposed Improvements | Target Fit (1-5) | Seller Proposition Gain |
|---|---|---|---|---|

### 3C. Code Improvement Suggestions for Marketability
For each improvement that enhances marketability:
- **What**: the code change
- **Where**: files affected
- **Which segment benefits**: primary and secondary
- **Seller proposition impact**: how this makes the product easier to sell
- **Marketability gain**: Low / Medium / High
- **Effort**: S / M / L / XL

### 3D. Deep Research for Market Alignment
- Search internet for competitor pricing, feature matrices, and buyer requirements
- Verify our proposed improvements would close competitive gaps
- Research what buyers in each segment actually evaluate (RFP criteria, procurement requirements)
- Note any regulatory or compliance requirements per segment

### Phase 3 Exit Criteria Checklist
Before advancing to Phase 4, confirm:
- [ ] 3-5 improvement themes identified with target states
- [ ] "Not fixing" list with justifications
- [ ] Measurable "done" signals defined per theme
- [ ] Market Alignment table complete (all segments)
- [ ] Seller proposition improvements listed with marketability gain
- [ ] Internet research: competitor analysis and buyer requirements checked
- [ ] **Exit criteria met: Y/N** (if N, list unmet items)

## Phase 4 — Phase-by-Phase Gap Implementation Plan (requires user approval)

### 4A. Gap-to-Phase Mapping
Map each finding from Phase 2 to a specific implementation phase:

| Finding ID | Severity | Gap Description | Implementation Phase | Effort | Dependencies | Exit Criteria |
|---|---|---|---|---|---|---|

### 4B. Agent-Executable Tasks
Discrete tasks a fresh agent session can execute from the brief alone:
- Title
- One context paragraph
- Files affected
- Acceptance criteria as runnable checks (command that passes or fails)
- Effort: S (<2h) / M (half-day) / L (1-2 days) / XL (needs breakdown)
- Risk assessment
- Dependencies
- Rollback procedure
- Test command to verify fix
- Test command to verify no regression
- Market segment benefited (if applicable)
- Seller proposition impact (if applicable)

### 4C. Milestone Ordering
- **M0** — Safety net: tests around critical paths, CI gates
- **M1** — Critical fixes: security and correctness
- **M2** — High-leverage: changes that make all future work easier
- **M3** — Market alignment: improvements that increase marketability and seller proposition
- **M4** — Quality & polish

Flag quick wins (high impact, S effort) separately.
Include implementation sketches for the top 3 tasks.

### 4D. Iterative Repair Loop
After implementing fixes, re-audit the changed files. Feed findings back and
iterate until clean or diminishing returns (max 3 rounds).

### Phase 4 Exit Criteria Checklist
Before advancing to Phase 5, confirm:
- [ ] All findings mapped to implementation phases
- [ ] Each task is self-contained (fresh agent can execute)
- [ ] Acceptance criteria are runnable checks
- [ ] Rollback procedures defined for each task
- [ ] Market alignment tasks identified (M3)
- [ ] Quick wins flagged
- [ ] Top 3 implementation sketches included
- [ ] **Exit criteria met: Y/N** (if N, list unmet items)

## Phase 5 — Comprehensive Success Criteria Verification

This is the final gate. Do NOT produce the deliverable until this phase is complete.

### 5A. Phase-by-Phase Exit Criteria Audit
Re-check every phase's exit criteria checklist:
- Phase 0: All items met? [ ]
- Phase 0.5: All items met? [ ]
- Phase 1: All items met? [ ]
- Phase 2: All items met? [ ]
- Phase 3: All items met? [ ]
- Phase 4: All items met? [ ]

If any phase has unmet criteria, go back and complete them before proceeding.

### 5B. Finding Completeness Check
- [ ] All Critical findings have been addressed in the task plan
- [ ] All High findings have been addressed in the task plan
- [ ] All market segment suitability gaps have proposed improvements
- [ ] All seller proposition improvements have implementation tasks
- [ ] No finding lacks a file:line citation
- [ ] Adversarial verification refuter tally is recorded

### 5C. Market Alignment Completeness Check
- [ ] Every market segment has a current-fit and target-fit rating
- [ ] Every segment with fit <=3 has proposed improvements
- [ ] Competitor analysis completed for each segment
- [ ] Buyer-ready artifact quality assessed per segment

### 5D. New Feature Rating Table
Rate every new feature/improvement that will be implemented or experienceable
after implementation, on a scale of 1-5 across 5 dimensions:

| # | New Feature/Improvement | Market Impact (1-5) | Implementation Effort (1-5, 5=easy) | Seller Proposition Strength (1-5) | User Experience Gain (1-5) | Technical Risk Reduction (1-5) | Avg Score |
|---|---|---|---|---|---|---|---|

- **Market Impact**: How much does this expand addressable market or segment fit?
- **Implementation Effort**: How easy is it to implement? (5 = trivial, 1 = very hard)
- **Seller Proposition Strength**: How much does this strengthen the sales pitch?
- **User Experience Gain**: How much does this improve the user experience?
- **Technical Risk Reduction**: How much does this reduce security/performance/failure risk?

Sort by average score descending. Flag features with avg >=4.0 as "high-impact quick wins".

### 5E. Final Confidence Assessment
- Overall audit confidence: ___% (must be >95% to proceed)
- Unverified items: list each with reason
- Residual risks: list each with mitigation
- Open questions: list each with who needs to decide

### Phase 5 Exit Criteria Checklist
Before producing the deliverable, confirm:
- [ ] All phase exit criteria audited (all met or justified)
- [ ] Finding completeness check passed
- [ ] Market alignment completeness check passed
- [ ] New Feature Rating Table complete (all features rated on 5 dimensions)
- [ ] Overall confidence >95% (or unmet items explicitly listed)
- [ ] **Exit criteria met: Y/N** (if N, list unmet items)

---

## Deliverable

Write one file: `docs/audits/audit-{YYYY-MM-DD}.md`

Structure:
1. **Audited commit SHA, date, method note, refuter tally, overall confidence**
2. **Executive Summary**: Health grade A-F, top 3 risks, top 3 opportunities,
   GO/NO-GO recommendation. Lead with the outcome.
3. **Calibration Baseline**: 5-10 bullets from Phase 0
4. **Repo Map**: Purpose, stack, entry points, data flows, conventions
5. **Gravity Wells Table**: Rank, file, LOC, commits, priority score, tests?, issue
6. **Top 15 Key Features (A/B/C)**: Feature, category, entry point, status, test coverage, segments served
7. **Market Segment Analysis**: Segment table with current fit, competitor comparison, buyer requirements
8. **Feature-to-Segment Suitability Matrix**: Cross-verification with gaps highlighted
9. **Audit Report** (worst first, grouped by dimension):
   - Per dimension: [DEEP] or [SHALLOW] label with justification
   - Findings table: ID, tier, category, file:line, issue, risk, fix, confidence, fact/judgment, market segment impact
   - Internet research sources consulted per dimension
10. **False Positive Log**: 2-5 dismissed issues with why
11. **Improvement Strategy**: 3-5 themes, target states, non-fixes, done signals
12. **Market Alignment & Seller Proposition Improvements**: Per-segment improvements, marketability gains, competitive gap closures
13. **Phase-by-Phase Gap Implementation Plan**: Gap-to-phase mapping, M0-M4 milestones, task table, quick wins, implementation sketches
14. **New Feature Rating Table**: All new features rated on 5 dimensions (scale of 1-5), sorted by average score
15. **Tooling Gaps**: Missing tools with one-line install commands
16. **Metrics Snapshot**: LOC, coverage, lint baseline, TODO count, CVE count
17. **Phase Exit Criteria Summary**: All phases, all items, met/unmet status
18. **Open Questions**: Each naming the decision the user needs to make
19. **Multi-Model Pipeline Recommendation**: Suggest which models to use for
    which phases (Haiku->map, Sonnet->audit, Opus->threats, Fable->backlog)

Write it for a reader who didn't watch you work: lead with the outcome,
complete sentences, spell out terms, no working shorthand. Don't pad — be
selective about what you include, don't compress the writing.

## Memory System

Store one lesson per file with a one-line summary at the top. Record
corrections and confirmed approaches alike, including why they mattered.
Don't save what the repo or chat history already records; update an existing
note rather than creating a duplicate; delete notes that turn out to be wrong.

## Checkpoint Behavior

Pause for the user only when the work genuinely requires them:
- A destructive or irreversible action
- A real scope change
- Input that only they can provide

If you hit one of these, ask and end the turn. Do not end on a promise.

## Autonomous Pipeline

You are operating autonomously. The user is not watching in real time and
cannot answer questions mid-task, so asking "Want me to...?" or "Shall I...?"
will block the work. For reversible actions that follow from the original
request, proceed without asking. Offering follow-ups after the task is done
is fine; asking permission after already discussing the work is not. Before
ending your turn, check your last paragraph. If it is a plan, an analysis, a
question, a list of next steps, or a promise about work you have not done
("I'll...", "let me know when..."), do that work now with tool calls. End your
turn only when the task is complete or you are blocked on input only the user
can provide.

## Boundary Definitions

When the user is describing a problem, asking a question, or thinking out loud
rather than requesting a change, the deliverable is your assessment. Report
your findings and stop. Don't apply a fix until they ask for one. Before
running a command that changes system state (restarts, deletes, config edits),
check that the evidence actually supports that specific action. A signal that
pattern-matches to a known failure may have a different cause.

## Context Budget Management

If the codebase exceeds context limits, prioritize:
1. Entry points (main.tsx, App.tsx, index.ts)
2. Auth/payment/security code
3. Data flow paths (API routes, DB queries, state management)
4. Config files (package.json, tsconfig, vite.config, netlify.toml)
5. Commercial/market docs (README, COMMERCIAL_SOURCE_OF_TRUTH, pricing pages)

Skip generated/vendored code (dist/, node_modules/, .venv/, *.min.*).

## SAST/DAST Integration

Run alongside automated scanners where available:
- `npm audit` for dependency CVEs
- `eslint` security rules
- Existing CI security checks
- `semgrep` if installed

Incorporate scanner output into findings. Do not rely on AI-only audit for
issues that automated scanners catch reliably.

---

## Research Provenance

This skill synthesizes 18 research sources (June-July 2026):

1. Anthropic Official Fable 5 Prompting Guide — effort levels, progress auditing, boundaries, parallel subagents, memory, safety classifier fallback
2. @meta_alchemist viral Fable 5 audit prompt — 4-phase structure, A-F health score, M1-M3 milestones
3. OmerFarukOruc /repo-audit gist — parallel subagents, adversarial verification, git-history mining
4. byhartvig/fable5-prompting — 4-component structure (Context -> Request -> Output -> Constraints)
5. AlphaSignal AI guide — 4 deletions, 5 additions, 5 verbatim Anthropic prompt blocks
6. tinosingh/Code-Health-Check-Prompt — Phase 0 Calibration, gravity wells, refactor priority score
7. zakarya526/fable-skill — model routing (Fable plans, Opus executes), STOP conditions
8. DEV Community 5-model comparison — multi-model pipeline (Haiku->map, Sonnet->audit, Opus->threats, Fable->backlog)
9. jamesccupps/Claude-Audit-Template — "read the code; do not skim"
10. GuidanceStudio/code-repository-audit-skill — 13-dimension framework
11. Iron-Ham/claude-deep-review — 49 parallel review agents
12. mohaqeq/architectural-pattern-auditor — 50-pattern catalog, conservative verification
13. MJWNA/large-codebase-audit-skill — 9 surfaces, adaptive dispatch
14. webvise Fable 5 cost-control — read-only first run, review gate
15. knightli.com migration notes — timeout strategy, verifier subagents
16. SurePrompts Opus 4.7 guide — "do not infer" guard, verbatim quotes
17. agency-In-a-box/code-audit-sop — finding IDs, phased remediation
18. Simon Roses security prompting — threat-model-first, iterative repair

Full gap analysis: see `gap-analysis.md` in this skill directory.
