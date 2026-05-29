import { describe, expect, it } from 'vitest';
import {
  buildUtilitySecurityControlMatrixCsv,
  buildUtilitySecurityDescriptor,
  buildUtilitySecurityEvidenceIndex,
  buildUtilitySecurityEvidenceMappingCsv,
  buildUtilitySecurityOwnerChecklistMarkdown,
  buildUtilitySecurityProofBundle,
  buildUtilitySecurityQuestionnaireTemplateMarkdown,
  UTILITY_SECURITY_CONTROLS,
} from '../../src/lib/utilitySecurityProofPack';

describe('utilitySecurity proof workflow', () => {
  it('publishes design-backed, deployed-evidence, and owner-supplied boundaries explicitly', () => {
    const bundle = buildUtilitySecurityProofBundle();
    const descriptor = buildUtilitySecurityDescriptor();
    const evidenceIndex = buildUtilitySecurityEvidenceIndex();

    expect(bundle.artifacts[0].label).toBe('Security review pack');
    expect(bundle.artifacts.some((artifact) => artifact.id === 'utility-security-questionnaire-template')).toBe(true);
    expect((descriptor.sections[1].body as string[]).some((line) => line.includes('Connector token custody: repo backed design'))).toBe(true);
    expect((descriptor.sections[1].body as string[]).some((line) => line.includes('Data handling and pilot boundary: repo backed design'))).toBe(true);
    expect((descriptor.sections[1].body as string[]).some((line) => line.includes('Security header evidence: deployed evidence required'))).toBe(true);
    expect((descriptor.sections[1].body as string[]).some((line) => line.includes('Incident response ownership: owner supplied'))).toBe(true);
    expect((descriptor.sections[1].body as string[]).some((line) => line.includes('Subprocessor and hosting disclosure: owner supplied'))).toBe(true);
    expect(buildUtilitySecurityControlMatrixCsv()).toContain('repo_backed_design');
    expect(buildUtilitySecurityControlMatrixCsv()).toContain('deployed_evidence_required');
    expect(buildUtilitySecurityQuestionnaireTemplateMarkdown()).toContain('Utility privacy questionnaire template');
    expect(buildUtilitySecurityQuestionnaireTemplateMarkdown()).toContain('subprocessor disclosures');
    expect(buildUtilitySecurityOwnerChecklistMarkdown()).toContain('Owner-supplied response checklist');
    expect(buildUtilitySecurityOwnerChecklistMarkdown()).toContain('incident notification contacts');
    expect(buildUtilitySecurityEvidenceMappingCsv()).toContain('question_or_attachment,evidence_type,notes');
    expect(buildUtilitySecurityEvidenceMappingCsv()).toContain('SBOM and dependency audit');
    expect(buildUtilitySecurityEvidenceMappingCsv()).toContain('Subprocessors and hosting disclosure');
    expect((evidenceIndex.controls as Array<unknown>).length).toBe(UTILITY_SECURITY_CONTROLS.length);
  });
});
