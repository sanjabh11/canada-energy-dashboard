export const EVIDENCE_ALLOWLIST: RegExp[];
export function isEvidenceFile(f: string): boolean;
export function staleDescendants(
  commits: { sha: string; files: string[] }[],
  currentHead: string,
): { sha: string; files: string[]; nonEvidence: string[] }[];
export function assertEvidenceOnlyDiff(changedFiles: string[]): void;
export function assertRunBinding(
  run: { head_sha?: string; conclusion?: string } | null,
  boundSha: string,
): void;
export function parseBoundIdentity(goalText: string): { boundSha: string; runId: string };
