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

export const RELEASE_POSTURE: ReleasePostureItem[] = [
  {
    title: 'Production deploy gate and live parity',
    status: 'verified',
    rating: '5.0/5',
    evidence: 'Production live parity is verified for the deployed artifact: remote metadata passed, hosted `/`, `/manifest.json`, and `/schema-webapp.jsonld` match built `dist`, and hosted proof-pack smoke passed.',
    nextAction: 'Rerun `pnpm run check:post-deploy-live` after every approved production deploy; do not treat a future source commit as live-proven until that gate passes again.',
  },
  {
    title: 'GitHub release and cron gates',
    status: 'watch',
    rating: '4.3/5',
    evidence: 'GitHub CI is a required release gate for the current pushed `main` source, but local source can be ahead of origin or dirty until `git status` and `gh run list` are refreshed. Source CI still does not prove production deploy parity.',
    nextAction: 'Refresh `git status --porcelain=v1 --branch` and GitHub Actions after every push; only a post-deploy live gate proves the hosted artifact.',
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
    evidence: '`pnpm run report:supabase-app-lint` reports zero app-owned lint findings on the linked project; remaining findings are extension-owned PostGIS/long-transaction functions.',
    nextAction: 'Keep `check:supabase-app-lint` in the production preflight and review account-level Supabase dashboard advisors manually before stronger production-security claims.',
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
    label: 'Current production parity gate',
    status: 'verified',
    command: 'pnpm run check:post-deploy-live',
    evidenceBoundary: 'The approved production artifact passed live metadata, exact static dist parity, and hosted proof-pack route smoke; rerun this after future source changes and production deploys.',
  },
  {
    label: 'Current source CI gate',
    status: 'watch',
    command: 'gh run list --repo sanjabh11/canada-energy-dashboard --limit 5',
    evidenceBoundary: 'GitHub CI must pass on the current pushed commit before source is considered release-ready; source CI still does not prove that production has been redeployed from that commit, and local ahead-of-origin work must be checked separately.',
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
    evidenceBoundary: 'CLI lint currently reports zero app-owned findings; extension-owned rows are not treated as app blockers.',
  },
  {
    label: 'Supabase MCP advisors',
    status: 'needs_remediation',
    command: 'Supabase MCP security/performance advisors for qnymbecjgeaoxsfphrti',
    evidenceBoundary: 'Connector advisor calls return permission denied, so connector-backed security/performance advisor evidence is unavailable until project authorization is fixed.',
  },
];

export const DEPLOYMENT_APPROVAL_CHECKLIST: DeploymentApprovalChecklistItem[] = [
  {
    gate: 'Pre-deploy source and release gate',
    status: 'predeploy_ready',
    command: 'pnpm run check:production-deploy-request',
    evidenceBoundary: 'Proves clean main-branch source, local release readiness, and whether production is ready for an approved remediation deploy request.',
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
