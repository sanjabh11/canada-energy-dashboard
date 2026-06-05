#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  historicalCommercialDocsToGovern,
  requiredActiveCommercialDocs,
} from './lib/commercial-docs.mjs';

const repoRoot = process.cwd();
const sourceDocPath = path.join(repoRoot, 'docs/COMMERCIAL_SOURCE_OF_TRUTH.md');
const packageJsonPath = path.join(repoRoot, 'package.json');

const requiredActiveDocs = requiredActiveCommercialDocs;
const historicalDocsToGovern = historicalCommercialDocsToGovern;

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
const outreachResponseLogPhrase = /OUTREACH_RESPONSE_LOG_TEMPLATE\.csv|validate:outreach-response-log/;
const outreachRowAppenderPhrase = /append:outreach-response-log-row/;
const outreachIntakePlanPhrase = /plan:outreach-intake|--action-plan/;
const outreachIntakePacketBatchPhrase = /create:outreach-intake-packets/;
const pilotEvidenceIntakePacketPhrase = /create:pilot-evidence-intake-packet/;
const phaseFMinimumIntakeBundlePhrase = /create:phase-f-minimum-intake-bundle|check:phase-f-minimum-intake-bundle/;
const phaseFEvidenceWorkspacePhrase = /create:phase-f-evidence-workspace|check:phase-f-evidence-workspace|report:phase-f-evidence-workspace/;
const unmergedBranchReadinessPhrase = /report:unmerged-branch-readiness|Unmerged Branch Readiness Report|non-merged branch/i;
const pilotEvidenceRegisterUpdaterPhrase = /update:pilot-evidence-register-row/;
const forecastTrustArtifactHelperPhrase = /prepare:forecast-trust-report-artifact/;
const gaIciArtifactHelperPhrase = /prepare:ga-ici-5cp-artifact/;
const byoCsvArtifactHelperPhrase = /prepare:byo-csv-proof-artifact/;
const nonStatusCommercialCommitmentEvidencePhrase = /non-status-only strong commercial commitment evidence|beyond repeating the status|beyond status-only text/i;
const publicReleaseStatusCheckPhrase = /check:public-release-status/;
const approvalPacketPublicStatusGatePhrase = /approval packet now runs[\s\S]*check:public-release-status|public release-status validation is a pre-deploy evidence gate/i;
const approvalPacketRequestPacketGatePhrase = /production approval request packet is a pre-deploy evidence gate|production_approval\.request_packet|request packet is ineligible/i;
const publicStatusRequestPacketHandlePhrase = /production approval request packet[\s\S]{0,220}public-safe evidence handles|public release status[\s\S]{0,260}production approval request packet/i;
const publicStatusSourceIsolationLedgerPhrase = /source provenance isolation ledger[\s\S]{0,240}public-safe handles|public release status[\s\S]{0,280}source provenance isolation ledger/i;
const publicStatusReleaseDeficitLedgerHandlePhrase = /release toolchain and approval deficits[\s\S]{0,260}public-safe handles|public release status[\s\S]{0,320}release toolchain and approval deficits/i;
const publicStatusReleasePreflightClearanceHandlePhrase = /release preflight clearance matrix[\s\S]{0,220}public-safe handles|public release status[\s\S]{0,260}release preflight clearance matrix/i;
const publicStatusBranchFamilyFreshnessHandlePhrase = /branch-family freshness rollup[\s\S]{0,260}public-safe handles|public release status[\s\S]{0,320}branch-family freshness rollup/i;
const publicStatusTopBranchPacketHandlePhrase = /top branch review packet[\s\S]{0,260}public-safe handles|public release status[\s\S]{0,320}top branch review packet/i;
const publicStatusBranchClearanceHandlePhrase = /branch clearance matrix[\s\S]{0,220}public-safe handles|public release status[\s\S]{0,260}branch clearance matrix/i;
const publicStatusCanonicalResolutionHandlePhrase = /canonical-head resolution queue[\s\S]{0,260}public-safe handles|public release status[\s\S]{0,300}canonical-head resolution queue/i;
const publicStatusBuyerHardGateDeficitsHandlePhrase = /buyer evidence hard-gate deficits[\s\S]{0,260}public-safe handles|public release status[\s\S]{0,320}buyer evidence hard-gate deficits/i;
const publicStatusBuyerAcquisitionHandlePhrase = /buyer evidence acquisition matrix[\s\S]{0,260}public-safe handles|public release status[\s\S]{0,280}buyer evidence acquisition matrix/i;
const publicStatusSupabaseClearanceDeficitsHandlePhrase = /Supabase advisor clearance deficits[\s\S]{0,260}public-safe handles|public release status[\s\S]{0,320}Supabase advisor clearance deficits/i;
const stalePostP1LiveParityPhrases = [
  'live deploy and buyer evidence remain blockers',
  'live metadata remains an external gate',
  'expected live metadata and static-parity failures remain external production gates',
];
const staleCurrentStatePhrases = [
  'The repo is clean on `main`',
  '| Repo head | `main` matches `origin/main`',
  '| Git LFS | Installed and push path works',
  'Current pushed source passes release-readiness preflight',
];
const strategyRoadmapPath = path.join(repoRoot, 'docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md');
const buyerEvidenceReadinessReportPath = path.join(repoRoot, 'scripts/report-buyer-evidence-readiness.mjs');
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
  'current-source anchor verification',
  'hard source-anchor gate',
  'Live metadata parity',
  'Live static parity',
  'check:live-static-parity',
  'check:strategy-source-anchors',
  'check:strategy-completion-audit',
  'check:post-deploy-live',
  'test:browser:hosted:proof-packs',
  'test:strategy-audit-slice',
  'test:wedge-prototype-routes',
  'ga-ici-5cp',
  'byo-csv-proof',
  'fixture-proof 95% gate',
  'focused strategy-audit unit slice',
  'wedge route smoke',
  'pilot-readiness, GA/ICI, and BYO-CSV route chunks',
  'PilotReadinessPage',
  'GaIciPeakPredictorPage',
  'ByoCsvProofPage',
  'non-status-only commercial commitment evidence',
  'future production deploys without explicit production approval',
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

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    failures.push(`Could not parse JSON file ${path.relative(repoRoot, filePath)}: ${error.message}`);
    return {};
  }
}

function extractAppRoutes(appSource) {
  return new Set(
    [...appSource.matchAll(/path:\s*'([^']+)'/g)]
      .map((match) => match[1])
      .filter((routePath) => !routePath.includes(':') && !routePath.includes('*')),
  );
}

function sectionBetween(source, startPattern, endPattern) {
  const start = source.search(startPattern);
  if (start === -1) return '';
  const rest = source.slice(start);
  const end = rest.slice(1).search(endPattern);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

function docReference(docPath) {
  return docPath.replace(/^docs\//, '');
}

function hasPreparePilotEvidenceCommandWithoutProofPackId(doc) {
  const command = 'pnpm run prepare:pilot-evidence-artifact';
  let searchStart = 0;
  while (searchStart < doc.length) {
    const commandStart = doc.indexOf(command, searchStart);
    if (commandStart === -1) return false;
    const commandWindow = doc.slice(commandStart, commandStart + 2500);
    const commandEndMatch = commandWindow.search(/\n\s*\n|```/);
    const commandText = commandEndMatch === -1 ? commandWindow : commandWindow.slice(0, commandEndMatch);
    if (!commandText.includes('--proof-pack-id')) return true;
    searchStart = commandStart + command.length;
  }
  return false;
}

if (!existsSync(sourceDocPath)) {
  failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md is missing.');
} else {
  const sourceDoc = readFileSync(sourceDocPath, 'utf8');
  const packageJson = existsSync(packageJsonPath) ? readJson(packageJsonPath) : {};
  const packageScripts = packageJson.scripts ?? {};
  if (!existsSync(packageJsonPath)) {
    failures.push('package.json is missing; cannot verify release-readiness scripts.');
  }

  const commercialSourceScript = String(packageScripts['check:commercial-source'] ?? '');
  if (!commercialSourceScript.includes('node scripts/check-commercial-source-docs.mjs')) {
    failures.push('check:commercial-source must run scripts/check-commercial-source-docs.mjs before composing dependent source checks.');
  }

  if (!/(^|&&\s*)pnpm run check:strategy-roadmap-doc\b/.test(commercialSourceScript)) {
    failures.push('check:commercial-source must call pnpm run check:strategy-roadmap-doc so the roadmap guard runs with the same resolved package manager.');
  }

  if (/corepack\s+pnpm\s+run\s+check:strategy-roadmap-doc\b/.test(commercialSourceScript)) {
    failures.push('check:commercial-source must not require Corepack for its nested roadmap check; release-readiness and deploy scripts enforce Corepack at their top-level gates.');
  }

  const activeCommercialSection = sectionBetween(
    sourceDoc,
    /^## Active Commercial Sources/m,
    /^## Active Sellability Ratings/m,
  );
  const historicalResearchSection = sectionBetween(
    sourceDoc,
    /^## Stale Or Historical Research/m,
    /^## Claim Translation Table/m,
  );

  if (!activeCommercialSection) {
    failures.push('COMMERCIAL_SOURCE_OF_TRUTH.md is missing the Active Commercial Sources section.');
  }

  if (!historicalResearchSection) {
    failures.push('COMMERCIAL_SOURCE_OF_TRUTH.md is missing the Stale Or Historical Research section.');
  }

  for (const docPath of requiredActiveDocs) {
    const docRef = docReference(docPath);
    const absoluteActiveDocPath = path.join(repoRoot, docPath);
    if (!existsSync(absoluteActiveDocPath)) {
      failures.push(`Active commercial doc is missing: ${docPath}`);
    }
    if (!sourceDoc.includes(docPath.replace(/^docs\//, '')) && !sourceDoc.includes(docPath)) {
      failures.push(`COMMERCIAL_SOURCE_OF_TRUTH.md does not reference active doc: ${docPath}`);
    }
    if (activeCommercialSection && !activeCommercialSection.includes(docRef) && !activeCommercialSection.includes(docPath)) {
      failures.push(`Active commercial doc is not listed in the Active Commercial Sources section: ${docPath}`);
    }
    if (historicalResearchSection && (historicalResearchSection.includes(docRef) || historicalResearchSection.includes(docPath))) {
      failures.push(`Active commercial doc is incorrectly listed as historical/reconcile-first: ${docPath}`);
    }
    if (existsSync(absoluteActiveDocPath)) {
      const activeDoc = readFileSync(absoluteActiveDocPath, 'utf8');
      if (filledNinetyFiveCommandWithoutEvidenceRoot.test(activeDoc)) {
        failures.push(`${docPath} has a 95% filled-register command without --evidence-root; 95% claims must recompute retained redacted artifact hashes.`);
      }
      if (hasPreparePilotEvidenceCommandWithoutProofPackId(activeDoc)) {
        failures.push(`${docPath} has a prepare:pilot-evidence-artifact command without --proof-pack-id; retained artifacts must be route/proof-pack matched.`);
      }
      if (staleForecastDiagnosticPhrase.test(activeDoc)) {
        failures.push(`${docPath} contains the stale keyword-only forecast diagnostic example; use numeric MAE, MAPE, RMSE, baseline, rolling-split, and interval-coverage evidence.`);
      }
      for (const stalePhrase of stalePostP1LiveParityPhrases) {
        if (activeDoc.includes(stalePhrase)) {
          failures.push(`${docPath} contains stale pre-P1 live-parity wording: ${stalePhrase}`);
        }
      }
      for (const stalePhrase of staleCurrentStatePhrases) {
        if (activeDoc.includes(stalePhrase)) {
          failures.push(`${docPath} contains stale current-state wording that must be refreshed from live repo evidence: ${stalePhrase}`);
        }
      }
    }
  }

  for (const docPath of historicalDocsToGovern) {
    const docRef = docReference(docPath);
    const historicalPath = path.join(repoRoot, docPath);
    if (existsSync(historicalPath) && !sourceDoc.includes(docPath.replace(/^docs\//, ''))) {
      failures.push(`Historical doc exists but is not governed as stale/reconcile-first: ${docPath}`);
    }
    if (activeCommercialSection && (activeCommercialSection.includes(docRef) || activeCommercialSection.includes(docPath))) {
      failures.push(`Historical doc is incorrectly listed in the Active Commercial Sources section: ${docPath}`);
    }
    if (
      existsSync(historicalPath) &&
      historicalResearchSection &&
      !historicalResearchSection.includes(docRef) &&
      !historicalResearchSection.includes(docPath)
    ) {
      failures.push(`Historical doc is not listed in the Stale Or Historical Research section: ${docPath}`);
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
    'live parity is achieved only when post-deploy live checks pass',
    'OUTREACH_RESPONSE_LOG_TEMPLATE.csv',
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

  if (hasPreparePilotEvidenceCommandWithoutProofPackId(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md has a prepare:pilot-evidence-artifact command without --proof-pack-id.');
  }

  if (staleForecastDiagnosticPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md contains the stale keyword-only forecast diagnostic example; use numeric forecast evidence.');
  }

  if (!numericForecastEvidencePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention numeric forecast evidence for the 95% pilot-evidence workflow.');
  }

  if (!outreachResponseLogPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention the outreach response log template and validator.');
  }

  if (!outreachIntakePlanPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention plan:outreach-intake or --action-plan for outreach response intake actions.');
  }

  if (packageScripts['plan:outreach-intake'] !== 'node scripts/validate-outreach-response-log.mjs --action-plan') {
    failures.push('package.json must keep plan:outreach-intake wired to the outreach response-log action-plan validator.');
  }

  if (packageScripts['check:outreach-intake-plan-template'] !== 'node scripts/validate-outreach-response-log.mjs --allow-template --action-plan') {
    failures.push('package.json must keep check:outreach-intake-plan-template wired to the outreach response-log action-plan template gate.');
  }

  if (packageScripts['create:outreach-intake-packets'] !== 'node scripts/create-outreach-intake-packets.mjs') {
    failures.push('package.json must keep create:outreach-intake-packets wired to the outreach intake packet batch generator.');
  }

  if (packageScripts['check:phase-f-minimum-intake-bundle'] !== 'node scripts/check-phase-f-minimum-intake-bundle.mjs') {
    failures.push('package.json must keep check:phase-f-minimum-intake-bundle wired to the Phase F starter bundle smoke check.');
  }

  if (packageScripts['create:phase-f-evidence-workspace'] !== 'node scripts/create-phase-f-evidence-workspace.mjs') {
    failures.push('package.json must keep create:phase-f-evidence-workspace wired to the Phase F evidence workspace generator.');
  }

  if (packageScripts['check:phase-f-evidence-workspace'] !== 'node scripts/check-phase-f-evidence-workspace.mjs') {
    failures.push('package.json must keep check:phase-f-evidence-workspace wired to the Phase F evidence workspace smoke check.');
  }

  if (packageScripts['report:phase-f-evidence-workspace'] !== 'node scripts/report-phase-f-evidence-workspace.mjs') {
    failures.push('package.json must keep report:phase-f-evidence-workspace wired to the Phase F evidence workspace status report.');
  }

  if (packageScripts['report:unmerged-branch-readiness'] !== 'node scripts/report-unmerged-branch-readiness.mjs') {
    failures.push('package.json must keep report:unmerged-branch-readiness wired to the non-merged branch launch-readiness report.');
  }

  if (packageScripts['generate:public-release-status'] !== 'node scripts/generate-public-release-status.mjs') {
    failures.push('package.json must keep generate:public-release-status wired to the public release-status generator.');
  }

  if (packageScripts['check:public-release-status'] !== 'node scripts/generate-public-release-status.mjs --check') {
    failures.push('package.json must keep check:public-release-status wired to the public release-status sync validator.');
  }

  if (!existsSync(buyerEvidenceReadinessReportPath)) {
    failures.push('scripts/report-buyer-evidence-readiness.mjs is missing.');
  } else {
    const buyerEvidenceReadinessReport = readFileSync(buyerEvidenceReadinessReportPath, 'utf8');
    if (!/create:phase-f-evidence-workspace/.test(buyerEvidenceReadinessReport)) {
      failures.push('scripts/report-buyer-evidence-readiness.mjs must point empty Phase F collection to create:phase-f-evidence-workspace.');
    }
    if (!/report:phase-f-evidence-workspace/.test(buyerEvidenceReadinessReport)) {
      failures.push('scripts/report-buyer-evidence-readiness.mjs must point empty Phase F collection to report:phase-f-evidence-workspace.');
    }
    if (
      !buyerEvidenceReadinessReport.includes('phaseFEvidenceWorkspaceUpdatedRegisterReportCommand')
      || !buyerEvidenceReadinessReport.includes('--register-file')
      || !buyerEvidenceReadinessReport.includes('/tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv')
    ) {
      failures.push('scripts/report-buyer-evidence-readiness.mjs must point updated Phase F workspace registers to report:phase-f-evidence-workspace --register-file.');
    }
    if (!outreachRowAppenderPhrase.test(buyerEvidenceReadinessReport)) {
      failures.push('scripts/report-buyer-evidence-readiness.mjs must point real outreach rows through append:outreach-response-log-row.');
    }
  }

  if (packageScripts['update:pilot-evidence-register-row'] !== 'node scripts/update-pilot-evidence-register-row.mjs') {
    failures.push('package.json must keep update:pilot-evidence-register-row wired to the retained-artifact register updater.');
  }

  if (!String(packageScripts['check:release-readiness'] ?? '').includes('check:outreach-intake-plan-template')) {
    failures.push('check:release-readiness must include check:outreach-intake-plan-template so the action-plan path cannot drift.');
  }

  if (!String(packageScripts['check:release-readiness'] ?? '').includes('check:public-release-status')) {
    failures.push('check:release-readiness must include check:public-release-status so the public release-status manifest cannot drift before production approval.');
  }

  if (packageScripts['check:corepack-toolchain'] !== 'node scripts/check-corepack-toolchain.mjs') {
    failures.push('package.json must keep check:corepack-toolchain wired to the pinned package-manager preflight.');
  }

  if (!String(packageScripts['check:release-readiness'] ?? '').startsWith('node scripts/check-corepack-toolchain.mjs && corepack pnpm run check:claim-boundaries')) {
    failures.push('check:release-readiness must start with check:corepack-toolchain before running Corepack-pinned gates.');
  }

  if (!String(packageScripts['check:release-readiness'] ?? '').includes('check:phase-f-minimum-intake-bundle')) {
    failures.push('check:release-readiness must include check:phase-f-minimum-intake-bundle so the Phase F starter bundle cannot drift.');
  }

  if (!String(packageScripts['check:release-readiness'] ?? '').includes('check:phase-f-evidence-workspace')) {
    failures.push('check:release-readiness must include check:phase-f-evidence-workspace so the Phase F workspace cannot drift.');
  }

  if (!outreachIntakePacketBatchPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention create:outreach-intake-packets for validated outreach-to-intake scaffolding.');
  }

  if (!pilotEvidenceIntakePacketPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention create:pilot-evidence-intake-packet for buyer-evidence intake scaffolding.');
  }

  if (!phaseFMinimumIntakeBundlePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention the Phase F minimum intake bundle generator or smoke check.');
  }

  if (!phaseFEvidenceWorkspacePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention the Phase F evidence workspace generator or smoke check.');
  }

  if (!unmergedBranchReadinessPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention report:unmerged-branch-readiness for current main-plus-unmerged-branch review.');
  }

  if (!pilotEvidenceRegisterUpdaterPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention update:pilot-evidence-register-row for retained-artifact register updates.');
  }

  if (!forecastTrustArtifactHelperPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention prepare:forecast-trust-report-artifact for forecast trust retained extracts.');
  }

  if (!gaIciArtifactHelperPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention prepare:ga-ici-5cp-artifact for GA/ICI retained extracts.');
  }

  if (!byoCsvArtifactHelperPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention prepare:byo-csv-proof-artifact for BYO-CSV retained extracts.');
  }

  if (!nonStatusCommercialCommitmentEvidencePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must require strong commercial commitment evidence beyond status-only text.');
  }

  if (!publicReleaseStatusCheckPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must mention check:public-release-status for the public release-status sync guard.');
  }

  if (!approvalPacketPublicStatusGatePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say the production approval packet runs check:public-release-status as a pre-deploy evidence gate.');
  }

  if (!approvalPacketRequestPacketGatePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say the production approval packet checks production_approval.request_packet as a pre-deploy evidence gate.');
  }

  if (!publicStatusRequestPacketHandlePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say public release status exposes the production approval request packet as a public-safe evidence handle.');
  }

  if (!publicStatusSourceIsolationLedgerPhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say public release status exposes the source provenance isolation ledger as a public-safe evidence handle.');
  }

  if (!publicStatusReleaseDeficitLedgerHandlePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say public release status exposes release toolchain and approval deficits as a public-safe evidence handle.');
  }

  if (!publicStatusReleasePreflightClearanceHandlePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say public release status exposes the release preflight clearance matrix as a public-safe evidence handle.');
  }

  if (!publicStatusBranchFamilyFreshnessHandlePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say public release status exposes the branch-family freshness rollup as a public-safe evidence handle.');
  }

  if (!publicStatusTopBranchPacketHandlePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say public release status exposes the top branch review packet as a public-safe evidence handle.');
  }

  if (!publicStatusBranchClearanceHandlePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say public release status exposes the branch clearance matrix as a public-safe evidence handle.');
  }

  if (!publicStatusCanonicalResolutionHandlePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say public release status exposes the canonical-head resolution queue as a public-safe evidence handle.');
  }

  if (!publicStatusBuyerHardGateDeficitsHandlePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say public release status exposes buyer evidence hard-gate deficits as a public-safe evidence handle.');
  }

  if (!publicStatusBuyerAcquisitionHandlePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say public release status exposes the buyer evidence acquisition matrix as a public-safe evidence handle.');
  }

  if (!publicStatusSupabaseClearanceDeficitsHandlePhrase.test(sourceDoc)) {
    failures.push('docs/COMMERCIAL_SOURCE_OF_TRUTH.md must say public release status exposes Supabase advisor clearance deficits as a public-safe evidence handle.');
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
    if (!pilotEvidenceIntakePacketPhrase.test(pilotEvidenceDoc)) {
      failures.push('docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md must mention create:pilot-evidence-intake-packet for buyer-evidence intake scaffolding.');
    }
    if (!outreachIntakePacketBatchPhrase.test(pilotEvidenceDoc)) {
      failures.push('docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md must mention create:outreach-intake-packets for validated outreach-to-intake scaffolding.');
    }
    if (!phaseFMinimumIntakeBundlePhrase.test(pilotEvidenceDoc)) {
      failures.push('docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md must mention the Phase F minimum intake bundle generator or smoke check.');
    }
    if (!phaseFEvidenceWorkspacePhrase.test(pilotEvidenceDoc)) {
      failures.push('docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md must mention the Phase F evidence workspace generator or smoke check.');
    }
    if (!pilotEvidenceRegisterUpdaterPhrase.test(pilotEvidenceDoc)) {
      failures.push('docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md must mention update:pilot-evidence-register-row for retained-artifact register updates.');
    }
    if (!forecastTrustArtifactHelperPhrase.test(pilotEvidenceDoc)) {
      failures.push('docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md must mention prepare:forecast-trust-report-artifact for forecast trust retained extracts.');
    }
    if (!gaIciArtifactHelperPhrase.test(pilotEvidenceDoc)) {
      failures.push('docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md must mention prepare:ga-ici-5cp-artifact for GA/ICI retained extracts.');
    }
    if (!byoCsvArtifactHelperPhrase.test(pilotEvidenceDoc)) {
      failures.push('docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md must mention prepare:byo-csv-proof-artifact for BYO-CSV retained extracts.');
    }
    if (!nonStatusCommercialCommitmentEvidencePhrase.test(pilotEvidenceDoc)) {
      failures.push('docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md must require strong commercial commitment evidence beyond status-only text.');
    }
  }

  const outreachTemplatesPath = path.join(repoRoot, 'docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md');
  if (existsSync(outreachTemplatesPath)) {
    const outreachTemplatesDoc = readFileSync(outreachTemplatesPath, 'utf8');
    if (!outreachResponseLogPhrase.test(outreachTemplatesDoc)) {
      failures.push('docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md must mention the outreach response log template and validator.');
    }
    if (!outreachIntakePlanPhrase.test(outreachTemplatesDoc)) {
      failures.push('docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md must mention plan:outreach-intake or --action-plan for outreach response intake actions.');
    }
    if (!outreachIntakePacketBatchPhrase.test(outreachTemplatesDoc)) {
      failures.push('docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md must mention create:outreach-intake-packets for validated outreach-to-intake scaffolding.');
    }
  }

  const outreachCampaignPath = path.join(repoRoot, 'docs/growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md');
  if (existsSync(outreachCampaignPath)) {
    const outreachCampaignDoc = readFileSync(outreachCampaignPath, 'utf8');
    if (!outreachResponseLogPhrase.test(outreachCampaignDoc)) {
      failures.push('docs/growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md must mention the outreach response log template and validator.');
    }
    if (!outreachIntakePlanPhrase.test(outreachCampaignDoc)) {
      failures.push('docs/growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md must mention plan:outreach-intake or --action-plan for outreach response intake actions.');
    }
  }

  const hermesOutreachPath = path.join(repoRoot, 'docs/HERMES_OUTREACH_OPERATING_PLAN.md');
  if (existsSync(hermesOutreachPath)) {
    const hermesOutreachDoc = readFileSync(hermesOutreachPath, 'utf8');
    if (!outreachRowAppenderPhrase.test(hermesOutreachDoc)) {
      failures.push('docs/HERMES_OUTREACH_OPERATING_PLAN.md must route repo-retained outreach rows through append:outreach-response-log-row.');
    }
    if (!phaseFEvidenceWorkspacePhrase.test(hermesOutreachDoc)) {
      failures.push('docs/HERMES_OUTREACH_OPERATING_PLAN.md must mention the Phase F evidence workspace generator or report before buyer evidence collection.');
    }
    if (!outreachIntakePacketBatchPhrase.test(hermesOutreachDoc)) {
      failures.push('docs/HERMES_OUTREACH_OPERATING_PLAN.md must mention create:outreach-intake-packets for actionable outreach rows.');
    }
    if (!/validate:pilot-evidence -- .*--require-95 .*--evidence-root|validate:pilot-evidence -- .*--evidence-root .*--require-95/.test(hermesOutreachDoc)) {
      failures.push('docs/HERMES_OUTREACH_OPERATING_PLAN.md must keep the 95% buyer-evidence command tied to --evidence-root hash verification.');
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
