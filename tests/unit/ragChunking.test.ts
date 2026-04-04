import { describe, expect, it } from 'vitest';
import { getSeedCorpusDocuments } from '../../supabase/functions/_shared/ragChunking';

describe('ragChunking corpus', () => {
  it('keeps the runtime seed corpus aligned with the documented energy corpus', () => {
    const documents = getSeedCorpusDocuments();
    const sourceIds = documents.map((document) => document.sourceId);

    expect(sourceIds).toEqual([
      'aeso-market-basics',
      'ieso-market-basics',
      'alberta-tier-basics',
      'oeb-chapter-5-basics',
      'aeso-pool-price-basics',
      'aeso-market-rules-basics',
      'ieso-power-data-basics',
      'eccc-emissions-basics',
      'oeb-filing-guidance-basics',
      'indigenous-energy-basics',
    ]);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
  });
});
