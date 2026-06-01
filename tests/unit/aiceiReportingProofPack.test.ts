import { describe, expect, it } from 'vitest';
import {
  buildAiceiChecklist,
  buildAiceiMetricsCsv,
  buildStarterAiceiProjects,
  parseAiceiProjects,
} from '../../src/lib/aiceiReportingSupport';
import {
  buildAiceiProofBundle,
  buildAiceiReportDescriptor,
} from '../../src/lib/aiceiReportingProofPack';

describe('aicei reporting proof workflow', () => {
  it('marks uploaded portfolio rows as owner-supplied and emits a checklist', () => {
    const uploaded = parseAiceiProjects('portfolio.json', JSON.stringify([
      {
        id: 'proj-1',
        name: 'Community Solar',
        reporting_period: 'Q2 2026',
        community: 'Treaty 8',
        technology: 'solar',
        generation_kwh: 42000,
        baseline_ghg: 18,
        actual_ghg: 10,
        capacity_building_activities: ['Apprenticeship cohort'],
        participants_count: 10,
        participants_hours: 32,
        community_approval_status: 'owner_supplied',
      },
    ]));

    const bundle = buildAiceiProofBundle('uploaded_portfolio');
    const descriptor = buildAiceiReportDescriptor({
      sourceMode: 'uploaded_portfolio',
      period: 'Q2 2026',
      records: uploaded,
    });

    expect(bundle.artifacts[0].claimLabel).toBe('owner-supplied');
    expect(descriptor.sections[1].body).toContain('Community approval status and governance notes remain owner-supplied unless independently confirmed.');
    expect(buildAiceiMetricsCsv(uploaded)).toContain('community_approval_status');
    expect(buildAiceiChecklist(uploaded)[0]).toContain('community approval status is owner_supplied');
  });

  it('keeps starter portfolio exports advisory', () => {
    expect(buildStarterAiceiProjects().length).toBeGreaterThan(0);
    expect(buildAiceiProofBundle('starter_portfolio').artifacts[0].claimLabel).toBe('advisory');
  });
});
