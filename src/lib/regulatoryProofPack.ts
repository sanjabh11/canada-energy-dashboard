import {
  REGULATORY_TEMPLATES,
  generateRegulatorySampleData,
  templateToCSV,
  type TemplateType,
} from './regulatoryTemplates';
import type {
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
} from './proofPack';

export type RegulatoryJurisdiction = 'Alberta' | 'Ontario';

interface JurisdictionPackConfig {
  title: string;
  coverSummary: string;
  templates: TemplateType[];
  reviewerChecklist: string[];
  officialSourceUrl: string;
  versionLabel: string;
  fieldMappingNotes: string[];
  assumptions: string[];
  disclaimer: string;
}

const PACK_CONFIG: Record<RegulatoryJurisdiction, JurisdictionPackConfig> = {
  Alberta: {
    title: 'AUC Rule 005 filing prep pack',
    coverSummary: 'Customer-grade Alberta AIR and DSP sample schedules with review notes that narrow annual filing prep into a repeatable export workflow.',
    templates: ['rule005_schedule_4_2', 'rule005_schedule_10', 'auc_dsp_data_schedule'],
    reviewerChecklist: [
      'Confirm utility-specific legal entity, year, and filing officer details before submission.',
      'Replace every sample row with utility data exported from the planning or finance source of record.',
      'Verify depreciation, rate-base, and O&M notes against the latest AUC-approved methodology.',
      'Attach internal review notes for any line-item variance above internal materiality thresholds.',
    ],
    officialSourceUrl: 'https://www.auc.ab.ca/rule-005/',
    versionLabel: 'AUC Rule 005 annual reporting workflow mapping',
    fieldMappingNotes: [
      'Schedule 4.2 maps to utility identification, filing year, and annual reporting context.',
      'Schedule 10 maps to capital additions and financial-review evidence.',
      'DSP data schedule maps forecast, reliability, asset, and scenario rows to planning-review attachments.',
    ],
    assumptions: [
      'Sample schedules remain illustrative until replaced with the utility’s source-of-record data.',
      'Templates preserve schedule structure; they do not automate regulator submission or collaboration workflow.',
      'Filing review still requires utility or consultant sign-off before submission.',
    ],
    disclaimer: 'This pack supports filing preparation and internal review only. It does not submit to the AUC or replace legal review.',
  },
  Ontario: {
    title: 'OEB Chapter 5 filing prep pack',
    coverSummary: 'Customer-grade Ontario DSP sample schedules with benchmark-ready context for asset condition, load forecast, reliability, and scenario planning.',
    templates: ['oeb_dsp_asset_condition', 'oeb_dsp_load_forecast', 'oeb_dsp_reliability', 'oeb_dsp_scenario_matrix'],
    reviewerChecklist: [
      'Confirm the rate application year, utility name, and Chapter 5 filing context before export.',
      'Replace sample condition, forecast, and reliability rows with utility-specific evidence before use.',
      'Cross-check scenario assumptions against the utility’s board-approved planning narrative.',
      'Retain benchmark and reliability notes alongside the exported schedules for internal review.',
    ],
    officialSourceUrl: 'https://www.oeb.ca/regulatory-rules-and-documents/rules-codes-and-requirements/filing-requirements-transmission-distribution-applications',
    versionLabel: 'OEB Chapter 5 DSP filing workflow mapping',
    fieldMappingNotes: [
      'Asset condition rows map to DSP asset-condition and capital-planning evidence.',
      'Load forecast rows map to demand forecast and scenario assumptions.',
      'Reliability rows map to service-quality and system-performance evidence.',
      'Scenario matrix rows map to planning alternatives and sensitivity review.',
    ],
    assumptions: [
      'Scenario matrices and sample schedules are starter artifacts, not an end-to-end DSP workflow.',
      'Utility-specific reliability metrics still require owner-supplied source evidence.',
      'Review notes help internal approval but do not substitute for OEB filing counsel or consultant review.',
    ],
    disclaimer: 'This pack is limited to sample schedule structure and internal review artifacts. It does not automate OEB filing submission.',
  },
};

function buildArtifactBase(
  jurisdiction: RegulatoryJurisdiction,
  id: string,
  label: string,
  format: ProofArtifactDefinition['format'],
  filename: string,
  description: string,
): ProofArtifactDefinition {
  const config = PACK_CONFIG[jurisdiction];
  return {
    id,
    label,
    format,
    filename,
    audience: 'Utility filing analyst or regulatory consultant',
    generatedAt: new Date().toISOString(),
    jurisdiction,
    sourceSummary: `${jurisdiction} filing pack generated from CEIP sample regulatory templates`,
    sourceManifestId: `${jurisdiction.toLowerCase()}-regulatory-source-${config.versionLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    verificationStatus: 'needs_buyer_data',
    doNotClaim: [
      'Regulator submission automation',
      'Legal or filing counsel approval',
      'Utility-specific source-of-record evidence before buyer replacement',
    ],
    assumptions: config.assumptions,
    claimLabel: 'advisory',
    isFallback: true,
    freshnessState: 'sample-pack',
    boundedClaimsDisclaimer: config.disclaimer,
    description,
  };
}

export function getRegulatoryPackConfig(jurisdiction: RegulatoryJurisdiction): JurisdictionPackConfig {
  return PACK_CONFIG[jurisdiction];
}

export function buildRegulatoryProofBundle(jurisdiction: RegulatoryJurisdiction): ProofPackBundle {
  const config = PACK_CONFIG[jurisdiction];
  return {
    title: config.title,
    summary: config.coverSummary,
    artifacts: [
      buildArtifactBase(
        jurisdiction,
        `${jurisdiction.toLowerCase()}-cover-memo`,
        `${jurisdiction} cover memo`,
        'html',
        `${jurisdiction.toLowerCase()}_regulatory_cover_memo.html`,
        'Annotated memo describing the schedules, review posture, and intended filing use.',
      ),
      buildArtifactBase(
        jurisdiction,
        `${jurisdiction.toLowerCase()}-reviewer-checklist`,
        `${jurisdiction} reviewer checklist`,
        'md',
        `${jurisdiction.toLowerCase()}_reviewer_checklist.md`,
        'Internal-review checklist for a utility, REA, or consultant before using the exported schedules.',
      ),
      ...config.templates.map((templateId) => buildArtifactBase(
        jurisdiction,
        templateId,
        REGULATORY_TEMPLATES[templateId].name,
        'csv',
        `${templateId}_${new Date().toISOString().slice(0, 10)}.csv`,
        REGULATORY_TEMPLATES[templateId].description,
      )),
    ],
  };
}

export function buildRegulatoryCoverMemoDescriptor(jurisdiction: RegulatoryJurisdiction): ProofDocumentDescriptor {
  const config = PACK_CONFIG[jurisdiction];
  return {
    definition: buildArtifactBase(
      jurisdiction,
      `${jurisdiction.toLowerCase()}-cover-memo`,
      `${jurisdiction} cover memo`,
      'html',
      `${jurisdiction.toLowerCase()}_regulatory_cover_memo.html`,
      'Annotated memo describing the schedules, reviewer notes, and intended filing use.',
    ),
    title: `${config.title} cover memo`,
    summary: config.coverSummary,
    sections: [
      {
        heading: 'Pack contents',
        kind: 'bullet_list',
        body: config.templates.map((templateId) => `${REGULATORY_TEMPLATES[templateId].name} — ${REGULATORY_TEMPLATES[templateId].description}`),
      },
      {
        heading: 'Reviewer notes',
        kind: 'bullet_list',
        body: config.templates.flatMap((templateId) => REGULATORY_TEMPLATES[templateId].notes.map((note) => `${REGULATORY_TEMPLATES[templateId].name}: ${note}`)),
      },
      {
        heading: 'Official source and field mapping',
        kind: 'bullet_list',
        body: [
          `Version label: ${config.versionLabel}`,
          `Official source: ${config.officialSourceUrl}`,
          ...config.fieldMappingNotes,
        ],
      },
      {
        heading: 'Recommended internal review flow',
        kind: 'bullet_list',
        body: config.reviewerChecklist,
      },
    ],
    nextStep: 'Replace the sample schedules with utility-owned data, attach internal review notes, and move the pack into filing review.',
  };
}

export function buildRegulatoryChecklistMarkdown(jurisdiction: RegulatoryJurisdiction): string {
  const config = PACK_CONFIG[jurisdiction];
  return [
    `# ${config.title} reviewer checklist`,
    '',
    ...config.reviewerChecklist.map((item) => `- ${item}`),
    '',
    '## Included schedules',
    ...config.templates.map((templateId) => `- ${REGULATORY_TEMPLATES[templateId].name}`),
  ].join('\n');
}

export function buildRegulatoryScheduleExports(jurisdiction: RegulatoryJurisdiction): Array<{
  definition: ProofArtifactDefinition;
  content: string;
}> {
  return PACK_CONFIG[jurisdiction].templates.map((templateId) => ({
    definition: buildArtifactBase(
      jurisdiction,
      templateId,
      REGULATORY_TEMPLATES[templateId].name,
      'csv',
      `${templateId}_${new Date().toISOString().slice(0, 10)}.csv`,
      REGULATORY_TEMPLATES[templateId].description,
    ),
    content: templateToCSV(REGULATORY_TEMPLATES[templateId], generateRegulatorySampleData(templateId)),
  }));
}
