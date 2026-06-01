import {
  FUND_REPORT_TEMPLATES,
  buildFunderSectionContent,
  buildFunderSourceLabel,
  type FunderProjectData,
  type FunderReportSection,
  type FunderReportTemplate,
  type FunderSourceMode,
} from './funderReportingSupport';
import type {
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
} from './proofPack';

export interface FunderReportPeriod {
  quarter: string;
  year: string;
}

function buildArtifact(
  id: string,
  label: string,
  format: ProofArtifactDefinition['format'],
  filename: string,
  description: string,
  sourceMode: FunderSourceMode,
): ProofArtifactDefinition {
  const isConstructed = sourceMode === 'constructed_commercial_scenario';
  return {
    id,
    label,
    format,
    filename,
    audience: 'Community energy team or program officer',
    generatedAt: new Date().toISOString(),
    jurisdiction: 'Canada',
    sourceSummary: buildFunderSourceLabel(sourceMode),
    sourceManifestId: `funder-reporting-${sourceMode}-v1`,
    verificationStatus: isConstructed
      ? 'constructed_scenario'
      : sourceMode === 'starter_projects'
        ? 'needs_buyer_data'
        : 'owner_supplied_required',
    doNotClaim: [
      'Certified Indigenous data sovereignty infrastructure',
      'Community or Nation approval without partner review',
      'Grant submission approval or program-officer endorsement',
    ],
    assumptions: [
      'The Wah-ila-toos workflow is the primary hardened path in this phase.',
      'Owner-supplied fields remain marked for community review before submission.',
      'The route generates reporting artifacts and does not act as a grant CRM or ERP system.',
    ],
    claimLabel: isConstructed ? 'constructed-scenario' : sourceMode === 'starter_projects' ? 'advisory' : 'owner-supplied',
    isFallback: sourceMode === 'starter_projects',
    freshnessState: sourceMode,
    commercialProofState: isConstructed ? 'constructed_commercial_scenario' : 'standard',
    boundedClaimsDisclaimer: 'This report supports community and funder review. It does not replace program-officer guidance or Nation-specific governance review.',
    description,
  };
}

function buildProjectNarrative(
  project: FunderProjectData,
  sections: FunderReportSection[],
  narratives: Record<string, string>,
): string[] {
  return sections
    .filter((section) => section.enabled)
    .map((section) => `${section.title}\n${narratives[`${project.id}-${section.id}`] || buildFunderSectionContent(project, section.id)}`);
}

export function buildFunderProofBundle(sourceMode: FunderSourceMode): ProofPackBundle {
  return {
    title: 'Funder-ready reporting pack',
    summary: 'Generate a quarterly report with explicit OCAP-aligned source labeling, owner-supplied markers, and export surfaces for community review.',
    artifacts: [
      buildArtifact(
        'funder-quarterly-pdf',
        'Quarterly report PDF',
        'pdf',
        `funder_report_${new Date().toISOString().slice(0, 10)}.pdf`,
        'Primary buyer-facing report for one reporting cycle.',
        sourceMode,
      ),
      buildArtifact(
        'funder-quarterly-html',
        'Quarterly report HTML',
        'html',
        `funder_report_${new Date().toISOString().slice(0, 10)}.html`,
        'Browser-readable version of the quarterly report for review and mark-up.',
        sourceMode,
      ),
      buildArtifact(
        'funder-quarterly-csv',
        'Quarterly report CSV',
        'csv',
        `funder_report_${new Date().toISOString().slice(0, 10)}.csv`,
        'Portfolio table for funder attachment or internal review.',
        sourceMode,
      ),
      buildArtifact(
        'funder-quarterly-json',
        'Quarterly report JSON',
        'json',
        `funder_report_${new Date().toISOString().slice(0, 10)}.json`,
        'Structured report payload preserving owner-supplied markers.',
        sourceMode,
      ),
      buildArtifact(
        'funder-quarterly-rtf',
        'Quarterly report RTF',
        'rtf',
        `funder_report_${new Date().toISOString().slice(0, 10)}.rtf`,
        'Word-compatible draft for program-officer or leadership markup.',
        sourceMode,
      ),
      buildArtifact(
        'funder-outreach-cover-note',
        'Outreach cover note',
        'md',
        `funder_outreach_cover_note_${new Date().toISOString().slice(0, 10)}.md`,
        'Short cover note for outreach or program-officer handoff alongside the main report.',
        sourceMode,
      ),
    ],
  };
}

export function buildFunderReportDescriptor(args: {
  templateId: FunderReportTemplate;
  period: FunderReportPeriod;
  projects: FunderProjectData[];
  sections: FunderReportSection[];
  narratives: Record<string, string>;
  sourceMode: FunderSourceMode;
}): ProofDocumentDescriptor {
  const template = FUND_REPORT_TEMPLATES[args.templateId];
  return {
    definition: buildArtifact(
      'funder-quarterly-report',
      `${template.name} PDF`,
      'pdf',
      `funder-report-${args.period.quarter}-${args.period.year}.pdf`,
      'Primary quarterly report artifact for one project portfolio.',
      args.sourceMode,
    ),
    title: `${template.name} — ${args.period.quarter} ${args.period.year}`,
    summary: `${template.description}. Source mode: ${buildFunderSourceLabel(args.sourceMode)}.`,
    sections: [
      {
        heading: 'Governance and source labeling',
        kind: 'bullet_list',
        body: [
          `Source mode: ${buildFunderSourceLabel(args.sourceMode)}`,
          'Owner-supplied project fields should be reviewed by the community team before submission.',
          'OCAP/FPIC language must remain attached to any report shared outside the Nation-controlled workflow.',
        ],
      },
      ...args.projects.map((project) => ({
        heading: `${project.name} — ${project.community}`,
        kind: 'preformatted' as const,
        body: buildProjectNarrative(project, args.sections, args.narratives).join('\n\n'),
      })),
    ],
    nextStep: 'Review the report with the community energy lead, then replace starter projects with live or uploaded project data before a formal funder submission.',
  };
}

export function buildFunderJsonPayload(args: {
  templateId: FunderReportTemplate;
  period: FunderReportPeriod;
  projects: FunderProjectData[];
  sections: FunderReportSection[];
  narratives: Record<string, string>;
  sourceMode: FunderSourceMode;
}): Record<string, unknown> {
  return {
    template: args.templateId,
    template_name: FUND_REPORT_TEMPLATES[args.templateId].name,
    period: args.period,
    source_mode: args.sourceMode,
    generated_at: new Date().toISOString(),
    owner_supplied_fields_notice: 'Project attributes remain owner-supplied unless otherwise noted by the community team.',
    projects: args.projects.map((project) => ({
      ...project,
      sections: args.sections
        .filter((section) => section.enabled)
        .map((section) => ({
          id: section.id,
          title: section.title,
          content: args.narratives[`${project.id}-${section.id}`] || buildFunderSectionContent(project, section.id),
        })),
    })),
  };
}

export function buildFunderOutreachCoverNote(args: {
  templateId: FunderReportTemplate;
  period: FunderReportPeriod;
  projects: FunderProjectData[];
  sourceMode: FunderSourceMode;
}): string {
  const template = FUND_REPORT_TEMPLATES[args.templateId];
  return [
    `# ${template.name} outreach cover note`,
    '',
    `- Reporting period: ${args.period.quarter} ${args.period.year}`,
    `- Source mode: ${buildFunderSourceLabel(args.sourceMode)}`,
    `- Projects included: ${args.projects.length}`,
    '- This attachment is intended to accompany the quarterly report during partner, funder, or community outreach.',
    '- Owner-supplied governance, FPIC, and approval fields remain visible and should be confirmed by the community team before external submission.',
    '',
    '## Project highlights',
    ...args.projects.map((project) => `- ${project.name} (${project.community}) — ${project.project_status}, ${(project.capacity_kw ?? 0).toLocaleString()} kW, ${(project.emissions_avoided_tonnes_co2 ?? 0).toLocaleString()} tCO2 avoided`),
  ].join('\n');
}
