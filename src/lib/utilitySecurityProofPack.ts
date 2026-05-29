import type {
  CommercialProofState,
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
} from './proofPack';

export interface UtilitySecurityControl {
  id: string;
  control: string;
  status: 'repo_backed_design' | 'deployed_evidence_required' | 'owner_supplied';
  detail: string;
  evidence: string;
}

export const UTILITY_SECURITY_CONTROLS: UtilitySecurityControl[] = [
  {
    id: 'token-custody',
    control: 'Connector token custody',
    status: 'repo_backed_design',
    detail: 'Deployed connector secrets are managed through server-side secret custody rather than customer browser storage.',
    evidence: 'Utility connector runtime validation and current utility lane implementation notes.',
  },
  {
    id: 'revocation-truth',
    control: 'Revocation and live-state truthfulness',
    status: 'repo_backed_design',
    detail: 'Connector status is designed to transition away from live when disconnect or revocation is initiated and confirmed.',
    evidence: 'Runtime validation pack and disconnect workflow on the utility demand route.',
  },
  {
    id: 'retention-boundary',
    control: 'Retention and bounded use',
    status: 'repo_backed_design',
    detail: 'Normalized interval history and audit records are retained only to support the planning workflow and provenance.',
    evidence: 'Current statement language and utility onboarding pack boundaries.',
  },
  {
    id: 'data-handling-boundary',
    control: 'Data handling and pilot boundary',
    status: 'repo_backed_design',
    detail: 'The current route labels starter, public-sample, uploaded, and connector-derived data separately so procurement reviewers can distinguish demo proof from buyer-owned records.',
    evidence: 'Utility planning live-surface contract, public sample manifest, and proof-pack source labels.',
  },
  {
    id: 'security-headers',
    control: 'Security header evidence',
    status: 'deployed_evidence_required',
    detail: 'Current Netlify headers and deployed route responses should be captured before using this in procurement.',
    evidence: 'Run curl/header capture for public proof routes during pilot security review.',
  },
  {
    id: 'dependency-audit',
    control: 'Dependency audit and SBOM evidence',
    status: 'deployed_evidence_required',
    detail: 'npm audit and package inventory must be attached with remediation notes for any accepted vulnerabilities.',
    evidence: 'npm audit JSON plus package-lock snapshot from the reviewed build.',
  },
  {
    id: 'incident-response-owner',
    control: 'Incident response ownership',
    status: 'owner_supplied',
    detail: 'Buyer-specific incident notification contacts, service-level terms, and regulator reporting obligations must be completed in the procurement response.',
    evidence: 'Owner response checklist and buyer questionnaire attachment.',
  },
  {
    id: 'subprocessors',
    control: 'Subprocessor and hosting disclosure',
    status: 'owner_supplied',
    detail: 'Cloud hosting, analytics, support, and any customer-approved connector subprocessors must be listed for the specific deployment before procurement submission.',
    evidence: 'Owner-supplied evidence matrix and utility questionnaire template.',
  },
  {
    id: 'privacy-review',
    control: 'Utility privacy review packet',
    status: 'owner_supplied',
    detail: 'Buyer-specific privacy questionnaires, utility forms, and signatory details remain owner-supplied during onboarding.',
    evidence: 'Must be attached by CEIP during each utility review.',
  },
  {
    id: 'third-party-certs',
    control: 'Third-party certifications',
    status: 'owner_supplied',
    detail: 'No SOC 2, Green Button Alliance, or NERC certification is claimed through this route alone.',
    evidence: 'Any external certifications would require separate evidence outside this pack.',
  },
];

export const UTILITY_SECURITY_CHECKLIST: string[] = [
  'Confirm the active route stays within planning and benchmarking scope.',
  'Attach the current utility security review pack to the forecast planning export.',
  'Mark any utility questionnaire answers that rely on owner-supplied legal or privacy review.',
  'Do not describe the route as Ontario-wide certified, SOC 2 certified, or production-approved without separate evidence.',
];

export const UTILITY_SECURITY_QUESTIONNAIRE_TEMPLATE: string[] = [
  'Utility or review body name: owner-supplied',
  'Planned pilot scope and feeder/substation boundary: owner-supplied',
  'Requested data categories and retention exceptions: owner-supplied',
  'Data handling, hosting region, and subprocessor disclosures: owner-supplied for the specific deployment',
  'Incident notification contacts, regulator reporting contacts, and service-level terms: owner-supplied',
  'Repo-backed controls referenced in this response: token custody, revocation truth, retention boundary, data handling labels',
  'Any requested certification or third-party audit evidence: owner-supplied and external to this route',
];

export const UTILITY_SECURITY_OWNER_RESPONSE_CHECKLIST: string[] = [
  'Add the utility-specific privacy questionnaire or procurement form.',
  'Confirm the named signatory, legal entity, and privacy contacts.',
  'Add subprocessor and hosting-region disclosures for the actual pilot environment.',
  'Add incident notification contacts and any utility/regulator reporting obligations.',
  'Mark any response that depends on buyer counsel, privacy officer, or utility legal review.',
  'Attach the forecast planning memo and keep the trust boundary language intact.',
];

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
    audience: 'Utility security, privacy, or integration reviewer',
    generatedAt: new Date().toISOString(),
    jurisdiction: 'Canada',
    sourceSummary: commercialProofState === 'constructed_commercial_scenario'
      ? 'Constructed forecast-pilot security attachment pack'
      : 'Current CEIP utility security and data-handling review surface',
    sourceManifestId: 'utility-security-review-pack-v2',
    verificationStatus: commercialProofState === 'constructed_commercial_scenario'
      ? 'constructed_scenario'
      : 'owner_supplied_required',
    doNotClaim: [
      'SOC 2 certification',
      'Green Button Alliance certification',
      'NERC CIP compliance',
      'Production utility approval',
    ],
    assumptions: [
      'Repo-backed items are limited to the currently implemented route and connector behaviors.',
      'Repo-backed design evidence is separate from deployed security evidence such as headers, SBOM, and dependency audit output.',
      'Owner-supplied items require separate legal, privacy, or utility-specific review before submission.',
      'This pack is a review artifact and does not imply certification or production approval.',
    ],
    claimLabel: commercialProofState === 'constructed_commercial_scenario' ? 'constructed-scenario' : 'advisory',
    isFallback: false,
    freshnessState: 'current-route-state',
    commercialProofState,
    boundedClaimsDisclaimer: 'This pack supports utility diligence only. It is not a certification statement, legal opinion, or production approval letter.',
    description,
  };
}

export function buildUtilitySecurityProofBundle(): ProofPackBundle {
  return {
    title: 'Utility security review pack',
    summary: 'Download a structured review pack, control matrix, checklist, and evidence index instead of relying on narrative-only trust copy.',
    artifacts: [
      buildArtifact(
        'utility-security-review-pack',
        'Security review pack',
        'html',
        `utility_security_review_pack_${new Date().toISOString().slice(0, 10)}.html`,
        'Primary diligence document for security and privacy review.',
      ),
      buildArtifact(
        'utility-security-control-matrix',
        'Control matrix CSV',
        'csv',
        `utility_security_control_matrix_${new Date().toISOString().slice(0, 10)}.csv`,
        'Tabular control list showing repo-backed versus owner-supplied items.',
      ),
      buildArtifact(
        'utility-security-checklist',
        'Utility review checklist',
        'md',
        `utility_security_review_checklist_${new Date().toISOString().slice(0, 10)}.md`,
        'Short reviewer checklist for the forecast pack or onboarding review.',
      ),
      buildArtifact(
        'utility-security-evidence-index',
        'Evidence index JSON',
        'json',
        `utility_security_evidence_index_${new Date().toISOString().slice(0, 10)}.json`,
        'Structured index of what is repo-backed versus still owner-supplied.',
      ),
      buildArtifact(
        'utility-security-questionnaire-template',
        'Utility privacy questionnaire template',
        'md',
        `utility_security_questionnaire_template_${new Date().toISOString().slice(0, 10)}.md`,
        'Forecast-pilot attachment template for utility privacy and procurement review.',
      ),
      buildArtifact(
        'utility-security-owner-checklist',
        'Owner-supplied response checklist',
        'md',
        `utility_security_owner_response_checklist_${new Date().toISOString().slice(0, 10)}.md`,
        'Checklist of legal, privacy, and signatory items that still require owner completion.',
      ),
      buildArtifact(
        'utility-security-evidence-mapping',
        'Evidence mapping CSV',
        'csv',
        `utility_security_evidence_mapping_${new Date().toISOString().slice(0, 10)}.csv`,
        'Maps likely questionnaire answers back to repo-backed or owner-supplied evidence.',
      ),
    ],
  };
}

export function buildUtilitySecurityDescriptor(): ProofDocumentDescriptor {
  return {
    definition: buildArtifact(
      'utility-security-review-pack',
      'Security review pack',
      'html',
      `utility_security_review_pack_${new Date().toISOString().slice(0, 10)}.html`,
      'Primary review artifact for utility diligence.',
    ),
    title: 'Utility security and data-handling review pack',
    summary: 'Structured diligence pack for utility forecasting workflows, with explicit repo-backed versus owner-supplied boundaries.',
    sections: [
      {
        heading: 'Current trust boundary',
        kind: 'bullet_list',
        body: [
          'The utility forecasting lane remains a planning and benchmarking workflow, not a production-approval claim.',
          'Connector and revocation behaviors are bounded by the current route and runtime validation pack.',
          'Any buyer-specific security questionnaire still requires owner-supplied legal and privacy review.',
        ],
      },
      {
        heading: 'Control matrix',
        kind: 'bullet_list',
        body: UTILITY_SECURITY_CONTROLS.map((control) => `${control.control}: ${control.status.replace(/_/g, ' ')} — ${control.detail}`),
      },
      {
        heading: 'Reviewer checklist',
        kind: 'bullet_list',
        body: UTILITY_SECURITY_CHECKLIST,
      },
      {
        heading: 'Questionnaire attachment pack',
        kind: 'bullet_list',
        body: [
          'Attach the utility privacy questionnaire template to the forecast planning memo.',
          'Keep owner-supplied legal, privacy, signatory responses, deployed header evidence, SBOM, and dependency audit notes separate from repo-backed design controls.',
          'Use the evidence mapping sheet to show which answers can be defended from the implemented product surface.',
        ],
      },
    ],
    nextStep: 'Attach this pack to the utility planning memo, then add any owner-supplied privacy or legal responses required by the specific utility.',
  };
}

export function buildUtilitySecurityControlMatrixCsv(): string {
  return [
    '# Utility security control matrix',
    `# Generated: ${new Date().toISOString()}`,
    'id,control,status,detail,evidence',
    ...UTILITY_SECURITY_CONTROLS.map((control) => [
      control.id,
      `"${control.control}"`,
      control.status,
      `"${control.detail}"`,
      `"${control.evidence}"`,
    ].join(',')),
  ].join('\n');
}

export function buildUtilitySecurityEvidenceIndex(): Record<string, unknown> {
  return {
    generated_at: new Date().toISOString(),
    bounded_claim: 'Utility review pack only. No certification or production approval implied.',
    controls: UTILITY_SECURITY_CONTROLS.map((control) => ({
      id: control.id,
      control: control.control,
      status: control.status,
      evidence: control.evidence,
      detail: control.detail,
    })),
  };
}

export function buildUtilitySecurityQuestionnaireTemplateMarkdown(): string {
  return [
    '# Utility privacy questionnaire template',
    '',
    '- This attachment accompanies the utility forecasting pilot pack.',
    '- Fields below are owner-supplied, mapped to repo-backed design evidence, or require deployed evidence capture.',
    '',
    ...UTILITY_SECURITY_QUESTIONNAIRE_TEMPLATE.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUtilitySecurityOwnerChecklistMarkdown(): string {
  return [
    '# Owner-supplied response checklist',
    '',
    ...UTILITY_SECURITY_OWNER_RESPONSE_CHECKLIST.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUtilitySecurityEvidenceMappingCsv(): string {
  return [
    '# Utility security evidence mapping',
    `# Generated: ${new Date().toISOString()}`,
    'question_or_attachment,evidence_type,notes',
    '"Utility privacy questionnaire","owner_supplied","Buyer-specific legal and privacy answers remain external to the route."',
    '"Token custody and revocation behavior","repo_backed_design","Mapped to the connector token custody and revocation controls in the review pack."',
    '"Retention and bounded use","repo_backed_design","Mapped to the retention boundary control and utility onboarding notes."',
    '"Data handling labels","repo_backed_design","Mapped to live-surface source kind, fallback, and public-sample manifest labels."',
    '"Security headers and deployed route evidence","deployed_evidence_required","Capture current public route headers before procurement submission."',
    '"SBOM and dependency audit","deployed_evidence_required","Attach package inventory, npm audit output, and remediation notes for accepted vulnerabilities."',
    '"Incident response contacts and reporting obligations","owner_supplied","Must be supplied for the specific buyer and procurement review."',
    '"Subprocessors and hosting disclosure","owner_supplied","Must reflect the actual deployment and approved customer data path."',
    '"Signatory, privacy officer, and legal approver","owner_supplied","Must be completed by the buyer or CEIP operator."',
  ].join('\n');
}
