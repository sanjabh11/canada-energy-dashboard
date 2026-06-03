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
    status: 'watch',
    rating: '4.2/5',
    evidence: 'The current pushed `main` source passes local release readiness and is ready for an explicit owner-approved remediation deploy request, but live static parity is not achieved because production still serves the older deployed artifact.',
    nextAction: 'Deploy only after explicit `DEPLOY CEIP PRODUCTION` approval, then rerun `pnpm run check:post-deploy-live` before calling current-source live parity complete.',
  },
  {
    title: 'GitHub release and cron gates',
    status: 'verified',
    rating: '4.7/5',
    evidence: 'GitHub CI passed for the current pushed `main` source; recent scheduled/soak workflows remain visible as separate workflow evidence and must be reviewed after their own triggers.',
    nextAction: 'Review GitHub Actions after every push because older failed runs remain visible until superseded.',
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
    status: 'watch',
    command: 'pnpm run check:post-deploy-live',
    evidenceBoundary: 'Production deploy `6a1fc17dad273f241f9ba768` previously passed hosted metadata, exact static dist parity, and hosted proof-pack smoke for that deployed artifact only; current pushed source is ahead of production until a new approved deploy passes post-deploy live checks.',
    publicReference: {
      label: 'Netlify deploy',
      url: 'https://app.netlify.com/projects/canada-energy/deploys/6a1fc17dad273f241f9ba768',
    },
  },
  {
    label: 'Current source deploy request',
    status: 'verified',
    command: 'pnpm run report:production-approval-packet',
    evidenceBoundary: 'Source deploy provenance and local release readiness pass on clean pushed `main`; live metadata passes, live static dist parity fails, and deployment request readiness is ready for explicit owner approval.',
  },
  {
    label: 'Current source CI gate',
    status: 'verified',
    command: 'gh run list --repo sanjabh11/canada-energy-dashboard --limit 5',
    evidenceBoundary: 'GitHub CI must pass on the current pushed commit before source is considered release-ready; source CI still does not prove that production has been redeployed from that commit.',
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
