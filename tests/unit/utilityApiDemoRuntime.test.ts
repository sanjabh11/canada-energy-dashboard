import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  runActivateUtilityApiDemo,
  runPollUtilityApiDemo,
  runRevokeUtilityApiDemo,
  runStartUtilityApiDemo,
  runSyncUtilityApiDemo,
} from '../../supabase/functions/_shared/utilityApiDemoRuntime';

const fixture = (name: string) => readFileSync(join(process.cwd(), 'tests/fixtures', name), 'utf8');

describe('utilityApiDemoRuntime', () => {
  let server: Awaited<ReturnType<typeof startMockServer>>;

  beforeAll(async () => {
    server = await startMockServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('starts a DEMO authorization with the commercial scenario by default', async () => {
    const response = await runStartUtilityApiDemo({}, {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      fetchImpl: server.fetch,
    });

    expect(response.status).toBe(200);
    expect(response.body.referral).toBe('demo-referral');
    expect(response.body.stage).toBe('authorization_pending');
    expect(server.state.lastStartBody).toEqual({
      utility: 'DEMO',
      scenario: 'commercial',
    });
  });

  it('rejects disallowed scenarios before touching UtilityAPI', async () => {
    await expect(runStartUtilityApiDemo({
      scenario: 'enterprise',
    }, {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      fetchImpl: server.fetch,
    })).rejects.toThrow('Unsupported UtilityAPI demo scenario');
  });

  it('returns authorization_pending while the referral has not materialized yet', async () => {
    const response = await runPollUtilityApiDemo({
      referral: 'pending-referral',
    }, {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      fetchImpl: server.fetch,
    });

    expect(response.status).toBe(202);
    expect(response.body.pending).toBe(true);
    expect(response.body.stage).toBe('authorization_pending');
    expect(response.body.next_poll_after_seconds).toBe(2);
  });

  it('returns collection_ready with meter states when authorization polling includes meters', async () => {
    const response = await runPollUtilityApiDemo({
      authorization_uid: 'auth-demo-1',
    }, {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      fetchImpl: server.fetch,
    });

    expect(response.status).toBe(200);
    expect(response.body.authorization_uid).toBe('auth-demo-1');
    expect(response.body.meter_count).toBe(2);
    expect(response.body.meter_uids).toEqual(['meter-1', 'meter-2']);
    expect(response.body.stage).toBe('collection_ready');
    expect(response.body.can_sync).toBe(true);
    expect(server.state.lastAuthorizationLookupUrl?.includes('include=meters')).toBe(true);
  });

  it('returns pending_manual without collapsing the session into a generic error', async () => {
    const response = await runPollUtilityApiDemo({
      authorization_uid: 'auth-pending-manual',
    }, {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      fetchImpl: server.fetch,
    });

    expect(response.status).toBe(200);
    expect(response.body.stage).toBe('pending_manual');
    expect(response.body.terminal_reason).toBe('pending_manual_after');
  });

  it('caps historical collection to 3 months server-side', async () => {
    const response = await runActivateUtilityApiDemo({
      authorization_uid: 'auth-demo-1',
      meter_uids: ['meter-1', 'meter-2'],
    }, {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      fetchImpl: server.fetch,
    });

    expect(response.status).toBe(200);
    expect(response.body.collection_duration_months).toBe(3);
    expect(response.body.stage).toBe('collection_pending');
    expect(server.state.lastActivationBody).toEqual({
      meters: ['meter-1', 'meter-2'],
      collection_duration: 3,
    });
  });

  it('returns pending from sync while collection is still running', async () => {
    const response = await runSyncUtilityApiDemo({
      authorization_uid: 'auth-collecting',
    }, {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      fetchImpl: server.fetch,
    });

    expect(response.status).toBe(202);
    expect(response.body.pending).toBe(true);
    expect(response.body.stage).toBe('collection_pending');
    expect(response.body.retry_after_seconds).toBe(5);
  });

  it('returns raw Green Button XML without server persistence during sync', async () => {
    const response = await runSyncUtilityApiDemo({
      authorization_uid: 'auth-demo-1',
    }, {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      fetchImpl: server.fetch,
    });

    expect(response.status).toBe(200);
    expect(typeof response.body.raw_xml).toBe('string');
    expect(String(response.body.raw_xml)).toContain('<espi:IntervalReading>');
  });

  it('revokes the DEMO authorization through UtilityAPI authorizations API', async () => {
    const response = await runRevokeUtilityApiDemo({
      authorization_uid: 'auth-demo-1',
    }, {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      fetchImpl: server.fetch,
    });

    expect(response.status).toBe(200);
    expect(response.body.revoked).toBe(true);
    expect(server.state.revokedAuthorizationUid).toBe('auth-demo-1');
  });
});

async function startMockServer() {
  const state = {
    lastStartBody: null as Record<string, unknown> | null,
    lastActivationBody: null as Record<string, unknown> | null,
    revokedAuthorizationUid: null as string | null,
    lastAuthorizationLookupUrl: null as string | null,
  };

  const routes = {
    '/api/v2/forms/form-123/test-submit': async (req: IncomingMessage, res: ServerResponse) => {
      const body = await readJsonBody(req);
      state.lastStartBody = body;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ referral: 'demo-referral' }));
    },
    '/api/v2/authorizations': (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const referral = url.searchParams.get('referrals');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (referral === 'pending-referral') {
        res.end(JSON.stringify({ items: [] }));
        return;
      }
      res.end(JSON.stringify({
        items: [{
          uid: 'auth-demo-1',
          utility: 'DEMO',
          is_test: true,
          user_status: 'active',
          meters: [
            { uid: 'meter-1', interval_count: 96, bill_count: 3, updated: '2026-04-27T08:00:00.000Z' },
            { uid: 'meter-2', interval_count: 96, bill_count: 3, updated: '2026-04-27T08:00:00.000Z' },
          ],
        }],
      }));
    },
    '/api/v2/authorizations/auth-demo-1': (req: IncomingMessage, res: ServerResponse) => {
      state.lastAuthorizationLookupUrl = req.url ?? null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        uid: 'auth-demo-1',
        utility: 'DEMO',
        is_test: true,
        user_status: 'active',
        meters: [
          { uid: 'meter-1', interval_count: 96, bill_count: 3, updated: '2026-04-27T08:00:00.000Z', status: 'complete' },
          { uid: 'meter-2', interval_count: 96, bill_count: 3, updated: '2026-04-27T08:00:00.000Z', status: 'complete' },
        ],
      }));
    },
    '/api/v2/authorizations/auth-pending-manual': (req: IncomingMessage, res: ServerResponse) => {
      state.lastAuthorizationLookupUrl = req.url ?? null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        uid: 'auth-pending-manual',
        utility: 'DEMO',
        is_test: true,
        user_status: 'active',
        meters: [
          {
            uid: 'meter-manual',
            interval_count: 0,
            bill_count: 0,
            status: 'pending_manual_after',
            status_message: 'Pending manual account step',
            notes: [{ type: 'pending_manual_after' }],
          },
        ],
      }));
    },
    '/api/v2/authorizations/auth-collecting': (req: IncomingMessage, res: ServerResponse) => {
      state.lastAuthorizationLookupUrl = req.url ?? null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        uid: 'auth-collecting',
        utility: 'DEMO',
        is_test: true,
        user_status: 'active',
        meters: [
          {
            uid: 'meter-collecting',
            interval_count: 0,
            bill_count: 0,
            status: 'collecting',
            status_message: 'Historical collection in progress',
          },
        ],
      }));
    },
    '/api/v2/meters/historical-collection': async (req: IncomingMessage, res: ServerResponse) => {
      const body = await readJsonBody(req);
      state.lastActivationBody = body;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    },
    '/DataCustodian/espi/1_1/resource/Batch/Subscription/auth-demo-1': (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(fixture('green-button-interval.xml'));
    },
    '/api/v2/authorizations/auth-demo-1/revoke': (_req: IncomingMessage, res: ServerResponse) => {
      state.revokedAuthorizationUid = 'auth-demo-1';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ revoked: true }));
    },
  } satisfies Record<string, (req: IncomingMessage, res: ServerResponse) => Promise<void> | void>;

  const nodeServer = createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    const route = routes[pathname as keyof typeof routes];
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    void route(req, res);
  });

  await new Promise<void>((resolve) => nodeServer.listen(0, '127.0.0.1', () => resolve()));
  const address = nodeServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start UtilityAPI mock server.');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    state,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' || input instanceof URL
        ? new URL(input.toString())
        : new URL(input.url);
      return fetch(`${baseUrl}${url.pathname}${url.search}`, init);
    },
    close: () => new Promise<void>((resolve, reject) => nodeServer.close((error) => error ? reject(error) : resolve())),
  };
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw.length > 0 ? JSON.parse(raw) as Record<string, unknown> : {};
}
