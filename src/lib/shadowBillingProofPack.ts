import type {
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
} from './proofPack';
import type { ShadowBillingSummary } from './shadowBillingSupport';

export type ShadowBillingSourceMode = 'starter_bills' | 'constructed_commercial_scenario' | 'uploaded_bills';

function buildArtifact(
  id: string,
  label: string,
  format: ProofArtifactDefinition['format'],
  filename: string,
  description: string,
  sourceMode: ShadowBillingSourceMode,
): ProofArtifactDefinition {
  const isFallback = sourceMode === 'starter_bills';
  const isConstructed = sourceMode === 'constructed_commercial_scenario';
  return {
    id,
    label,
    format,
    filename,
    audience: 'Facilities lead, CFO, or municipal procurement reviewer',
    generatedAt: new Date().toISOString(),
    jurisdiction: 'Alberta',
    sourceSummary: isConstructed
      ? 'Constructed Alberta municipal invoice comparison scenario'
      : isFallback
        ? 'Starter 12-month Alberta bill set'
        : 'Uploaded 12-month invoice history',
    sourceManifestId: `shadow-billing-${sourceMode}-v1`,
    verificationStatus: isConstructed
      ? 'constructed_scenario'
      : isFallback
        ? 'needs_buyer_data'
        : 'owner_supplied_required',
    doNotClaim: [
      'Full delivered-bill audit',
      'Utility bill correctness certification',
      'Broker execution or legal advice',
      'Rider-level parity unless rider fields are supplied',
    ],
    assumptions: [
      'Default comparison is energy-supply-only unless owner-supplied fixed charges are included.',
      'RoLR comparison uses the route disclosure and does not imply full delivered-bill parity for every rider or contract term.',
      'Invoice deltas support pilot qualification and bill review, not broker execution or legal advice.',
      'Rider exclusions, uploaded bill fields, and approval notes must remain attached to the audit trail.',
    ],
    claimLabel: isConstructed ? 'constructed-scenario' : isFallback ? 'advisory' : 'owner-supplied',
    isFallback,
    freshnessState: sourceMode,
    commercialProofState: isConstructed ? 'constructed_commercial_scenario' : 'standard',
    boundedClaimsDisclaimer: 'This comparison is limited to the supplied invoice data and the route’s disclosed RoLR assumptions. It does not certify utility bill correctness.',
    description,
  };
}

export function buildShadowBillingProofBundle(sourceMode: ShadowBillingSourceMode): ProofPackBundle {
  return {
    title: 'Invoice comparison proof pack',
    summary: 'Export a finance-readable invoice comparison memo, monthly delta CSV, and a CFO summary without pretending to audit every delivered-bill rider.',
    artifacts: [
      buildArtifact(
        'shadow-billing-memo',
        'Invoice comparison memo',
        'html',
        `shadow_billing_invoice_comparison_${new Date().toISOString().slice(0, 10)}.html`,
        'Buyer-facing memo showing actual supply cost versus the RoLR comparison path.',
        sourceMode,
      ),
      buildArtifact(
        'shadow-billing-delta-csv',
        'Monthly delta CSV',
        'csv',
        `shadow_billing_monthly_delta_${new Date().toISOString().slice(0, 10)}.csv`,
        'Month-by-month deltas for finance or facilities review.',
        sourceMode,
      ),
      buildArtifact(
        'shadow-billing-cfo-summary',
        'CFO summary',
        'md',
        `shadow_billing_cfo_summary_${new Date().toISOString().slice(0, 10)}.md`,
        'Short executive summary for a facilities or procurement follow-up.',
        sourceMode,
      ),
      buildArtifact(
        'shadow-billing-field-map',
        'Bill field map',
        'md',
        `shadow_billing_field_map_${new Date().toISOString().slice(0, 10)}.md`,
        'Audit-trail mapping for uploaded invoice fields, approval notes, and rider exclusions.',
        sourceMode,
      ),
    ],
  };
}

export function buildShadowBillingMemoDescriptor(
  summary: ShadowBillingSummary,
  sourceMode: ShadowBillingSourceMode,
): ProofDocumentDescriptor {
  const topMonths = [...summary.rows]
    .sort((left, right) => right.deltaVsRolrCad - left.deltaVsRolrCad)
    .slice(0, 3);

  return {
    definition: buildArtifact(
      'shadow-billing-memo',
      'Invoice comparison memo',
      'html',
      `shadow_billing_invoice_comparison_${new Date().toISOString().slice(0, 10)}.html`,
      'Primary memo for the current billing review.',
      sourceMode,
    ),
    title: 'Shadow billing invoice comparison memo',
    summary: 'Twelve-month energy-supply comparison showing what the buyer paid versus the RoLR comparison path and where the largest deltas sit.',
    sections: [
      {
        heading: 'Annual summary',
        kind: 'bullet_list',
        body: [
          `Actual supply cost: CAD ${summary.totalActualSupplyCostCad.toFixed(2)}`,
          `RoLR comparison cost: CAD ${summary.totalRolrSupplyCostCad.toFixed(2)}`,
          `Pool-price comparison cost: CAD ${summary.totalPoolSupplyCostCad.toFixed(2)}`,
          `Delta versus RoLR: CAD ${summary.deltaVsRolrCad.toFixed(2)}`,
          `Months above RoLR: ${summary.monthsOverRolr} of ${summary.rows.length}`,
        ],
      },
      {
        heading: 'Scope and buyer caution',
        kind: 'bullet_list',
        body: [
          'This route compares energy supply charges first, because rider-level bill reconstruction is not universal across municipal and retailer invoices.',
          `Fixed charges included in the current file: CAD ${summary.totalFixedChargesCad.toFixed(2)}`,
          'Rider exclusions, mapping assumptions, and approval notes must be kept with the monthly delta CSV.',
          'Use the monthly delta export as the first paid-pilot artifact before positioning full bill validation.',
        ],
      },
      {
        heading: 'Largest monthly deltas',
        kind: 'bullet_list',
        body: topMonths.map((row) => `${row.billingPeriod}: actual CAD ${row.actualSupplyCostCad.toFixed(2)} vs RoLR CAD ${((row.consumptionKwh * row.rolrRateCentsPerKwh) / 100).toFixed(2)} (delta CAD ${row.deltaVsRolrCad.toFixed(2)})`),
      },
    ],
    nextStep: 'Upload the last 12 customer invoices, validate any rider exclusions, and use the CFO summary to qualify a municipal or facilities billing pilot.',
  };
}

export function buildShadowBillingFieldMapMarkdown(): string {
  return [
    '# Shadow billing field map and audit notes',
    '',
    '- Required fields: billing_period, consumption_kwh, actual_supply_cost_cad, rolr_rate_cents_per_kwh.',
    '- Optional fields: pool_price_cad_per_mwh, fixed_charges_cad, site_id, retailer, approval_note.',
    '- Rider exclusion: delivery, riders, taxes, and non-energy adjustments are excluded unless owner-supplied as separate columns.',
    '- Approval note: finance or facilities reviewer should confirm source invoice custody before savings language is used externally.',
    '- Audit trail: keep the uploaded bill file, parsed monthly delta CSV, field map, and CFO summary together.',
  ].join('\n');
}

export function buildShadowBillingExecutiveMarkdown(summary: ShadowBillingSummary): string {
  return [
    '# Shadow billing CFO summary',
    '',
    `- Actual supply cost: CAD ${summary.totalActualSupplyCostCad.toFixed(2)}`,
    `- RoLR comparison cost: CAD ${summary.totalRolrSupplyCostCad.toFixed(2)}`,
    `- Delta vs RoLR: CAD ${summary.deltaVsRolrCad.toFixed(2)}`,
    `- Months above RoLR: ${summary.monthsOverRolr} of ${summary.rows.length}`,
    '- Scope: Energy-supply-only unless owner-supplied fixed charges are present.',
  ].join('\n');
}
