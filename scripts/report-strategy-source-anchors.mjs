#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const roadmapRelativePath = readArg('--roadmap', 'docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md');
const outPath = readArg('--out');
const timeoutMs = Number(readArg('--timeout-ms', '12000'));
const failOnUnverified = args.includes('--fail-on-unverified');
const roadmapPath = path.resolve(repoRoot, roadmapRelativePath);
const generatedAt = new Date().toISOString();

const sourceAnchors = [
  {
    label: 'IESO Global Adjustment',
    url: 'https://www.ieso.ca/en/Learn/Electricity-Pricing-Explained/Global-Adjustment',
    terms: ['Global Adjustment', 'Class A', 'top five peak demand hours'],
  },
  {
    label: 'IESO Class A eligibility',
    url: 'https://www.ieso.ca/en/Sector-Participants/Settlements/Global-Adjustment-Class-A-Eligibility',
    terms: ['Global Adjustment Class A Eligibility', 'peak demand factor', 'top five peak hours'],
  },
  {
    label: 'IESO Peak Tracker',
    url: 'https://www.ieso.ca/peaktracker',
    terms: ['Peak Tracker', 'Ontario demand'],
  },
  {
    label: 'OEB filing requirements',
    url: 'https://www.oeb.ca/regulatory-rules-and-documents/rules-codes-and-requirements/filing-requirements-transmission-distribution-applications',
    terms: ['filing requirements', 'distribution'],
  },
  {
    label: 'Alberta TIER regulation',
    url: 'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
    terms: ['Technology Innovation and Emissions Reduction', 'TIER'],
  },
  {
    label: 'Amperon demand forecasts',
    url: 'https://www.amperon.co/products/demand-forecasts',
    terms: ['Demand Forecasts', 'Amperon'],
  },
  {
    label: 'Itron grid planning',
    url: 'https://na.itron.com/products/grid-planning',
    terms: ['Grid Planning', 'Itron'],
  },
  {
    label: 'UtilityAPI Utility Data Exchange',
    url: 'https://utilityapi.com/products/utility-data-exchange',
    terms: ['Utility Data Exchange', 'UtilityAPI'],
  },
  {
    label: 'UtilityAPI authorizations',
    url: 'https://utilityapi.com/docs/api/authorizations',
    terms: ['authorizations', 'UtilityAPI'],
  },
  {
    label: 'Nixtla conformal prediction',
    url: 'https://nixtlaverse.nixtla.io/statsforecast/docs/tutorials/conformalprediction.html',
    terms: ['Conformal', 'StatsForecast'],
  },
  {
    label: 'NIST AI RMF',
    url: 'https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10',
    terms: ['Artificial Intelligence Risk Management Framework', 'AI RMF'],
  },
  {
    label: 'OWASP CSV injection',
    url: 'https://owasp.org/www-community/attacks/CSV_Injection',
    terms: ['CSV Injection', 'Formula Injection'],
  },
  {
    label: 'NIST IR 8053 de-identification',
    url: 'https://csrc.nist.gov/pubs/ir/8053/final',
    terms: ['De-Identification', 'Privacy'],
  },
];

function normalizeText(value) {
  return value.toLowerCase().replace(/\s+/g, ' ');
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function describeFetchError(error) {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause && typeof error.cause === 'object' ? error.cause : null;
  const causeCode = cause && 'code' in cause ? `; cause=${cause.code}` : '';
  return `${error.name}: ${error.message}${causeCode}`;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'CEIP-source-anchor-audit/1.0',
        accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
      },
    });
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();
    return {
      ok: response.ok,
      statusCode: response.status,
      finalUrl: response.url,
      contentType,
      title: extractTitle(body),
      body,
      error: '',
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: 0,
      finalUrl: url,
      contentType: '',
      title: '',
      body: '',
      error: describeFetchError(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

if (!existsSync(roadmapPath)) {
  console.error(`Strategy source anchor report failed: missing ${roadmapRelativePath}`);
  process.exit(1);
}

const roadmap = readFileSync(roadmapPath, 'utf8');

const results = await Promise.all(
  sourceAnchors.map(async (anchor) => {
    const appearsInRoadmap = roadmap.includes(anchor.url);
    const fetched = await fetchWithTimeout(anchor.url);
    const searchable = normalizeText(`${fetched.title}\n${fetched.body.slice(0, 500_000)}`);
    const missingTerms = anchor.terms.filter((term) => !searchable.includes(normalizeText(term)));
    const status =
      appearsInRoadmap && fetched.ok && missingTerms.length === 0
        ? 'verified'
        : appearsInRoadmap && fetched.ok
          ? 'reachable_needs_review'
          : 'fetch_failed';

    return {
      ...anchor,
      appearsInRoadmap,
      status,
      httpStatus: fetched.statusCode,
      finalUrl: fetched.finalUrl,
      contentType: fetched.contentType,
      title: fetched.title,
      missingTerms,
      error: fetched.error,
    };
  }),
);

const counts = results.reduce(
  (acc, result) => {
    acc[result.status] += 1;
    return acc;
  },
  { verified: 0, reachable_needs_review: 0, fetch_failed: 0 },
);

const rows = results
  .map((result) => {
    const evidence =
      result.status === 'verified'
        ? `matched: ${result.terms.join(', ')}`
        : result.error || `missing terms: ${result.missingTerms.join(', ') || 'n/a'}`;
    return `| ${result.label} | ${result.status} | ${result.appearsInRoadmap ? 'yes' : 'no'} | ${result.httpStatus || 'n/a'} | ${result.finalUrl} | ${evidence} |`;
  })
  .join('\n');

const markdown = [
  '# CEIP Strategy Source Anchor Report',
  '',
  `Generated: ${generatedAt}`,
  `Roadmap: ${roadmapRelativePath}`,
  '',
  '## Summary',
  '',
  `- Verified anchors: ${counts.verified}`,
  `- Reachable but needs review: ${counts.reachable_needs_review}`,
  `- Fetch-failed anchors: ${counts.fetch_failed}`,
  '- This report checks source reachability and expected anchor terms. It does not replace human source review, buyer evidence, legal review, or production approval.',
  '',
  '## Anchors',
  '',
  '| Source | Status | In roadmap | HTTP | Final URL | Evidence |',
  '|---|---|---|---:|---|---|',
  rows,
  '',
].join('\n');

if (outPath) {
  const resolvedOutPath = path.resolve(repoRoot, outPath);
  const outputDir = path.dirname(resolvedOutPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  writeFileSync(resolvedOutPath, markdown);
  console.log(`Strategy source anchor report written to ${resolvedOutPath}`);
} else {
  console.log(markdown);
}

if (failOnUnverified && (counts.fetch_failed > 0 || counts.reachable_needs_review > 0)) {
  process.exit(1);
}
