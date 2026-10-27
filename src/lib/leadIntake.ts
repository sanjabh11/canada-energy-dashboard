export interface LeadIntakeSubmission {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  team_size?: string;
  industry?: string;
  message?: string;
  source_route: string;
  channel: 'direct' | 'whop' | 'partner';
  segment: string;
  campaign_id: string;
  metadata?: Record<string, unknown>;
}

export interface LeadIntakeDisclosure {
  contactName: string;
  contactEmail: string;
  policiesUrl: string;
  processingLocations: string;
  retentionSummary: string;
}

type LeadIntakeClientConfig = Record<string, string | undefined>;

/**
 * Return a collection disclosure only after its operational details have
 * been explicitly configured and approved by the privacy owner. This keeps
 * the UI from inventing a mailbox, processing region, or retention promise.
 */
export function getLeadIntakeDisclosure(
  config: LeadIntakeClientConfig = import.meta.env,
): LeadIntakeDisclosure | null {
  if (config.VITE_PRIVACY_NOTICE_APPROVED !== 'true') return null;
  const contactName = config.VITE_PRIVACY_CONTACT_NAME?.trim() ?? '';
  const contactEmail = config.VITE_PRIVACY_CONTACT_EMAIL?.trim() ?? '';
  const policiesUrl = config.VITE_PRIVACY_POLICIES_URL?.trim() ?? '';
  const processingLocations = config.VITE_PRIVACY_PROCESSING_LOCATIONS?.trim() ?? '';
  const retentionSummary = config.VITE_PRIVACY_RETENTION_SUMMARY?.trim() ?? '';
  let policyIsHttps = false;
  try {
    policyIsHttps = new URL(policiesUrl).protocol === 'https:';
  } catch {
    policyIsHttps = false;
  }
  if (
    !contactName ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ||
    !policyIsHttps ||
    !processingLocations ||
    !retentionSummary
  )
    return null;
  return { contactName, contactEmail, policiesUrl, processingLocations, retentionSummary };
}

/** Collection stays off until both the notice and its runtime details pass. */
export function isLeadIntakeEnabled(config: LeadIntakeClientConfig = import.meta.env): boolean {
  return config.VITE_ENABLE_LEAD_INTAKE === 'true' && getLeadIntakeDisclosure(config) !== null;
}

/**
 * Options for persistLeadIntake / buildLeadIntakePayload.
 *
 * `pilotRequest` marks an explicit opt-in to a pilot/facility assessment.
 * Facility-level fields (emissions, capex, benchmark values, compliance year,
 * scenario data) are ONLY included in the submission payload when this is
 * true — either via this option or via `metadata.pilot_request === true`.
 * Contact-only submissions carry no facility data (G7 payload minimization).
 */
export interface LeadIntakeSubmitOptions {
  pilotRequest?: boolean;
}

/**
 * Facility-level metadata keys gated behind an explicit pilot request.
 * Keep in sync with the server-side mirror in netlify/functions/leads.ts —
 * the function re-applies this filter as defense-in-depth.
 */
const FACILITY_METADATA_EXACT_KEYS = new Set([
  'annual_emissions',
  'emissions',
  'benchmark_exceedance',
  'benchmark_values',
  'direct_invest_capex',
  'capex',
  'compliance_year',
  'scenario',
  'scenario_data',
]);
const LEAD_METADATA_STRING_LIMITS: Readonly<Record<string, number>> = {
  lead_type: 64,
  client_count: 16,
  current_tool: 100,
  target_plan: 64,
};

const LEAD_METADATA_NUMBER_MAXIMUMS: Readonly<Record<string, number>> = {
  annual_emissions: 1_000_000_000,
  benchmark_exceedance: 1_000_000_000,
  direct_invest_capex: 1_000_000_000_000,
  compliance_year: 2100,
};

export function isFacilityLevelMetadataKey(key: string): boolean {
  if (FACILITY_METADATA_EXACT_KEYS.has(key)) return true;
  return (
    key.startsWith('facility_') ||
    key.startsWith('emissions_') ||
    key.startsWith('capex_') ||
    key.startsWith('benchmark_') ||
    key.startsWith('scenario_') ||
    key.startsWith('compliance_')
  );
}

/**
 * Payload clamps. These bounds deliberately match the server-side schema
 * maxima in netlify/functions/leads.ts so a legitimate browser payload can
 * never be rejected for length alone (client truncates, server validates).
 */
function clamp(value: string | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
  pilotRequest: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (key === 'pilot_request') continue; // normalized below
    if (!pilotRequest && isFacilityLevelMetadataKey(key)) continue;
    if (
      Object.prototype.hasOwnProperty.call(LEAD_METADATA_STRING_LIMITS, key) &&
      typeof value === 'string'
    ) {
      const trimmed = value.trim();
      if (trimmed) out[key] = trimmed.slice(0, LEAD_METADATA_STRING_LIMITS[key]);
      continue;
    }
    if (
      Object.prototype.hasOwnProperty.call(LEAD_METADATA_NUMBER_MAXIMUMS, key) &&
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      if (value < 0 || value > LEAD_METADATA_NUMBER_MAXIMUMS[key]) continue;
      if (key === 'compliance_year' && (!Number.isInteger(value) || value < 2000)) continue;
      out[key] = value;
    }
  }
  if (pilotRequest) out.pilot_request = true;
  return out;
}

/**
 * Build the wire payload for the intake endpoint. Exported for tests.
 * Facility-level metadata is stripped unless the submitter opted into a
 * pilot request; `pilot_request` is itself normalized to a boolean flag that
 * is only sent when true.
 */
export function buildLeadIntakePayload(
  submission: LeadIntakeSubmission,
  options: LeadIntakeSubmitOptions = {},
): Record<string, unknown> {
  const pilotRequest = options.pilotRequest === true || submission.metadata?.pilot_request === true;

  return {
    company_name: clamp(submission.company_name, 200),
    contact_name: clamp(submission.contact_name, 200),
    email: clamp(submission.email, 320),
    phone: clamp(submission.phone, 64),
    team_size: clamp(submission.team_size, 32),
    industry: clamp(submission.industry, 64),
    message: clamp(submission.message, 2000),
    source_route: clamp(submission.source_route, 100),
    channel: submission.channel,
    segment: clamp(submission.segment, 100),
    campaign_id: clamp(submission.campaign_id, 100),
    metadata: sanitizeMetadata(submission.metadata, pilotRequest),
  };
}

export async function persistLeadIntake(
  submission: LeadIntakeSubmission,
  options: LeadIntakeSubmitOptions = {},
): Promise<{
  ok: boolean;
  error?: string;
}> {
  // A frontend caller cannot turn collection on by merely rendering a form.
  // The server repeats the gate, but this prevents accidental transmission
  // from any stale or newly added submission surface as well.
  if (!isLeadIntakeEnabled()) {
    return { ok: false, error: 'privacy_notice_unapproved' };
  }

  const payload = buildLeadIntakePayload(submission, options);

  if (
    !payload.contact_name ||
    !payload.email ||
    !payload.source_route ||
    !payload.segment ||
    !payload.campaign_id
  ) {
    return {
      ok: false,
      error: 'invalid_submission',
    };
  }

  try {
    const response = await fetch('/api/leads/intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'intake',
        submission: payload,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return {
        ok: false,
        error: body?.message || body?.error || `lead_capture_failed_${response.status}`,
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}
