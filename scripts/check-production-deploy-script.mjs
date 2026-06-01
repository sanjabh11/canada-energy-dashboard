#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const deployScriptRelativePath = 'scripts/deploy-production.sh';
const packageRelativePath = 'package.json';
const deployScriptPath = path.join(repoRoot, deployScriptRelativePath);
const packagePath = path.join(repoRoot, packageRelativePath);
const failures = [];

function requireFile(filePath, relativePath) {
  if (!existsSync(filePath)) {
    failures.push(`${relativePath} is missing.`);
    return '';
  }
  return readFileSync(filePath, 'utf8');
}

function requireText(text, label, needle) {
  if (!text.includes(needle)) failures.push(`${label} must include \`${needle}\`.`);
}

function requirePattern(text, label, pattern, description) {
  if (!pattern.test(text)) failures.push(`${label} must ${description}.`);
}

function rejectText(text, label, needle, reason) {
  if (text.includes(needle)) failures.push(`${label} must not include \`${needle}\`; ${reason}.`);
}

const deployScript = requireFile(deployScriptPath, deployScriptRelativePath);
const packageJson = requireFile(packagePath, packageRelativePath);

if (deployScript) {
  const requiredFragments = [
    'pnpm run check:release-readiness',
    'pnpm run build:prod',
    'DEPLOY CEIP PRODUCTION',
    'netlify deploy --prod',
    'pnpm run check:post-deploy-live',
    'validate:pilot-evidence --require-95',
  ];

  for (const fragment of requiredFragments) {
    requireText(deployScript, deployScriptRelativePath, fragment);
  }

  requirePattern(
    deployScript,
    deployScriptRelativePath,
    /CURRENT_BRANCH=\$\(git branch --show-current\)[\s\S]*"\$CURRENT_BRANCH" != "main"/,
    'enforce the main-branch deploy precondition',
  );
  requirePattern(
    deployScript,
    deployScriptRelativePath,
    /git status --short/,
    'enforce a clean worktree before deploy',
  );
  requirePattern(
    deployScript,
    deployScriptRelativePath,
    /if \[ "\$DEPLOY_CONFIRMATION" = "DEPLOY CEIP PRODUCTION" \]/,
    'require an exact typed owner-approval phrase before netlify deploy',
  );
  rejectText(
    deployScript,
    deployScriptRelativePath,
    'Continue anyway?',
    'production audit or lint failures must block deployment',
  );
}

if (packageJson) {
  requireText(packageJson, packageRelativePath, '"check:production-deploy-script"');
  requirePattern(
    packageJson,
    packageRelativePath,
    /"check:release-readiness":\s*"[^"]*check:production-deploy-script/,
    'include the production deploy script guard in release readiness',
  );
}

if (failures.length > 0) {
  console.error('Production deploy script guard failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Production deploy script guard passed for ${deployScriptRelativePath}.`);
