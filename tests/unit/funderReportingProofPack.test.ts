import { describe, expect, it } from 'vitest';
import { buildFunderJsonPayload, buildFunderProofBundle, buildFunderReportDescriptor } from '../../src/lib/funderReportingProofPack';
import { buildStarterProjects, type FunderReportSection } from '../../src/lib/funderReportingSupport';

const sections: FunderReportSection[] = [
  { id: 'project_overview', title: 'Project Overview', enabled: true },
  { id: 'financial_summary', title: 'Financial Summary', enabled: true },
];

describe('funderReportingProofPack', () => {
  it('marks the starter workflow as fallback while preserving all export formats', () => {
    const bundle = buildFunderProofBundle('starter_projects');

    expect(bundle.artifacts).toHaveLength(6);
    expect(bundle.artifacts.every((artifact) => artifact.isFallback)).toBe(true);
    expect(bundle.artifacts.map((artifact) => artifact.format)).toEqual(['pdf', 'html', 'csv', 'json', 'rtf', 'md']);
  });

  it('builds descriptors and payloads with governance and owner-supplied review language', () => {
    const projects = buildStarterProjects().slice(0, 1);
    const descriptor = buildFunderReportDescriptor({
      templateId: 'wah-ila-toos',
      period: { quarter: 'Q4', year: '2025' },
      projects,
      sections,
      narratives: {},
      sourceMode: 'uploaded_projects',
    });
    const payload = buildFunderJsonPayload({
      templateId: 'wah-ila-toos',
      period: { quarter: 'Q4', year: '2025' },
      projects,
      sections,
      narratives: {},
      sourceMode: 'uploaded_projects',
    });

    expect(descriptor.sections[0].body).toContain('OCAP/FPIC language must remain attached to any report shared outside the Nation-controlled workflow.');
    expect(descriptor.nextStep).toContain('replace starter projects with live or uploaded project data');
    expect(payload.source_mode).toBe('uploaded_projects');
    expect(payload.owner_supplied_fields_notice).toContain('owner-supplied');
    expect((payload.projects as Array<{ sections: Array<{ title: string }> }>)[0].sections[0].title).toBe('Project Overview');
  });
});
