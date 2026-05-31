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
const manualEvidenceRelativePath = readArg(
  '--manual-evidence',
  'docs/ops/CEIP_STRATEGY_SOURCE_ANCHOR_MANUAL_EVIDENCE_2026-05-31.json',
);
const outPath = readArg('--out');
const timeoutMs = Number(readArg('--timeout-ms', '12000'));
const manualEvidenceMaxAgeDays = Number(readArg('--manual-evidence-max-age-days', '45'));
const failOnUnverified = args.includes('--fail-on-unverified');
const roadmapPath = path.resolve(repoRoot, roadmapRelativePath);
const manualEvidencePath =
  manualEvidenceRelativePath === 'none' ? null : path.resolve(repoRoot, manualEvidenceRelativePath);
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
    label: 'Gneiting and Raftery proper scoring rules',
    url: 'https://stat.uw.edu/research/tech-reports/strictly-proper-scoring-rules-prediction-and-estimation-revised',
    terms: ['Strictly Proper Scoring Rules', 'interval score', 'width as well as coverage'],
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

function classifyFetchFailure(fetched) {
  if (fetched.ok) return '';
  if (fetched.statusCode >= 400) return `http_${fetched.statusCode}`;
  if (/ENOTFOUND|EAI_AGAIN/i.test(fetched.error)) return 'network_dns';
  if (/UND_ERR_CONNECT_TIMEOUT|AbortError|timed out|timeout/i.test(fetched.error)) return 'network_timeout';
  return 'fetch_error';
}

function readManualEvidence() {
  if (!manualEvidencePath || !existsSync(manualEvidencePath)) {
    return {
      path: manualEvidenceRelativePath,
      loaded: false,
      error: '',
      byLabel: new Map(),
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(manualEvidencePath, 'utf8'));
    const anchors = Array.isArray(parsed.anchors) ? parsed.anchors : [];
    return {
      path: manualEvidenceRelativePath,
      loaded: true,
      error: '',
      byLabel: new Map(anchors.map((anchor) => [anchor.label, anchor])),
    };
  } catch (error) {
    return {
      path: manualEvidenceRelativePath,
      loaded: false,
      error: describeFetchError(error),
      byLabel: new Map(),
    };
  }
}

function validateManualEvidence(anchor, manualEvidence) {
  const entry = manualEvidence.byLabel.get(anchor.label);
  if (!entry) {
    return { ok: false, exists: false, reason: 'no manual evidence entry' };
  }

  const entryUrls = [entry.url, ...(Array.isArray(entry.aliasUrls) ? entry.aliasUrls : [])].filter(Boolean);
  if (!entryUrls.includes(anchor.url)) {
    return {
      ok: false,
      exists: true,
      reason: `manual evidence URL mismatch: ${entry.url || 'missing'}`,
    };
  }

  const verifiedAtTime = Date.parse(entry.verifiedAt ?? '');
  if (!Number.isFinite(verifiedAtTime)) {
    return { ok: false, exists: true, reason: 'manual evidence missing valid verifiedAt' };
  }

  if (verifiedAtTime - Date.parse(generatedAt) > 60_000) {
    return { ok: false, exists: true, reason: 'manual evidence verifiedAt is in the future' };
  }

  const ageDays = Math.max(0, (Date.parse(generatedAt) - verifiedAtTime) / 86_400_000);
  if (ageDays > manualEvidenceMaxAgeDays) {
    return {
      ok: false,
      exists: true,
      reason: `manual evidence is ${ageDays.toFixed(1)} days old; max ${manualEvidenceMaxAgeDays}`,
    };
  }

  const matchedTerms = Array.isArray(entry.matchedTerms) ? entry.matchedTerms : [];
  const matchedTermSet = new Set(matchedTerms.map((term) => normalizeText(String(term))));
  const missingTerms = anchor.terms.filter((term) => !matchedTermSet.has(normalizeText(term)));
  if (missingTerms.length > 0) {
    return {
      ok: false,
      exists: true,
      reason: `manual evidence missing terms: ${missingTerms.join(', ')}`,
    };
  }

  if (!entry.retrievalTool || !entry.evidenceNote) {
    return {
      ok: false,
      exists: true,
      reason: 'manual evidence must include retrievalTool and evidenceNote',
    };
  }

  return {
    ok: true,
    exists: true,
    verifiedAt: entry.verifiedAt,
    retrievalTool: entry.retrievalTool,
    evidenceNote: entry.evidenceNote,
    matchedTerms,
  };
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
const manualEvidence = readManualEvidence();

const results = await Promise.all(
  sourceAnchors.map(async (anchor) => {
    const appearsInRoadmap = roadmap.includes(anchor.url);
    const fetched = await fetchWithTimeout(anchor.url);
    const searchable = normalizeText(`${fetched.title}\n${fetched.body.slice(0, 500_000)}`);
    const missingTerms = anchor.terms.filter((term) => !searchable.includes(normalizeText(term)));
    const fetchFailureKind = classifyFetchFailure(fetched);
    const manual = validateManualEvidence(anchor, manualEvidence);
    const status =
      appearsInRoadmap && fetched.ok && missingTerms.length === 0
        ? 'verified'
        : appearsInRoadmap && fetched.ok
          ? 'reachable_needs_review'
          : manual.ok
            ? 'manual_verified'
            : manual.exists
              ? 'manual_needs_review'
              : fetchFailureKind.startsWith('network_')
                ? 'network_unreachable'
                : 'fetch_failed';

    return {
      ...anchor,
      appearsInRoadmap,
      status,
      fetchFailureKind,
      httpStatus: fetched.statusCode,
      finalUrl: fetched.finalUrl,
      contentType: fetched.contentType,
      title: fetched.title,
      missingTerms,
      manual,
      error: fetched.error,
    };
  }),
);

const counts = results.reduce(
  (acc, result) => {
    acc[result.status] += 1;
    return acc;
  },
  {
    verified: 0,
    manual_verified: 0,
    reachable_needs_review: 0,
    manual_needs_review: 0,
    network_unreachable: 0,
    fetch_failed: 0,
  },
);

const rows = results
  .map((result) => {
    const evidence =
      result.status === 'verified'
        ? `matched: ${result.terms.join(', ')}`
        : result.status === 'manual_verified'
          ? `manual ${result.manual.retrievalTool} ${result.manual.verifiedAt}; matched: ${result.manual.matchedTerms.join(', ')}; live fetch fallback: ${result.fetchFailureKind || 'n/a'}`
          : result.manual.exists
            ? result.manual.reason
            : result.error || `missing terms: ${result.missingTerms.join(', ') || 'n/a'}`;
    return `| ${result.label} | ${result.status} | ${result.appearsInRoadmap ? 'yes' : 'no'} | ${result.httpStatus || 'n/a'} | ${result.finalUrl} | ${result.fetchFailureKind || 'ok'} | ${evidence} |`;
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
  `- Live-verified anchors: ${counts.verified}`,
  `- Manual-verified anchors: ${counts.manual_verified}`,
  `- Reachable but needs review: ${counts.reachable_needs_review}`,
  `- Manual evidence needs review: ${counts.manual_needs_review}`,
  `- Network-unreachable anchors: ${counts.network_unreachable}`,
  `- Fetch-failed anchors: ${counts.fetch_failed}`,
  `- Manual evidence file: ${manualEvidence.path}${manualEvidence.loaded ? '' : ' (not loaded)'}`,
  `- Manual evidence max age: ${manualEvidenceMaxAgeDays} days`,
  manualEvidence.error ? `- Manual evidence error: ${manualEvidence.error}` : '',
  '- This report checks source reachability, expected anchor terms, and date-stamped manual web evidence when official sites are unreachable from local fetch. It does not replace human source review, buyer evidence, legal review, or production approval.',
  '',
  '## Anchors',
  '',
  '| Source | Status | In roadmap | HTTP | Final URL | Fetch health | Evidence |',
  '|---|---|---|---:|---|---|---|',
  rows,
  '',
]
  .filter(Boolean)
  .join('\n');

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

if (
  failOnUnverified &&
  (counts.fetch_failed > 0 ||
    counts.reachable_needs_review > 0 ||
    counts.manual_needs_review > 0 ||
    counts.network_unreachable > 0)
) {
  process.exit(1);
}
