import { getEdgeBaseUrl, getEdgeHeaders } from './config';

export type ExportJobStatus =
  'queued' | 'running' | 'success' | 'failed' | 'blocked_stale' | 'canceled';

export interface CreateExportJobPayload {
  template: string;
  request_source?: string;
  request_context?: Record<string, unknown>;
  force_export?: boolean;
  priority?: number;
  sources?: Array<'aeso_pool' | 'forecast_dataset' | 'tier_inputs' | 'compliance_pack'>;
}

export interface ExportJobResponse {
  jobId: string;
  status: ExportJobStatus;
  reason?: string;
  outputSignedUrl?: string | null;
  confidenceSnapshot?: Record<string, unknown>;
  disclaimerRequired?: boolean;
  createdAt?: string;
}

export interface ExportJobErrorPayload {
  error: string;
  reason?: string;
  code?: string;
  confidence?: string;
  snapshot?: Record<string, unknown>;
}

export class ExportJobError extends Error {
  status: number;
  payload: ExportJobErrorPayload;

  constructor(status: number, payload: ExportJobErrorPayload) {
    super(payload.reason || payload.error || 'Export request failed.');
    this.name = 'ExportJobError';
    this.status = status;
    this.payload = payload;
  }
}

const DEFAULT_POLL_INTERVAL_MS = 1800;
const DEFAULT_POLL_TIMEOUT_MS = 120000;
const EXPORT_CREDENTIAL_SESSION_KEY = 'ceip_export_api_key_session';
export const DEFAULT_EXPORT_CREDENTIAL_TTL_MS = 60 * 60 * 1000;
export const MAX_EXPORT_CREDENTIAL_TTL_MS = 24 * 60 * 60 * 1000;

interface SessionExportCredential {
  value: string;
  expiresAt: number;
}

/** Store a user-supplied export credential for this browser session only. */
export function setExportApiKeyForSession(
  value: string,
  ttlMs = DEFAULT_EXPORT_CREDENTIAL_TTL_MS,
): boolean {
  if (typeof window === 'undefined' || !Number.isFinite(ttlMs) || ttlMs <= 0) return false;
  const normalized = value.trim();
  if (!normalized || normalized.length > 8192) return false;
  const expiresAt = Date.now() + Math.min(ttlMs, MAX_EXPORT_CREDENTIAL_TTL_MS);
  const sessionValue: SessionExportCredential = { value: normalized, expiresAt };
  try {
    window.sessionStorage.setItem(EXPORT_CREDENTIAL_SESSION_KEY, JSON.stringify(sessionValue));
    window.localStorage.removeItem('ceip_export_api_key');
    window.localStorage.removeItem('ceip_api_key');
    return true;
  } catch {
    return false;
  }
}

/** Clear the session credential and any legacy persistent copies. */
export function clearExportApiKey(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(EXPORT_CREDENTIAL_SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
  try {
    window.localStorage.removeItem('ceip_export_api_key');
  } catch {
    /* storage unavailable */
  }
  try {
    window.localStorage.removeItem('ceip_api_key');
  } catch {
    /* storage unavailable */
  }
}

function getExportCredential(): string {
  if (typeof window === 'undefined') return '';
  // Do not read API keys from persistent localStorage. Remove old copies when
  // the export path is next used, without echoing their values.
  try {
    window.localStorage.removeItem('ceip_export_api_key');
    window.localStorage.removeItem('ceip_api_key');
    const raw = window.sessionStorage.getItem(EXPORT_CREDENTIAL_SESSION_KEY);
    if (!raw) return '';
    const credential = JSON.parse(raw) as Partial<SessionExportCredential>;
    if (
      typeof credential.value !== 'string' ||
      !credential.value.trim() ||
      typeof credential.expiresAt !== 'number' ||
      credential.expiresAt <= Date.now()
    ) {
      window.sessionStorage.removeItem(EXPORT_CREDENTIAL_SESSION_KEY);
      return '';
    }
    return credential.value.trim();
  } catch {
    return '';
  }
}

function getAuthHeaders(idempotencyKey?: string): Record<string, string> {
  const baseHeaders = getEdgeHeaders();
  // Export credentials are user-scoped and session-only with a bounded expiry.
  // A build-time VITE_ key would be a shared credential bundled into client JS.
  const exportApiKey = getExportCredential();

  if (exportApiKey) {
    baseHeaders.Authorization = `ApiKey ${exportApiKey}`;
    baseHeaders.apikey = exportApiKey;
  }

  if (idempotencyKey) {
    baseHeaders['Idempotency-Key'] = idempotencyKey;
  }

  return baseHeaders;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function parseJsonSafe(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const base = getEdgeBaseUrl();
  if (!base) {
    throw new Error('Supabase Edge base URL is not configured.');
  }
  return fetch(`${base}/${path}`, init);
}

export async function createExportJob(
  payload: CreateExportJobPayload,
  options: { idempotencyKey?: string } = {},
): Promise<ExportJobResponse> {
  const idempotencyKey = options.idempotencyKey || createIdempotencyKey();
  const response = await request('create-export-job', {
    method: 'POST',
    headers: getAuthHeaders(idempotencyKey),
    body: JSON.stringify(payload),
  });

  const parsed = await parseJsonSafe(response);
  if (!response.ok) {
    throw new ExportJobError(response.status, {
      error: String(parsed.error || 'Failed to create export job'),
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      code: typeof parsed.code === 'string' ? parsed.code : undefined,
      confidence: typeof parsed.confidence === 'string' ? parsed.confidence : undefined,
      snapshot:
        parsed.snapshot && typeof parsed.snapshot === 'object'
          ? (parsed.snapshot as Record<string, unknown>)
          : undefined,
    });
  }

  return {
    jobId: String(parsed.jobId),
    status: String(parsed.status || 'queued') as ExportJobStatus,
    reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
    outputSignedUrl: typeof parsed.outputSignedUrl === 'string' ? parsed.outputSignedUrl : null,
    confidenceSnapshot:
      parsed.confidenceSnapshot && typeof parsed.confidenceSnapshot === 'object'
        ? (parsed.confidenceSnapshot as Record<string, unknown>)
        : undefined,
    disclaimerRequired: parsed.disclaimerRequired === true,
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : undefined,
  };
}

export async function getExportJobStatus(jobId: string): Promise<ExportJobResponse> {
  const response = await request(`export-job-status?id=${encodeURIComponent(jobId)}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const parsed = await parseJsonSafe(response);
  if (!response.ok) {
    throw new ExportJobError(response.status, {
      error: String(parsed.error || 'Failed to fetch export job status'),
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      code: typeof parsed.code === 'string' ? parsed.code : undefined,
    });
  }

  return {
    jobId: String(parsed.jobId),
    status: String(parsed.status || 'queued') as ExportJobStatus,
    reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
    outputSignedUrl: typeof parsed.outputSignedUrl === 'string' ? parsed.outputSignedUrl : null,
    confidenceSnapshot:
      parsed.confidenceSnapshot && typeof parsed.confidenceSnapshot === 'object'
        ? (parsed.confidenceSnapshot as Record<string, unknown>)
        : undefined,
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : undefined,
  };
}

export async function waitForExportJob(
  jobId: string,
  options: {
    pollIntervalMs?: number;
    timeoutMs?: number;
    onUpdate?: (job: ExportJobResponse) => void;
  } = {},
): Promise<ExportJobResponse> {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
  const startedAt = Date.now();

  while (true) {
    const status = await getExportJobStatus(jobId);
    options.onUpdate?.(status);

    if (
      status.status === 'success' ||
      status.status === 'failed' ||
      status.status === 'blocked_stale' ||
      status.status === 'canceled'
    ) {
      return status;
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new ExportJobError(408, {
        error: 'Export job polling timeout.',
        reason: 'The export job is taking longer than expected.',
        code: 'timeout',
      });
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

export async function cancelExportJob(jobId: string): Promise<ExportJobResponse> {
  const response = await request(`export-job-status?id=${encodeURIComponent(jobId)}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action: 'cancel' }),
  });

  const parsed = await parseJsonSafe(response);
  if (!response.ok) {
    throw new ExportJobError(response.status, {
      error: String(parsed.error || 'Failed to cancel export job'),
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      code: typeof parsed.code === 'string' ? parsed.code : undefined,
    });
  }

  return {
    jobId: String(parsed.jobId),
    status: 'canceled',
  };
}
