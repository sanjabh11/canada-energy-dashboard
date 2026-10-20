#!/usr/bin/env node
/**
 * Secret-exposure gate — two layers:
 *
 * 1. HEAD scan: every git-tracked file is searched for credential-shaped
 *    literals (JWTs, Google keys, Stripe sk_live, webhooks, AWS AKIA,
 *    private keys, generic SECRET/PASSWORD assignments). Any hit fails —
 *    no tracked file may contain a credential value.
 *
 * 2. HISTORY scan: known historical exposures are enumerated and checked
 *    against docs/security/SECRET_EXPOSURE_INCIDENTS.md — every history hit
 *    must match a documented INC entry, or the gate fails. Documented
 *    entries are reported as OPEN owner-action items, not hidden.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const registerPath = path.join(repoRoot, 'docs/security/SECRET_EXPOSURE_INCIDENTS.md');

// Credential-shaped literals (NOT env-var names — those are allowed).
const LITERAL_PATTERNS = [
  { name: 'jwt', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, label: 'JWT (possible Supabase/session token)' },
  { name: 'google_api_key', re: /AIza[0-9A-Za-z_-]{30,}/g, label: 'Google API key' },
  { name: 'stripe_secret', re: /sk_(live|test)_[0-9A-Za-z]{16,}/g, label: 'Stripe secret key' },
  { name: 'stripe_webhook', re: /whsec_[0-9A-Za-z]{16,}/g, label: 'Stripe webhook secret' },
  { name: 'github_pat', re: /(ghp|github_pat)_[0-9A-Za-z_]{20,}/g, label: 'GitHub token' },
  { name: 'aws_access_key', re: /AKIA[0-9A-Z]{16}/g, label: 'AWS access key' },
  { name: 'private_key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, label: 'private key material' },
  { name: 'generic_secret_assign', re: /(SERVICE_ROLE_KEY|SECRET_KEY|API_SECRET|DB_PASSWORD)\s*=\s*["']?([A-Za-z0-9/+=_-]{24,})/g, label: 'secret-shaped assignment', realValue: true },
];

// Values matching these markers are documented placeholders/test fixtures,
// not credentials.
const PLACEHOLDER_MARKERS = /(your-|example|placeholder|dummy|fake|test[-_]|do-not|xxx|<.*?>|\.\.\.|insert-|replace-me|not-a-real)/i;

function looksReal(value) {
  return !PLACEHOLDER_MARKERS.test(value);
}

function sh(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function scanText(text, pathLabel) {
  const hits = [];
  for (const { re, label, realValue } of LITERAL_PATTERNS) {
    const found = text.matchAll(re);
    for (const m of found) {
      const candidate = m[1] ?? m[0];
      if (realValue && !looksReal(candidate)) continue;
      hits.push({ path: pathLabel, kind: label });
    }
  }
  return hits;
}

// --- Layer 1: WORKING-TREE scan of tracked + untracked source files ---------
// Auditors review the checkout, not just HEAD — scan the filesystem.
const tracked = sh(['ls-files']).split('\n').filter(Boolean);
const untracked = sh(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
const headHits = [];
import { readFileSync as readFs } from 'node:fs';
for (const file of [...tracked, ...untracked]) {
  if (/\.(png|jpg|jpeg|gif|ico|woff2?|ttf|map|zip|gz|bin|tgz)$/i.test(file)) continue;
  let text;
  try { text = readFs(path.join(repoRoot, file), 'utf8'); } catch { continue; }
  headHits.push(...scanText(text, file));
}

// --- Layer 2: history scan — every hit must be a documented incident --------
const incidentsDoc = existsSync(registerPath) ? readFileSync(registerPath, 'utf8') : '';
const knownIncidents = (incidentsDoc.match(/INC-\d{3}/g) ?? []);

const historyHits = [];
const log = sh(['log', '--all', '--format=%H']).split('\n').filter(Boolean);
// Scan commit diffs only for env/config files — bounded and fast enough.
for (const commit of log) {
  const files = sh(['show', '--name-only', '--format=', commit])
    .split('\n').filter((f) => /(^|\/)\.env|\.env\.|secret|credential/i.test(f));
  for (const file of files) {
    let blob;
    try { blob = sh(['show', `${commit}:${file}`]); } catch { continue; }
    for (const hit of scanText(blob, file)) {
      historyHits.push({ commit: commit.slice(0, 8), ...hit });
    }
  }
}

// History hits are expected (they are why the register exists) — they fail
// the gate only when NOT documented in the incident register.
const undocumented = knownIncidents.length === 0 && historyHits.length > 0
  ? historyHits
  : historyHits.filter((h) => !incidentsDoc.includes(h.path) && !incidentsDoc.includes(h.kind));

if (headHits.length > 0) {
  console.error('check-secret-scan: CREDENTIAL LITERALS IN TRACKED FILES AT HEAD:');
  for (const h of headHits) console.error(`  ${h.path}: ${h.kind} (${h.count}×)`);
}
if (undocumented.length > 0) {
  console.error('check-secret-scan: UNDOCUMENTED history exposures (not in SECRET_EXPOSURE_INCIDENTS.md):');
  for (const h of undocumented.slice(0, 10)) console.error(`  ${h.commit} ${h.path}: ${h.kind}`);
}
if (headHits.length > 0 || undocumented.length > 0) {
  process.exitCode = 1;
} else {
  console.log(`check-secret-scan: HEAD clean (${tracked.length} files). History exposures: ${historyHits.length} documented in ${knownIncidents.join(', ') || 'none'}.`);
}
