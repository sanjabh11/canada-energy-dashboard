#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--dry-run') {
      result.dryRun = true;
      continue;
    }
    if (token.startsWith('--')) {
      const key = token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = argv[index + 1];
      if (value && !value.startsWith('--')) {
        result[key] = value;
        index += 1;
      } else {
        result[key] = true;
      }
      continue;
    }
    result._.push(token);
  }
  return result;
}

function fail(message) {
  throw new Error(message);
}

const args = parseArgs(process.argv.slice(2));
const weightsPath = args.weights ?? args._[0];
if (!weightsPath) fail('Missing --weights path.');

const supabaseUrl = String(args.supabaseUrl ?? process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const serviceRoleKey = String(args.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '');
const commitSha = String(args.commitSha ?? process.env.GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? '');

if (!supabaseUrl && !args.dryRun) {
  fail('Missing SUPABASE_URL.');
}
if (!serviceRoleKey && !args.dryRun) {
  fail('Missing SUPABASE_SERVICE_ROLE_KEY.');
}
if (!commitSha) {
  fail('Missing commit SHA.');
}

const rawWeights = readFileSync(weightsPath, 'utf8');
const weights = JSON.parse(rawWeights);
const manifest = weights.manifest ?? {};
const canonicalWeights = JSON.parse(rawWeights);
if (canonicalWeights.manifest && typeof canonicalWeights.manifest === 'object' && 'training_artifact_sha' in canonicalWeights.manifest) {
  canonicalWeights.manifest.training_artifact_sha = '__artifact_sha__';
}
const canonicalJson = JSON.stringify(canonicalWeights);
const canonicalSha256 = createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
if (manifest.training_artifact_sha && manifest.training_artifact_sha !== canonicalSha256) {
  fail(`Artifact SHA mismatch for ${weightsPath}: manifest=${manifest.training_artifact_sha} file=${canonicalSha256}`);
}

const payload = {
  model_key: manifest.model_key,
  model_version: manifest.model_version,
  artifact_sha256: canonicalSha256,
  training_data_profile: manifest.training_data_profile,
  simulator_config: manifest.simulator_config,
  metrics: manifest.metrics,
  artifact_size_bytes: statSync(weightsPath).size,
  git_commit_sha: commitSha,
  trained_at: manifest.trained_at,
};

if (args.dryRun) {
  console.log(JSON.stringify({ dry_run: true, payload }, null, 2));
  process.exit(0);
}

const response = await fetch(`${supabaseUrl}/rest/v1/ml_model_artifacts?on_conflict=model_key,model_version,artifact_sha256`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  const body = await response.text();
  fail(`Artifact ledger insert failed (${response.status}): ${body}`);
}

console.log(JSON.stringify({ inserted: true, status: response.status, payload }, null, 2));
