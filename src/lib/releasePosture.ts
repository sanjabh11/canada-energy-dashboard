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
    command: 'pnpm run check:launch-evidence-manifest && pnpm run report:production-approval-packet',
    evidenceBoundary: 'Launch evidence validation checks manifest structure and proof-boundary consistency only; it does not prove production approval, buyer acceptance, commercial readiness, deployment, or current hosted/live parity.',
  },
  {
    label: 'Current source CI gate',
    status: 'watch',
    command: 'gh run list --repo sanjabh11/canada-energy-dashboard --limit 5',
    evidenceBoundary: 'GitHub CI must pass on the current pushed commit before source is considered release-ready; source CI still does not prove that production has been redeployed from that commit, and local ahead-of-origin, staged-only, or unstaged source blockers must be checked separately.',
  },
  {
    label: 'Source provenance resolution queue',
    status: 'external_gate',
    command: 'pnpm run report:production-approval-packet -- --skip-release-readiness && pnpm run report:launch-evidence-manifest',
    evidenceBoundary: 'The source provenance resolution queue classifies staged-only, unstaged-only, mixed, untracked, ignored, and renamed source decisions, but it does not commit, unstage, stash, revert, delete, rename, move, or clear source provenance. It does not prove current local cleanliness or grant production approval.',
  },
  {
    label: 'Release preflight remediation queue',
    status: 'external_gate',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run report:launch-evidence-manifest',
    evidenceBoundary: 'The release preflight remediation queue sequences Corepack pnpm resolver, release-readiness execution, Git LFS push-path proof, clean source provenance, and explicit owner production approval, but it does not install tools, clear source provenance, run release-readiness, push, or deploy. It does not prove production approval.',
  },
  {
    label: 'Release toolchain probe ledger',
    status: 'external_gate',
    command: 'pnpm run report:launch-evidence-manifest',
    evidenceBoundary: 'The release toolchain probe ledger records current-shell Corepack pnpm resolver and Git LFS availability evidence, but it does not install tools, run release-readiness, push, deploy, clear source provenance, or grant production approval. It does not substitute for release-readiness or production approval.',
  },
  {
    label: 'Unmerged branch review queue',
    status: 'external_gate',
    command: 'pnpm run report:unmerged-branch-readiness && pnpm run report:launch-evidence-manifest',
    evidenceBoundary: 'Current branch inventory shows high-risk unmerged refs and review-first packet evidence; this does not create launch evidence, buyer proof, production approval, merges, checkouts, migrations, or deploys.',
  },
  {
    label: 'Canonical head decision queue',
    status: 'external_gate',
    command: 'pnpm run report:unmerged-branch-readiness && pnpm run report:launch-evidence-manifest',
    evidenceBoundary: 'The canonical head decision queue surfaces split, local-only, origin-only, stale, aging, and unknown branch-family decisions before merge review, but it does not checkout, merge, push, discard, deploy, or select a branch head. It does not create launch evidence or prove production approval.',
  },
  {
    label: 'Review-first branch packet queue',
    status: 'external_gate',
    command: 'pnpm run report:unmerged-branch-readiness -- --focus-risk high && pnpm run report:launch-evidence-manifest',
    evidenceBoundary: 'The review-first branch packet queue surfaces focused read-only branch packets, canonical-head state, changed Supabase function rows, and drift risk before any branch decision, but it does not checkout, merge, push, discard, migrate, deploy, mutate Supabase, or select a canonical head. It does not create buyer proof or create production approval.',
  },
  {
    label: 'Launch blocker action queue',
    status: 'external_gate',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run report:launch-evidence-manifest',
    evidenceBoundary: 'The launch blocker action queue sequences source provenance, launch evidence validation, release toolchain, branch review, Supabase advisor access, buyer evidence, production approval, and post-deploy live proof; it does not deploy, merge, contact buyers, mutate branches, clear blockers, prove launch evidence validation, or create launch readiness, and it does not create launch readiness.',
  },
  {
    label: 'Production approval prerequisite queue',
    status: 'external_gate',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run report:launch-evidence-manifest',
    evidenceBoundary: 'The production approval prerequisite queue sequences clean source provenance, launch evidence validation, Corepack release-readiness, canonical branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, and post-deploy live proof; it does not prove production approval, deploy, push, merge, mutate branches, contact buyers, access Supabase, clear source provenance, prove launch evidence validation, or claim post-deploy live parity.',
  },
  {
    label: 'Post-deploy live proof gate queue',
    status: 'external_gate',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run report:launch-evidence-manifest',
    evidenceBoundary: 'The post-deploy live proof gate queue sequences production approval clearance, guarded deploy completion, live public metadata, live static dist parity, hosted proof-pack route smoke, and current-source hosted parity claim; it does not prove current hosted/live parity, deploy, push, rebuild, mutate Netlify, access live accounts, or run browser smoke.',
  },
  {
    label: 'Buyer evidence remediation queue',
    status: 'external_gate',
    command: 'pnpm run report:buyer-evidence-readiness && pnpm run report:launch-evidence-manifest',
    evidenceBoundary: 'The buyer evidence remediation queue maps non-pass buyer hard-gate rows for accepted buyer evidence, reviewer evidence, commercial signal, retained artifacts, and 95% validation, but it does not contact buyers. It does not create accepted evidence, move confidence, attach artifacts, validate 95%, or claim buyer acceptance.',
  },
  {
    label: 'Supabase advisor remediation queue',
    status: 'needs_remediation',
    command: 'pnpm run report:launch-evidence-manifest',
    evidenceBoundary: 'The Supabase advisor remediation queue maps CLI lint freshness, connector authorization, Security Advisor evidence, Performance Advisor evidence, public-safe findings, and no-clearance-claim rows, but it does not authorize connectors, access the dashboard, rerun advisors, mutate the database, or record secrets. It does not create or claim advisor clearance.',
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
    command: 'pnpm run validate:pilot-evidence -- path/to/register.csv --require-95 --evidence-root path/to/redacted-artifacts',
    evidenceBoundary: 'Deployment never raises market confidence; accepted buyer rows, reviewer feedback, commercial signal, and retained hashes are required.',
  },
];
