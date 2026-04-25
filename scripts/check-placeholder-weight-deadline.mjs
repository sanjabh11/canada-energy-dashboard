import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const deadline = new Date('2026-06-01T00:00:00.000Z');
const now = new Date();

if (now < deadline) {
  console.log(`[placeholder-weight-gate] pre-deadline (${now.toISOString()} < ${deadline.toISOString()}); allowing placeholder artifacts for B+.0/B+.1 sequence.`);
  process.exit(0);
}

const weightsDir = join(process.cwd(), 'src/lib/modelWeights');
const weightFiles = readdirSync(weightsDir).filter((file) => file.endsWith('.json'));
const offenders = [];

for (const file of weightFiles) {
  const filePath = join(weightsDir, file);
  const content = readFileSync(filePath, 'utf8');
  const artifact = JSON.parse(content);
  const manifest = artifact.manifest ?? {};
  const simulatorVersion = String(manifest.simulator_config?.version ?? '');
  const artifactSha = String(manifest.training_artifact_sha ?? '');
  const scenarioCount = Number(manifest.simulator_config?.scenario_count ?? 0);
  const mape = Number(manifest.metrics?.mape ?? Number.NaN);
  const physicsViolationRate = Number(manifest.metrics?.physics_violation_rate ?? Number.NaN);
  const warnings = Array.isArray(manifest.warnings) ? manifest.warnings.map((entry) => String(entry)).join(' ') : '';
  const gateReason = [
    simulatorVersion.startsWith('placeholder-') ? `simulator_config.version=${simulatorVersion}` : null,
    artifactSha.startsWith('placeholder-') ? `training_artifact_sha=${artifactSha}` : null,
    scenarioCount < 5000 ? `scenario_count=${scenarioCount}` : null,
    Number.isFinite(mape) && mape > 0.05 ? `mape=${mape}` : null,
    Number.isFinite(physicsViolationRate) && physicsViolationRate > 0.1 ? `physics_violation_rate=${physicsViolationRate}` : null,
    warnings.toLowerCase().includes('placeholder') ? 'warnings mention placeholder artifacts' : null,
  ].filter(Boolean);

  if (gateReason.length > 0) {
    offenders.push(`${file}: ${gateReason.join('; ')}`);
  }
}

if (offenders.length > 0) {
  console.error('[placeholder-weight-gate] placeholder artifacts are still present after the deadline:');
  for (const offender of offenders) {
    console.error(` - ${offender}`);
  }
  process.exit(1);
}

console.log('[placeholder-weight-gate] all committed model artifacts have moved past placeholder state.');
