#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const ACTIVE_PATHS = [
  'src',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'docs/Top20.md',
  'docs/CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md',
  'docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md',
  'docs/MVP_DEMO_FREEZE_HANDOFF.md',
  'docs/HERMES_OUTREACH_OPERATING_PLAN.md',
  'docs/LINKEDIN_PROOF_BUNDLES.md',
  'docs/OPENCLAW_CONSOLE_KICKSTART_STRATEGY.md',
  'docs/Openclaw_outreach.md',
  'docs/growth',
];

const SKIP_SEGMENTS = new Set([
  'archive',
  'screenshots',
  'node_modules',
  'dist',
  '.git',
  '.netlify',
  'playwright-report',
  'test-results',
]);

const CHECK_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.mdx']);

const REFERENCE_ONLY_FILES = new Set([
  'src/lib/helpContent.ts',
  'src/lib/helpContentDatabase.ts',
  'src/lib/quizData.ts',
  'src/lib/regulatoryTemplates.ts',
]);

const BOUNDARY_CONTEXT = [
  /do not/i,
  /does not/i,
  /not (?:a|an|the|customer|production|regulator|engineering|certified|binding|legal|broker|trading|live|native|submission|operator|control-room)/i,
  /no[- ](?:approval|broker|certification|claim|submission|production|engineering|scada|adms)/i,
  /without/i,
  /unless/i,
  /out of scope/i,
  /sandbox/i,
  /deferred/i,
  /guardrail/i,
  /boundary/i,
  /bounded/i,
  /claim/i,
  /avoid/i,
  /reject/i,
  /park/i,
  /blocked/i,
  /must not/i,
  /should not/i,
  /never/i,
  /before .*available/i,
  /needs .*live broker quote/i,
  /bridge certification/i,
  /support surface/i,
  /support only/i,
  /owner-supplied/i,
  /advisory/i,
  /doNotClaim/i,
];

const RULES = [
  {
    name: 'Production utility or bridge readiness',
    pattern: /\b(production utility onboarding|production utility bridge|London Hydro readiness|Alectra production onboarding|submission-grade bridge readiness)\b/i,
  },
  {
    name: 'Real customer data or telemetry proof',
    pattern: /\b(real customer data|real customer proof|customer LDC history|native [`'"]?15-minute[`'"]? telemetry|production utility telemetry)\b/i,
  },
  {
    name: 'Certification or sovereignty overclaim',
    pattern: /\b(SOC[- ]?2(?: Type II)? (?:certified|compliant)|SOC-II Type II compliant|NERC CIP compliance|Green Button Alliance certification|certified Indigenous data sovereignty|hardened Indigenous sovereignty|nation-held encryption keys|full data sovereignty|OCAP(?:®)?[- ]compliant|(?:FPIC\/)?OCAP(?:®)?[-/ ]?(?:aligned[- ]?)?certification|OCAP(?:®)?[- ]ready)\b/i,
  },
  {
    name: 'TIER price, trading, or savings overclaim',
    pattern: /\b(live TIER market pricing|real-time credit price|live market price|live market pricing|broker quote|trade execution|guaranteed savings)\b/i,
  },
  {
    name: 'AI/GPU superiority overclaim',
    pattern: /\b(AI beats|GPU forecasting|Enterprise AI\/GPU superiority|AI\/GPU superiority)\b/i,
  },
  {
    name: 'Engineering automation or approval overclaim',
    pattern: /\b(engineering approval|power-flow|SCADA|ADMS|predictive-maintenance automation)\b/i,
  },
  {
    name: 'Regulatory/legal submission overclaim',
    pattern: /\b(regulator submission automation|filing counsel approval|legal compliance opinion)\b/i,
  },
];

function shouldSkipPath(filePath) {
  const segments = filePath.split(path.sep);
  return segments.some((segment) => SKIP_SEGMENTS.has(segment));
}

function collectFiles(targetPath) {
  const absolute = path.join(repoRoot, targetPath);
  const stat = statSync(absolute, { throwIfNoEntry: false });
  if (!stat) return [];

  if (stat.isFile()) {
    return CHECK_EXTENSIONS.has(path.extname(absolute)) ? [absolute] : [];
  }

  const files = [];
  const stack = [absolute];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || shouldSkipPath(path.relative(repoRoot, current))) continue;

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const nextPath = path.join(current, entry.name);
      const relative = path.relative(repoRoot, nextPath);
      if (shouldSkipPath(relative)) continue;
      if (REFERENCE_ONLY_FILES.has(relative)) continue;

      if (entry.isDirectory()) {
        stack.push(nextPath);
      } else if (CHECK_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(nextPath);
      }
    }
  }

  return files;
}

function hasBoundaryContext(lines, lineIndex) {
  const start = Math.max(0, lineIndex - 10);
  const end = Math.min(lines.length - 1, lineIndex + 5);
  const context = lines.slice(start, end + 1).join('\n');
  return BOUNDARY_CONTEXT.some((pattern) => pattern.test(context));
}

const checkedFiles = [...new Set(ACTIVE_PATHS.flatMap(collectFiles))].sort();
const failures = [];

for (const file of checkedFiles) {
  const relative = path.relative(repoRoot, file);
  if (REFERENCE_ONLY_FILES.has(relative)) continue;
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (rule.pattern.test(line) && !hasBoundaryContext(lines, index)) {
        failures.push({
          rule: rule.name,
          file: relative,
          line: index + 1,
          text: line.trim(),
        });
      }
    }
  });
}

if (failures.length > 0) {
  console.error('Claim-boundary check failed. Reword these as bounded support, sandbox, owner-supplied, or do-not-claim language:\n');
  for (const failure of failures) {
    console.error(`${failure.file}:${failure.line} [${failure.rule}] ${failure.text}`);
  }
  process.exit(1);
}

console.log(`Claim-boundary check passed for ${checkedFiles.length} active source/doc files.`);
