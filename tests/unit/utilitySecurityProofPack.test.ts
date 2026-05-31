import { describe, expect, it } from 'vitest';
import {
  buildUtilitySecurityControlMatrixCsv,
  buildUtilitySecurityDescriptor,
  buildUtilitySecurityEvidenceIndex,
  buildUtilitySecurityEvidenceMappingCsv,
  buildUtilitySecurityOwnerChecklistMarkdown,
  buildUtilitySecurityPilotAttachmentManifestMarkdown,
  buildUtilitySecurityProofBundle,
  buildUtilitySecurityQuestionnaireTemplateMarkdown,
  UTILITY_SECURITY_PILOT_ATTACHMENTS,
  UTILITY_SECURITY_CONTROLS,
} from '../../src/lib/utilitySecurityProofPack';

describe('utilitySecurity proof workflow', () => {
  it('publishes design-backed, deployed-evidence, and owner-supplied boundaries explicitly', () => {
    const bundle = buildUtilitySecurityProofBundle();
    const descriptor = buildUtilitySecurityDescriptor();
    const evidenceIndex = buildUtilitySecurityEvidenceIndex();

    expect(bundle.artifacts[0].label).toBe('Security review pack');
    expect(bundle.artifacts.some((artifact) => artifact.id === 'utility-security-questionnaire-template')).toBe(true);
    expect(bundle.artifacts.some((artifact) => artifact.id === 'utility-security-pilot-attachment-manifest')).toBe(true);
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
    expect(buildUtilitySecurityPilotAttachmentManifestMarkdown()).toContain('Security header capture for production proof routes');
    expect(buildUtilitySecurityPilotAttachmentManifestMarkdown()).toContain('SBOM or package inventory plus dependency audit notes');
    expect(buildUtilitySecurityPilotAttachmentManifestMarkdown()).toContain('Hosting, region, analytics, support, and connector subprocessor disclosure');
    expect(buildUtilitySecurityPilotAttachmentManifestMarkdown()).toContain('Incident notification, privacy, legal, and regulator-reporting contacts');
    expect(buildUtilitySecurityPilotAttachmentManifestMarkdown()).toContain('SOC 2 certification from this manifest alone');
    expect(buildUtilitySecurityPilotAttachmentManifestMarkdown()).toContain('Production utility approval without buyer-signed procurement evidence');
    expect((evidenceIndex.controls as Array<unknown>).length).toBe(UTILITY_SECURITY_CONTROLS.length);
    expect((evidenceIndex.pilot_attachments as Array<unknown>).length).toBe(UTILITY_SECURITY_PILOT_ATTACHMENTS.length);
  });
});
