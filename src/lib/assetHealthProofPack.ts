import type { AssetHealthResult, FleetSummary } from './assetHealthScoring';
import type {
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
} from './proofPack';

function riskOrder(value: AssetHealthResult['risk_priority']): number {
  switch (value) {
    case 'critical':
      return 0;
    case 'high':
      return 1;
    case 'medium':
      return 2;
    default:
      return 3;
  }
}

export function rankAssetsForAction(results: AssetHealthResult[]): AssetHealthResult[] {
  return [...results].sort((left, right) => {
    const byRisk = riskOrder(left.risk_priority) - riskOrder(right.risk_priority);
    if (byRisk !== 0) return byRisk;
    if (left.health_index !== right.health_index) return left.health_index - right.health_index;
    return left.next_inspection_months - right.next_inspection_months;
  });
}

function buildArtifact(
  id: string,
  label: string,
  format: ProofArtifactDefinition['format'],
  filename: string,
  description: string,
  isFallback: boolean,
): ProofArtifactDefinition {
  return {
    id,
    label,
    format,
    filename,
    audience: 'Utility asset manager or capital planning lead',
    generatedAt: new Date().toISOString(),
    jurisdiction: 'Canada',
    sourceSummary: isFallback ? 'Sample or uploaded fleet data scored by the CEIP CSV-first asset model' : 'Uploaded fleet data scored by the CEIP CSV-first asset model',
    sourceManifestId: isFallback ? 'asset-health-starter-fleet-v1' : 'asset-health-owner-upload-v1',
    verificationStatus: isFallback ? 'needs_buyer_data' : 'owner_supplied_required',
    doNotClaim: [
      'SCADA or sensor integration',
      'Predictive-maintenance automation',
      'Engineering sign-off or field inspection replacement',
    ],
    assumptions: [
      'Scoring is CSV-first and does not use SCADA, sensors, or work-order integrations in this phase.',
      'Replacement budget is directional and based on default asset-type replacement cost assumptions.',
      'Priority reasons are deterministic explanations from age, loading, maintenance, and environment factor scores.',
      'Replacement-cost overrides and scoring-weight sensitivity should be confirmed with the buyer before board use.',
    ],
    claimLabel: 'advisory',
    isFallback,
    freshnessState: isFallback ? 'starter-or-sample' : 'uploaded-current',
    boundedClaimsDisclaimer: 'This summary supports capex triage and inspection planning. It does not replace engineering review or field inspection.',
    description,
  };
}

export function buildAssetExecutiveSummaryDescriptor(
  summary: FleetSummary,
  results: AssetHealthResult[],
  isFallback: boolean,
): ProofDocumentDescriptor {
  const ranked = rankAssetsForAction(results).slice(0, 5);
  return {
    definition: buildArtifact(
      'asset-executive-summary',
      'Executive summary export',
      'html',
      `asset_health_executive_summary_${new Date().toISOString().slice(0, 10)}.html`,
      'Meeting-ready capex summary with top-priority assets and rationale.',
      isFallback,
    ),
    title: 'Asset health executive summary',
    summary: 'Fleet-level replacement pressure, inspection cadence, and top-priority asset rationale for buyer meetings.',
    sections: [
      {
        heading: 'Fleet overview',
        kind: 'bullet_list',
        body: [
          `Total assets scored: ${summary.total_assets}`,
          `Average health index: ${summary.avg_health_index}`,
          `Assets needing action: ${summary.assets_needing_action}`,
          `Estimated replacement budget: CAD ${summary.replacement_budget_estimate_cad.toLocaleString()}`,
        ],
      },
      {
        heading: 'Priority assets',
        kind: 'bullet_list',
        body: ranked.map((asset) => `${asset.asset_name} (${asset.location}) — ${asset.risk_priority} risk, HI ${asset.health_index}, ${asset.priority_reason}`),
      },
      {
        heading: 'Inspection cadence',
        kind: 'bullet_list',
        body: ranked.map((asset) => `${asset.asset_name}: next inspection in ${asset.next_inspection_months} month(s); recommended action: ${asset.recommended_action}`),
      },
      {
        heading: 'Cost and sensitivity checks',
        kind: 'bullet_list',
        body: [
          'Use buyer-supplied replacement-cost overrides before using the budget estimate in a board pack.',
          'Run a weight-sensitivity review for age, loading, maintenance, and environment factors before approving replace/defer decisions.',
          'Keep deterministic priority reasons attached to every replacement or deferral recommendation.',
        ],
      },
    ],
    nextStep: 'Review the top-priority assets with operations and capex teams, then replace sample rows with the next real fleet subset for a paid pilot.',
  };
}

export function buildPrioritizedReplacementCsv(results: AssetHealthResult[]): string {
  const ranked = rankAssetsForAction(results);
  const headers = [
    'asset_id',
    'asset_name',
    'location',
    'criticality',
    'risk_priority',
    'health_index',
    'priority_reason',
    'recommended_action',
    'next_inspection_months',
  ];

  const rows = ranked.map((asset) => [
    asset.asset_id,
    asset.asset_name,
    asset.location,
    asset.criticality,
    asset.risk_priority,
    asset.health_index,
    `"${asset.priority_reason}"`,
    `"${asset.recommended_action}"`,
    asset.next_inspection_months,
  ].join(','));

  return [
    '# Asset Health Prioritized Replacement List',
    `# Generated: ${new Date().toISOString()}`,
    '',
    headers.join(','),
    ...rows,
  ].join('\n');
}

export function buildAssetProofBundle(isFallback: boolean): ProofPackBundle {
  return {
    title: 'Asset capex proof pack',
    summary: 'Export a scored fleet CSV, a prioritized replacement list, and an executive summary without requiring SCADA or sensor integrations.',
    artifacts: [
      buildArtifact(
        'asset-executive-summary',
        'Executive summary export',
        'html',
        `asset_health_executive_summary_${new Date().toISOString().slice(0, 10)}.html`,
        'Capex-facing summary with top actions, replacement budget, and inspection cadence.',
        isFallback,
      ),
      buildArtifact(
        'asset-scored-csv',
        'Scored fleet CSV',
        'csv',
        `asset_health_index_${new Date().toISOString().slice(0, 10)}.csv`,
        'Row-level asset scores with factor breakdowns, priority reasons, and recommended actions.',
        isFallback,
      ),
      buildArtifact(
        'asset-priority-csv',
        'Prioritized replacement list',
        'csv',
        `asset_prioritized_replacement_${new Date().toISOString().slice(0, 10)}.csv`,
        'Sorted action list for the highest-risk assets in the fleet.',
        isFallback,
      ),
      buildArtifact(
        'asset-cost-sensitivity-checklist',
        'Cost sensitivity checklist',
        'md',
        `asset_cost_sensitivity_checklist_${new Date().toISOString().slice(0, 10)}.md`,
        'Board-prep checklist for replacement-cost overrides and scoring-weight sensitivity.',
        isFallback,
      ),
    ],
  };
}

export function buildAssetCostSensitivityChecklistMarkdown(): string {
  return [
    '# Asset cost and scoring sensitivity checklist',
    '',
    '- Replace default asset replacement costs with buyer-approved cost assumptions before board use.',
    '- Confirm whether age, loading, maintenance, or environment should receive local weighting adjustments.',
    '- Re-run the prioritized replacement CSV after any cost or weighting change.',
    '- Keep field inspection and engineering review as required approvals before final replace/defer decisions.',
  ].join('\n');
}
