#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceDocPath = path.join(repoRoot, 'docs/COMMERCIAL_SOURCE_OF_TRUTH.md');

const requiredActiveDocs = [
  'README.md',
  'docs/Top20.md',
  'docs/CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md',
  'docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md',
  'docs/MVP_DEMO_FREEZE_HANDOFF.md',
  'docs/HERMES_OUTREACH_OPERATING_PLAN.md',
  'docs/growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md',
  'docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md',
  'docs/growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv',
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
  'docs/IMIPLEMENTATION_VERIFICATION.md',
  'docs/UI_allpages.md',
  'docs/Linkedin_artical.md',
  'docs/delivery/GAP_ANALYSIS_COMPREHENSIVE_2025_12_13.md',
  'docs/delivery/GAP_ANALYSIS_IMPLEMENTATION_PLAN.md',
  'docs/delivery/IMPLEMENTATION_PLAN_HYBRID.md',
  'docs/delivery/MONETIZATION_GAP_ANALYSIS.md',
  'docs/delivery/STRATEGY_COMPARISON_FINAL.md',
  'COMMIT_MESSAGE.txt',
];

const failures = [];
const staleBannerPhrase = 'Historical / reconcile-first note';

const currentSellabilityRatingsByDoc = [
  {
    docPath: 'README.md',
    rows: [
      ['Utility demand forecast planning pack', '4.5/5'],
      ['Forecast benchmarking and provenance layer', '4.6/5'],
      ['OEB/AUC regulatory filing packs', '4.3/5'],
      ['TIER compliance savings pack', '4.0/5'],
      ['TIER credit banking audit pack', '3.9/5'],
      ['Asset health executive capex pack', '4.1/5'],
      ['Utility security procurement pack', '4.0/5'],
      ['Shadow billing invoice proof pack', '3.8/5'],
      ['Large-load/data-centre readiness overlay', '3.2/5'],
      ['Consultant/API Canadian energy data pack', '3.1/5'],
    ],
  },
  {
    docPath: 'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
    rows: [
      ['Utility demand forecast planning pack', '4.5/5'],
      ['Forecast benchmarking and provenance layer', '4.6/5'],
      ['OEB/AUC regulatory filing packs', '4.3/5'],
      ['TIER compliance savings pack', '4.0/5'],
      ['TIER credit banking audit pack', '3.9/5'],
      ['Asset health executive capex pack', '4.1/5'],
      ['Utility security procurement pack', '4.0/5'],
      ['Shadow billing invoice proof pack', '3.8/5'],
      ['Large-load/data-centre readiness overlay', '3.2/5'],
      ['Consultant/API Canadian energy data pack', '3.1/5'],
    ],
  },
  {
    docPath: 'docs/HERMES_OUTREACH_OPERATING_PLAN.md',
    rows: [
      ['`utility_forecast_planning_pack`', '4.5/5'],
      ['`forecast_benchmark_provenance`', '4.6/5'],
      ['`regulatory_filing_pack`', '4.3/5'],
      ['`tier_cfo_savings_pack`', '4.0/5'],
      ['`tier_credit_banking_audit_pack`', '3.9/5'],
      ['`asset_health_capex_pack`', '4.1/5'],
      ['`utility_security_procurement_pack`', '4.0/5'],
      ['`shadow_billing_invoice_pack`', '3.8/5'],
      ['`large_load_readiness_overlay`', '3.2/5'],
      ['`consultant_api_data_pack`', '3.1/5'],
    ],
  },
  {
    docPath: 'docs/growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md',
    rows: [
      ['Utility demand forecast planning pack', '4.5/5'],
      ['Forecast benchmarking and provenance layer', '4.6/5'],
      ['OEB/AUC regulatory filing packs', '4.3/5'],
      ['TIER compliance savings pack', '4.0/5'],
      ['TIER credit banking audit pack', '3.9/5'],
      ['Asset health executive capex pack', '4.1/5'],
      ['Utility security procurement pack', '4.0/5'],
      ['Shadow billing invoice proof pack', '3.8/5'],
      ['Large-load/data-centre readiness overlay', '3.2/5'],
      ['Consultant/API Canadian energy data pack', '3.1/5'],
    ],
  },
  {
    docPath: 'docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md',
    rows: [
      ['Utility demand forecast planning pack', '4.5/5'],
      ['Forecast benchmarking and provenance layer', '4.6/5'],
      ['OEB/AUC regulatory filing packs', '4.3/5'],
      ['TIER compliance savings pack', '4.0/5'],
      ['TIER credit banking audit pack', '3.9/5'],
      ['Asset health executive capex pack', '4.1/5'],
      ['Utility security procurement pack', '4.0/5'],
      ['Shadow billing invoice proof pack', '3.8/5'],
      ['Large-load/data-centre readiness overlay', '3.2/5'],
      ['Consultant/API Canadian energy data pack', '3.1/5'],
    ],
  },
];

const overconfidentOutreachRatings = ['4.7/5', '4.8/5', '4.9/5'];
const commercialPositioningPath = path.join(repoRoot, 'src/lib/commercialPositioning.ts');
const appRoutesPath = path.join(repoRoot, 'src/App.tsx');
const pilotEvidenceValidatorPath = path.join(repoRoot, 'scripts/validate-pilot-evidence-register.mjs');
const currentCommercialWedgeScores = [
  ['utility-demand-forecast', 4.5],
  ['forecast-benchmarking', 4.6],
  ['regulatory-filing', 4.3],
  ['tier-compliance', 4.0],
  ['tier-credit-banking', 3.9],
  ['asset-health', 4.1],
  ['utility-security', 4.0],
  ['shadow-billing', 3.8],
  ['large-load-readiness', 3.2],
  ['consultant-api-data-pack', 3.1],
];
const currentCommercialWedgeRoutes = [
  ['utility-demand-forecast', '/utility-demand-forecast', '/forecast-benchmarking'],
  ['forecast-benchmarking', '/forecast-benchmarking', '/utility-demand-forecast'],
  ['regulatory-filing', '/regulatory-filing', '/utility-demand-forecast'],
  ['tier-compliance', '/roi-calculator', '/credit-banking'],
  ['tier-credit-banking', '/credit-banking', '/roi-calculator'],
  ['asset-health', '/asset-health', '/regulatory-filing'],
  ['utility-security', '/utility-security', '/utility-demand-forecast'],
  ['shadow-billing', '/shadow-billing', '/roi-calculator'],
  ['large-load-readiness', '/ai-datacentres', '/utility-demand-forecast'],
  ['consultant-api-data-pack', '/api-docs', '/dashboard'],
];
const routeAliasesThatMustRemainLive = ['/solutions', '/pilot-readiness', '/pilot-evidence'];

function extractAppRoutes(appSource) {
  return new Set(
    [...appSource.matchAll(/path:\s*'([^']+)'/g)]
      .map((match) => match[1])
      .filter((routePath) => !routePath.includes(':') && !routePath.includes('*')),
  );
}

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

  for (const expectation of currentSellabilityRatingsByDoc) {
    const absoluteDocPath = path.join(repoRoot, expectation.docPath);
    if (!existsSync(absoluteDocPath)) {
      continue;
    }

    const doc = readFileSync(absoluteDocPath, 'utf8');
    const rows = doc.split(/\r?\n/);

    for (const [needle, rating] of expectation.rows) {
      const matchingRows = rows.filter((line) => line.includes(needle) && line.includes('|'));
      if (matchingRows.length === 0) {
        failures.push(`${expectation.docPath} is missing active sellability row for ${needle}.`);
      } else if (!matchingRows.some((row) => row.includes(rating))) {
        failures.push(`${expectation.docPath} has stale sellability rating for ${needle}; expected ${rating}, found rows: ${matchingRows.map((row) => row.trim()).join(' / ')}`);
      }
    }

    if (expectation.docPath !== 'docs/COMMERCIAL_SOURCE_OF_TRUTH.md') {
      for (const rating of overconfidentOutreachRatings) {
        if (doc.includes(rating)) {
          failures.push(`${expectation.docPath} contains pre-pilot target rating ${rating}; keep active outreach ratings conservative until the 95% gate passes.`);
        }
      }
    }
  }

  if (!existsSync(commercialPositioningPath)) {
    failures.push('src/lib/commercialPositioning.ts is missing.');
  } else {
    const commercialPositioningSource = readFileSync(commercialPositioningPath, 'utf8');
    const appRouteSource = existsSync(appRoutesPath) ? readFileSync(appRoutesPath, 'utf8') : '';
    const pilotEvidenceValidatorSource = existsSync(pilotEvidenceValidatorPath)
      ? readFileSync(pilotEvidenceValidatorPath, 'utf8')
      : '';
    const appRoutes = extractAppRoutes(appRouteSource);

    if (!existsSync(appRoutesPath)) {
      failures.push('src/App.tsx is missing; cannot verify top-10 proof-pack routes.');
    }

    if (!existsSync(pilotEvidenceValidatorPath)) {
      failures.push('scripts/validate-pilot-evidence-register.mjs is missing; cannot verify pilot-evidence route allowlist.');
    }

    for (const [id, expectedScore] of currentCommercialWedgeScores) {
      const wedgePattern = new RegExp(`id:\\s*'${id}'[\\s\\S]*?score:\\s*${expectedScore}(?:\\.0)?\\b`);
      if (!wedgePattern.test(commercialPositioningSource)) {
        failures.push(`src/lib/commercialPositioning.ts has stale score for ${id}; expected ${expectedScore}/5.`);
      }
    }

    for (const [id, href, proofHref] of currentCommercialWedgeRoutes) {
      const hrefPattern = new RegExp(`id:\\s*'${id}'[\\s\\S]*?href:\\s*'${href}'[\\s\\S]*?proofHref:\\s*'${proofHref}'`);
      if (!hrefPattern.test(commercialPositioningSource)) {
        failures.push(`src/lib/commercialPositioning.ts has stale route mapping for ${id}; expected href ${href} and proofHref ${proofHref}.`);
      }

      for (const routePath of [href, proofHref]) {
        if (!appRoutes.has(routePath)) {
          failures.push(`Commercial route ${routePath} for ${id} is not registered in src/App.tsx.`);
        }
      }

      if (!pilotEvidenceValidatorSource.includes(`'${href}'`)) {
        failures.push(`Pilot evidence validator does not allow top-10 route ${href} for ${id}.`);
      }
    }

    for (const routePath of routeAliasesThatMustRemainLive) {
      if (!appRoutes.has(routePath)) {
        failures.push(`Required commercial support route ${routePath} is not registered in src/App.tsx.`);
      }
      if (routePath.startsWith('/pilot-') && !pilotEvidenceValidatorSource.includes(`'${routePath}'`)) {
        failures.push(`Pilot evidence validator does not allow support route ${routePath}.`);
      }
    }

    const highScorePattern = /score:\s*(?:4\.[7-9]|5)(?:\.0)?\b/;
    if (highScorePattern.test(commercialPositioningSource)) {
      failures.push('src/lib/commercialPositioning.ts contains a pre-pilot score above 4.6/5; keep public website ratings aligned to the active confidence audit.');
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
