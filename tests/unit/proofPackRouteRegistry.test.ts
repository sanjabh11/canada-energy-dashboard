import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const registryPath = path.join(process.cwd(), 'scripts/lib/proof-pack-routes.mjs');
const intakeScriptPath = path.join(process.cwd(), 'scripts/create-pilot-evidence-intake-packet.mjs');
const outreachValidatorPath = path.join(process.cwd(), 'scripts/validate-outreach-response-log.mjs');
const tempRoots: string[] = [];

type ProofPackRouteConfig = {
  proofPackId: string;
  buyerLane: string;
  inputDataType: string;
  artifactGenerated: string;
  doNotClaim: string;
};

async function loadRegistry() {
  const registry = await import(pathToFileURL(registryPath).href) as {
    proofPackRouteConfigs: Map<string, ProofPackRouteConfig>;
    proofPackRoutes: Set<string>;
    proofPackIdsByRoute: Map<string, Set<string>>;
    proofPackBuyerLanes: Set<string>;
  };
  return registry;
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

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-proof-pack-routes-'));
  tempRoots.push(root);
  return root;
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('proof-pack route registry', () => {
  it('keeps route, proof-pack, and buyer-lane exports in sync', async () => {
    const {
      proofPackRouteConfigs,
      proofPackRoutes,
      proofPackIdsByRoute,
      proofPackBuyerLanes,
    } = await loadRegistry();

    expect(proofPackRouteConfigs.size).toBe(12);
    expect(Array.from(proofPackRoutes).sort()).toEqual(Array.from(proofPackRouteConfigs.keys()).sort());

    const proofPackIds = new Set<string>();
    for (const [route, config] of proofPackRouteConfigs) {
      expect(config.proofPackId).toMatch(/_pack$|_provenance$|_overlay$/);
      expect(proofPackIds.has(config.proofPackId)).toBe(false);
      proofPackIds.add(config.proofPackId);
      expect(proofPackIdsByRoute.get(route)).toEqual(new Set([config.proofPackId]));
      expect(proofPackBuyerLanes.has(config.buyerLane)).toBe(true);
    }
  });

  it('drives the intake packet route listing', async () => {
    const { proofPackRouteConfigs } = await loadRegistry();
    const result = await runNodeScript(intakeScriptPath, ['--list-routes']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');

    for (const [route, config] of proofPackRouteConfigs) {
      expect(result.stdout).toContain(`- ${route} (${config.proofPackId})`);
    }
  });

  it('lets the outreach response validator accept every registered route/proof-pack pair', async () => {
    const { proofPackRouteConfigs } = await loadRegistry();
    const root = makeTempRoot();
    const filePath = path.join(root, 'outreach-response-log.csv');
    const header = [
      'activity_date',
      'channel',
      'target_label',
      'buyer_lane',
      'proof_pack_id',
      'route',
      'rating',
      'variant_id',
      'caveat_used',
      'artifact_promised',
      'reply_status',
      'response_summary',
      'pain_signal',
      'requested_input',
      'reviewer_role',
      'commercial_commitment_status',
      'next_action',
      'pilot_evidence_register_action',
      'notes',
    ].join(',');

    const rows = Array.from(proofPackRouteConfigs, ([route, config]) => [
      '2026-05-31',
      'email',
      `registry_${route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}`,
      config.buyerLane,
      config.proofPackId,
      route,
      '4.1',
      `registry_${config.proofPackId}`,
      config.doNotClaim,
      config.artifactGenerated,
      'interested',
      `Buyer asked for bounded ${route} proof-pack intake with a redacted sample.`,
      `Proof-pack workflow fit for ${route}`,
      config.inputDataType,
      'pilot reviewer',
      'none',
      'create intake packet',
      'create_intake_packet',
      'No direct identifiers retained in this registry parity fixture.',
    ].map(csvCell).join(','));

    writeFileSync(filePath, [header, ...rows, ''].join('\n'), 'utf8');
    const result = await runNodeScript(outreachValidatorPath, [filePath, '--report']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain(`Outreach response log validation passed for ${proofPackRouteConfigs.size} row(s)`);
  });
});
