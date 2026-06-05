import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const generatorScriptPath = path.join(process.cwd(), 'scripts/create-pilot-evidence-intake-packet.mjs');
const bundleGeneratorScriptPath = path.join(process.cwd(), 'scripts/create-phase-f-minimum-intake-bundle.mjs');
const workspaceGeneratorScriptPath = path.join(process.cwd(), 'scripts/create-phase-f-evidence-workspace.mjs');
const workspaceReportScriptPath = path.join(process.cwd(), 'scripts/report-phase-f-evidence-workspace.mjs');
const outreachLogGeneratorScriptPath = path.join(process.cwd(), 'scripts/create-outreach-response-log.mjs');
const outreachRowAppenderScriptPath = path.join(process.cwd(), 'scripts/append-outreach-response-log-row.mjs');
const outreachIntakeBatchScriptPath = path.join(process.cwd(), 'scripts/create-outreach-intake-packets.mjs');
const artifactPrepScriptPath = path.join(process.cwd(), 'scripts/prepare-pilot-evidence-artifact.mjs');
const registerUpdaterScriptPath = path.join(process.cwd(), 'scripts/update-pilot-evidence-register-row.mjs');
const validatorScriptPath = path.join(process.cwd(), 'scripts/validate-pilot-evidence-register.mjs');
const PILOT_EVIDENCE_CLI_TIMEOUT_MS = 120_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-pilot-intake-'));
  tempRoots.push(root);
  return root;
}

function runNodeScript(scriptPath: string, args: string[]) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('pilot evidence intake packet generator', () => {
  it('creates starter intake packets from validated actionable outreach rows without moving confidence', async () => {
    const root = makeTempRoot();
    const outreachDir = path.join(root, 'outreach-log');
    const batchDir = path.join(root, 'outreach-intake-packets');
    const createLog = await runNodeScript(outreachLogGeneratorScriptPath, ['--output-dir', outreachDir]);
    expect(createLog.status).toBe(0);

    const logPath = path.join(outreachDir, 'outreach-response-log.csv');
    const appendRow = await runNodeScript(outreachRowAppenderScriptPath, [
      '--log-file',
      logPath,
      '--activity-date',
      '2026-06-01',
      '--channel',
      'linkedin',
      '--target-label',
      'utility_planner_001',
      '--route',
      '/utility-demand-forecast',
      '--rating',
      '4.5',
      '--variant-id',
      'utility_forecast',
      '--reply-status',
      'interested',
      '--response-summary',
      'Buyer asked for a bounded forecast sample.',
      '--pain-signal',
      'Load growth planning',
      '--requested-input',
      'anonymized load history',
      '--reviewer-role',
      'utility planning reviewer',
      '--next-action',
      'create intake packet',
      '--pilot-evidence-register-action',
      'create_intake_packet',
    ]);
    expect(appendRow.status).toBe(0);

    const dryRun = await runNodeScript(outreachIntakeBatchScriptPath, [
      '--log-file',
      logPath,
      '--output-dir',
      batchDir,
      '--dry-run',
    ]);
    expect(dryRun.status).toBe(0);
    expect(dryRun.stdout).toContain('Planned intake packets: 1');
    expect(dryRun.stdout).toContain('Confidence movement: none');
    expect(existsSync(batchDir)).toBe(false);

    const result = await runNodeScript(outreachIntakeBatchScriptPath, [
      '--log-file',
      logPath,
      '--output-dir',
      batchDir,
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Outreach intake packet generation complete.');
    expect(result.stdout).toContain('Created intake packets: 1');
    expect(result.stdout).toContain('Confidence movement: none');

    const packetDir = path.join(batchDir, '2026-06-01-utility-planner-001-utility-demand-forecast');
    const registerPath = path.join(packetDir, 'pilot-evidence-register-starter.csv');
    const manifestPath = path.join(batchDir, 'outreach-intake-packet-manifest.json');
    const readmePath = path.join(batchDir, 'README.md');

    expect(existsSync(registerPath)).toBe(true);
    expect(existsSync(path.join(packetDir, 'redacted-artifacts/README.md'))).toBe(true);
    expect(readFileSync(registerPath, 'utf8')).toContain('confidence_delta');
    expect(readFileSync(registerPath, 'utf8')).toContain(',pending,0,');
    expect(readFileSync(registerPath, 'utf8')).toContain('utility_forecast_planning_pack');
    expect(readFileSync(readmePath, 'utf8')).toContain('does not create buyer proof');

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest.confidenceMovement).toBe('none');
    expect(manifest.createdPacketCount).toBe(1);
    expect(manifest.packets[0].route).toBe('/utility-demand-forecast');
    expect(manifest.packets[0].proofPackId).toBe('utility_forecast_planning_pack');

    const validationResult = await runNodeScript(validatorScriptPath, [registerPath]);
    expect(validationResult.status).toBe(0);
    expect(validationResult.stdout).toContain('Pilot evidence register validation passed');

    const gateResult = await runNodeScript(validatorScriptPath, [
      registerPath,
      '--require-95',
      '--evidence-root',
      path.join(packetDir, 'redacted-artifacts'),
    ]);
    const gateOutput = `${gateResult.stderr}\n${gateResult.stdout}`;
    expect(gateResult.status).toBe(1);
    expect(gateOutput).toContain('95% confidence gate requires total accepted buyer-supplied confidence_delta of at least 0.9');
  }, PILOT_EVIDENCE_CLI_TIMEOUT_MS);

  it('skips non-actionable outreach rows without creating intake packet folders', async () => {
    const root = makeTempRoot();
    const outreachDir = path.join(root, 'outreach-log');
    const batchDir = path.join(root, 'outreach-intake-packets');
    const createLog = await runNodeScript(outreachLogGeneratorScriptPath, ['--output-dir', outreachDir]);
    expect(createLog.status).toBe(0);

    const logPath = path.join(outreachDir, 'outreach-response-log.csv');
    const appendRow = await runNodeScript(outreachRowAppenderScriptPath, [
      '--log-file',
      logPath,
      '--activity-date',
      '2026-06-01',
      '--channel',
      'email',
      '--target-label',
      'utility_planner_002',
      '--route',
      '/utility-demand-forecast',
      '--rating',
      '4.5',
      '--variant-id',
      'utility_forecast',
      '--reply-status',
      'sent_no_reply',
      '--response-summary',
      'No reply yet.',
      '--pain-signal',
      'Load growth planning',
      '--requested-input',
      'anonymized load history',
      '--reviewer-role',
      'utility planning reviewer',
      '--next-action',
      'wait for reply',
    ]);
    expect(appendRow.status).toBe(0);

    const result = await runNodeScript(outreachIntakeBatchScriptPath, [
      '--log-file',
      logPath,
      '--output-dir',
      batchDir,
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Created intake packets: 0');
    expect(result.stdout).toContain('Skipped rows: 1');
    expect(existsSync(path.join(batchDir, 'outreach-intake-packet-manifest.json'))).toBe(true);
    const manifest = JSON.parse(readFileSync(path.join(batchDir, 'outreach-intake-packet-manifest.json'), 'utf8'));
    expect(manifest.createdPacketCount).toBe(0);
    expect(manifest.skippedRows[0].reason).toContain('pilot_evidence_register_action is not create_intake_packet');
  }, PILOT_EVIDENCE_CLI_TIMEOUT_MS);

  it('creates a route-specific starter packet that passes base register validation without moving confidence', async () => {
    const outputDir = makeTempRoot();
    const result = await runNodeScript(generatorScriptPath, [
      '--route', '/ga-ici-5cp',
      '--output-dir', outputDir,
      '--record-date', '2026-06-01',
      '--buyer-segment', 'Ontario Class A advisor',
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Pilot evidence intake packet created.');
    expect(result.stdout).toContain('ga_ici_5cp_decision_support_pack');
    expect(result.stdout).toContain('validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95');

    const registerPath = path.join(outputDir, 'pilot-evidence-register-starter.csv');
    const readmePath = path.join(outputDir, 'README.md');
    const artifactReadmePath = path.join(outputDir, 'redacted-artifacts/README.md');
    const registerText = readFileSync(registerPath, 'utf8');
    const readmeText = readFileSync(readmePath, 'utf8');
    const artifactReadmeText = readFileSync(artifactReadmePath, 'utf8');

    expect(registerText).toContain('/ga-ici-5cp');
    expect(registerText).toContain('ga_ici_5cp_decision_support_pack');
    expect(registerText).toContain('buyer_supplied_anonymized');
    expect(registerText).toContain(',pending,0,');
    expect(registerText).toContain('not market-confidence evidence');
    expect(readmeText).toContain('does not create buyer proof');
    expect(readmeText).toContain('confidence_delta=0');
    expect(readmeText).toContain('pnpm run prepare:pilot-evidence-artifact');
    expect(readmeText).toContain('pnpm run prepare:ga-ici-5cp-artifact');
    expect(readmeText).toContain('--historical-actuals-file public/data/ga_ici_5cp_public_historical_actuals.csv');
    expect(readmeText).toContain('--customer-load-file path/to/redacted-ontario-interval-load.csv');
    expect(readmeText).toContain('--proof-pack-id ga_ici_5cp_decision_support_pack');
    expect(readmeText).toContain('# Generic fallback retained-artifact helper');
    expect(readmeText).toContain('Run the starter validation immediately');
    expect(readmeText).toContain('--buyer-data-coverage-pct "<replace with buyer data coverage percentage>"');
    expect(readmeText).toContain('--commercial-commitment-evidence "<replace with retained commercial-commitment evidence text when status is stronger than none>"');
    expect(readmeText).toContain('pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root');
    expect(readmeText).not.toContain('--buyer-data-coverage-pct 0 --time-to-artifact-hours 0');
    expect(artifactReadmeText).toContain('Do not store raw buyer files');

    const validationResult = await runNodeScript(validatorScriptPath, [registerPath]);
    expect(validationResult.status).toBe(0);
    expect(validationResult.stdout).toContain('Pilot evidence register validation passed');
    expect(validationResult.stderr).toBe('');
  }, PILOT_EVIDENCE_CLI_TIMEOUT_MS);

  it('fails the 95% market-confidence gate for the starter packet', async () => {
    const outputDir = makeTempRoot();
    const createResult = await runNodeScript(generatorScriptPath, [
      '--route', '/utility-demand-forecast',
      '--output-dir', outputDir,
      '--record-date', '2026-06-01',
    ]);
    expect(createResult.status).toBe(0);

    const registerPath = path.join(outputDir, 'pilot-evidence-register-starter.csv');
    const result = await runNodeScript(validatorScriptPath, [
      registerPath,
      '--require-95',
      '--evidence-root',
      path.join(outputDir, 'redacted-artifacts'),
    ]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires accepted buyer-supplied utility demand forecast evidence');
    expect(output).toContain('95% confidence gate requires total accepted buyer-supplied confidence_delta of at least 0.9');
  });

  it('rejects unknown routes and lists supported routes', async () => {
    const outputDir = makeTempRoot();
    const badResult = await runNodeScript(generatorScriptPath, [
      '--route', '/unknown',
      '--output-dir', outputDir,
    ]);

    expect(badResult.status).toBe(1);
    expect(badResult.stderr).toContain('Unsupported route: /unknown');

    const listResult = await runNodeScript(generatorScriptPath, ['--list-routes']);

    expect(listResult.status).toBe(0);
    expect(listResult.stdout).toContain('/utility-demand-forecast');
    expect(listResult.stdout).toContain('/byo-csv-proof');
  });

  it('creates a Phase F minimum bundle with a combined non-confidence-moving starter register', async () => {
    const outputDir = makeTempRoot();
    const result = await runNodeScript(bundleGeneratorScriptPath, [
      '--output-dir', outputDir,
      '--record-date', '2026-06-01',
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Phase F minimum intake bundle created.');
    expect(result.stdout).toContain('/utility-demand-forecast (utility_forecast_planning_pack)');
    expect(result.stdout).toContain('/roi-calculator (tier_cfo_savings_pack)');
    expect(result.stdout).toContain('/utility-security (utility_security_procurement_pack)');
    expect(result.stdout).toContain('Expected blocker: the hard 95% gate below should fail until real buyer-supplied redacted artifacts');

    const registerPath = path.join(outputDir, 'phase-f-minimum-register-starter.csv');
    const readmePath = path.join(outputDir, 'README.md');
    const registerText = readFileSync(registerPath, 'utf8');
    const readmeText = readFileSync(readmePath, 'utf8');

    expect(existsSync(path.join(outputDir, 'utility-demand-forecast/README.md'))).toBe(true);
    expect(existsSync(path.join(outputDir, 'roi-calculator/README.md'))).toBe(true);
    expect(existsSync(path.join(outputDir, 'utility-security/README.md'))).toBe(true);
    expect(registerText).toContain('/utility-demand-forecast');
    expect(registerText).toContain('/roi-calculator');
    expect(registerText).toContain('/utility-security');
    expect(registerText).toContain('utility-demand-forecast/redacted-artifacts/README.md');
    expect(registerText).toContain('roi-calculator/redacted-artifacts/README.md');
    expect(registerText).toContain('utility-security/redacted-artifacts/README.md');
    expect(registerText).toContain('confidence_delta');
    expect(registerText).toContain('Phase F bundle starter row only; not buyer proof');
    expect(readmeText).toContain('does not create buyer proof');
    expect(readmeText).toContain('Global 95% Gate Checks');
    expect(readmeText).toContain('The two 95% commands are expected to fail for this starter bundle');
    expect(readmeText).toContain('--artifact-root');
    expect(readmeText).toContain('do not hand-prefix it into the top-level register');

    const validationResult = await runNodeScript(validatorScriptPath, [registerPath]);
    expect(validationResult.status).toBe(0);
    expect(validationResult.stdout).toContain('Pilot evidence register validation passed for 3 row(s)');
    expect(validationResult.stderr).toBe('');
  }, PILOT_EVIDENCE_CLI_TIMEOUT_MS);

  it('updates a top-level Phase F bundle register from a route-local retained artifact root', async () => {
    const outputDir = makeTempRoot();
    const createResult = await runNodeScript(bundleGeneratorScriptPath, [
      '--output-dir', outputDir,
      '--record-date', '2026-06-01',
    ]);
    expect(createResult.status).toBe(0);

    const artifactRoot = path.join(outputDir, 'utility-demand-forecast/redacted-artifacts');
    const prepResult = await runNodeScript(artifactPrepScriptPath, [
      '--evidence-root',
      artifactRoot,
      '--artifact-file',
      'utility-demand-forecast-retained.md',
      '--route',
      '/utility-demand-forecast',
      '--proof-pack-id',
      'utility_forecast_planning_pack',
      '--record-date',
      '2026-06-01',
      '--pii-screen-result',
      'redacted',
      '--buyer-data-coverage-pct',
      '90',
      '--time-to-artifact-hours',
      '36',
      '--reviewer-role',
      'utility planning reviewer',
      '--reviewer-acceptance',
      'accepted',
      '--reviewer-feedback-status',
      'complete',
      '--day-14-decision',
      'proceed',
      '--commercial-commitment-status',
      'paid_pilot',
      '--commercial-commitment-evidence',
      'paid pilot evidence retained in redacted commercial appendix',
      '--claim-boundary',
      'Buyer supplied redacted planning support only and no production onboarding claim.',
      '--do-not-claim',
      'Do not claim utility approval or live telemetry.',
      '--diagnostic',
      'MAE 12.4 MW; MAPE 3.8%; RMSE 18.6 MW; persistence MAE 21.3 MW; seasonal-naive MAE 19.9 MW; rolling-origin split count 4; interval coverage 91.2%; CEIP champion vs seasonal-naive challenger.',
    ]);
    expect(prepResult.status).toBe(0);
    const evidenceReference = prepResult.stdout.match(/evidence_file_reference: (utility-demand-forecast-retained\.md#sha256=[a-f0-9]{64})/)?.[1];
    expect(evidenceReference).toBeTruthy();

    const starterRegisterPath = path.join(outputDir, 'phase-f-minimum-register-starter.csv');
    const updatedRegisterPath = path.join(outputDir, 'phase-f-minimum-register-updated.csv');
    const updateResult = await runNodeScript(registerUpdaterScriptPath, [
      '--register-file',
      starterRegisterPath,
      '--evidence-root',
      outputDir,
      '--artifact-root',
      artifactRoot,
      '--evidence-file-reference',
      evidenceReference as string,
      '--confidence-delta',
      '0.3',
      '--output-file',
      updatedRegisterPath,
    ]);
    expect(updateResult.status).toBe(0);
    expect(updateResult.stderr).toBe('');
    expect(updateResult.stdout).toContain('Pilot evidence register row updated.');
    expect(updateResult.stdout).toContain('evidence_file_reference: utility-demand-forecast/redacted-artifacts/utility-demand-forecast-retained.md#sha256=');

    const updatedRegisterText = readFileSync(updatedRegisterPath, 'utf8');
    expect(updatedRegisterText).toContain('utility-demand-forecast/redacted-artifacts/utility-demand-forecast-retained.md#sha256=');
    expect(updatedRegisterText).toContain(',0.3,');
    expect(updatedRegisterText).not.toContain('utility-demand-forecast-retained.md#sha256=0000');

    const validationResult = await runNodeScript(validatorScriptPath, [
      updatedRegisterPath,
      '--evidence-root',
      outputDir,
    ]);
    expect(validationResult.status).toBe(0);
    expect(validationResult.stderr).toBe('');
    expect(validationResult.stdout).toContain('Pilot evidence register validation passed for 3 row(s)');

    const gateResult = await runNodeScript(validatorScriptPath, [
      updatedRegisterPath,
      '--require-95',
      '--evidence-root',
      outputDir,
    ]);
    const gateOutput = `${gateResult.stderr}\n${gateResult.stdout}`;
    expect(gateResult.status).toBe(1);
    expect(gateOutput).toContain('95% confidence gate requires accepted buyer-supplied TIER CFO or credit-banking evidence');
    expect(gateOutput).toContain('95% confidence gate requires accepted buyer-supplied shadow-billing or utility-security evidence');
  }, PILOT_EVIDENCE_CLI_TIMEOUT_MS);

  it('keeps the Phase F minimum bundle below the hard 95% gate until buyer evidence exists', async () => {
    const outputDir = makeTempRoot();
    const createResult = await runNodeScript(bundleGeneratorScriptPath, [
      '--output-dir', outputDir,
      '--record-date', '2026-06-01',
    ]);
    expect(createResult.status).toBe(0);

    const registerPath = path.join(outputDir, 'phase-f-minimum-register-starter.csv');
    const result = await runNodeScript(validatorScriptPath, [
      registerPath,
      '--require-95',
      '--evidence-root',
      outputDir,
    ]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires accepted buyer-supplied utility demand forecast evidence');
    expect(output).toContain('95% confidence gate requires accepted buyer-supplied TIER CFO or credit-banking evidence');
    expect(output).toContain('95% confidence gate requires accepted buyer-supplied shadow-billing or utility-security evidence');
    expect(output).toContain('95% confidence gate requires total accepted buyer-supplied confidence_delta of at least 0.9');
  }, PILOT_EVIDENCE_CLI_TIMEOUT_MS);

  it('creates a Phase F evidence workspace without moving confidence', async () => {
    const outputDir = makeTempRoot();
    const result = await runNodeScript(workspaceGeneratorScriptPath, [
      '--output-dir', outputDir,
      '--record-date', '2026-06-01',
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Phase F evidence workspace created.');
    expect(result.stdout).toContain('Confidence movement: none');
    expect(result.stdout).toContain('Buyer proof created: no');
    expect(result.stdout).toContain('Expected blocker: the hard 95% gate below should fail until real buyer-supplied retained artifacts');

    const manifest = JSON.parse(readFileSync(path.join(outputDir, 'phase-f-evidence-workspace-manifest.json'), 'utf8'));
    expect(manifest.confidence_movement).toBe('none');
    expect(manifest.buyer_proof_created).toBe(false);
    expect(manifest.selected_routes.map((entry: { route: string }) => entry.route)).toEqual([
      '/utility-demand-forecast',
      '/roi-calculator',
      '/utility-security',
    ]);

    const readmeText = readFileSync(path.join(outputDir, 'README.md'), 'utf8');
    expect(readmeText).toContain('This workspace is collection scaffolding only.');
    expect(readmeText).toContain('Confidence movement: none');
    expect(readmeText).toContain('Buyer proof created: no');
    expect(readmeText).toContain('pnpm run report:buyer-evidence-readiness');

    expect(existsSync(path.join(outputDir, 'outreach/outreach-response-log.csv'))).toBe(true);
    expect(existsSync(path.join(outputDir, 'phase-f-minimum-intake/phase-f-minimum-register-starter.csv'))).toBe(true);

    const gateResult = await runNodeScript(validatorScriptPath, [
      path.join(outputDir, 'phase-f-minimum-intake/phase-f-minimum-register-starter.csv'),
      '--require-95',
      '--evidence-root',
      path.join(outputDir, 'phase-f-minimum-intake'),
    ]);
    expect(gateResult.status).toBe(1);
    expect(`${gateResult.stderr}\n${gateResult.stdout}`).toContain('95% confidence gate requires total accepted buyer-supplied confidence_delta of at least 0.9');
  }, PILOT_EVIDENCE_CLI_TIMEOUT_MS);

  it('reports Phase F evidence workspace status and next commands without moving confidence', async () => {
    const outputDir = makeTempRoot();
    const createResult = await runNodeScript(workspaceGeneratorScriptPath, [
      '--output-dir', outputDir,
      '--record-date', '2026-06-01',
    ]);
    expect(createResult.status).toBe(0);

    const result = await runNodeScript(workspaceReportScriptPath, [
      '--workspace-dir', outputDir,
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('CEIP Phase F Evidence Workspace Report');
    expect(result.stdout).toContain('Confidence movement: none');
    expect(result.stdout).toContain('Buyer proof created: no');
    expect(result.stdout).toContain('Selected register:');
    expect(result.stdout).toContain('Hard 95% retained-evidence gate: blocked');
    expect(result.stdout).toContain('Starter register scaffold: present');
    expect(result.stdout).toContain('Selected register validation: pass');
    expect(result.stdout).toContain('Production outreach response logs: 1');
    expect(result.stdout).toContain('Confidence-moving register rows: 0');
    expect(result.stdout).toContain('Phase F 95% gate: not ready');
    expect(result.stdout).toContain('Current 95% Gate Blockers');
    expect(result.stdout).toContain('pnpm run append:outreach-response-log-row');
    expect(result.stdout).toContain('pnpm run plan:outreach-intake');
    expect(result.stdout).toContain('pnpm run create:outreach-intake-packets');
    expect(result.stdout).toContain('pnpm run update:pilot-evidence-register-row');
    expect(result.stdout).toContain('Then rerun this workspace report against the updated candidate register');
    expect(result.stdout).toContain('--register-file');
    expect(result.stdout).toContain('Boundary: this report does not create buyer proof or raise market confidence.');
  }, PILOT_EVIDENCE_CLI_TIMEOUT_MS);

  it('reports against an explicitly selected updated Phase F register', async () => {
    const outputDir = makeTempRoot();
    const createResult = await runNodeScript(workspaceGeneratorScriptPath, [
      '--output-dir', outputDir,
      '--record-date', '2026-06-01',
    ]);
    expect(createResult.status).toBe(0);

    const starterRegisterPath = path.join(outputDir, 'phase-f-minimum-intake/phase-f-minimum-register-starter.csv');
    const updatedRegisterPath = path.join(outputDir, 'phase-f-minimum-register-updated.csv');
    copyFileSync(starterRegisterPath, updatedRegisterPath);

    const result = await runNodeScript(workspaceReportScriptPath, [
      '--workspace-dir', outputDir,
      '--register-file', updatedRegisterPath,
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain(`Selected register: ${updatedRegisterPath}`);
    expect(result.stdout).toContain(`Selected register validation: pass (${updatedRegisterPath})`);
    expect(result.stdout).toContain('Hard 95% retained-evidence gate: blocked');
    expect(result.stdout).toContain(`pnpm run validate:pilot-evidence -- ${updatedRegisterPath} --require-95`);
  }, PILOT_EVIDENCE_CLI_TIMEOUT_MS);

  it('rejects selected Phase F registers outside the workspace', async () => {
    const outputDir = makeTempRoot();
    const outsideDir = makeTempRoot();
    const createResult = await runNodeScript(workspaceGeneratorScriptPath, [
      '--output-dir', outputDir,
      '--record-date', '2026-06-01',
    ]);
    expect(createResult.status).toBe(0);

    const starterRegisterPath = path.join(outputDir, 'phase-f-minimum-intake/phase-f-minimum-register-starter.csv');
    const outsideRegisterPath = path.join(outsideDir, 'phase-f-minimum-register-updated.csv');
    copyFileSync(starterRegisterPath, outsideRegisterPath);

    const result = await runNodeScript(workspaceReportScriptPath, [
      '--workspace-dir', outputDir,
      '--register-file', outsideRegisterPath,
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Phase F evidence workspace report failed:');
    expect(result.stderr).toContain('Selected register must be inside the workspace');
  }, PILOT_EVIDENCE_CLI_TIMEOUT_MS);

  it('rejects invalid Phase F lane route overrides', async () => {
    const outputDir = makeTempRoot();
    const result = await runNodeScript(bundleGeneratorScriptPath, [
      '--output-dir', outputDir,
      '--tier-route', '/utility-security',
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--tier-route must be one of /roi-calculator, /credit-banking.');
  });
});
