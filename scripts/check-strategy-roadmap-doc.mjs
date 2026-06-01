#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { strategySourceAnchorUrls } from './lib/strategy-source-anchors.mjs';

const repoRoot = process.cwd();
const roadmapRelativePath = 'docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md';
const roadmapPath = path.join(repoRoot, roadmapRelativePath);
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireText(source, label, needle) {
  if (!source.includes(needle)) {
    fail(`${label} missing required text: ${needle}`);
  }
}

function requirePattern(source, label, pattern) {
  if (!pattern.test(source)) {
    fail(`${label} missing required pattern: ${pattern}`);
  }
}

function sectionBetween(source, startPattern, endPattern) {
  const start = source.search(startPattern);
  if (start === -1) return '';
  const rest = source.slice(start);
  const end = rest.slice(1).search(endPattern);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

if (!existsSync(roadmapPath)) {
  fail(`${roadmapRelativePath} is missing.`);
} else {
  const roadmap = readFileSync(roadmapPath, 'utf8');

  const deliverableRequirements = [
    {
      label: 'verdict and per-pillar scoring',
      needles: ['## 1. Verdict', '| Strategy-direction pillar |', 'Desk-research strategy-direction confidence: **95 / 100**'],
    },
    {
      label: 'market landscape and whitespace map',
      needles: ['## 3. Market And Source Anchors', '### 3.1 Incumbent Foreclosure Matrix', 'Do not compete on enterprise bill management'],
    },
    {
      label: 'blended top-10 roadmap',
      needles: ['## 4. Top 10 Feature Roadmap', '| Rank | Feature | Keep/New |', '| 10 | Shadow billing invoice proof pack |'],
    },
    {
      label: 'radical feature deep dives',
      needles: ['### 4.1 Radical Feature Deep-Dives', 'Forecast trust report / champion-challenger evidence generator', 'Privacy-preserving BYO-CSV proof generator'],
    },
    {
      label: 'have-vs-needed gap analysis',
      needles: ['## 5. Have-Vs-Needed Gap Analysis', '| Feature | Have now | Needed for stronger claim | Dependency type | Effort |'],
    },
    {
      label: 'prediction accuracy uplift track',
      needles: ['## 6. Prediction-Accuracy Uplift Track', 'Do not claim accurate predictions as a general product property'],
    },
    {
      label: 'marketability and sellability track',
      needles: ['## 7. Marketability And Sellability Track', '### 7.1 Budget-Line And Ease-Of-Buy Matrix'],
    },
    {
      label: 'phased plan, prompts, loopholes, and approval packet',
      needles: [
        '## 8. Phased Implementation Plan',
        '## 9. Loophole To Fix Ledger',
        '## 10. Codex Prompts For Next Phases',
        '## 11. Completion Audit And Production Approval Packet',
      ],
    },
  ];

  for (const requirement of deliverableRequirements) {
    for (const needle of requirement.needles) {
      requireText(roadmap, requirement.label, needle);
    }
  }

  const pillars = [
    'Niche correctness',
    'Feature-set completeness',
    'Uniqueness and defensibility',
    'Prediction credibility',
    'Marketability and sellability logic',
    'Feasibility, solo-dev',
    'Gap closeability',
  ];

  for (const pillar of pillars) {
    requireText(roadmap, 'seven-pillar strategy scoring', pillar);
  }

  const topTenFeatures = [
    'Utility demand forecast planning pack',
    'Forecast trust report',
    'OEB/AUC filing autobinder',
    'Ontario GA/ICI 5CP predictor',
    'Privacy-preserving BYO-CSV proof generator',
    'TIER CFO policy what-if and memo',
    'TIER credit banking audit',
    'Asset health capex pack',
    'Utility security procurement pack',
    'Shadow billing invoice proof pack',
  ];

  const topTenSection = sectionBetween(roadmap, /^## 4\. Top 10 Feature Roadmap/m, /^### 4\.1 Radical Feature Deep-Dives/m);
  const rankedRows = topTenSection.split(/\r?\n/).filter((line) => /^\|\s*\d+\s*\|/.test(line));
  if (rankedRows.length !== 10) {
    fail(`top-10 roadmap must contain exactly 10 ranked feature rows; found ${rankedRows.length}.`);
  }

  for (const feature of topTenFeatures) {
    requireText(topTenSection || roadmap, 'top-10 roadmap', feature);
  }

  const gaIciPublicActualNeedles = [
    'https://reports-public.ieso.ca/public/ICIPeakTracker/',
    'public/data/ga_ici_5cp_public_historical_actuals.csv',
    'check:ga-ici-public-actuals',
    'base-period filtering in `prepare:ga-ici-5cp-artifact`',
    'GA/ICI historical backtests could depend on synthetic fixtures or mix actuals from the wrong base period.',
  ];

  for (const needle of gaIciPublicActualNeedles) {
    requireText(roadmap, 'GA/ICI public historical actuals evidence', needle);
  }

  const radicalCandidates = [
    'Ontario GA/ICI 5CP predictor',
    'Forecast trust report / champion-challenger evidence generator',
    'Privacy-preserving BYO-CSV proof generator',
    'OEB/AUC filing autobinder',
    'TIER CFO policy what-if and credit-banking audit',
  ];

  const radicalSection = sectionBetween(roadmap, /^### 4\.1 Radical Feature Deep-Dives/m, /^## 5\. Have-Vs-Needed Gap Analysis/m);
  for (const candidate of radicalCandidates) {
    requireText(radicalSection || roadmap, 'radical feature deep-dives', candidate);
  }

  const adversarialLoopQuestions = [
    /Is the niche big enough\?/,
    /Does Amperon,\s*EnergyCAP[\s\S]*foreclose the wedge\?/,
    /Is filing-prep recurring budget or one-off work\?/,
    /Can a solo dev credibly claim accurate predictions without real data\?/,
    /Does GA\/ICI prediction need incumbent-scale infrastructure\?/,
    /Is privacy-preserving BYO-CSV proof real or just marketing\?/,
  ];

  for (const questionPattern of adversarialLoopQuestions) {
    requirePattern(roadmap, 'adversarial loophole ledger', questionPattern);
  }

  for (const sourceAnchor of strategySourceAnchorUrls) {
    requireText(roadmap, 'current source anchors', sourceAnchor);
  }

  const buyerBoundaryNeedles = [
    'This is not a 95% market-confidence claim',
    'buyer-proven market confidence remains gated',
    'Fixtures and templates do not count as buyer proof',
    'validate:pilot-evidence --require-95 --evidence-root',
    'Do not raise buyer-proven 95% market confidence',
  ];

  for (const needle of buyerBoundaryNeedles) {
    requireText(roadmap, 'buyer-evidence dependency separation', needle);
  }

  const activeGuardNeedles = [
    'shared active commercial-doc registry',
    'docs/ops/CEIP_STRATEGY_SOURCE_ANCHOR_MANUAL_EVIDENCE_2026-05-31.json',
    'this roadmap and `docs/growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv`',
    'Manual source-anchor evidence could become an active proof artifact without claim-boundary scanning.',
    'scripts/lib/commercial-docs.mjs',
    'check:commercial-source` and `check:claim-boundaries` now consume the same active-doc registry',
    '`.csv` evidence templates are scan-eligible',
  ];

  for (const needle of activeGuardNeedles) {
    requireText(roadmap, 'active commercial doc claim-boundary guard coverage', needle);
  }

  const liveParityNeedles = [
    'Hosted root HTML',
    'Hosted manifest / JSON-LD',
    'Do not deploy without explicit production approval',
    'pnpm run check:release-readiness',
    'pnpm run check:production-deploy-script',
    'pnpm run report:strategy-completion-audit',
    'pnpm run report:production-approval-packet',
    'pnpm run report:strategy-source-anchors',
    'pnpm run check:strategy-source-anchors',
    'GA/ICI public historical actuals guard',
    'fixture-proof 95% buyer-evidence gate',
    'check:pilot-evidence-95-fixture-gate',
    'check:pilot-evidence-template',
    'original-plan completion audit coverage',
    'Release readiness could pass while the original 95% strategy-plan requirement map silently drifts.',
    'The production deploy script could drift from the approval packet and skip the CEIP-specific readiness or post-deploy parity gates.',
    'dirty worktree blocker classification',
    'Completion audit could claim the buyer-evidence boundary is enforced without running the fixture-proof and template gates.',
    'pnpm run check:post-deploy-live',
    'Live metadata parity',
    'Live static parity',
    'pnpm run check:live-static-parity',
  ];

  for (const needle of liveParityNeedles) {
    requireText(roadmap, 'live-parity and production approval gate', needle);
  }

  const codexPromptNeedles = [
    '### Phase A prompt',
    '### Phase C prompt',
    '### Phase D prompt',
    '### Phase F prompt',
  ];

  for (const needle of codexPromptNeedles) {
    requireText(roadmap, 'Codex handoff prompts', needle);
  }
}

if (failures.length > 0) {
  console.error('Strategy roadmap document check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Strategy roadmap document check passed for ${roadmapRelativePath}.`);
