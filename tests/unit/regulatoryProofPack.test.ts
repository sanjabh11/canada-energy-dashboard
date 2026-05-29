import { describe, expect, it } from 'vitest';
import {
  buildRegulatoryChecklistMarkdown,
  buildRegulatoryCoverMemoDescriptor,
  buildRegulatoryProofBundle,
  buildRegulatoryScheduleExports,
} from '../../src/lib/regulatoryProofPack';

describe('regulatoryProofPack', () => {
  it('builds Alberta and Ontario proof bundles with the expected schedule counts', () => {
    const albertaBundle = buildRegulatoryProofBundle('Alberta');
    const ontarioBundle = buildRegulatoryProofBundle('Ontario');

    expect(albertaBundle.artifacts).toHaveLength(5);
    expect(ontarioBundle.artifacts).toHaveLength(6);
    expect(albertaBundle.artifacts[0].label).toBe('Alberta cover memo');
    expect(albertaBundle.artifacts[0].verificationStatus).toBe('needs_buyer_data');
    expect(albertaBundle.artifacts[0].doNotClaim).toContain('Regulator submission automation');
    expect(ontarioBundle.artifacts[1].label).toBe('Ontario reviewer checklist');
  });

  it('exports jurisdiction-specific checklists and schedule payloads', () => {
    const descriptor = buildRegulatoryCoverMemoDescriptor('Ontario');
    const checklist = buildRegulatoryChecklistMarkdown('Alberta');
    const scheduleExports = buildRegulatoryScheduleExports('Ontario');

    expect(descriptor.title).toContain('OEB Chapter 5 filing prep pack');
    expect(descriptor.sections[0].body).toContain('Section 5.2 — Asset Condition Assessment — Asset condition summary by asset class, including health index scores, age demographics, and replacement planning per OEB Appendix 2-AB methodology.');
    expect(descriptor.sections.find((section) => section.heading === 'Official source and field mapping')).toBeTruthy();
    expect(checklist).toContain('# AUC Rule 005 filing prep pack reviewer checklist');
    expect(checklist).toContain('Confirm utility-specific legal entity, year, and filing officer details before submission.');
    expect(scheduleExports).toHaveLength(4);
    expect(scheduleExports[0].content).toContain(',');
    expect(scheduleExports[0].definition.filename).toContain('oeb_dsp_asset_condition');
  });
});
