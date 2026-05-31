export type CommercialCommitmentStatus =
  | 'none'
  | 'design_partner_signed'
  | 'paid_pilot'
  | 'purchase_order'
  | 'letter_of_intent';

const strongCommercialCommitmentStatuses = new Set<CommercialCommitmentStatus>([
  'design_partner_signed',
  'paid_pilot',
  'purchase_order',
  'letter_of_intent',
]);

const commercialCommitmentEvidenceRules = new Map<CommercialCommitmentStatus, { label: string; pattern: RegExp }>([
  ['design_partner_signed', {
    label: 'redacted signed design-partner agreement or letter evidence',
    pattern: /(?:design[-_ ]?partner[\s\S]{0,100}(?:signed|agreement|letter|executed|retained|redacted)|(?:signed|executed|agreement|letter|retained|redacted)[\s\S]{0,100}design[-_ ]?partner)/i,
  }],
  ['paid_pilot', {
    label: 'redacted paid-pilot invoice, payment, receipt, confirmation, or agreement evidence',
    pattern: /(?:paid[-_ ]?pilot[\s\S]{0,100}(?:evidence|invoice|payment|receipt|confirmation|agreement|appendix|retained|redacted)|(?:pilot[-_ ]?payment|paid[-_ ]?invoice|invoice[-_ ]?paid|payment[-_ ]?confirmation|receipt)[\s\S]{0,100}(?:pilot|invoice|retained|redacted|evidence)?)/i,
  }],
  ['purchase_order', {
    label: 'redacted purchase-order reference, issued PO, or procurement evidence',
    pattern: /(?:purchase[-_ ]?order|\bpo\b)[\s\S]{0,100}(?:reference|issued|procurement|evidence|appendix|retained|redacted|confirmation|number)/i,
  }],
  ['letter_of_intent', {
    label: 'redacted letter-of-intent evidence',
    pattern: /(?:letter[-_ ]?of[-_ ]?intent|\bloi\b)[\s\S]{0,100}(?:signed|received|executed|evidence|appendix|retained|redacted|confirmation)/i,
  }],
]);

const directIdentifierPatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: 'email address', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { label: 'phone number', pattern: /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/ },
  { label: 'Canadian postal code', pattern: /\b[A-Z]\d[A-Z][ -]?\d[A-Z]\d\b/i },
  { label: 'account, meter, or credential label', pattern: /\b(?:account|acct|meter|premise|service|api[_ -]?key|secret|password|token)[-_ ]?(?:id|number|no|identifier)?\b\s*[:#=]\s*[A-Z0-9-]{4,}/i },
  { label: 'street address', pattern: /\b\d{1,6}\s+[A-Z0-9.'-]+(?:\s+[A-Z0-9.'-]+){0,4}\s+(?:street|st|road|rd|avenue|ave|drive|dr|lane|ln|boulevard|blvd|way|court|ct)\b/i },
];

export function isStrongCommercialCommitmentStatus(status: string): status is CommercialCommitmentStatus {
  return strongCommercialCommitmentStatuses.has(status as CommercialCommitmentStatus);
}

export function getCommercialCommitmentEvidenceFailure(status: string, evidence?: string): string | null {
  if (!isStrongCommercialCommitmentStatus(status)) return null;
  const trimmedEvidence = (evidence ?? '').trim();
  if (!trimmedEvidence) {
    return `is required when commercial_commitment_status is ${status}.`;
  }

  const directIdentifier = directIdentifierPatterns.find(({ pattern }) => pattern.test(trimmedEvidence));
  if (directIdentifier) {
    return `must not contain a ${directIdentifier.label}; retain only redacted commercial-commitment evidence text.`;
  }

  const rule = commercialCommitmentEvidenceRules.get(status);
  if (rule && !rule.pattern.test(trimmedEvidence)) {
    return `must describe ${rule.label}; do not repeat only the status.`;
  }

  return null;
}

export function resolveCommercialCommitmentEvidence(status: string, evidence?: string): string {
  const failure = getCommercialCommitmentEvidenceFailure(status, evidence);
  if (failure) throw new Error(`commercialCommitmentEvidence ${failure}`);
  const trimmedEvidence = (evidence ?? '').trim();
  return trimmedEvidence || 'none';
}
