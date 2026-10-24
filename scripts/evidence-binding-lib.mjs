// evidence-binding-lib.mjs — pure predicates for the two-state binding
// contract. Separated from IO so negative fixtures can test them without
// git/gh/network.

// Evidence-only allowlist: files a descendant of bound_source_sha may
// change without requiring a fresh source binding. Anything else —
// application code, tests, migrations, package files, CI workflow,
// security scripts, configuration — reopens the binding requirement.
export const EVIDENCE_ALLOWLIST = [
  /^goal\.md$/,
  /^mission\.md$/,
  /^docs\/remediation\/CEIP_AUDIT_ADDENDUM_\d{4}-\d{2}-\d{2}B?\.md$/,
  /^docs\/staging\/(FOUR_TABLE_DECISIONS|FUNCTION_DEPLOYMENT_MANIFEST|MIGRATION_REPLAY_COMPARISON|OWNER_SIGNOFF_MATRIX|STORAGE_RECEIPT_TEMPLATE|WITHHELD_ROWS_RECONCILIATION_PACKET)\.md$/,
  /^\.phase-loop\//,
  /^\.positioning-audit\//,
];

export function isEvidenceFile(f) {
  return EVIDENCE_ALLOWLIST.some((re) => re.test(f));
}

// Merge commits need the -m parent comparison. Without it, git diff-tree
// returns no paths for a merge and a code change can be mistaken for an
// evidence-only descendant.
export function diffTreeArgs(sha) {
  return ['diff-tree', '--no-commit-id', '--name-only', '-r', '-m', sha];
}

export function parseFileList(output) {
  return [...new Set(output.split('\n').map((f) => f.trim()).filter(Boolean))];
}

// A non-evidence descendant is justified only by its own verification run.
// Evidence-only descendants remain safe to include without a fresh run.
export function justifiedFiles(commits, coveredShas, currentHead) {
  const covered = new Set(coveredShas);
  covered.add(currentHead);
  return new Set(
    commits
      .filter((c) => covered.has(c.sha) || c.files.every(isEvidenceFile))
      .flatMap((c) => c.files),
  );
}

// `gh api --paginate --slurp` returns an array of response pages. Keeping the
// parser pure makes pagination and the no-run case testable without GitHub.
export function workflowRunsFromPages(payload) {
  const pages = Array.isArray(payload) ? payload : [payload];
  return pages.flatMap((page) =>
    Array.isArray(page?.workflow_runs) ? page.workflow_runs : [],
  );
}

// A descendant commit is stale when it touches non-evidence files AND is not
// the current run's own head commit (which self-binds by going green).
export function staleDescendants(commits, currentHead) {
  return commits
    .filter(
      ({ sha }) =>
        !(sha === currentHead || sha.startsWith(currentHead) || currentHead.startsWith(sha)),
    )
    .map((c) => ({ ...c, nonEvidence: c.files.filter((f) => !isEvidenceFile(f)) }))
    .filter((c) => c.nonEvidence.length > 0);
}

export function assertEvidenceOnlyDiff(changedFiles) {
  const violations = changedFiles.filter(
    (f) => !EVIDENCE_ALLOWLIST.some((re) => re.test(f)),
  );
  if (violations.length > 0) {
    throw new Error(
      `non-evidence files changed after bound source: ${violations.join(', ')}`,
    );
  }
}

const GATE_JOB = 'evidence-binding';

// A run binds a source commit when every verification job passed. The
// binding job itself may fail — its red means "docs are stale", not that the
// code is unproven. This avoids the recursion deadlock where a code commit's
// own run can never become the bound source.
export function assertRunBinding(run, jobs, boundSha, requiredJobNames = []) {
  if (!run || !run.head_sha) throw new Error(`run not found for bound run id`);
  if (!run.head_sha.startsWith(boundSha))
    throw new Error(`run headSha ${run.head_sha.slice(0, 8)} ≠ bound ${boundSha}`);
  const verificationJobs = (jobs ?? []).filter((j) => j.name !== GATE_JOB);
  if (verificationJobs.length === 0)
    throw new Error(`no verification jobs found for bound run`);
  const missing = requiredJobNames.filter(
    (name) => !verificationJobs.some((job) => job.name === name),
  );
  if (missing.length > 0)
    throw new Error(`required verification jobs missing: ${missing.join(', ')}`);
  const bad = verificationJobs.filter((j) => j.conclusion !== 'success');
  if (bad.length > 0)
    throw new Error(`verification jobs not green: ${bad.map((j) => `${j.name}=${j.conclusion}`).join(', ')}`);
}

export function parseBoundIdentity(goalText) {
  const m = goalText.match(/bound HEAD `([0-9a-f]{7,40})` — CI run\s*\n?>`?\s*`?(\d+)`?/s);
  if (!m) throw new Error('goal.md milestone does not name a bound HEAD + CI run pair');
  return { boundSha: m[1], runId: m[2] };
}
