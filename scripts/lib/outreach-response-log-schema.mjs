export const OUTREACH_RESPONSE_LOG_COLUMNS = [
  'activity_date',
  'channel',
  'target_label',
  'buyer_lane',
  'proof_pack_id',
  'route',
  'rating',
  'variant_id',
  'caveat_used',
  'artifact_promised',
  'reply_status',
  'response_summary',
  'pain_signal',
  'requested_input',
  'reviewer_role',
  'commercial_commitment_status',
  'next_action',
  'pilot_evidence_register_action',
  'notes',
  'consent_basis',
  'consent_source',
  'consent_date',
  'sender_identification_status',
  'unsubscribe_mechanism_status',
  'casl_owner_approval',
  'casl_approval_date',
  'casl_approval_reference',
  'unsubscribe_status',
];

// Legacy anonymized-handle suppression schema written by the workspace generator.
export const SUPPRESSION_REGISTRY_COLUMNS = [
  'target_label',
  'suppression_date',
  'source_row',
  'reason',
];

// Canonical live suppression schema. `email` holds the suppressed identity —
// a real address kept only in this registry for CASL honouring, or the same
// anonymized target_label handle used in the repo outreach response log.
export const SUPPRESSION_REGISTRY_LIVE_COLUMNS = [
  'email',
  'domain',
  'reason',
  'source',
  'suppressed_at',
  'suppressed_by',
];

// The single workspace-wide suppression source of truth. Every outreach
// script resolves this by default and fails closed when it is missing.
export const SUPPRESSION_REGISTRY_CANONICAL_PATH = 'docs/growth/SUPPRESSION_REGISTRY_LIVE.csv';
export const SUPPRESSION_REGISTRY_ENV_VAR = 'CEIP_SUPPRESSION_REGISTRY';

export const CASL_CONSENT_BASES = new Set([
  'express_consent',
  'existing_business_relationship',
  'existing_non_business_relationship',
  'implied_consent_conspicuously_published_address',
  'casl_exemption',
  'none',
]);

export const CASL_CONTROL_STATUSES = new Set(['verified', 'not_verified', 'not_applicable']);
export const CASL_OWNER_APPROVAL_STATUSES = new Set(['pending', 'approved', 'rejected']);
export const UNSUBSCRIBE_STATUSES = new Set(['none', 'opted_out', 'suppressed']);
export const SUPPRESSION_REASONS = new Set(['unsubscribe', 'owner_suppression']);
export const OUTBOUND_REPLY_STATUSES = new Set([
  'sent_no_reply',
  'interested',
  'requested_info',
  'data_offered',
  'meeting_booked',
  'not_now',
  'not_fit',
]);

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      value = '';
      continue;
    }
    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  return rows;
}
