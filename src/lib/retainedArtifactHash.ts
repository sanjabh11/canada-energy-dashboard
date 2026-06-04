export interface RetainedArtifactHashInput {
  fileName: string;
  text: string;
  digest?: (bytes: Uint8Array) => Promise<ArrayBuffer>;
}

export interface RetainedArtifactHashResult {
  fileName: string;
  sha256: string;
  reference: string;
  byteLength: number;
  lineCount: number;
  warnings: string[];
}

const TEXT_INSPECTABLE_EXTENSIONS = new Set(['.csv', '.html', '.htm', '.json', '.jsonl', '.md', '.tsv', '.txt', '.yaml', '.yml']);
const DIRECT_IDENTIFIER_PATTERN =
  /\b(account(?:[_ -]?number)?|address|customer|email|meter(?:[_ -]?id|[_ -]?number)?|phone|postal(?:[_ -]?code)?|secret|token)\b/i;
const SPREADSHEET_FORMULA_PATTERN = /(^|[\n\r,])\s*["']?(?:[=+@]|-(?![\d\s]))/;

export function normalizeRetainedArtifactFileName(fileName: string): string {
  const cleaned = fileName
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '');

  const normalized = cleaned || 'retained-artifact.md';
  return normalized.includes('.') ? normalized : `${normalized}.md`;
}

export function buildRetainedArtifactReference(fileName: string, sha256: string): string {
  const normalizedFileName = normalizeRetainedArtifactFileName(fileName);
  const normalizedHash = sha256.trim().toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(normalizedHash)) {
    throw new Error('SHA-256 hash must be 64 lowercase hexadecimal characters.');
  }

  return `${normalizedFileName}#sha256=${normalizedHash}`;
}

export function detectRetainedArtifactWarnings(fileName: string, text: string): string[] {
  const normalizedFileName = normalizeRetainedArtifactFileName(fileName);
  const extension = normalizedFileName.includes('.')
    ? normalizedFileName.slice(normalizedFileName.lastIndexOf('.')).toLowerCase()
    : '';
  const warnings: string[] = [];

  if (!TEXT_INSPECTABLE_EXTENSIONS.has(extension)) {
    warnings.push('Use a text-inspectable retained artifact extension such as .md, .txt, .csv, or .json.');
  }

  if (DIRECT_IDENTIFIER_PATTERN.test(text)) {
    warnings.push('Potential identifier wording found; verify this is a retained summary and not raw buyer data.');
  }

  if (SPREADSHEET_FORMULA_PATTERN.test(text)) {
    warnings.push('Potential spreadsheet formula prefix found; review OWASP CSV/formula-injection handling before using this artifact.');
  }

  return warnings;
}

async function defaultSha256Digest(bytes: Uint8Array): Promise<ArrayBuffer> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Browser SHA-256 digest API is unavailable in this environment.');
  }

  return globalThis.crypto.subtle.digest('SHA-256', bytes);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeRetainedArtifactHash({
  fileName,
  text,
  digest = defaultSha256Digest,
}: RetainedArtifactHashInput): Promise<RetainedArtifactHashResult> {
  const normalizedFileName = normalizeRetainedArtifactFileName(fileName);

  if (text.trim().length === 0) {
    throw new Error('Paste a redacted retained artifact before computing a hash.');
  }

  const bytes = new TextEncoder().encode(text);
  const sha256 = toHex(await digest(bytes));

  return {
    fileName: normalizedFileName,
    sha256,
    reference: buildRetainedArtifactReference(normalizedFileName, sha256),
    byteLength: bytes.byteLength,
    lineCount: text.split(/\r\n|\r|\n/).length,
    warnings: detectRetainedArtifactWarnings(normalizedFileName, text),
  };
}
