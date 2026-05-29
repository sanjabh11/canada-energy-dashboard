import { describe, expect, it } from 'vitest';
import {
  buildConsultantEndpointFreshnessCsv,
  buildConsultantMemoDescriptor,
  buildConsultantNotebookStarterMarkdown,
  buildConsultantProofBundle,
  buildConsultantSampleExport,
  getConsultantVariantHref,
} from '../../src/lib/consultantProofPack';
import { renderMarkdownProofDocument } from '../../src/lib/proofPack';

describe('consultantProofPack', () => {
  it('builds a bounded consultant bundle with memo and sample export artifacts', () => {
    const bundle = buildConsultantProofBundle();

    expect(bundle.title).toBe('Consultant proof pack');
    expect(bundle.artifacts).toHaveLength(4);
    expect(bundle.artifacts[0].format).toBe('md');
    expect(bundle.artifacts[1].format).toBe('json');
    expect(bundle.artifacts[1].isFallback).toBe(true);
    expect(bundle.artifacts[2].id).toBe('consultant-endpoint-freshness-matrix');
  });

  it('renders memo markdown and sample export around the consultant truth stack', () => {
    const memo = renderMarkdownProofDocument(buildConsultantMemoDescriptor('consultant_benchmarking'));
    const sample = buildConsultantSampleExport('consultant_overview');

    expect(memo).toContain('/api-docs');
    expect(memo).toContain('/forecast-benchmarking');
    expect(memo).toContain('/overview');
    expect(memo).toContain('Lead the first outbound message with Forecast benchmarking');

    expect(JSON.parse(sample)).toMatchObject({
      proof_variant: 'consultant_overview',
      primary_route: '/overview',
    });
    expect(buildConsultantEndpointFreshnessCsv()).toContain('/utility-demand-forecast');
    expect(buildConsultantNotebookStarterMarkdown()).toContain('5-10 endpoints');
    expect(getConsultantVariantHref('consultant_api_docs')).toBe('/api-docs');
  });
});
