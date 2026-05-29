import { describe, expect, it } from 'vitest';
import {
  buildProofMetadataLines,
  renderHtmlProofDocument,
  renderMarkdownProofDocument,
  type ProofDocumentDescriptor,
} from '../../src/lib/proofPack';

const descriptor: ProofDocumentDescriptor = {
  definition: {
    id: 'demo-proof-pack',
    label: 'Demo proof pack',
    format: 'html',
    filename: 'demo-proof-pack.html',
    audience: 'Operations reviewer',
    generatedAt: '2026-04-29T00:00:00.000Z',
    jurisdiction: 'Canada',
    sourceSummary: 'Starter portfolio',
    sourceManifestId: 'demo-source-manifest',
    verificationStatus: 'needs_buyer_data',
    doNotClaim: ['Production deployment', 'Customer proof'],
    assumptions: ['Starter workflow only', 'Owner review required'],
    claimLabel: 'advisory',
    isFallback: true,
    freshnessState: 'starter-projects',
    boundedClaimsDisclaimer: 'For review only.',
    description: 'Shared proof artifact test',
  },
  title: 'Demo proof pack',
  summary: 'Shared proof-pack metadata and export rendering.',
  sections: [
    {
      heading: 'Highlights',
      kind: 'bullet_list',
      body: ['One export path', 'Explicit source labels'],
    },
    {
      heading: 'Details',
      kind: 'preformatted',
      body: 'Line one\nLine two',
    },
  ],
  nextStep: 'Promote the export into a buyer-facing route.',
};

describe('proofPack', () => {
  it('builds metadata lines with bounded-claims and fallback disclosure', () => {
    const metadata = buildProofMetadataLines(descriptor.definition);

    expect(metadata).toContain('Jurisdiction: Canada');
    expect(metadata).toContain('Source manifest: demo-source-manifest');
    expect(metadata).toContain('Verification status: needs buyer data');
    expect(metadata).toContain('Claim label: advisory');
    expect(metadata).toContain('Fallback/sample disclosure: fallback or sample-backed');
    expect(metadata.at(-1)).toContain('For review only.');
  });

  it('renders HTML and markdown proof documents with metadata, assumptions, and next step', () => {
    const html = renderHtmlProofDocument(descriptor);
    const markdown = renderMarkdownProofDocument(descriptor);

    expect(html).toContain('Artifact metadata');
    expect(html).toContain('Starter workflow only');
    expect(html).toContain('Explicit source labels');
    expect(html).toContain('Next step');

    expect(markdown).toContain('# Demo proof pack');
    expect(markdown).toContain('## Artifact metadata');
    expect(markdown).toContain('- Claim label: advisory');
    expect(markdown).toContain('```');
    expect(markdown).toContain('Promote the export into a buyer-facing route.');
  });
});
