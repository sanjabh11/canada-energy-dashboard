import type {
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
} from './proofPack';
import {
  buildAiceiChecklist,
  buildAiceiSourceLabel,
  type AiceiProjectRecord,
  type AiceiSourceMode,
} from './aiceiReportingSupport';

function buildArtifact(
  id: string,
  label: string,
  format: ProofArtifactDefinition['format'],
  filename: string,
  description: string,
  sourceMode: AiceiSourceMode,
): ProofArtifactDefinition {
  const isConstructed = sourceMode === 'constructed_commercial_scenario';
  return {
    id,
    label,
    format,
    filename,
    audience: 'Community energy team or AICEI program reviewer',
    generatedAt: new Date().toISOString(),
    jurisdiction: 'Alberta',
    sourceSummary: buildAiceiSourceLabel(sourceMode),
    sourceManifestId: `aicei-reporting-${sourceMode}-v1`,
    verificationStatus: isConstructed
      ? 'constructed_scenario'
      : sourceMode === 'starter_portfolio'
        ? 'needs_buyer_data'
        : 'owner_supplied_required',
    doNotClaim: [
      'Certified Indigenous data sovereignty infrastructure',
      'Community approval without partner review',
      'Grant submission approval',
    ],
    assumptions: [
      'This route focuses on Alberta AICEI reporting first and reuses the hardened reporting/export pattern.',
      'Community approval and governance fields remain owner-supplied unless independently confirmed by the project team.',
      'Exports support review and submission preparation, not grant CRM or full project management.',
    ],
    claimLabel: isConstructed ? 'constructed-scenario' : sourceMode === 'starter_portfolio' ? 'advisory' : 'owner-supplied',
    isFallback: sourceMode === 'starter_portfolio',
    freshnessState: sourceMode,
    commercialProofState: isConstructed ? 'constructed_commercial_scenario' : 'standard',
    boundedClaimsDisclaimer: 'This report supports program review only. It does not replace community governance approval or PrairiesCan guidance.',
    description,
  };
}

export function buildAiceiProofBundle(sourceMode: AiceiSourceMode): ProofPackBundle {
  return {
    title: 'AICEI reporting proof pack',
    summary: 'Generate a quarterly AICEI report, a portfolio metrics export, and an approval-gap checklist with explicit OCAP and owner-supplied markers.',
    artifacts: [
      buildArtifact(
        'aicei-quarterly-pdf',
        'Quarterly report PDF',
        'pdf',
        `aicei_report_${new Date().toISOString().slice(0, 10)}.pdf`,
        'Primary quarterly report artifact for program or community review.',
        sourceMode,
      ),
      buildArtifact(
        'aicei-quarterly-html',
        'Quarterly report HTML',
        'html',
        `aicei_report_${new Date().toISOString().slice(0, 10)}.html`,
        'Browser-readable report with the same governance framing as the PDF.',
        sourceMode,
      ),
      buildArtifact(
        'aicei-metrics-csv',
        'Portfolio metrics CSV',
        'csv',
        `aicei_metrics_${new Date().toISOString().slice(0, 10)}.csv`,
        'Project and period metrics for buyer-side review or attachment.',
        sourceMode,
      ),
      buildArtifact(
        'aicei-approval-checklist',
        'Approval-gap checklist',
        'md',
        `aicei_approval_checklist_${new Date().toISOString().slice(0, 10)}.md`,
        'Checklist of missing approvals or owner-supplied fields that still need validation.',
        sourceMode,
      ),
    ],
  };
}

export function buildAiceiReportDescriptor(args: {
  sourceMode: AiceiSourceMode;
  period: string;
  records: AiceiProjectRecord[];
}): ProofDocumentDescriptor {
  const totalGeneration = args.records.reduce((sum, record) => sum + record.generationKwh, 0);
  const totalReduction = args.records.reduce((sum, record) => sum + Math.max(record.baselineGhgTonnes - record.actualGhgTonnes, 0), 0);
  const totalParticipants = args.records.reduce((sum, record) => sum + record.participantsCount, 0);
  const totalHours = args.records.reduce((sum, record) => sum + record.participantsHours, 0);
  const checklist = buildAiceiChecklist(args.records);

  return {
    definition: buildArtifact(
      'aicei-quarterly-report',
      'Quarterly report PDF',
      'pdf',
      `aicei_report_${new Date().toISOString().slice(0, 10)}.pdf`,
      'Primary quarterly report artifact for the active AICEI period.',
      args.sourceMode,
    ),
    title: `AICEI quarterly reporting pack — ${args.period}`,
    summary: `Alberta-specific reporting pack with community approval markers, generation metrics, GHG reduction tracking, and capacity-building evidence for ${args.period}.`,
    sections: [
      {
        heading: 'Quarterly totals',
        kind: 'bullet_list',
        body: [
          `Portfolio generation: ${totalGeneration.toLocaleString()} kWh`,
          `Portfolio GHG reduction: ${totalReduction.toLocaleString()} tonnes CO2e`,
          `Participants reached: ${totalParticipants.toLocaleString()}`,
          `Capacity-building hours: ${totalHours.toLocaleString()}`,
        ],
      },
      {
        heading: 'Governance and owner-supplied fields',
        kind: 'bullet_list',
        body: [
          `Source mode: ${buildAiceiSourceLabel(args.sourceMode)}`,
          'Community approval status and governance notes remain owner-supplied unless independently confirmed.',
          'OCAP-aligned review language must stay attached to the report during external sharing.',
        ],
      },
      {
        heading: 'Project snapshots',
        kind: 'bullet_list',
        body: args.records.map((record) => `${record.name} (${record.community}) — ${record.generationKwh.toLocaleString()} kWh, approval ${record.communityApprovalStatus}, activities: ${record.capacityBuildingActivities.join('; ') || 'none listed'}`),
      },
      {
        heading: 'Missing approvals and review gaps',
        kind: 'bullet_list',
        body: checklist,
      },
    ],
    nextStep: 'Replace any starter rows with the live or uploaded portfolio, confirm community approval status, and attach the quarterly PDF plus checklist to the buyer review.',
  };
}
