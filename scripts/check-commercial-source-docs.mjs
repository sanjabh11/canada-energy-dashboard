#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceDocPath = path.join(repoRoot, 'docs/COMMERCIAL_SOURCE_OF_TRUTH.md');

const requiredActiveDocs = [
  'README.md',
  'docs/Top20.md',
  'docs/CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md',
  'docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md',
  'docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md',
  'docs/MVP_DEMO_FREEZE_HANDOFF.md',
  'docs/HERMES_OUTREACH_OPERATING_PLAN.md',
  'docs/growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md',
  'docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md',
  'docs/growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv',
];

const historicalDocsToGovern = [
  'docs/CEIP_95_CONFIDENCE_AUDIT_2026-05-31.md',
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
      ['Ontario GA/ICI 5CP decision-support pack', '4.2/5'],
      ['Privacy-preserving BYO-CSV proof generator', '4.1/5'],
      ['TIER compliance savings pack', '4.0/5'],
      ['TIER credit banking audit pack', '3.9/5'],
      ['Asset health executive capex pack', '4.1/5'],
      ['Utility security procurement pack', '4.0/5'],
      ['Shadow billing invoice proof pack', '3.8/5'],
    ],
  },
  {
    docPath: 'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
    rows: [
      ['Utility demand forecast planning pack', '4.5/5'],
      ['Forecast benchmarking and provenance layer', '4.6/5'],
      ['OEB/AUC regulatory filing packs', '4.3/5'],
      ['Ontario GA/ICI 5CP decision-support pack', '4.2/5'],
      ['Privacy-preserving BYO-CSV proof generator', '4.1/5'],
      ['TIER compliance savings pack', '4.0/5'],
      ['TIER credit banking audit pack', '3.9/5'],
      ['Asset health executive capex pack', '4.1/5'],
      ['Utility security procurement pack', '4.0/5'],
      ['Shadow billing invoice proof pack', '3.8/5'],
    ],
  },
  {
    docPath: 'docs/HERMES_OUTREACH_OPERATING_PLAN.md',
    rows: [
      ['`utility_forecast_planning_pack`', '4.5/5'],
      ['`forecast_benchmark_provenance`', '4.6/5'],
      ['`regulatory_filing_pack`', '4.3/5'],
      ['`ga_ici_5cp_decision_support_pack`', '4.2/5'],
      ['`byo_csv_privacy_proof_pack`', '4.1/5'],
      ['`tier_cfo_savings_pack`', '4.0/5'],
      ['`tier_credit_banking_audit_pack`', '3.9/5'],
      ['`asset_health_capex_pack`', '4.1/5'],
      ['`utility_security_procurement_pack`', '4.0/5'],
      ['`shadow_billing_invoice_pack`', '3.8/5'],
    ],
  },
  {
    docPath: 'docs/growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md',
    rows: [
      ['Utility demand forecast planning pack', '4.5/5'],
      ['Forecast benchmarking and provenance layer', '4.6/5'],
      ['OEB/AUC regulatory filing packs', '4.3/5'],
      ['Ontario GA/ICI 5CP decision-support pack', '4.2/5'],
      ['Privacy-preserving BYO-CSV proof generator', '4.1/5'],
      ['TIER compliance savings pack', '4.0/5'],
      ['TIER credit banking audit pack', '3.9/5'],
      ['Asset health executive capex pack', '4.1/5'],
      ['Utility security procurement pack', '4.0/5'],
      ['Shadow billing invoice proof pack', '3.8/5'],
    ],
  },
  {
    docPath: 'docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md',
    rows: [
      ['Utility demand forecast planning pack', '4.5/5'],
      ['Forecast benchmarking and provenance layer', '4.6/5'],
      ['OEB/AUC regulatory filing packs', '4.3/5'],
      ['Ontario GA/ICI 5CP decision-support pack', '4.2/5'],
      ['Privacy-preserving BYO-CSV proof generator', '4.1/5'],
      ['TIER compliance savings pack', '4.0/5'],
      ['TIER credit banking audit pack', '3.9/5'],
      ['Asset health executive capex pack', '4.1/5'],
      ['Utility security procurement pack', '4.0/5'],
      ['Shadow billing invoice proof pack', '3.8/5'],
    ],
  },
];

const overconfidentOutreachRatings = ['4.7/5', '4.8/5', '4.9/5'];
const filledNinetyFiveCommandWithoutEvidenceRoot = /path\/to\/filled-pilot-evidence-register\.csv --require-95(?! --evidence-root)/;
const staleForecastDiagnosticPhrase = /MAE,\s*MAPE,\s*RMSE recorded;\s*persistence and seasonal-naive compared;\s*rolling-origin split record,\s*interval coverage,\s*and champion\/challenger note attached\.?/i;
const numericForecastEvidencePhrase = /numeric forecast evidence|numeric MAE|MAE\s+\d+(?:\.\d+)?\s*(?:MW|%)/i;
const forecastTrustArtifactHelperPhrase = /prepare:forecast-trust-report-artifact/;
const strategyRoadmapPath = path.join(repoRoot, 'docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md');
const strategyRoadmapWhitespacePhrases = [
  'Incumbent Foreclosure Matrix',
  'Do not compete on enterprise bill management',
  'Radical Feature Deep-Dives',
  'Budget-Line And Ease-Of-Buy Matrix',
  'self-serve evidence generator',
  'price trajectory, direct investment, and credit-floor assumptions',
  'EnergyCAP',
  'GridX',
  'Bidgely',
  'Oracle Opower',
  'Enverus',
  'Innowatts',
  'UtilityAPI',
  'Itron',
  'Amperon',
  'Adversarial Research Loop Ledger',
  'Is the niche big enough?',
  'OEB Energy at a Glance',
  'Rural Electrification Associations',
  'not a broad SaaS TAM',
  'low-latency curtailment remains out of scope',
  'Completion Audit And Production Approval Packet',
  'Release-readiness preflight',
  'Local release readiness',
  'Live metadata parity',
  'Live static parity',
  'check:live-static-parity',
  'check:post-deploy-live',
  'test:strategy-audit-slice',
  'fixture-proof 95% gate',
  'focused 74-test strategy-audit slice',
  'Do not deploy without explicit production approval',
  'buyer-proven 95% market confidence',
];
const commercialPositioningPath = path.join(repoRoot, 'src/lib/commercialPositioning.ts');
const appRoutesPath = path.join(repoRoot, 'src/App.tsx');
const pilotEvidenceValidatorPath = path.join(repoRoot, 'scripts/validate-pilot-evidence-register.mjs');
const pilotEvidenceSourcePath = path.join(repoRoot, 'src/lib/pilotEvidence.ts');
const currentCommercialWedgeScores = [
  ['utility-demand-forecast', 4.5],
  ['forecast-benchmarking', 4.6],
  ['regulatory-filing', 4.3],
  ['ga-ici-5cp', 4.2],
  ['byo-csv-proof', 4.1],
  ['tier-compliance', 4.0],
  ['tier-credit-banking', 3.9],
  ['asset-health', 4.1],
  ['utility-security', 4.0],
  ['shadow-billing', 3.8],
];
const currentCommercialWedgeRoutes = [
  ['utility-demand-forecast', '/utility-demand-forecast', '/forecast-benchmarking'],
  ['forecast-benchmarking', '/forecast-benchmarking', '/utility-demand-forecast'],
  ['regulatory-filing', '/regulatory-filing', '/utility-demand-forecast'],
  ['ga-ici-5cp', '/ga-ici-5cp', '/forecast-benchmarking'],
  ['byo-csv-proof', '/byo-csv-proof', '/pilot-readiness'],
  ['tier-compliance', '/roi-calculator', '/credit-banking'],
  ['tier-credit-banking', '/credit-banking', '/roi-calculator'],
  ['asset-health', '/asset-health', '/regulatory-filing'],
  ['utility-security', '/utility-security', '/utility-demand-forecast'],
  ['shadow-billing', '/shadow-billing', '/roi-calculator'],
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
    const absoluteActiveDocPath = path.join(repoRoot, docPath);
    if (!existsSync(absoluteActiveDocPath)) {
      failures.push(`Active commercial doc is missing: ${docPath}`);
    }
    if (!sourceDoc.includes(docPath.replace(/^docs\//, '')) && !sourceDoc.includes(docPath)) {
      failures.push(`COMMERCIAL_SOURCE_OF_TRUTH.md does not reference active doc: ${docPath}`);
    }
    if (existsSync(absoluteActiveDocPath)) {
      const activeDoc = readFileSync(absoluteActiveDocPath, 'utf8');
      if (filledNinetyFiveCommandWithoutEvidenceRoot.test(activeDoc)) {
        failures.push(`${docPath} has a 95% filled-register command without --evidence-root; 95% claims must recompute retained redacted artifact hashes.`);
      }
      if (staleForecastDiagnosticPhrase.test(activeDoc)) {
        failures.push(`${docPath} contains the stale keyword-only forecast diagnostic example; use numeric MAE, MAPE, RMSE, baseline, rolling-split, and interval-coverage evidence.`);
      }
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
    'Desk-research strategy-direction confidence is 95/100',
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

    if (filledNinetyFiveCommandWithoutEvidenceRoot.test(doc)) {
      failures.push(`${expectation.docPath} has a 95% filled-register command without --evidence-root; 95% claims must recompute retained redacted artifact hashes.`);
    }
  }

  if (filledNinetyFiveCommandWithoutEvidenceRoot.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md has a 95% filled-register command without --evidence-root.');
  }

  if (staleForecastDiagnosticPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md contains the stale keyword-only forecast diagnostic example; use numeric forecast evidence.');
  }

  if (!numericForecastEvidencePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention numeric forecast evidence for the 95% pilot-evidence workflow.');
  }

  if (!forecastTrustArtifactHelperPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention prepare:forecast-trust-report-artifact for forecast trust retained extracts.');
  }

  if (existsSync(strategyRoadmapPath)) {
    const strategyRoadmap = readFileSync(strategyRoadmapPath, 'utf8');
    for (const phrase of strategyRoadmapWhitespacePhrases) {
      if (!strategyRoadmap.includes(phrase)) {
        failures.push(`docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md is missing incumbent-whitespace phrase: ${phrase}`);
      }
    }
  }

  if (existsSync(pilotEvidenceSourcePath)) {
    const pilotEvidenceSource = readFileSync(pilotEvidenceSourcePath, 'utf8');
    if (filledNinetyFiveCommandWithoutEvidenceRoot.test(pilotEvidenceSource)) {
      failures.push('src/lib/pilotEvidence.ts has a 95% filled-register command without --evidence-root.');
    }
  }

  const pilotEvidenceDocPath = path.join(repoRoot, 'docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md');
  if (existsSync(pilotEvidenceDocPath)) {
    const pilotEvidenceDoc = readFileSync(pilotEvidenceDocPath, 'utf8');
    if (!forecastTrustArtifactHelperPhrase.test(pilotEvidenceDoc)) {
      failures.push('docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md must mention prepare:forecast-trust-report-artifact for forecast trust retained extracts.');
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
