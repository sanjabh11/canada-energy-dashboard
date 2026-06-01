export const phaseFMinimumLaneGroups = [
  {
    label: 'Utility forecast proof pack',
    routes: ['/utility-demand-forecast'],
    reason: 'Required for buyer-specific prediction credibility.',
  },
  {
    label: 'TIER CFO or credit-banking proof pack',
    routes: ['/roi-calculator', '/credit-banking'],
    reason: 'Required for the Alberta compliance / finance lane.',
  },
  {
    label: 'Shadow-billing or utility-security proof pack',
    routes: ['/shadow-billing', '/utility-security'],
    reason: 'Required for the billing / security procurement lane.',
  },
];

export const phaseFGlobalGateChecks = [
  'At least three distinct accepted buyer-supplied proof_pack_id values with day_14_decision=proceed.',
  'Total accepted buyer-supplied confidence_delta of at least 0.9.',
  'Distinct SHA-256 retained redacted artifacts for every accepted confidence-moving row.',
  'buyer_data_coverage_pct >= 70 for every accepted confidence-moving row.',
  'time_to_artifact_hours <= 120 for every accepted confidence-moving row, with at least one accepted proof pack at or below 48 hours.',
  'At least one strong commercial commitment: design_partner_signed, paid_pilot, purchase_order, or letter_of_intent.',
  'Retained artifacts must support record_date, pii_screen_result, buyer_data_coverage_pct, time_to_artifact_hours, reviewer_acceptance, reviewer_feedback_status, day_14_decision=proceed, and any strong commercial commitment.',
];

export const phaseFDefaultMinimumRoutes = [
  '/utility-demand-forecast',
  '/roi-calculator',
  '/utility-security',
];

export const phaseFTierRoutes = new Set(['/roi-calculator', '/credit-banking']);
export const phaseFBillingSecurityRoutes = new Set(['/shadow-billing', '/utility-security']);
