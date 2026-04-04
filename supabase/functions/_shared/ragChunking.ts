export interface CorpusSourceDocument {
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
  sourceUrl?: string;
  sourceUpdatedAt: string;
  metadata: Record<string, unknown>;
}

export interface ChunkedCorpusDocument {
  sourceType: string;
  sourceId: string;
  title: string;
  chunkIndex: number;
  chunkId: string;
  content: string;
  sourceUrl?: string;
  sourceUpdatedAt: string;
  metadata: Record<string, unknown>;
}

const CORPUS_UPDATED_AT = '2026-03-24T00:00:00.000Z';
const DEFAULT_MAX_CHARS = 900;
const DEFAULT_OVERLAP_CHARS = 120;

const ENERGY_CORPUS_DOCUMENTS: CorpusSourceDocument[] = [
  {
    sourceType: 'energy_corpus',
    sourceId: 'aeso-market-basics',
    title: 'AESO Market Basics',
    sourceUrl: 'https://www.aeso.ca/market/',
    sourceUpdatedAt: CORPUS_UPDATED_AT,
    metadata: {
      topic: 'aeso',
      seeded_from: 'docs/energy-corpus/aeso-market-basics.md',
      primary_source_anchors: [
        'https://www.aeso.ca/',
        'https://api.aeso.ca/',
        'https://www.aeso.ca/market/'
      ]
    },
    content: `# AESO Market Basics

## Scope
High-level reference notes for Alberta power market context used by CEIP dashboards and future RAG features.

## Core Concepts
- The Alberta Electric System Operator (AESO) operates Alberta's interconnected electric system and wholesale electricity market.
- Alberta's energy market is commonly described as an energy-only market with pool-price settlement and balancing and system-operator functions run by AESO.
- Pool price is commonly expressed in dollars per megawatt-hour and is one of the main reference signals for retail, industrial, and optimization workflows.
- Demand, generation mix, outages, congestion, and reserve conditions can materially affect price and dispatch conditions.

## Why It Matters in CEIP
- src/lib/aesoService.ts powers Alberta-oriented household and market experiences.
- Rate Watchdog, ROI calculations, and AI explanations need clear separation between live data, cached data, and modeled fallbacks.
- Future ingestion work should prioritize live price, demand, and generation snapshots from authoritative operator sources.

## Retrieval Hints
- Relevant entities: AESO, pool price, Alberta demand, generation mix, transmission constraints, reserve margin.
- Relevant user intents: fixed-vs-RRO comparison, grid optimization, wholesale price explanation, market condition summary.`
  },
  {
    sourceType: 'energy_corpus',
    sourceId: 'ieso-market-basics',
    title: 'IESO Market Basics',
    sourceUrl: 'https://www.ieso.ca/en/Power-Data',
    sourceUpdatedAt: CORPUS_UPDATED_AT,
    metadata: {
      topic: 'ieso',
      seeded_from: 'docs/energy-corpus/ieso-market-basics.md',
      primary_source_anchors: [
        'https://www.ieso.ca/',
        'https://www.ieso.ca/en/Power-Data',
        'https://www.ieso.ca/en/Sector-Participants/Market-Operations'
      ]
    },
    content: `# IESO Market Basics

## Scope
Seed reference for Ontario electricity-market concepts needed by dashboards, LLM prompts, and later retrieval pipelines.

## Core Concepts
- The Independent Electricity System Operator operates Ontario's bulk electricity system and market administration functions.
- Ontario market context often includes demand, supply mix, imports and exports, reliability conditions, and procurement or resource adequacy mechanisms.
- Operational conditions can differ significantly from Alberta, so prompts and retrieval should not collapse AESO and IESO context into one generic market model.
- Ontario-facing analytics should preserve source identity, timestamps, and any market-design caveats relevant to the queried metric.

## Why It Matters in CEIP
- Ontario demand and transition dashboards need operator-specific language and provenance.
- Future AI responses should distinguish between Alberta pool-price logic and Ontario market and operator context.
- Planned ingestion and freshness work should treat IESO data as a first-class operational source, not a generic provincial feed.

## Retrieval Hints
- Relevant entities: IESO, Ontario demand, resource adequacy, imports, exports, generation mix, market report.
- Relevant user intents: Ontario market summary, reliability conditions, transition KPI explanation, demand trend analysis.`
  },
  {
    sourceType: 'energy_corpus',
    sourceId: 'alberta-tier-basics',
    title: 'Alberta TIER Basics',
    sourceUrl: 'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
    sourceUpdatedAt: CORPUS_UPDATED_AT,
    metadata: {
      topic: 'alberta_tier',
      seeded_from: 'docs/energy-corpus/alberta-tier-basics.md',
      primary_source_anchors: [
        'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
        'https://www.alberta.ca/emissions-performance-credits',
        'https://www.alberta.ca/carbon-pricing-and-emissions-trading'
      ]
    },
    content: `# Alberta TIER Basics

## Scope
Seed reference for Technology Innovation and Emissions Reduction program context used in industrial compliance experiences.

## Core Concepts
- TIER is Alberta's industrial emissions and competitiveness framework for covered facilities and regulated compliance obligations.
- Common user questions revolve around compliance pathways, benchmark exposure, emissions intensity, credit usage, fund-payment alternatives, and economic trade-offs.
- TIER-oriented product surfaces must separate static assumptions, modeled economics, and official compliance requirements.
- Carbon-price references, benchmark assumptions, and facility-level recommendations must be freshness-tagged because they change over time.

## Why It Matters in CEIP
- ROI and arbitrage-oriented tools depend on credible TIER context.
- AI explanations need a domain reference that is independent from UI copy and code comments.
- Future RAG flows should retrieve program context before generating compliance narratives or savings recommendations.

## Retrieval Hints
- Relevant entities: TIER, compliance obligation, emissions intensity, benchmark, fund payment, emission performance credit.
- Relevant user intents: savings estimate, compliance pathway comparison, credit-vs-fund logic, program summary.`
  },
  {
    sourceType: 'energy_corpus',
    sourceId: 'oeb-chapter-5-basics',
    title: 'OEB Chapter 5 Basics',
    sourceUrl: 'https://www.oeb.ca/industry/applications-oeb/chapter-5-filing-requirements-electricity-transmission-and-distribution-applications',
    sourceUpdatedAt: CORPUS_UPDATED_AT,
    metadata: {
      topic: 'oeb_chapter_5',
      seeded_from: 'docs/energy-corpus/oeb-chapter-5-basics.md',
      primary_source_anchors: [
        'https://www.oeb.ca/',
        'https://www.oeb.ca/industry/applications-oeb/chapter-5-filing-requirements-electricity-transmission-and-distribution-applications'
      ]
    },
    content: `# OEB Chapter 5 Basics

## Scope
Seed reference for Ontario Energy Board distribution-system-plan and related filing context.

## Core Concepts
- OEB Chapter 5 guidance is relevant to utility planning, filing expectations, asset strategy, and evidence quality.
- CEIP regulatory and asset-trust surfaces should treat filing guidance as structured regulatory context, not generic prose.
- Filing-oriented AI outputs should prefer traceable references, assumptions, and clearly scoped summaries instead of free-form policy speculation.
- Asset-health outputs should be linked to filing context with explicit provenance when used in regulatory narratives.

## Why It Matters in CEIP
- Regulatory filing exports and asset-health narratives are more defensible when grounded in a corpus document instead of only app logic.
- Future RAG flows can use Chapter 5 context to improve filing-assistance prompts and reduce hallucinated guidance.

## Retrieval Hints
- Relevant entities: OEB Chapter 5, DSP, distribution system plan, filing requirements, evidence, utility planning.
- Relevant user intents: filing summary, asset evidence support, regulatory narrative generation, planning guidance.`
  },
  {
    sourceType: 'energy_corpus',
    sourceId: 'aeso-pool-price-basics',
    title: 'AESO Pool Price Basics',
    sourceUrl: 'https://www.aeso.ca/market/market-and-system-reporting/',
    sourceUpdatedAt: CORPUS_UPDATED_AT,
    metadata: {
      topic: 'aeso_pool_price',
      seeded_from: 'docs/energy-corpus/aeso-pool-price-basics.md',
      primary_source_anchors: [
        'https://www.aeso.ca/market/market-and-system-reporting/',
        'https://www.aeso.ca/market/market-snapshot/',
        'https://www.aeso.ca/market/market-and-system-reporting/pool-price/'
      ]
    },
    content: `# AESO Pool Price Basics

## Scope
Seed reference for Alberta pool-price context used in retail, ROI, and grid-operations workflows.

## Core Concepts
- Pool price is a key Alberta market signal and should always be time-stamped.
- Users need to know whether a price is live, snapshot-backed, or fallback-derived.
- Pool-price explanations should avoid implying that model output is the same as operator-fed market data.

## Why It Matters in CEIP
- Alberta dashboards, alerting, and optimization tools depend on honest price provenance.
- RAG and prompt flows need a stable explanation of pool price before generating recommendations.

## Retrieval Hints
- Relevant entities: pool price, Alberta market, wholesale price, dispatch, settlement.
- Relevant user intents: price explanation, savings estimate, market summary, current conditions.`
  },
  {
    sourceType: 'energy_corpus',
    sourceId: 'aeso-market-rules-basics',
    title: 'AESO Market Rules Basics',
    sourceUrl: 'https://www.aeso.ca/market/market-and-system-reporting/market-rules/',
    sourceUpdatedAt: CORPUS_UPDATED_AT,
    metadata: {
      topic: 'aeso_market_rules',
      seeded_from: 'docs/energy-corpus/aeso-market-rules-basics.md',
      primary_source_anchors: [
        'https://www.aeso.ca/market/market-and-system-reporting/market-rules/',
        'https://www.aeso.ca/market/'
      ]
    },
    content: `# AESO Market Rules Basics

## Scope
Seed reference for Alberta market-rule and operator-context explanations.

## Core Concepts
- Market rules frame how dispatch, settlement, and operating decisions are interpreted.
- Rule-oriented content should be traceable to an operator or regulator source.
- Explanations should distinguish rules from assumptions, forecasts, and estimates.

## Why It Matters in CEIP
- AI responses about Alberta market behavior should stay grounded in operator context.
- Dashboards and alerts should not use rules language loosely when the source is actually a model or sample dataset.

## Retrieval Hints
- Relevant entities: market rules, dispatch, settlement, operating reserve, compliance.
- Relevant user intents: rule summary, settlement explanation, market operations context.`
  },
  {
    sourceType: 'energy_corpus',
    sourceId: 'ieso-power-data-basics',
    title: 'IESO Power Data Basics',
    sourceUrl: 'https://www.ieso.ca/en/Power-Data',
    sourceUpdatedAt: CORPUS_UPDATED_AT,
    metadata: {
      topic: 'ieso_power_data',
      seeded_from: 'docs/energy-corpus/ieso-power-data-basics.md',
      primary_source_anchors: [
        'https://www.ieso.ca/en/Power-Data',
        'https://www.ieso.ca/en/Sector-Participants/Market-Operations',
        'https://www.ieso.ca/en/Power-Data/Data-Directory'
      ]
    },
    content: `# IESO Power Data Basics

## Scope
Seed reference for Ontario power-data products and operator terminology.

## Core Concepts
- Power-data references should preserve Ontario-specific naming and cadence.
- Demand, generation, interchange, and market summaries should stay distinct from Alberta market logic.
- Time-series metrics should clearly expose whether data is live, delayed, or archival.

## Why It Matters in CEIP
- Ontario dashboards and AI outputs need a stable reference for power-data vocabulary.
- Future RAG use cases should understand Ontario terms before generating summaries or comparisons.

## Retrieval Hints
- Relevant entities: power data, demand, interchange, generation mix, Ontario market reports.
- Relevant user intents: daily market data, demand trend summary, operator report explanation.`
  },
  {
    sourceType: 'energy_corpus',
    sourceId: 'eccc-emissions-basics',
    title: 'ECCC Emissions Basics',
    sourceUrl: 'https://www.canada.ca/en/environment-climate-change/services/climate-change.html',
    sourceUpdatedAt: CORPUS_UPDATED_AT,
    metadata: {
      topic: 'eccc_emissions',
      seeded_from: 'docs/energy-corpus/eccc-emissions-basics.md',
      primary_source_anchors: [
        'https://www.canada.ca/en/environment-climate-change.html',
        'https://www.canada.ca/en/environment-climate-change/services/climate-change.html',
        'https://www.canada.ca/en/environment-climate-change/services/climate-change/climate-data.html'
      ]
    },
    content: `# ECCC Emissions Basics

## Scope
Seed reference for federal emissions and climate context used in dashboards and prompts.

## Core Concepts
- Federal climate data should be treated as source-backed and time-stamped.
- Emissions context should distinguish measured values, modeled estimates, and policy targets.
- Weather and emissions narratives should not imply operational live data if the source is periodic reporting.

## Why It Matters in CEIP
- Emissions dashboards and narrative tools need climate-context grounding.
- RAG and prompt templates use this context to keep policy explanations factual and scoped.

## Retrieval Hints
- Relevant entities: emissions, climate data, reporting, targets, baseline, sectoral context.
- Relevant user intents: emissions summary, climate context, policy explanation, reporting support.`
  },
  {
    sourceType: 'energy_corpus',
    sourceId: 'oeb-filing-guidance-basics',
    title: 'OEB Filing Guidance Basics',
    sourceUrl: 'https://www.oeb.ca/industry/applications-oeb/chapter-5-filing-requirements-electricity-transmission-and-distribution-applications',
    sourceUpdatedAt: CORPUS_UPDATED_AT,
    metadata: {
      topic: 'oeb_filing_guidance',
      seeded_from: 'docs/energy-corpus/oeb-filing-guidance-basics.md',
      primary_source_anchors: [
        'https://www.oeb.ca/industry/applications-oeb/chapter-5-filing-requirements-electricity-transmission-and-distribution-applications',
        'https://www.oeb.ca/'
      ]
    },
    content: `# OEB Filing Guidance Basics

## Scope
Seed reference for Ontario filing guidance beyond the broader Chapter 5 basics note.

## Core Concepts
- Filing guidance is most useful when reduced to traceable requirements and evidence expectations.
- Utility filings should be summarized conservatively, with assumptions and caveats made explicit.
- Regulatory language should not be mixed with generic product copy.

## Why It Matters in CEIP
- Filing-assistance workflows need a compact source reference.
- Regulatory AI outputs should stay closer to quoted or paraphrased source language than to free-form synthesis.

## Retrieval Hints
- Relevant entities: filing guidance, evidence support, utility application, transmission, distribution.
- Relevant user intents: filing checklist, regulatory summary, evidence narrative.`
  },
  {
    sourceType: 'energy_corpus',
    sourceId: 'indigenous-energy-basics',
    title: 'Indigenous Energy Basics',
    sourceUrl: 'https://www.nrcan.gc.ca/energy/indigenous-peoples/18830',
    sourceUpdatedAt: CORPUS_UPDATED_AT,
    metadata: {
      topic: 'indigenous_energy',
      seeded_from: 'docs/energy-corpus/indigenous-energy-basics.md',
      primary_source_anchors: [
        'https://www.nrcan.gc.ca/energy/indigenous-peoples/18830',
        'https://www.rcaanc-cirnac.gc.ca/'
      ]
    },
    content: `# Indigenous Energy Basics

## Scope
Seed reference for Indigenous energy context, consultation, and community-led energy discussions.

## Core Concepts
- Indigenous energy context should prioritize sovereignty, consultation, and local governance.
- Product language should avoid generic advice when a project or workflow involves community context.
- Any AI-generated response should clearly separate policy context from community-specific engagement details.

## Why It Matters in CEIP
- Consultation workflows and educational content need a trusted reference.
- RAG and prompt flows should be able to retrieve respectful, source-anchored context.

## Retrieval Hints
- Relevant entities: Indigenous energy, consultation, sovereignty, community-led development, governance.
- Relevant user intents: consultation support, project framing, community energy summary.`
  }
];

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function buildHeadingPath(path: string[], heading: string, level: number): string[] {
  const next = path.slice(0, Math.max(0, level - 1));
  next[level - 1] = heading;
  return next.filter(Boolean);
}

function parseSections(content: string): Array<{ headingPath: string[]; body: string }> {
  const lines = normalizeWhitespace(content).split('\n');
  const sections: Array<{ headingPath: string[]; body: string }> = [];
  let headingPath: string[] = [];
  let buffer: string[] = [];

  const pushCurrent = () => {
    const body = normalizeWhitespace(buffer.join('\n'));
    if (body) {
      sections.push({ headingPath: [...headingPath], body });
    }
    buffer = [];
  };

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      pushCurrent();
      headingPath = buildHeadingPath(headingPath, match[2].trim(), match[1].length);
      buffer.push(line.trim());
      continue;
    }
    buffer.push(line);
  }

  pushCurrent();
  return sections.length > 0 ? sections : [{ headingPath: [], body: normalizeWhitespace(content) }];
}

function splitLargeBlock(text: string, maxChars: number, overlapChars: number): string[] {
  if (text.length <= maxChars) {
    return [text.trim()];
  }

  const paragraphs = text.split(/\n\n+/).map((value) => value.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    const normalized = current.trim();
    if (normalized) chunks.push(normalized);
    current = '';
  };

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      pushCurrent();
    }

    if (paragraph.length <= maxChars) {
      current = paragraph;
      continue;
    }

    let start = 0;
    while (start < paragraph.length) {
      const slice = paragraph.slice(start, start + maxChars).trim();
      if (slice) chunks.push(slice);
      if (start + maxChars >= paragraph.length) break;
      start += Math.max(1, maxChars - overlapChars);
    }
  }

  pushCurrent();
  return chunks;
}

export function getSeedCorpusDocuments(): CorpusSourceDocument[] {
  return ENERGY_CORPUS_DOCUMENTS.map((document) => ({
    ...document,
    metadata: { ...document.metadata }
  }));
}

export function chunkCorpusDocument(
  document: CorpusSourceDocument,
  options: { maxChars?: number; overlapChars?: number } = {}
): ChunkedCorpusDocument[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const overlapChars = options.overlapChars ?? DEFAULT_OVERLAP_CHARS;
  const sections = parseSections(document.content);
  const chunks: ChunkedCorpusDocument[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const sectionText = normalizeWhitespace(section.body);
    if (!sectionText) continue;

    const pieces = splitLargeBlock(sectionText, maxChars, overlapChars);
    for (const piece of pieces) {
      const citationId = `${document.sourceId}:${chunkIndex + 1}`;
      chunks.push({
        sourceType: document.sourceType,
        sourceId: document.sourceId,
        title: document.title,
        chunkIndex,
        chunkId: citationId,
        content: piece,
        sourceUrl: document.sourceUrl,
        sourceUpdatedAt: document.sourceUpdatedAt,
        metadata: {
          ...document.metadata,
          citation_id: citationId,
          heading_path: section.headingPath,
          chunk_char_count: piece.length,
          chunk_token_estimate: Math.ceil(piece.length / 4)
        }
      });
      chunkIndex += 1;
    }
  }

  return chunks;
}
