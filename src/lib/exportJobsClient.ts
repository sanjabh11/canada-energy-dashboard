import { getEdgeBaseUrl, getEdgeHeaders } from './config';

export type ExportJobStatus = 'queued' | 'running' | 'success' | 'failed' | 'blocked_stale' | 'canceled';

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

function getExportCredential(): string {
  if (typeof window === 'undefined') return '';
  const fromStorage = localStorage.getItem('ceip_export_api_key') || localStorage.getItem('ceip_api_key') || '';
  return fromStorage.trim();
}

function getAuthHeaders(idempotencyKey?: string): Record<string, string> {
  const baseHeaders = getEdgeHeaders();
  const exportApiKey = (import.meta.env.VITE_EXPORTS_API_KEY as string | undefined)?.trim() || getExportCredential();

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
    return await response.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function request(
  path: string,
  init: RequestInit
): Promise<Response> {
  const base = getEdgeBaseUrl();
  if (!base) {
    throw new Error('Supabase Edge base URL is not configured.');
  }
  return fetch(`${base}/${path}`, init);
}

export async function createExportJob(
  payload: CreateExportJobPayload,
  options: { idempotencyKey?: string } = {}
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
      snapshot: (parsed.snapshot && typeof parsed.snapshot === 'object')
        ? parsed.snapshot as Record<string, unknown>
        : undefined,
    });
  }

  return {
    jobId: String(parsed.jobId),
    status: String(parsed.status || 'queued') as ExportJobStatus,
    reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
    outputSignedUrl: typeof parsed.outputSignedUrl === 'string' ? parsed.outputSignedUrl : null,
    confidenceSnapshot: (parsed.confidenceSnapshot && typeof parsed.confidenceSnapshot === 'object')
      ? parsed.confidenceSnapshot as Record<string, unknown>
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
    confidenceSnapshot: (parsed.confidenceSnapshot && typeof parsed.confidenceSnapshot === 'object')
      ? parsed.confidenceSnapshot as Record<string, unknown>
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
  } = {}
): Promise<ExportJobResponse> {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
  const startedAt = Date.now();

  while (true) {
    const status = await getExportJobStatus(jobId);
    options.onUpdate?.(status);

    if (status.status === 'success' || status.status === 'failed' || status.status === 'blocked_stale' || status.status === 'canceled') {
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

export async function reissueExportJobUrl(jobId: string): Promise<ExportJobResponse> {
  const response = await request(`export-job-status?id=${encodeURIComponent(jobId)}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action: 'reissue_url' }),
  });

  const parsed = await parseJsonSafe(response);
  if (!response.ok) {
    throw new ExportJobError(response.status, {
      error: String(parsed.error || 'Failed to reissue export URL'),
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      code: typeof parsed.code === 'string' ? parsed.code : undefined,
    });
  }

  return {
    jobId: String(parsed.jobId),
    status: 'success',
    outputSignedUrl: typeof parsed.outputSignedUrl === 'string' ? parsed.outputSignedUrl : null,
  };
}
