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
  /^\.phase-loop\//,
  /^\.positioning-audit\//,
];

export function isEvidenceFile(f) {
  return EVIDENCE_ALLOWLIST.some((re) => re.test(f));
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

export function assertRunBinding(run, boundSha) {
  if (!run || !run.head_sha) throw new Error(`run not found for bound run id`);
  if (run.conclusion !== 'success')
    throw new Error(`run conclusion is ${run.conclusion}, not success`);
  if (!run.head_sha.startsWith(boundSha))
    throw new Error(`run headSha ${run.head_sha.slice(0, 8)} ≠ bound ${boundSha}`);
}

export function parseBoundIdentity(goalText) {
  const m = goalText.match(/bound HEAD `([0-9a-f]{7,40})` — CI run\s*\n?>`?\s*`?(\d+)`?/s);
  if (!m) throw new Error('goal.md milestone does not name a bound HEAD + CI run pair');
  return { boundSha: m[1], runId: m[2] };
}
