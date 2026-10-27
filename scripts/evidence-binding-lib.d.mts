export const EVIDENCE_ALLOWLIST: RegExp[];
export function isEvidenceFile(f: string): boolean;
export function diffTreeArgs(sha: string): string[];
export function parseFileList(output: string): string[];
export function justifiedFiles(
  commits: { sha: string; files: string[] }[],
  coveredShas: Iterable<string>,
  currentHead: string,
): Set<string>;
export function workflowRunsFromPages(
  payload: unknown,
): { database_id?: number; id?: number; head_sha?: string; conclusion?: string }[];
export function staleDescendants(
  commits: { sha: string; files: string[] }[],
  currentHead: string,
): { sha: string; files: string[]; nonEvidence: string[] }[];
export function assertEvidenceOnlyDiff(changedFiles: string[]): void;
export function assertRunBinding(
  run: { head_sha?: string; conclusion?: string } | null,
  jobs: { name: string; conclusion: string }[],
  boundSha: string,
  requiredJobNames?: string[],
): void;
export function parseBoundIdentity(goalText: string): { boundSha: string; runId: string };
