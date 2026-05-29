export type ProofArtifactFormat = 'csv' | 'html' | 'json' | 'md' | 'pdf' | 'rtf';
export type CommercialProofState = 'standard' | 'constructed_commercial_scenario';
export type ProofVerificationStatus =
  | 'verified_source'
  | 'needs_buyer_data'
  | 'source_stale'
  | 'sandbox_only'
  | 'owner_supplied_required'
  | 'constructed_scenario';

export interface ProofArtifactDefinition {
  id: string;
  label: string;
  format: ProofArtifactFormat;
  filename: string;
  audience: string;
  generatedAt: string;
  jurisdiction: string;
  sourceSummary: string;
  assumptions: string[];
  claimLabel: string;
  isFallback: boolean;
  freshnessState: string;
  sourceManifestId: string;
  verificationStatus: ProofVerificationStatus;
  doNotClaim: string[];
  boundedClaimsDisclaimer: string;
  commercialProofState?: CommercialProofState;
  description?: string;
}

export interface ProofPackBundle {
  title: string;
  summary: string;
  artifacts: ProofArtifactDefinition[];
}

export interface ProofDocumentSection {
  heading: string;
  body: string | string[];
  kind?: 'bullet_list' | 'paragraphs' | 'preformatted';
}

export interface ProofDocumentDescriptor {
  definition: ProofArtifactDefinition;
  title: string;
  summary: string;
  sections: ProofDocumentSection[];
  nextStep?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeBodyLines(section: ProofDocumentSection): string[] {
  if (Array.isArray(section.body)) {
    return section.body.map((item) => String(item));
  }
  return String(section.body)
    .split('\n')
    .map((line) => line.trimEnd());
}

export function buildProofMetadataLines(definition: ProofArtifactDefinition): string[] {
  return [
    `Generated: ${definition.generatedAt}`,
    `Jurisdiction: ${definition.jurisdiction}`,
    `Audience: ${definition.audience}`,
    `Source summary: ${definition.sourceSummary}`,
    `Source manifest: ${definition.sourceManifestId}`,
    `Freshness state: ${definition.freshnessState}`,
    `Verification status: ${definition.verificationStatus.replace(/_/g, ' ')}`,
    `Claim label: ${definition.claimLabel}`,
    `Commercial proof state: ${definition.commercialProofState === 'constructed_commercial_scenario' ? 'constructed commercial scenario' : 'standard'}`,
    `Fallback/sample disclosure: ${definition.isFallback ? 'fallback or sample-backed' : 'non-fallback route state'}`,
    `Do not claim: ${definition.doNotClaim.length > 0 ? definition.doNotClaim.join('; ') : 'No additional claim restrictions beyond the bounded-claims disclaimer.'}`,
    `Bounded claims: ${definition.boundedClaimsDisclaimer}`,
  ];
}

export function renderHtmlProofDocument(descriptor: ProofDocumentDescriptor): string {
  const { definition, title, summary, sections, nextStep } = descriptor;
  const assumptionItems = definition.assumptions.map((assumption) => `<li>${escapeHtml(assumption)}</li>`).join('');
  const metadataItems = buildProofMetadataLines(definition)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('');

  const sectionMarkup = sections.map((section) => {
    const lines = normalizeBodyLines(section);
    const content = section.kind === 'bullet_list'
      ? `<ul>${lines.map((line) => `<li>${escapeHtml(line.replace(/^- /, ''))}</li>`).join('')}</ul>`
      : section.kind === 'preformatted'
        ? `<pre>${escapeHtml(lines.join('\n'))}</pre>`
        : lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');

    return `<section><h2>${escapeHtml(section.heading)}</h2>${content}</section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0 auto; max-width: 880px; padding: 40px; color: #0f172a; line-height: 1.5; }
    h1, h2 { color: #0f172a; }
    .eyebrow { color: #0f766e; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .summary { margin-top: 12px; color: #334155; }
    .panel { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin: 24px 0; }
    ul { padding-left: 20px; }
    pre { background: #e2e8f0; border-radius: 12px; overflow-x: auto; padding: 16px; white-space: pre-wrap; }
    .next-step { margin-top: 24px; padding: 16px; border-left: 4px solid #0f766e; background: #ecfeff; }
  </style>
</head>
<body>
  <div class="eyebrow">${escapeHtml(definition.label)} • ${escapeHtml(definition.format.toUpperCase())}</div>
  <h1>${escapeHtml(title)}</h1>
  <p class="summary">${escapeHtml(summary)}</p>

  <div class="panel">
    <h2>Artifact metadata</h2>
    <ul>${metadataItems}</ul>
  </div>

  <div class="panel">
    <h2>Assumptions</h2>
    <ul>${assumptionItems}</ul>
  </div>

  ${sectionMarkup}
  ${nextStep ? `<div class="next-step"><strong>Next step:</strong> ${escapeHtml(nextStep)}</div>` : ''}
</body>
</html>`;
}

export function renderMarkdownProofDocument(descriptor: ProofDocumentDescriptor): string {
  const { definition, title, summary, sections, nextStep } = descriptor;
  const metadataLines = buildProofMetadataLines(definition).map((line) => `- ${line}`).join('\n');
  const assumptionLines = definition.assumptions.map((assumption) => `- ${assumption}`).join('\n');
  const sectionLines = sections.map((section) => {
    const lines = normalizeBodyLines(section);
    if (section.kind === 'bullet_list') {
      return `## ${section.heading}\n${lines.map((line) => line.startsWith('- ') ? line : `- ${line}`).join('\n')}`;
    }
    if (section.kind === 'preformatted') {
      return `## ${section.heading}\n\`\`\`\n${lines.join('\n')}\n\`\`\``;
    }
    return `## ${section.heading}\n${lines.join('\n\n')}`;
  }).join('\n\n');

  return [
    `# ${title}`,
    '',
    summary,
    '',
    '## Artifact metadata',
    metadataLines,
    '',
    '## Assumptions',
    assumptionLines,
    '',
    sectionLines,
    nextStep ? `\n## Next step\n${nextStep}` : '',
  ].join('\n');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadTextArtifact(
  definition: ProofArtifactDefinition,
  content: string,
  mimeType = 'text/plain;charset=utf-8;',
): void {
  downloadBlob(new Blob([content], { type: mimeType }), definition.filename);
}

function pushPdfLines(doc: any, text: string, x: number, y: number, maxWidth: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * 6);
}

export async function downloadPdfArtifact(descriptor: ProofDocumentDescriptor): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const margin = 18;
  const maxWidth = 174;
  let y = 20;

  function ensureSpace(spaceNeeded = 16) {
    if (y + spaceNeeded <= 275) return;
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  y = pushPdfLines(doc, descriptor.title, margin, y, maxWidth);
  y += 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = pushPdfLines(doc, descriptor.summary, margin, y, maxWidth);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  ensureSpace(12);
  y = pushPdfLines(doc, 'Artifact metadata', margin, y, maxWidth);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  buildProofMetadataLines(descriptor.definition).forEach((line) => {
    ensureSpace(8);
    y = pushPdfLines(doc, `• ${line}`, margin, y, maxWidth);
  });

  ensureSpace(14);
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  y = pushPdfLines(doc, 'Assumptions', margin, y, maxWidth);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  descriptor.definition.assumptions.forEach((assumption) => {
    ensureSpace(8);
    y = pushPdfLines(doc, `• ${assumption}`, margin, y, maxWidth);
  });

  descriptor.sections.forEach((section) => {
    ensureSpace(16);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    y = pushPdfLines(doc, section.heading, margin, y, maxWidth);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    normalizeBodyLines(section).forEach((line) => {
      ensureSpace(8);
      const prefix = section.kind === 'bullet_list' ? '• ' : '';
      y = pushPdfLines(doc, `${prefix}${line.replace(/^- /, '')}`, margin, y, maxWidth);
    });
  });

  if (descriptor.nextStep) {
    ensureSpace(14);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    y = pushPdfLines(doc, 'Next step', margin, y, maxWidth);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y = pushPdfLines(doc, descriptor.nextStep, margin, y, maxWidth);
  }

  doc.save(descriptor.definition.filename);
}
