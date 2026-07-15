#!/usr/bin/env node

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const auditRoot = path.join(repoRoot, '.positioning-audit');

const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', '.netlify', 'playwright-report', 'test-results']);
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function collectFiles(relativePath, extensions = null) {
  const root = path.join(repoRoot, relativePath);
  const files = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    const stat = statSync(current, { throwIfNoEntry: false });
    if (!stat) continue;

    if (stat.isFile()) {
      if (!extensions || extensions.has(path.extname(current))) files.push(current);
      continue;
    }

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
      stack.push(path.join(current, entry.name));
    }
  }

  return files.sort();
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function check(id, status, detail, evidence = null) {
  return { id, status, detail, ...(evidence ? { evidence } : {}) };
}

function extractInventoryClaims(evidenceCorpus) {
  const evidenceItem = evidenceCorpus.evidence_items?.find((entry) => entry.id === 'EV-005');
  const phaseOnePath = path.join(auditRoot, 'artifacts', 'phase-1-evidence-reconnaissance.md');
  const phaseOneText = readFileSync(phaseOnePath, 'utf8');
  const text = `${evidenceItem?.claim ?? ''}\n${phaseOneText}`;
  const patterns = {
    routes: /\|\s*Routes(?:\s*\([^|]+\))?\s*\|\s*(\d+)/i,
    lazyImports: /\|\s*Lazy-loaded components\s*\|\s*(\d+)/i,
    components: /\|\s*Component files\s*\|\s*(\d+)/i,
    libFiles: /\|\s*Lib files\s*\|\s*(\d+)/i,
    docs: /\|\s*Documentation files\s*\|\s*(\d+)/i,
    edgeFunctions: /\|\s*Edge Functions\s*\|\s*(\d+)/i,
  };

  return Object.fromEntries(
    Object.entries(patterns).map(([key, pattern]) => [key, Number(text.match(pattern)?.[1] ?? 0)]),
  );
}

function collectRoutePaths(appSource) {
  return [...appSource.matchAll(/\bpath\s*:\s*["']([^"']+)["']/g)].map((match) => match[1]);
}

function collectExperimentLinks(experiments) {
  return experiments.experiments.flatMap((experiment) => {
    const ids = [experiment.hypothesis_id, ...(experiment.hypothesis_ids ?? [])].filter(Boolean);
    return ids.map((hypothesisId) => ({ experimentId: experiment.id, hypothesisId }));
  });
}

function main() {
  const state = readJson('.positioning-audit/state.json');
  const evidenceCorpus = readJson('.positioning-audit/evidence-corpus.json');
  const hypotheses = readJson('.positioning-audit/hypotheses.json').hypotheses;
  const experiments = readJson('.positioning-audit/experiments.json');
  const claimRegister = readJson('.positioning-audit/claim-register.json');
  const researchQuestions = readJson('.positioning-audit/research-questions.json');
  const appSource = readFileSync(path.join(repoRoot, 'src/App.tsx'), 'utf8');
  const commercialPositioningSource = readFileSync(path.join(repoRoot, 'src/lib/commercialPositioning.ts'), 'utf8');

  const routePaths = collectRoutePaths(appSource);
  const uniqueRoutePaths = [...new Set(routePaths)];
  const componentFiles = collectFiles('src/components');
  const libFiles = collectFiles('src/lib');
  const docsFiles = collectFiles('docs');
  const edgeFunctionDirectories = readdirSync(path.join(repoRoot, 'supabase/functions'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '_shared')
    .map((entry) => entry.name)
    .sort();
  const actualInventory = {
    routes: uniqueRoutePaths.length,
    routeDeclarations: routePaths.length,
    lazyImports: countMatches(appSource, /React\.lazy\s*\(/g),
    components: componentFiles.length,
    libFiles: libFiles.length,
    docs: docsFiles.length,
    edgeFunctions: edgeFunctionDirectories.length,
  };
  const claimedInventory = extractInventoryClaims(evidenceCorpus);
  const inventoryMismatches = Object.keys(claimedInventory)
    .filter((key) => claimedInventory[key] > 0 && claimedInventory[key] !== actualInventory[key])
    .map((key) => ({ metric: key, claimed: claimedInventory[key], actual: actualInventory[key] }));

  const artifactFiles = readdirSync(path.join(auditRoot, 'artifacts'))
    .filter((fileName) => /^phase-[0-7].*\.md$/.test(fileName))
    .sort();
  const artifactPageCounts = artifactFiles.map((fileName) => {
    const content = readFileSync(path.join(auditRoot, 'artifacts', fileName), 'utf8');
    return { file: fileName, pages: countMatches(content, /^## Page [1-4]\b.*$/gm) };
  });
  const phaseTrees = Object.keys(researchQuestions.trees ?? {}).sort();
  const hypothesisIds = hypotheses.map((hypothesis) => hypothesis.id);
  const experimentLinks = collectExperimentLinks(experiments);
  const invalidExperimentLinks = experimentLinks.filter(({ hypothesisId }) => !hypothesisIds.includes(hypothesisId));
  const linkedHypothesisIds = new Set(experimentLinks.filter(({ hypothesisId }) => hypothesisIds.includes(hypothesisId)).map(({ hypothesisId }) => hypothesisId));
  const unlinkedHypothesisIds = hypothesisIds.filter((hypothesisId) => !linkedHypothesisIds.has(hypothesisId));
  const tierRoutePresent = uniqueRoutePaths.includes('/tier-compliance');
  const tierSemanticIdPresent = /['"]tier-compliance['"]/.test(commercialPositioningSource);
  const allHypothesesUnresolved = hypotheses.every((hypothesis) => hypothesis.status === 'Unresolved');
  const designedExperimentsOnly = state.experiments_executed === 0 && experiments.experiments.every((experiment) => !experiment.result);
  const validationPending = state.analysis_status === 'complete'
    && state.market_validation_status === 'validation_pending'
    && state.current_phase === 'VALIDATION_PENDING'
    && state.decision_confidence.validation === 0;
  const claimsAreQualified = claimRegister.claims?.every((claim) =>
    claim.approved_wording && claim.prohibited_wording?.length && claim.sources?.length && claim.counter_evidence?.length,
  );

  const checks = [
    check(
      'audit-state',
      state.current_gate === 'CONDITIONAL_GO' && state.evidence_limited_mode ? 'PASS' : 'WARN',
      `State is ${state.current_phase}/${state.current_gate}; evidence-limited mode=${state.evidence_limited_mode}.`,
    ),
    check(
      'buyer-evidence-boundary',
      designedExperimentsOnly && allHypothesesUnresolved && validationPending ? 'PASS' : 'WARN',
      `${state.experiments_executed} experiments executed; all hypotheses unresolved=${allHypothesesUnresolved}; validation lifecycle=${state.market_validation_status}.`,
    ),
    check(
      'phase-artifacts',
      artifactFiles.length === 8 && artifactPageCounts.every(({ pages }) => pages === 4) ? 'PASS' : 'WARN',
      `${artifactFiles.length}/8 phase artifacts found; page counts: ${artifactPageCounts.map(({ pages }) => pages).join(', ')}.`,
    ),
    check(
      'research-question-persistence',
      phaseTrees.length === 8 ? 'PASS' : 'WARN',
      `Persisted research trees: ${phaseTrees.length}/8 (${phaseTrees.join(', ') || 'none'}).`,
    ),
    check(
      'experiment-hypothesis-links',
      invalidExperimentLinks.length === 0 && unlinkedHypothesisIds.length === 0 ? 'PASS' : 'WARN',
      invalidExperimentLinks.length === 0
        ? `All experiment links reference known hypotheses; unlinked hypotheses: ${unlinkedHypothesisIds.join(', ') || 'none'}.`
        : `Invalid links: ${invalidExperimentLinks.map(({ experimentId, hypothesisId }) => `${experimentId}->${hypothesisId}`).join(', ')}; unlinked hypotheses: ${unlinkedHypothesisIds.join(', ') || 'none'}.`,
      { invalid: invalidExperimentLinks, unlinked: unlinkedHypothesisIds },
    ),
    check(
      'tier-entrypoint',
      tierRoutePresent ? 'PASS' : 'WARN',
      tierRoutePresent
        ? 'A dedicated /tier-compliance route is declared.'
        : `No /tier-compliance route is declared; semantic positioning ID present=${tierSemanticIdPresent}.`,
    ),
    check(
      'inventory-reconciliation',
      inventoryMismatches.length === 0 ? 'PASS' : 'WARN',
      inventoryMismatches.length === 0 ? 'EV-005 matches the current worktree inventory.' : `${inventoryMismatches.length} EV-005 inventory values differ from the current worktree.`,
      { claimed: claimedInventory, actual: actualInventory, mismatches: inventoryMismatches },
    ),
    check(
      'market-claim-register',
      claimsAreQualified ? 'PASS' : 'WARN',
      `${claimRegister.claims?.length ?? 0} claim records include approved wording, prohibitions, sources, and counter-evidence.`,
    ),
  ];

  const result = {
    audit_id: state.audit_id,
    verified_at: new Date().toISOString(),
    verdict: state.current_gate,
    checks,
    inventory: { claimed: claimedInventory, actual: actualInventory, mismatches: inventoryMismatches },
    artifacts: artifactPageCounts,
    research_question_trees: phaseTrees,
    experiment_links: { invalid: invalidExperimentLinks, unlinked_hypotheses: unlinkedHypothesisIds },
    tier_entrypoint: { route_present: tierRoutePresent, semantic_id_present: tierSemanticIdPresent },
    warning_count: checks.filter(({ status }) => status === 'WARN').length,
  };

  console.log(JSON.stringify(result, null, 2));

  if (process.argv.includes('--refresh-inventory')) {
    const snapshotPath = path.join(repoRoot, '.positioning-audit', 'inventory-snapshot.json');
    const snapshot = {
      snapshot_at: result.verified_at,
      audit_id: state.audit_id,
      inventory: actualInventory,
      mismatches: inventoryMismatches,
    };
    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n');
  }

  if (process.argv.includes('--strict') && result.warning_count > 0) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(`Positioning audit verification failed: ${error.message}`);
  process.exitCode = 1;
}
