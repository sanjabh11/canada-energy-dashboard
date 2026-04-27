import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  authorizeUtilityConnectorHeaders,
  buildGreenButtonAuthorizeResponse,
  runGreenButtonCallback,
  runGreenButtonRevoke,
  runGreenButtonSync,
  runTelemetryIngest,
  validateTelemetryPayload,
} from '../../supabase/functions/_shared/utilityConnectorRuntime';
import { buildUtilityConnectorBridgeRequestSignature } from '../../supabase/functions/_shared/utilityConnectorBridge';
import { parseGreenButtonXml } from '../../src/lib/utilityLiveData';

const fixture = (name: string) => readFileSync(join(process.cwd(), 'tests/fixtures', name), 'utf8');

describe('utilityConnectorRuntime', () => {
  let server: Awaited<ReturnType<typeof startMockServer>>;

  beforeAll(async () => {
    server = await startMockServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('builds a Green Button authorize URL for the local mock harness', () => {
    const response = buildGreenButtonAuthorizeResponse({
      authorizeUrl: `${server.baseUrl}/authorize`,
      clientId: 'client-123',
      redirectUri: 'https://example.com/callback',
      connectorId: 'acct-1',
      scope: 'FB=4_5_15_16',
    });

    expect(response.status).toBe(200);
    expect(String(response.body.authorize_url)).toContain('client_id=client-123');
    expect(String(response.body.authorize_url)).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
    expect(response.body.state).toBe('acct-1');
  });

  it('rejects invalid connector keys before ingest', () => {
    const headers = new Headers({
      'x-utility-connector-key': 'wrong-key',
    });

    expect(authorizeUtilityConnectorHeaders('expected-key', headers)).toBe('Missing or invalid utility connector ingest key.');
    expect(authorizeUtilityConnectorHeaders('expected-key', new Headers({ 'x-utility-connector-key': 'expected-key' }))).toBeNull();
  });

  it('exchanges a mocked Green Button auth code and stores expiry metadata', async () => {
    const repo = createFakeConnectorRepo();
    server.requestLog.length = 0;
    const tokenRequestHeaders = await buildUtilityConnectorBridgeRequestSignature({
      method: 'POST',
      requestUrl: `${server.baseUrl}/token-success`,
      bodyText: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'good-code',
        redirect_uri: 'https://example.com/callback',
        client_id: 'client-123',
        client_secret: 'secret-456',
      }).toString(),
      signingSecret: 'bridge-secret',
      signingKeyId: 'bridge-key-1',
      issuer: 'supabase-utility-connector-green-button',
      originalHost: 'gb.ceip.energy',
      timestamp: '2026-04-26T12:00:00.000Z',
      nonce: 'token-nonce-1',
    });
    const response = await runGreenButtonCallback({
      code: 'good-code',
      state: 'acct-1',
      connectorId: 'acct-1',
      tokenEndpoint: `${server.baseUrl}/token-success`,
      clientId: 'client-123',
      clientSecret: 'secret-456',
      redirectUri: 'https://example.com/callback',
      utilityName: 'London Hydro',
      displayName: 'London Hydro Green Button',
      tokenRequestHeaders,
    }, {
      fetchImpl: fetch,
      upsertAccount: repo.upsertAccount,
      logRun: repo.logRun,
      upsertToken: repo.upsertToken,
      encryptSecret: async (plaintext) => `enc:${plaintext}`,
      now: () => new Date('2026-04-26T12:00:00.000Z'),
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(repo.state.tokens).toHaveLength(1);
    expect(repo.state.tokens[0]?.registration_metadata.scope).toBe('FB=4_5_15_16');
    expect(repo.state.accounts.at(-1)?.status).toBe('active');
    expect(repo.state.accounts.at(-1)?.metadata?.token_expires_at).toBe('2026-04-26T13:00:00.000Z');
    expect(server.requestLog.at(-1)?.headers['x-utility-connector-bridge-signature']).toBeTruthy();
    expect(server.requestLog.at(-1)?.headers['x-utility-connector-bridge-key-id']).toBe('bridge-key-1');
  });

  it('marks the connector revoked when the token exchange is rejected by the utility', async () => {
    const repo = createFakeConnectorRepo();
    const response = await runGreenButtonCallback({
      code: 'revoked-code',
      state: 'acct-2',
      connectorId: 'acct-2',
      tokenEndpoint: `${server.baseUrl}/token-revoked`,
      clientId: 'client-123',
      clientSecret: 'secret-456',
      redirectUri: 'https://example.com/callback',
      utilityName: 'Alectra Utilities',
      displayName: 'Alectra Utilities Green Button',
    }, {
      fetchImpl: fetch,
      upsertAccount: repo.upsertAccount,
      logRun: repo.logRun,
      upsertToken: repo.upsertToken,
      encryptSecret: async (plaintext) => `enc:${plaintext}`,
      now: () => new Date('2026-04-26T12:00:00.000Z'),
    });

    expect(response.status).toBe(400);
    expect(repo.state.accounts.at(-1)?.status).toBe('revoked');
    expect(repo.state.accounts.at(-1)?.metadata?.revoked_at).toBe('2026-04-26T12:00:00.000Z');
    expect(repo.state.runs.at(-1)?.status).toBe('failure');
  });

  it('syncs a mocked Green Button feed into normalized interval history rows', async () => {
    const repo = createFakeConnectorRepo();
    server.requestLog.length = 0;
    const requestHeaders = await buildUtilityConnectorBridgeRequestSignature({
      method: 'GET',
      requestUrl: `${server.baseUrl}/feed.xml`,
      bodyText: '',
      signingSecret: 'bridge-secret',
      signingKeyId: 'bridge-key-1',
      issuer: 'supabase-utility-connector-green-button',
      originalHost: 'gb.ceip.energy',
      timestamp: '2026-04-26T12:00:00.000Z',
      nonce: 'feed-nonce-1',
    });
    const response = await runGreenButtonSync({
      connectorId: 'acct-3',
      utilityName: 'London Hydro',
      displayName: 'London Hydro Green Button',
      feedUrl: `${server.baseUrl}/feed.xml`,
      accessToken: 'access-123',
      metadata: { runtime_validation_mode: 'mock' },
      requestHeaders,
    }, {
      fetchImpl: fetch,
      sha256Hex: async (input) => createHash('sha256').update(input).digest('hex'),
      upsertAccount: repo.upsertAccount,
      logRun: repo.logRun,
      auditPayload: repo.auditPayload,
      insertIntervalHistory: repo.insertIntervalHistory,
      parseGreenButtonXml: (xml, geographyId) => parseGreenButtonXml(xml, { jurisdiction: 'Ontario', geographyId: geographyId ?? undefined }).rows.map((row) => ({
        observed_at: row.timestamp,
        geography_level: row.geography_level,
        geography_id: row.geography_id,
        customer_class: row.customer_class,
        demand_mw: row.demand_mw,
        quality_flags: row.quality_flags ?? [],
      })),
      now: () => new Date('2026-04-26T12:00:00.000Z'),
    });

    expect(response.status).toBe(200);
    expect(response.body.inserted_rows).toBe(2);
    expect(repo.state.intervalRows).toHaveLength(2);
    expect(repo.state.payloadAudits[0]?.payloadKind).toBe('green_button_xml');
    expect(repo.state.runs.at(-1)?.status).toBe('success');
    expect(server.requestLog.at(-1)?.headers['x-utility-connector-bridge-signature']).toBeTruthy();
  });

  it('marks a connector revoked when the remote Green Button feed returns unauthorized', async () => {
    const repo = createFakeConnectorRepo();
    const response = await runGreenButtonSync({
      connectorId: 'acct-4',
      utilityName: 'Alectra Utilities',
      displayName: 'Alectra Utilities Green Button',
      feedUrl: `${server.baseUrl}/feed-unauthorized`,
      accessToken: 'stale-token',
    }, {
      fetchImpl: fetch,
      sha256Hex: async (input) => createHash('sha256').update(input).digest('hex'),
      upsertAccount: repo.upsertAccount,
      logRun: repo.logRun,
      auditPayload: repo.auditPayload,
      insertIntervalHistory: repo.insertIntervalHistory,
      parseGreenButtonXml: (xml, geographyId) => parseGreenButtonXml(xml, { jurisdiction: 'Ontario', geographyId: geographyId ?? undefined }).rows.map((row) => ({
        observed_at: row.timestamp,
        geography_level: row.geography_level,
        geography_id: row.geography_id,
        customer_class: row.customer_class,
        demand_mw: row.demand_mw,
        quality_flags: row.quality_flags ?? [],
      })),
      now: () => new Date('2026-04-26T12:00:00.000Z'),
    });

    expect(response.status).toBe(400);
    expect(repo.state.accounts.at(-1)?.status).toBe('revoked');
    expect(repo.state.accounts.at(-1)?.metadata?.revoked_at).toBe('2026-04-26T12:00:00.000Z');
  });

  it('revokes an API-managed connector and purges token custody after remote success', async () => {
    const repo = createFakeConnectorRepo();
    repo.state.tokens.push({
      connector_account_id: 'acct-6',
      token_label: 'default',
      access_token_ciphertext: 'enc:access-123',
    });
    server.requestLog.length = 0;
    const requestHeaders = await buildUtilityConnectorBridgeRequestSignature({
      method: 'POST',
      requestUrl: `${server.baseUrl}/revoke-success`,
      bodyText: '',
      signingSecret: 'bridge-secret',
      signingKeyId: 'bridge-key-1',
      issuer: 'supabase-utility-connector-green-button',
      originalHost: 'gb.ceip.energy',
      timestamp: '2026-04-26T12:00:00.000Z',
      nonce: 'revoke-nonce-1',
    });

    const response = await runGreenButtonRevoke({
      connectorId: 'acct-6',
      utilityName: 'Ontario Mock Utility',
      displayName: 'Ontario Mock Utility CMD',
      revocationMode: 'api',
      revokeUrl: `${server.baseUrl}/revoke-success`,
      actor: 'unit-test',
      requestHeaders,
    }, {
      fetchImpl: fetch,
      upsertAccount: repo.upsertAccount,
      logRun: repo.logRun,
      deleteTokens: repo.deleteTokens,
      resolveAccessToken: async () => 'access-123',
      now: () => new Date('2026-04-26T12:00:00.000Z'),
    });

    expect(response.status).toBe(200);
    expect(repo.state.accounts.at(-1)?.status).toBe('revoked');
    expect(repo.state.accounts.at(-1)?.metadata?.token_material_purged).toBe(true);
    expect(repo.state.runs.at(-1)?.run_type).toBe('revoke');
    expect(repo.state.deletedTokenAccounts).toContain('acct-1');
    expect(server.requestLog.at(-1)?.headers['x-utility-connector-bridge-signature']).toBeTruthy();
  });

  it('requires confirmation for portal-managed revocation before marking a connector revoked', async () => {
    const repo = createFakeConnectorRepo();

    const requested = await runGreenButtonRevoke({
      connectorId: 'acct-7',
      utilityName: 'London Hydro',
      displayName: 'London Hydro Green Button',
      revocationMode: 'portal_redirect',
      manageConnectionsUrl: 'https://example.com/manage',
      actor: 'unit-test',
    }, {
      upsertAccount: repo.upsertAccount,
      logRun: repo.logRun,
      deleteTokens: repo.deleteTokens,
      now: () => new Date('2026-04-26T12:00:00.000Z'),
    });

    expect(requested.status).toBe(202);
    expect(repo.state.accounts.at(-1)?.status).toBe('failed');
    expect(repo.state.accounts.at(-1)?.metadata?.awaiting_revocation_confirmation).toBe(true);

    const confirmed = await runGreenButtonRevoke({
      connectorId: 'acct-7',
      utilityName: 'London Hydro',
      displayName: 'London Hydro Green Button',
      revocationMode: 'portal_redirect',
      manageConnectionsUrl: 'https://example.com/manage',
      actor: 'unit-test',
      confirmRevoked: true,
    }, {
      upsertAccount: repo.upsertAccount,
      logRun: repo.logRun,
      deleteTokens: repo.deleteTokens,
      now: () => new Date('2026-04-26T12:05:00.000Z'),
    });

    expect(confirmed.status).toBe(200);
    expect(repo.state.accounts.at(-1)?.status).toBe('revoked');
    expect(repo.state.accounts.at(-1)?.metadata?.revoked_at).toBe('2026-04-26T12:05:00.000Z');
  });

  it('rejects empty Green Button feeds even when the transport succeeds', async () => {
    const repo = createFakeConnectorRepo();
    const response = await runGreenButtonSync({
      connectorId: 'acct-5',
      utilityName: 'London Hydro',
      displayName: 'London Hydro Green Button',
      xmlPayload: fixture('green-button-empty.xml'),
    }, {
      sha256Hex: async (input) => createHash('sha256').update(input).digest('hex'),
      upsertAccount: repo.upsertAccount,
      logRun: repo.logRun,
      auditPayload: repo.auditPayload,
      insertIntervalHistory: repo.insertIntervalHistory,
      parseGreenButtonXml: (xml, geographyId) => parseGreenButtonXml(xml, { jurisdiction: 'Ontario', geographyId: geographyId ?? undefined }).rows.map((row) => ({
        observed_at: row.timestamp,
        geography_level: row.geography_level,
        geography_id: row.geography_id,
        customer_class: row.customer_class,
        demand_mw: row.demand_mw,
        quality_flags: row.quality_flags ?? [],
      })),
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No interval readings found in the supplied Green Button XML payload.');
  });

  it('ingests valid telemetry payloads and rejects malformed ones', async () => {
    const repo = createFakeConnectorRepo();
    const validPayload = JSON.parse(fixture('utility-telemetry-valid.json'));
    const stalePayload = JSON.parse(fixture('utility-telemetry-stale.json'));
    const invalidPayload = JSON.parse(fixture('utility-telemetry-invalid-quality.json'));
    const missingGeography = JSON.parse(fixture('utility-telemetry-missing-geography.json'));

    expect(validateTelemetryPayload(stalePayload).errors).toEqual([]);

    const success = await runTelemetryIngest({
      body: validPayload,
      utilityName: 'Telemetry gateway',
      displayName: 'Telemetry gateway HTTP',
    }, {
      sha256Hex: async (input) => createHash('sha256').update(input).digest('hex'),
      upsertAccount: repo.upsertAccount,
      auditPayload: repo.auditPayload,
      insertTelemetrySnapshot: repo.insertTelemetrySnapshot,
      logRun: repo.logRun,
    });

    expect(success.status).toBe(200);
    expect(repo.state.telemetrySnapshots).toHaveLength(1);
    expect(repo.state.telemetrySnapshots[0]?.snapshot.quality_flags).toContain('phase_unbalanced');

    const invalidQuality = await runTelemetryIngest({
      body: invalidPayload,
    }, {
      sha256Hex: async (input) => createHash('sha256').update(input).digest('hex'),
      upsertAccount: repo.upsertAccount,
      auditPayload: repo.auditPayload,
      insertTelemetrySnapshot: repo.insertTelemetrySnapshot,
      logRun: repo.logRun,
    });
    expect(invalidQuality.status).toBe(400);

    const missingGeo = await runTelemetryIngest({
      body: missingGeography,
    }, {
      sha256Hex: async (input) => createHash('sha256').update(input).digest('hex'),
      upsertAccount: repo.upsertAccount,
      auditPayload: repo.auditPayload,
      insertTelemetrySnapshot: repo.insertTelemetrySnapshot,
      logRun: repo.logRun,
    });
    expect(missingGeo.status).toBe(400);
  });
});

function createFakeConnectorRepo() {
  const accountMap = new Map<string, { id: string; payload: any }>();
  const state = {
    accounts: [] as any[],
    runs: [] as any[],
    tokens: [] as any[],
    deletedTokenAccounts: [] as string[],
    payloadAudits: [] as any[],
    intervalRows: [] as any[],
    telemetrySnapshots: [] as any[],
  };

  return {
    state,
    upsertAccount: async (payload: any) => {
      const key = `${payload.jurisdiction}:${payload.connector_kind}:${payload.display_name}`;
      const existing = accountMap.get(key);
      const record = {
        id: existing?.id ?? `acct-${accountMap.size + 1}`,
        ...payload,
      };
      accountMap.set(key, { id: record.id, payload: record });
      state.accounts.push(record);
      return { id: record.id };
    },
    logRun: async (payload: any) => {
      state.runs.push(payload);
    },
    upsertToken: async (payload: any) => {
      state.tokens.push(payload);
    },
    deleteTokens: async ({ connectorAccountId }: { connectorAccountId: string }) => {
      state.deletedTokenAccounts.push(connectorAccountId);
      state.tokens = state.tokens.filter((token) => token.connector_account_id !== connectorAccountId);
    },
    auditPayload: async (payload: any) => {
      state.payloadAudits.push(payload);
    },
    insertIntervalHistory: async (payload: any) => {
      state.intervalRows.push(...payload.rows);
    },
    insertTelemetrySnapshot: async (payload: any) => {
      state.telemetrySnapshots.push(payload);
    },
  };
}

async function startMockServer() {
  const requestLog: Array<{ pathname: string; method: string; headers: IncomingMessage['headers'] }> = [];
  const routes = {
    '/token-success': (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        access_token: 'access-123',
        refresh_token: 'refresh-abc',
        expires_in: 3600,
        scope: 'FB=4_5_15_16',
        token_type: 'Bearer',
      }));
    },
    '/token-revoked': (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'invalid_token',
        error_description: 'Token revoked by utility.',
      }));
    },
    '/feed.xml': (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(fixture('green-button-interval.xml'));
    },
    '/feed-unauthorized': (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('unauthorized');
    },
    '/revoke-success': (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(204);
      res.end();
    },
  } satisfies Record<string, (req: IncomingMessage, res: ServerResponse) => void>;

  const server = createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    requestLog.push({
      pathname,
      method: req.method ?? 'GET',
      headers: req.headers,
    });
    const route = routes[pathname as keyof typeof routes];
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    route(req, res);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start mock connector server.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requestLog,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
