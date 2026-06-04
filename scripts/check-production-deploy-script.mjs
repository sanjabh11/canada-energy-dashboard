#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const deployScriptRelativePath = 'scripts/deploy-production.sh';
const packageRelativePath = 'package.json';
const publicRedirectsRelativePath = 'public/_redirects';
const publicHeadersRelativePath = 'public/_headers';
const deployScriptPath = path.join(repoRoot, deployScriptRelativePath);
const packagePath = path.join(repoRoot, packageRelativePath);
const publicRedirectsPath = path.join(repoRoot, publicRedirectsRelativePath);
const publicHeadersPath = path.join(repoRoot, publicHeadersRelativePath);
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

function rejectPattern(text, label, pattern, description) {
  if (pattern.test(text)) failures.push(`${label} must not ${description}.`);
}

function requireBefore(text, label, firstNeedle, secondNeedle, reason) {
  const firstIndex = text.indexOf(firstNeedle);
  const secondIndex = text.indexOf(secondNeedle);
  if (firstIndex === -1 || secondIndex === -1 || firstIndex > secondIndex) {
    failures.push(`${label} must place \`${firstNeedle}\` before \`${secondNeedle}\`; ${reason}.`);
  }
}

const deployScript = requireFile(deployScriptPath, deployScriptRelativePath);
const packageJson = requireFile(packagePath, packageRelativePath);
const publicRedirects = requireFile(publicRedirectsPath, publicRedirectsRelativePath);
const publicHeaders = requireFile(publicHeadersPath, publicHeadersRelativePath);
let packageConfig = {};

if (packageJson) {
  try {
    packageConfig = JSON.parse(packageJson);
  } catch {
    failures.push(`${packageRelativePath} must be valid JSON.`);
  }
}

if (deployScript) {
  const requiredFragments = [
    'corepack pnpm --version',
    'corepack pnpm run check:release-readiness',
    'corepack pnpm audit --audit-level=high',
    'corepack pnpm run build:prod',
    'corepack pnpm run check:built-client-env',
    'DEPLOY CEIP PRODUCTION',
    'netlify deploy --prod --no-build --dir=dist',
    'corepack pnpm run check:post-deploy-live',
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
  rejectPattern(
    deployScript,
    deployScriptRelativePath,
    /(^|\n)\s*pnpm\s+(run|audit|exec|install)\b/,
    'call bare pnpm commands; use Corepack so the pinned packageManager version is honored',
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
  requireText(packageJson, packageRelativePath, '"check:client-env-safety"');
  requireText(packageJson, packageRelativePath, '"check:built-client-env"');
  requirePattern(
    packageJson,
    packageRelativePath,
    /"check:release-readiness":\s*"[^"]*check:client-env-safety/,
    'include the client env safety guard in release readiness',
  );
  requirePattern(
    packageJson,
    packageRelativePath,
    /"check:release-readiness":\s*"[^"]*check:built-client-env/,
    'include the built client env guard in release readiness',
  );

  const e2ePreviewScript = String(packageConfig.scripts?.['test:e2e:preview'] ?? '');
  if (!e2ePreviewScript.includes('PLAYWRIGHT_DIST_DIR:-/tmp/ceip-playwright-dist')) {
    failures.push(`${packageRelativePath} must keep Playwright preview builds outside production dist/.`);
  }
  if (!e2ePreviewScript.includes('vite preview --outDir "$OUT_DIR"')) {
    failures.push(`${packageRelativePath} must serve Playwright preview tests from the temporary outDir.`);
  }
  if (!e2ePreviewScript.includes('vite build --outDir "$OUT_DIR" --emptyOutDir')) {
    failures.push(`${packageRelativePath} must build Playwright preview tests into the temporary outDir.`);
  }
  if (/pnpm run build/.test(e2ePreviewScript)) {
    failures.push(`${packageRelativePath} must not let Playwright preview builds overwrite production dist/.`);
  }

  const browserScripts = [
    'test:wedge-prototype-routes',
    'test:browser:phase6',
    'test:browser:hosted:phase6',
    'test:browser:hosted:proof-packs',
  ];
  for (const scriptName of browserScripts) {
    requirePattern(
      packageJson,
      packageRelativePath,
      new RegExp(`"${scriptName}":\\s*"[^"]*PLAYWRIGHT_HTML_OUTPUT_DIR=/tmp/ceip-[^"]*PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/ceip-`),
      `send ${scriptName} Playwright HTML and JSON output outside the repo before deploy gates run`,
    );
  }
}

if (publicRedirects) {
  const authFunctionRoute = '/api/auth/*  /.netlify/functions/auth-session/:splat  200';
  const leadsFunctionRoute = '/api/leads/*  /.netlify/functions/leads  200';
  const staticApiRoute = '/api/*  /api/:splat  200';

  requireText(publicRedirects, publicRedirectsRelativePath, authFunctionRoute);
  requireText(publicRedirects, publicRedirectsRelativePath, leadsFunctionRoute);
  requireText(publicRedirects, publicRedirectsRelativePath, staticApiRoute);
  requireBefore(
    publicRedirects,
    publicRedirectsRelativePath,
    authFunctionRoute,
    staticApiRoute,
    'function-backed auth endpoints must not be swallowed by the static API passthrough in no-build deploy artifacts',
  );
  requireBefore(
    publicRedirects,
    publicRedirectsRelativePath,
    leadsFunctionRoute,
    staticApiRoute,
    'function-backed lead endpoints must not be swallowed by the static API passthrough in no-build deploy artifacts',
  );
}

if (publicHeaders) {
  requireText(publicHeaders, publicHeadersRelativePath, '/api/*.yaml');
  requireText(publicHeaders, publicHeadersRelativePath, '/*.yaml');
  rejectText(
    publicHeaders,
    publicHeadersRelativePath,
    '\n/api/*\n',
    'function-backed JSON endpoints must not inherit YAML content headers',
  );
}

if (failures.length > 0) {
  console.error('Production deploy script guard failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Production deploy script guard passed for ${deployScriptRelativePath}.`);
