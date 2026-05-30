#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceDocPath = path.join(repoRoot, 'docs/COMMERCIAL_SOURCE_OF_TRUTH.md');

const requiredActiveDocs = [
  'docs/Top20.md',
  'docs/CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md',
  'docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md',
  'docs/MVP_DEMO_FREEZE_HANDOFF.md',
  'docs/HERMES_OUTREACH_OPERATING_PLAN.md',
  'docs/growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md',
  'docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md',
];

const historicalDocsToGovern = [
  'docs/DEEP_RESEARCH_GTM_STRATEGY_2026.md',
  'docs/DEEP_RESEARCH_MARKET_ALIGNMENT_GTM_2026.md',
  'docs/Ph8_PRD.md',
  'docs/Ph8_micro_niche.md',
  'docs/ValueProposition.md',
  'docs/ValueProposition_whop.md',
  'docs/Grok_suggestions.md',
  'docs/ADVERSARIAL_USP_ANALYSIS.md',
  'docs/COMET_OUTREACH_STRATEGY.md',
  'docs/COMET_OUTREACH_STRATEGY_V2.md',
  'docs/whop_skill.md',
  'docs/Whop_analysis.md',
  'docs/PRD_PRODUCTION_MONETIZATION.md',
  'docs/OEB_SANDBOX_PROPOSAL.md',
  'docs/FEASIBILITY_ANALYSIS_PRODUCTION_USE_CASES.md',
  'docs/monetization.md',
  'docs/Final_gaps.md',
  'docs/UI_allpages.md',
  'docs/Linkedin_artical.md',
];

const failures = [];
const staleBannerPhrase = 'Historical / reconcile-first note';

if (!existsSync(sourceDocPath)) {
  failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md is missing.');
} else {
  const sourceDoc = readFileSync(sourceDocPath, 'utf8');

  for (const docPath of requiredActiveDocs) {
    if (!existsSync(path.join(repoRoot, docPath))) {
      failures.push(`Active commercial doc is missing: ${docPath}`);
    }
    if (!sourceDoc.includes(docPath.replace(/^docs\//, '')) && !sourceDoc.includes(docPath)) {
      failures.push(`COMMERCIAL_SOURCE_OF_TRUTH.md does not reference active doc: ${docPath}`);
    }
  }

  for (const docPath of historicalDocsToGovern) {
    const historicalPath = path.join(repoRoot, docPath);
    if (existsSync(historicalPath) && !sourceDoc.includes(docPath.replace(/^docs\//, ''))) {
      failures.push(`Historical doc exists but is not governed as stale/reconcile-first: ${docPath}`);
    }
    if (existsSync(historicalPath)) {
      const historicalDoc = readFileSync(historicalPath, 'utf8');
      if (!historicalDoc.slice(0, 1200).includes(staleBannerPhrase)) {
        failures.push(`Historical doc is missing stale/reconcile-first banner: ${docPath}`);
      }
    }
  }

  const requiredPhrases = [
    '90-92%',
    'buyer-supplied pilot evidence',
    'UtilityAPI/Green Button sandbox',
    'OCAP-aligned workflow',
    'accurate avalanche prediction',
  ];

  for (const phrase of requiredPhrases) {
    if (!sourceDoc.includes(phrase)) {
      failures.push(`COMMERCIAL_SOURCE_OF_TRUTH.md is missing required boundary phrase: ${phrase}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Commercial source-of-truth check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Commercial source-of-truth check passed for ${requiredActiveDocs.length} active docs and ${historicalDocsToGovern.length} historical docs.`);
