#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const templatePath = path.join(repoRoot, 'docs/growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv');
const intakeDocPath = path.join(repoRoot, 'docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md');
const sourceDocPath = path.join(repoRoot, 'docs/COMMERCIAL_SOURCE_OF_TRUTH.md');

const requiredColumns = [
  'record_date',
  'buyer_lane',
  'buyer_segment',
  'proof_pack_id',
  'route',
  'evidence_owner',
  'input_data_type',
  'source_label',
  'evidence_file_reference',
  'pii_screen_result',
  'commercial_commitment_status',
  'artifact_generated',
  'time_to_artifact_hours',
  'buyer_data_coverage_pct',
  'benchmark_lift_or_diagnostic',
  'reviewer_role',
  'reviewer_feedback_status',
  'reviewer_acceptance',
  'claim_boundary',
  'do_not_claim',
  'day_14_decision',
  'confidence_delta',
  'follow_up_action',
  'notes',
];

const forbiddenColumns = [
  'customer_name',
  'customer_email',
  'email',
  'phone',
  'phone_number',
  'account_number',
  'meter_identifier',
  'meter_id',
  'service_address',
  'address',
  'postal_code',
  'secret',
  'token',
  'password',
];

const requiredDocPhrases = [
  'PILOT_EVIDENCE_REGISTER_TEMPLATE.csv',
  'create:pilot-evidence-intake-packet',
  'update:pilot-evidence-register-row',
  'time_to_artifact_hours',
  'buyer_data_coverage_pct',
  'benchmark_lift_or_diagnostic',
  'reviewer_acceptance',
];

const failures = [];

const duplicateRequiredColumns = requiredColumns.filter((column, index) => requiredColumns.indexOf(column) !== index);
if (duplicateRequiredColumns.length > 0) {
  failures.push(`Pilot evidence template check has duplicate required columns: ${Array.from(new Set(duplicateRequiredColumns)).join(', ')}`);
}

function readRequiredFile(filePath, label) {
  if (!existsSync(filePath)) {
    failures.push(`${label} is missing: ${path.relative(repoRoot, filePath)}`);
    return '';
  }
  return readFileSync(filePath, 'utf8');
}

const template = readRequiredFile(templatePath, 'Pilot evidence register template');
if (template) {
  const [headerLine, sampleLine] = template.trim().split(/\r?\n/);
  const columns = headerLine.split(',').map((column) => column.trim());
  const columnSet = new Set(columns);

  for (const column of requiredColumns) {
    if (!columnSet.has(column)) {
      failures.push(`Pilot evidence register template is missing required column: ${column}`);
    }
  }

  for (const column of forbiddenColumns) {
    if (columnSet.has(column)) {
      failures.push(`Pilot evidence register template must not collect direct identifier column: ${column}`);
    }
  }

  if (!sampleLine) {
    failures.push('Pilot evidence register template must include one placeholder sample row.');
  }

  if (!template.includes('buyer_supplied_anonymized')) {
    failures.push('Pilot evidence register template must show a buyer_supplied_anonymized source label example.');
  }

  if (!template.includes('production telemetry') || !template.includes('forecast superiority')) {
    failures.push('Pilot evidence register template must include do-not-claim examples.');
  }

  const validatorPath = path.join(repoRoot, 'scripts/validate-pilot-evidence-register.mjs');
  if (!existsSync(validatorPath)) {
    failures.push('Pilot evidence register validator is missing: scripts/validate-pilot-evidence-register.mjs');
  } else {
    const validationResult = spawnSync(process.execPath, [
      validatorPath,
      templatePath,
      '--allow-template',
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    if (validationResult.status !== 0) {
      const output = `${validationResult.stderr ?? ''}\n${validationResult.stdout ?? ''}`.trim();
      failures.push(`Pilot evidence register template must pass the canonical validator with --allow-template.${output ? ` Validator output: ${output}` : ''}`);
    }
  }
}

for (const [label, filePath] of [
  ['Pilot evidence intake doc', intakeDocPath],
  ['Commercial source of truth doc', sourceDocPath],
]) {
  const doc = readRequiredFile(filePath, label);
  for (const phrase of requiredDocPhrases) {
    if (doc && !doc.includes(phrase)) {
      failures.push(`${label} must reference ${phrase}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Pilot evidence template check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Pilot evidence register template check passed for ${requiredColumns.length} required columns and canonical validator compatibility.`);
