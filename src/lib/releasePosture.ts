export interface ReleasePostureItem {
  title: string;
  status: 'verified' | 'watch' | 'external_gate' | 'needs_remediation';
  rating: string;
  evidence: string;
  nextAction: string;
}

export interface ReleaseHealthEvidenceItem {
  label: string;
  status: ReleasePostureItem['status'];
  command: string;
  evidenceBoundary: string;
  publicReference?: {
    label: string;
    url: string;
  };
}

export interface DeploymentApprovalChecklistItem {
  gate: string;
  status: 'predeploy_ready' | 'manual_stop' | 'postdeploy_required' | 'external_gate';
  command: string;
  evidenceBoundary: string;
}

export interface SupabaseAdvisorStatusCheck {
  id: 'cli_app_lint' | 'security_performance_advisors';
  label: string;
  source: string;
  status: ReleasePostureItem['status'];
  proofBucket: string;
  command: string;
  evidenceBoundary: string;
  nextAction: string;
}

export interface SupabaseAdvisorStatusCard {
  title: string;
  status: ReleasePostureItem['status'];
  projectRef: string;
  decisionBoundary: string;
  docsReference: {
    label: string;
    url: string;
  };
  checks: SupabaseAdvisorStatusCheck[];
}

export const RELEASE_POSTURE: ReleasePostureItem[] = [
  {
    title: 'Last approved production artifact parity',
    status: 'verified',
    rating: '5.0/5',
    evidence: 'The last approved production artifact passed remote metadata, hosted `/`, `/manifest.json`, `/schema-webapp.jsonld` static parity, and hosted proof-pack smoke for that deployed artifact only.',
    nextAction: 'Preserve this as last-approved artifact evidence; do not treat a future source commit as live-proven until a new approved deploy passes `pnpm run check:post-deploy-live`.',
  },
  {
    title: 'Current source live parity',
    status: 'external_gate',
    rating: '2.0/5',
    evidence: 'Latest local/source changes are not live-proven by the last approved artifact, local build output, source CI, or launch evidence validation. Current source becomes live-proven only after clean source provenance, launch evidence validation, explicit owner approval, production deploy, and post-deploy live parity checks.',
    nextAction: 'Run `pnpm run report:production-approval-packet` with launch evidence validation passing; after clean provenance and explicit owner approval, deploy through the guarded path and rerun `pnpm run check:post-deploy-live`.',
  },
  {
    title: 'GitHub release and cron gates',
    status: 'watch',
    rating: '4.3/5',
    evidence: 'GitHub CI is a required release gate for the current pushed `main` source, but local source can be ahead of origin or dirty. The approval packet now distinguishes staged-only, unstaged-only, mixed, untracked, and ignored source blockers before any deploy request. Source CI still does not prove production deploy parity.',
    nextAction: 'Refresh `pnpm run report:production-approval-packet -- --skip-release-readiness`, `git status --porcelain=v1 --branch`, and GitHub Actions after every push; only a post-deploy live gate proves the hosted artifact.',
  },
  {
    title: 'Unmerged branch review queue',
    status: 'external_gate',
    rating: '2.0/5',
    evidence: 'The current unmerged-branch report finds 4 high-risk, 3 medium-risk, and 1 low-risk local/origin refs touching deploy, Supabase, payment, ML, source-app, UI, or claim surfaces. Launch evidence now carries three review-first branch packets with canonical-head state and changed Supabase function rows. These branches are review queues only and do not create launch evidence, buyer proof, or production approval.',
    nextAction: 'Review the launch manifest review-first packets, choose canonical heads for split branch families, complete focused security/release checks, and merge only through normal release gates.',
  },
  {
    title: 'Supabase edge-function surface',
    status: 'watch',
    rating: '4.1/5',
    evidence: '`llm`, `weather-ingestion-cron`, and `ops-health` are deployed on the linked Supabase project, while many older edge functions predate the current proof-pack strategy.',
    nextAction: 'Keep edge-function deploys function-scoped and verify each cron or route after deployment; do not treat older active functions as current proof-pack evidence without route-specific smoke.',
  },
  {
    title: 'Buyer-evidence confidence gate',
    status: 'external_gate',
    rating: '1.5/5',
    evidence: 'The app has templates, intake packets, retained-artifact hashing, and the hard 95% validator, but no real accepted buyer register is present.',
    nextAction: 'Collect anonymized buyer evidence; keep rehearsal-only rows at `confidence_delta=0`.',
  },
  {
    title: 'Supabase database lint posture',
    status: 'watch',
    rating: '4.1/5',
    evidence: 'The last recorded `pnpm run report:supabase-app-lint` posture showed zero app-owned lint findings on the linked project; a fresh run must complete before stronger production-security claims because CLI access can fail before classification.',
    nextAction: 'Keep `check:supabase-app-lint` in the production preflight, provide database credentials when required, and review account-level Supabase dashboard advisors manually before stronger production-security claims.',
  },
  {
    title: 'Supabase advisor connector access',
    status: 'needs_remediation',
    rating: '2.0/5',
    evidence: 'Supabase MCP security and performance advisor calls still return permission denied for project `qnymbecjgeaoxsfphrti`; CLI lint works, but connector-backed advisor evidence is unavailable.',
    nextAction: 'Fix Supabase connector or project authorization, then rerun the security and performance advisors before claiming connector-level Supabase review coverage.',
  },
];

export const RELEASE_HEALTH_EVIDENCE: ReleaseHealthEvidenceItem[] = [
  {
    label: 'Last verified production artifact',
    status: 'verified',
    command: 'pnpm run check:post-deploy-live',
    evidenceBoundary: 'The latest approved production deploy passed hosted metadata, exact static dist parity, and hosted proof-pack smoke for that deployed artifact only; future source changes require another approved deploy and post-deploy live check.',
    publicReference: {
      label: 'Netlify deploys',
      url: 'https://app.netlify.com/projects/canada-energy/deploys',
    },
  },
  {
    label: 'Latest approved production parity',
    status: 'verified',
    command: 'pnpm run check:post-deploy-live',
    evidenceBoundary: 'The approved production artifact passed live metadata, exact static dist parity, and hosted proof-pack route smoke for that artifact only; this does not prove future source commits are deployed.',
  },
  {
    label: 'Current source live parity',
    status: 'external_gate',
    command: 'pnpm run report:production-approval-packet && pnpm run check:post-deploy-live',
    evidenceBoundary: 'Current source is not live-proven until source provenance is clean, launch evidence validation passes, owner approval is explicit, the guarded production deploy runs, and post-deploy live parity passes.',
  },
  {
    label: 'Launch evidence validation gate',
    status: 'external_gate',
    command: 'pnpm run report:launch-evidence-validation-readiness && pnpm run check:launch-evidence-validation-report',
    evidenceBoundary: 'Launch evidence validation checks manifest structure and proof-boundary consistency only; it does not prove production approval, buyer acceptance, commercial readiness, deployment, or current hosted/live parity.',
  },
  {
    label: 'Objective completion audit',
    status: 'external_gate',
    command: 'pnpm run report:objective-completion-audit-readiness && pnpm run check:objective-completion-audit-report',
    evidenceBoundary: 'The objective completion audit maps required launch deliverables, present report tables, blocked P0/P1 gates, manual-stop rows, and next proof commands, but it does not prove production approval, buyer acceptance, commercial launch readiness, deployment, hosted/live parity, Supabase clearance, branch approval, source readiness, or permission to contact buyers.',
  },
  {
    label: 'Adversarial review ledger',
    status: 'external_gate',
    command: 'pnpm run report:adversarial-review-readiness && pnpm run check:adversarial-review-report',
    evidenceBoundary: 'The adversarial review ledger maps buyer evidence, production approval, release toolchain, Supabase advisor clearance, and branch-risk challenge lanes, but it does not prove production approval, buyer acceptance, release readiness, Supabase clearance, branch approval, deployment, hosted/live parity, or commercial launch readiness.',
  },
  {
    label: 'Fix report blocker map',
    status: 'external_gate',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run check:commercial-launch-readiness-report && pnpm run report:launch-evidence-manifest && pnpm run check:launch-evidence-manifest',
    evidenceBoundary: 'The fix report blocker map summarizes files changed, tests run, required checks, unresolved blockers, and approval gates from the launch evidence manifest, but it does not modify files, run missing checks, clear buyer evidence, source provenance, branch review, Supabase advisor clearance, release toolchain, production approval, deployment, hosted/live parity, or commercial launch readiness. It does not prove production approval.',
  },
  {
    label: 'Progress update digest',
    status: 'external_gate',
    command: 'pnpm run report:progress-digest-readiness && pnpm run check:progress-digest-report',
    evidenceBoundary: 'The progress update digest summarizes accomplished work, target matrix, pending work, current bottleneck, and phase progress from the launch evidence manifest, but it does not complete pending work, clear blockers, run checks, contact buyers, approve branches, deploy, prove hosted/live parity, or create commercial launch readiness. It does not prove production approval.',
  },
  {
    label: 'Bottleneck log digest',
    status: 'external_gate',
    command: 'pnpm run report:progress-digest-readiness && pnpm run check:progress-digest-report',
    evidenceBoundary: 'The bottleneck log digest summarizes the blocked task or subtask, elapsed time, last update, root cause, and top unblock options from the launch evidence manifest, but it does not resolve evidence gaps, collect buyer artifacts, authorize Supabase advisors, choose branch heads, approve deploys, mutate live services, prove hosted/live parity, or create commercial launch readiness. It does not prove production approval.',
  },
  {
    label: 'Current source CI gate',
    status: 'watch',
    command: 'gh run list --repo sanjabh11/canada-energy-dashboard --limit 5',
    evidenceBoundary: 'GitHub CI must pass on the current pushed commit before source is considered release-ready; source CI still does not prove that production has been redeployed from that commit, and local ahead-of-origin, staged-only, or unstaged source blockers must be checked separately.',
  },
  {
    label: 'Source provenance isolation ledger',
    status: 'external_gate',
    command: 'pnpm run report:source-provenance-readiness && pnpm run check:source-provenance-report',
    evidenceBoundary: 'The source provenance isolation ledger classifies dirty source paths by tracked, untracked, ignored, staged-only, unstaged-only, mixed, rename or move, and release-blocking state, but it does not commit, unstage, stash, revert, delete, rename, move, clear source provenance, run release-readiness, deploy, or grant approval. It does not prove current local cleanliness or production approval.',
  },
  {
    label: 'Source provenance resolution queue',
    status: 'external_gate',
    command: 'pnpm run report:source-provenance-readiness && pnpm run check:source-provenance-report',
    evidenceBoundary: 'The source provenance resolution queue classifies staged-only, unstaged-only, mixed, untracked, ignored, and renamed source decisions, but it does not commit, unstage, stash, revert, delete, rename, move, or clear source provenance. It does not prove current local cleanliness or grant production approval.',
  },
  {
    label: 'Release toolchain and approval deficit ledger',
    status: 'external_gate',
    command: 'pnpm run report:release-preflight && pnpm run check:release-preflight-report',
    evidenceBoundary: 'The release toolchain and approval deficit ledger maps package-manager pin, Corepack pnpm resolver, release-readiness execution, Git LFS push-path proof, clean source provenance, and explicit owner production approval deficits, but it does not install tools, clear source provenance, run release-readiness, push, deploy, prove hosted/live parity, grant owner approval, or create launch readiness. It does not prove production approval.',
  },
  {
    label: 'Release preflight remediation queue',
    status: 'external_gate',
    command: 'pnpm run report:release-preflight && pnpm run check:release-preflight-report',
    evidenceBoundary: 'The release preflight remediation queue sequences Corepack pnpm resolver, release-readiness execution, Git LFS push-path proof, clean source provenance, and explicit owner production approval, but it does not install tools, clear source provenance, run release-readiness, push, or deploy. It does not prove production approval.',
  },
  {
    label: 'Release operator handoff packet',
    status: 'external_gate',
    command: 'pnpm run report:release-preflight && pnpm run check:release-preflight-report',
    evidenceBoundary: 'The focused release preflight report/check maps release remediation rows into non-executable operator or owner execution gates, including toolchain_probe_first, after_corepack_git_lfs_and_clean_source, owner_source_decision_first, manual_stop_after_all_prerequisites, blocks_release_gate, and can_execute_from_packet=false. It does not install Corepack, enable Corepack, install Git LFS, run release-readiness, clear source provenance, push, deploy, request production approval, grant owner approval, or prove hosted/live parity. It does not prove production approval or create launch readiness.',
  },
  {
    label: 'Release preflight clearance matrix',
    status: 'external_gate',
    command: 'pnpm run report:release-preflight && pnpm run check:release-preflight-report',
    evidenceBoundary: 'The release preflight clearance matrix maps package-manager pin, Corepack pnpm resolver, release-readiness execution, Git LFS push-path proof, clean source provenance, and explicit owner production approval, but it does not install tools, clear source provenance, run release-readiness, push, deploy, or grant owner approval. It does not prove production approval or current hosted/live parity.',
  },
  {
    label: 'Release toolchain probe ledger',
    status: 'external_gate',
    command: 'pnpm run report:release-preflight && pnpm run check:release-preflight-report',
    evidenceBoundary: 'The release toolchain probe ledger records current-shell Corepack pnpm resolver and Git LFS availability evidence, but it does not install tools, run release-readiness, push, deploy, clear source provenance, or grant production approval. It does not substitute for release-readiness or production approval.',
  },
  {
    label: 'Unmerged branch review queue',
    status: 'external_gate',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
    evidenceBoundary: 'The focused branch review report/check exposes high-risk unmerged refs, review-first packet evidence, canonical-head rows, and production approval branch rows; this does not create launch evidence, buyer proof, production approval, merges, checkouts, migrations, or deploys.',
  },
  {
    label: 'Branch family freshness rollup',
    status: 'external_gate',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
    evidenceBoundary: 'The focused branch review report/check surfaces local-only, origin-only, matching, local-ahead, origin-ahead, diverged, stale, aging, fresh, high-risk, and review-first branch-family counts from read-only branch evidence, but it does not checkout, merge, push, discard, select canonical heads, migrate, deploy, or clear branch review. It does not create launch evidence, prove current source readiness, or prove production approval.',
  },
  {
    label: 'Top branch review packet',
    status: 'external_gate',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
    evidenceBoundary: 'The focused branch review report/check surfaces the current highest-priority focused read-only branch packet, local/origin state, branch freshness, changed categories, changed Supabase function rows, and canonical-head comparison, but it does not checkout, merge, push, discard, migrate, deploy, mutate Supabase, select a canonical head, or clear branch review. It does not create launch evidence or prove production approval.',
  },
  {
    label: 'Branch clearance matrix',
    status: 'external_gate',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
    evidenceBoundary: 'The focused branch review report/check maps read-only branch review rows, review-first families, canonical-head decisions, stale or aging drift review, and release-gate dependencies, but it does not checkout, merge, push, discard, select canonical heads, run migrations, deploy, grant production approval, or clear branch review. It does not create launch evidence or prove production approval.',
  },
  {
    label: 'Branch operator handoff packet',
    status: 'external_gate',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
    evidenceBoundary: 'The focused branch review report/check maps branch clearance rows into operator or owner execution gates, including read-only focused review first, owner canonical-head decision first, blocking branch-gate rows, and can_execute_from_packet=false. It does not checkout, merge, push, discard, delete, select canonical heads, run migrations, mutate Supabase, deploy, request production approval, grant owner approval, prove hosted/live parity, or clear branch review. It does not create launch evidence or prove production approval.',
  },
  {
    label: 'Canonical head decision queue',
    status: 'external_gate',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
    evidenceBoundary: 'The focused branch review report/check surfaces split, local-only, origin-only, stale, aging, and unknown branch-family decisions before merge review, but it does not checkout, merge, push, discard, deploy, or select a branch head. It does not create launch evidence or prove production approval.',
  },
  {
    label: 'Canonical head resolution queue',
    status: 'external_gate',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
    evidenceBoundary: 'The focused branch review report/check maps owner-decision actions for split, local-only, origin-only, stale, aging, and unknown branch-family states, but it does not checkout, merge, push, discard, delete, select canonical heads, migrate, deploy, grant production approval, or clear branch review. It does not create launch evidence or prove production approval.',
  },
  {
    label: 'Review-first branch packet queue',
    status: 'external_gate',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
    evidenceBoundary: 'The focused branch review report/check surfaces focused read-only branch packets, canonical-head state, changed Supabase function rows, and drift risk before any branch decision, but it does not checkout, merge, push, discard, migrate, deploy, mutate Supabase, or select a canonical head. It does not create buyer proof or create production approval.',
  },
  {
    label: 'Launch blocker action queue',
    status: 'external_gate',
    command: 'pnpm run report:launch-action-readiness && pnpm run check:launch-action-report',
    evidenceBoundary: 'The launch blocker action queue sequences source provenance, launch evidence validation, release toolchain, branch review, Supabase advisor access, buyer evidence, production approval, and post-deploy live proof; it does not deploy, merge, contact buyers, mutate branches, clear blockers, prove launch evidence validation, or create launch readiness, and it does not create launch readiness.',
  },
  {
    label: 'Production approval prerequisite queue',
    status: 'external_gate',
    command: 'pnpm run report:production-approval-readiness && pnpm run check:production-approval-report',
    evidenceBoundary: 'The production approval prerequisite queue sequences clean source provenance, launch evidence validation, Corepack release-readiness, canonical branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, and post-deploy live proof; it does not prove production approval, deploy, push, merge, mutate branches, contact buyers, access Supabase, clear source provenance, prove launch evidence validation, or claim post-deploy live parity.',
  },
  {
    label: 'Production approval request packet',
    status: 'external_gate',
    command: 'pnpm run report:production-approval-readiness && pnpm run check:production-approval-report && pnpm run check:production-deploy-request',
    evidenceBoundary: 'The production approval request packet classifies prerequisite rows into pre-request, owner-decision, and post-deploy-boundary phases, but it does not prove production approval, deploy, push, merge, mutate branches, contact buyers, access Supabase, clear source provenance, request owner approval, or prove hosted/live parity.',
  },
  {
    label: 'Post-deploy live proof gate queue',
    status: 'external_gate',
    command: 'pnpm run report:post-deploy-live-proof-readiness && pnpm run check:post-deploy-live-proof-report',
    evidenceBoundary: 'The post-deploy live proof gate queue sequences production approval clearance, guarded deploy completion, live public metadata, live static dist parity, hosted proof-pack route smoke, and current-source hosted parity claim; it does not prove current hosted/live parity, deploy, push, rebuild, mutate Netlify, access live accounts, or run browser smoke.',
  },
  {
    label: 'Local proof-pack browser smoke',
    status: 'external_gate',
    command: 'pnpm run test:browser:local:proof-packs',
    evidenceBoundary: 'The local proof-pack browser smoke runs Chromium checks for /utility-demand-forecast, /forecast-benchmarking, /regulatory-filing, /pilot-readiness, /ga-ici-5cp, and /byo-csv-proof against a local preview with Playwright reports under /tmp/ceip-local-proof-packs-*. It is local evidence only. It does not create buyer evidence, satisfy Corepack-pinned release-readiness, deploy, mutate Netlify, run hosted proof-pack smoke, prove post-deploy live parity, grant production approval, or create launch readiness.',
  },
  {
    label: 'Buyer evidence hard-gate deficit ledger',
    status: 'external_gate',
    command: 'pnpm run report:buyer-evidence-gate-readiness && pnpm run check:buyer-evidence-gate-report',
    evidenceBoundary: 'The buyer evidence hard-gate deficit ledger maps accepted buyer evidence, reviewer evidence, commercial signal, retained artifacts, and 95% validation deficits, but it does not contact buyers, create accepted evidence, move confidence, attach artifacts, validate 95%, or claim buyer acceptance. It does not create buyer proof or prove commercial readiness.',
  },
  {
    label: 'Buyer evidence acquisition matrix',
    status: 'external_gate',
    command: 'pnpm run report:buyer-evidence-gate-readiness && pnpm run check:buyer-evidence-gate-report',
    evidenceBoundary: 'The buyer evidence acquisition matrix maps outreach intake, production pilot register, utility forecast, TIER or credit, billing or security, distinct proof-pack, accepted confidence, reviewer, retained artifact, and 95% validation rows, but it does not contact buyers, create accepted evidence, move confidence, attach artifacts, validate 95%, or claim buyer acceptance. It does not create buyer proof or prove commercial readiness.',
  },
  {
    label: 'Buyer evidence remediation queue',
    status: 'external_gate',
    command: 'pnpm run report:buyer-evidence-gate-readiness && pnpm run check:buyer-evidence-gate-report',
    evidenceBoundary: 'The buyer evidence remediation queue maps non-pass buyer hard-gate rows for accepted buyer evidence, reviewer evidence, commercial signal, retained artifacts, and 95% validation, but it does not contact buyers. It does not create accepted evidence, move confidence, attach artifacts, validate 95%, or claim buyer acceptance.',
  },
  {
    label: 'Supabase advisor remediation queue',
    status: 'needs_remediation',
    command: 'pnpm run report:supabase-advisor-readiness && pnpm run check:supabase-advisor-report',
    evidenceBoundary: 'The Supabase advisor remediation queue maps CLI lint freshness, connector authorization, Security Advisor evidence, Performance Advisor evidence, public-safe findings, and no-clearance-claim rows, but it does not authorize connectors, access the dashboard, rerun advisors, mutate the database, or record secrets. It does not create or claim advisor clearance.',
  },
  {
    label: 'Supabase advisor clearance deficit ledger',
    status: 'needs_remediation',
    command: 'pnpm run report:supabase-advisor-readiness && pnpm run check:supabase-advisor-report',
    evidenceBoundary: 'The Supabase advisor clearance deficit ledger maps CLI lint freshness, connector authorization, Security Advisor evidence, Performance Advisor evidence, public-safe findings, and the no-clearance claim row, but it does not authorize connectors, access the dashboard, rerun advisors, mutate the database, record secrets, clear advisor findings, or claim advisor clearance. It does not grant production approval or create launch readiness, and it does not create advisor clearance.',
  },
  {
    label: 'Buyer evidence scan',
    status: 'external_gate',
    command: 'pnpm run report:buyer-evidence-readiness',
    evidenceBoundary: 'Current scan finds no production buyer-evidence register or outreach response log outside templates/fixtures, so buyer-proven 95% market confidence remains blocked.',
  },
  {
    label: 'Supabase CLI app lint',
    status: 'watch',
    command: 'pnpm run check:supabase-app-lint',
    evidenceBoundary: 'Last recorded CLI lint evidence reports zero app-owned findings; if the lint command fails before classification, treat database lint proof as stale and credential/connectivity-gated until rerun.',
  },
  {
    label: 'Supabase MCP advisors',
    status: 'needs_remediation',
    command: 'Supabase MCP security/performance advisors for qnymbecjgeaoxsfphrti',
    evidenceBoundary: 'Connector advisor calls return permission denied, so connector-backed security/performance advisor evidence is unavailable until project authorization is fixed.',
  },
];

export const SUPABASE_ADVISOR_STATUS_CARD: SupabaseAdvisorStatusCard = {
  title: 'Supabase advisor status',
  status: 'needs_remediation',
  projectRef: 'qnymbecjgeaoxsfphrti',
  decisionBoundary: 'This public card separates Supabase CLI database lint from Supabase Database Security and Performance Advisors. It does not claim advisor clearance, production approval, or security review completion.',
  docsReference: {
    label: 'Supabase Database Advisors docs',
    url: 'https://supabase.com/docs/guides/database/database-advisors',
  },
  checks: [
    {
      id: 'cli_app_lint',
      label: 'CLI app lint refresh',
      source: 'Supabase CLI database lint',
      status: 'watch',
      proofBucket: 'local/CLI',
      command: 'pnpm run report:supabase-app-lint',
      evidenceBoundary: 'Last recorded CLI app lint showed zero app-owned findings, but this check must rerun successfully before stronger security claims; CLI lint does not substitute for Database Security or Performance Advisors.',
      nextAction: 'Set database credentials when required and rerun `report:supabase-app-lint` or `check:supabase-app-lint` before approval packets.',
    },
    {
      id: 'security_performance_advisors',
      label: 'Security and Performance Advisors',
      source: 'Supabase MCP connector or Supabase dashboard',
      status: 'needs_remediation',
      proofBucket: 'external account',
      command: 'Supabase MCP security/performance advisors for qnymbecjgeaoxsfphrti',
      evidenceBoundary: 'Connector advisor access is permission-dependent and currently unavailable, so advisor evidence remains blocked until project authorization is fixed and advisors are rerun.',
      nextAction: 'Fix Supabase connector or project authorization, then rerun security and performance advisors before claiming connector-level Supabase review coverage.',
    },
  ],
};

export const DEPLOYMENT_APPROVAL_CHECKLIST: DeploymentApprovalChecklistItem[] = [
  {
    gate: 'Pre-deploy source and release gate',
    status: 'predeploy_ready',
    command: 'pnpm run check:production-deploy-request',
    evidenceBoundary: 'Proves clean main-branch source, launch evidence validation, local release readiness, and whether production is ready for an approved remediation deploy request.',
  },
  {
    gate: 'Owner production approval',
    status: 'manual_stop',
    command: 'Type DEPLOY CEIP PRODUCTION in the guarded deploy script only after approval.',
    evidenceBoundary: 'This is the manual production stop; no script output or local check substitutes for explicit owner approval.',
  },
  {
    gate: 'Post-deploy live parity',
    status: 'postdeploy_required',
    command: 'pnpm run check:post-deploy-live',
    evidenceBoundary: 'Proves hosted metadata, exact static dist parity, and hosted proof-pack route smoke after the current artifact is deployed.',
  },
  {
    gate: 'Buyer-proven confidence',
    status: 'external_gate',
    command: 'pnpm run report:buyer-evidence-gate-readiness && pnpm run check:buyer-evidence-gate-report',
    evidenceBoundary: 'Deployment never raises market confidence; the focused buyer evidence gate report/check is an inspection handle only, and accepted buyer rows, reviewer feedback, commercial signal, retained hashes, and validate:pilot-evidence --require-95 are required before buyer confidence claims.',
  },
];
