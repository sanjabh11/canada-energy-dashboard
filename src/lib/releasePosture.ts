export interface ReleasePostureItem {
  title: string;
  status: 'verified' | 'watch' | 'external_gate' | 'needs_remediation';
  rating: string;
  evidence: string;
  nextAction: string;
}

export const RELEASE_POSTURE: ReleasePostureItem[] = [
  {
    title: 'Production deploy gate and live parity',
    status: 'watch',
    rating: '4.2/5',
    evidence: 'Deploy script and post-deploy gates are configured, but latest live parity is proven only when `check:post-deploy-live` passes after the explicit production deploy.',
    nextAction: 'Run `pnpm run report:production-approval-packet`, obtain the exact owner approval phrase, deploy, then run `pnpm run check:post-deploy-live`.',
  },
  {
    title: 'GitHub release and cron gates',
    status: 'verified',
    rating: '4.7/5',
    evidence: 'CI, trained dispatch soak, PV fault soak, and Weather Ingestion cron are expected to pass on the current main branch.',
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
];
