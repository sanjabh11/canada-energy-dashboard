import type { DashboardData, QueueData } from '../components/ai-datacentre/types';
import type {
  CommercialProofState,
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
} from './proofPack';

export interface LargeLoadScenarioInput {
  requestedMw: number;
  timelineBand: '0-12 months' | '12-24 months' | '24+ months';
  onSiteGenerationMw: number;
  byopStorageContributionMw: number;
}

export interface LargeLoadReadinessSummary {
  netGridAskMw: number;
  readinessBand: 'phase_1_screening' | 'queue_study_required' | 'phase_2_likely' | 'alberta_only';
  phase1RemainingMw: number;
  queueToPeakRatioPct: number;
  backlogChecklist: string[];
  narrative: string;
}

function buildArtifact(
  id: string,
  label: string,
  format: ProofArtifactDefinition['format'],
  filename: string,
  description: string,
  commercialProofState: CommercialProofState = 'constructed_commercial_scenario',
): ProofArtifactDefinition {
  return {
    id,
    label,
    format,
    filename,
    audience: 'Large-load sponsor, site selection lead, or utility planner',
    generatedAt: new Date().toISOString(),
    jurisdiction: 'Alberta',
    sourceSummary: commercialProofState === 'constructed_commercial_scenario'
      ? 'Constructed Alberta large-load planning overlay with current queue context'
      : 'Alberta AI data-centre and AESO queue context plus owner-entered large-load planning inputs',
    sourceManifestId: 'large-load-aeso-ieso-readiness-overlay-v1',
    verificationStatus: commercialProofState === 'constructed_commercial_scenario'
      ? 'constructed_scenario'
      : 'owner_supplied_required',
    doNotClaim: [
      'Engineering approval',
      'Power-flow study',
      'Queue position guarantee',
      'Utility interconnection approval',
    ],
    assumptions: [
      'This overlay is an Alberta planning narrative only and does not provide engineering approval.',
      'Phase 1 and queue context come from the currently loaded AI data centre dashboard state.',
      'On-site generation and BYOP/storage values are owner-entered scenario assumptions.',
      'IESO/AESO source context should be refreshed before using this as a buyer-facing readiness artifact.',
    ],
    claimLabel: commercialProofState === 'constructed_commercial_scenario' ? 'constructed-scenario' : 'advisory',
    isFallback: false,
    freshnessState: 'dashboard-context',
    commercialProofState,
    boundedClaimsDisclaimer: 'This readiness summary is a planning aid only. It does not guarantee queue position, system impact, or utility approval.',
    description,
  };
}

export function buildLargeLoadReadinessSummary(args: {
  selectedProvince: string;
  queueData: QueueData | null;
  dcData: DashboardData | null;
  input: LargeLoadScenarioInput;
}): LargeLoadReadinessSummary {
  if (args.selectedProvince !== 'AB' || !args.queueData || !args.dcData) {
    return {
      netGridAskMw: Math.max(args.input.requestedMw - args.input.onSiteGenerationMw - args.input.byopStorageContributionMw, 0),
      readinessBand: 'alberta_only',
      phase1RemainingMw: 0,
      queueToPeakRatioPct: 0,
      backlogChecklist: ['Switch to Alberta and load the source-backed queue context before using this readiness pack.'],
      narrative: 'Large-load readiness is only modelled against the Alberta queue and phase-allocation context in this phase.',
    };
  }

  const phase1RemainingMw = Number(args.queueData.insights?.phase1_allocation_status?.remaining_mw ?? 0);
  const phase1Full = Boolean(args.queueData.insights?.phase1_allocation_status?.is_fully_allocated);
  const totalRequestedMw = Number(args.queueData.summary?.total_requested_mw ?? 0);
  const peakDemandMw = Number(args.dcData.grid_impact?.current_peak_demand_mw ?? 12100);
  const netGridAskMw = Math.max(args.input.requestedMw - args.input.onSiteGenerationMw - args.input.byopStorageContributionMw, 0);
  const queueToPeakRatioPct = peakDemandMw > 0 ? ((totalRequestedMw + netGridAskMw) / peakDemandMw) * 100 : 0;

  let readinessBand: LargeLoadReadinessSummary['readinessBand'] = 'phase_1_screening';
  if (phase1Full || netGridAskMw > phase1RemainingMw) {
    readinessBand = 'phase_2_likely';
  } else if (netGridAskMw > phase1RemainingMw * 0.6 || args.input.timelineBand === '0-12 months') {
    readinessBand = 'queue_study_required';
  }

  const backlogChecklist = [
    `Confirm requested service timeline: ${args.input.timelineBand}.`,
    `Validate net grid ask after on-site generation and BYOP/storage: ${netGridAskMw.toFixed(1)} MW.`,
    `Run BYOP/storage sensitivity: 0 MW, ${args.input.byopStorageContributionMw.toFixed(1)} MW, and ${(args.input.byopStorageContributionMw * 1.5).toFixed(1)} MW contribution cases.`,
    'Prepare a queue-to-peak context note and utility study ask before representing this as a grid-ready project.',
    'Refresh AESO and IESO source context before any external buyer handoff.',
    'Keep the exported summary labelled as planning narrative, not engineering approval.',
  ];

  const narrative = readinessBand === 'phase_2_likely'
    ? 'The current Alberta queue context suggests this scenario will likely require a later-phase or more complex interconnection study path.'
    : readinessBand === 'queue_study_required'
      ? 'The project may fit an early screening conversation, but current queue pressure and timing still justify a detailed utility study narrative.'
      : 'The scenario fits a first-screening conversation if the utility accepts the current large-load assumptions and the owner-supplied timeline remains credible.';

  return {
    netGridAskMw,
    readinessBand,
    phase1RemainingMw,
    queueToPeakRatioPct,
    backlogChecklist,
    narrative,
  };
}

export function buildLargeLoadProofBundle(): ProofPackBundle {
  return {
    title: 'Large-load readiness pack',
    summary: 'Export an Alberta-only readiness summary and backlog checklist without turning the dashboard into an engineering-approval claim.',
    artifacts: [
      buildArtifact(
        'large-load-readiness-summary',
        'Readiness summary',
        'html',
        `large_load_readiness_${new Date().toISOString().slice(0, 10)}.html`,
        'Primary readiness narrative for site-selection or utility screening.',
      ),
      buildArtifact(
        'large-load-backlog-checklist',
        'Backlog checklist',
        'md',
        `large_load_backlog_checklist_${new Date().toISOString().slice(0, 10)}.md`,
        'Next-study checklist tied to the active Alberta scenario.',
      ),
    ],
  };
}

export function buildLargeLoadDescriptor(args: {
  input: LargeLoadScenarioInput;
  summary: LargeLoadReadinessSummary;
}): ProofDocumentDescriptor {
  return {
    definition: buildArtifact(
      'large-load-readiness-summary',
      'Readiness summary',
      'html',
      `large_load_readiness_${new Date().toISOString().slice(0, 10)}.html`,
      'Primary readiness narrative for one Alberta large-load scenario.',
    ),
    title: 'Alberta large-load connection readiness summary',
    summary: 'Scenario overlay combining requested MW, on-site generation, BYOP/storage contribution, and the current Alberta queue context.',
    sections: [
      {
        heading: 'Scenario inputs',
        kind: 'bullet_list',
        body: [
          `Requested load: ${args.input.requestedMw.toFixed(1)} MW`,
          `Timeline band: ${args.input.timelineBand}`,
          `On-site generation: ${args.input.onSiteGenerationMw.toFixed(1)} MW`,
          `BYOP or storage contribution: ${args.input.byopStorageContributionMw.toFixed(1)} MW`,
        ],
      },
      {
        heading: 'Current readiness readout',
        kind: 'bullet_list',
        body: [
          `Net grid ask: ${args.summary.netGridAskMw.toFixed(1)} MW`,
          `Phase 1 remaining capacity: ${args.summary.phase1RemainingMw.toFixed(1)} MW`,
          `Queue-to-peak ratio after overlay: ${args.summary.queueToPeakRatioPct.toFixed(1)}%`,
          `Readiness band: ${args.summary.readinessBand.replace(/_/g, ' ')}`,
        ],
      },
      {
        heading: 'Backlog and next-study checklist',
        kind: 'bullet_list',
        body: args.summary.backlogChecklist,
      },
      {
        heading: 'No-approval guardrail',
        kind: 'bullet_list',
        body: [
          'This summary supports assumptions screening only.',
          'It does not replace a system-impact study, power-flow analysis, queue position, or utility approval.',
          'Refresh AESO/IESO source context and owner assumptions before external use.',
        ],
      },
    ],
    nextStep: 'Review this summary with the utility or site-selection advisor, then replace any starter assumptions before using it in a paid pilot conversation.',
  };
}
