import { describe, expect, it } from 'vitest';
import {
  buildUtilityConnectorBridgeRequestSignature,
  buildUtilityConnectorBridgeUrl,
  shouldUseUtilityConnectorBridge,
  verifyUtilityConnectorBridgeRequestSignature,
} from '../../supabase/functions/_shared/utilityConnectorBridge';

describe('utilityConnectorBridge', () => {
  it('uses the bridge only for London Hydro when a bridge host exists', () => {
    expect(shouldUseUtilityConnectorBridge('London Hydro', 'https://gb.ceip.energy')).toBe(true);
    expect(shouldUseUtilityConnectorBridge('Alectra Utilities', 'https://gb.ceip.energy')).toBe(false);
    expect(shouldUseUtilityConnectorBridge('London Hydro', '')).toBe(false);
  });

  it('builds the callback, token, feed, and revoke routes on the custom bridge host', () => {
    expect(buildUtilityConnectorBridgeUrl('https://gb.ceip.energy', 'callback', 'London Hydro')).toBe(
      'https://gb.ceip.energy/cmd/callback?utility_name=London+Hydro',
    );
    expect(buildUtilityConnectorBridgeUrl('https://gb.ceip.energy', 'token')).toBe('https://gb.ceip.energy/cmd/token');
    expect(buildUtilityConnectorBridgeUrl('https://gb.ceip.energy', 'feed')).toBe('https://gb.ceip.energy/cmd/feed');
    expect(buildUtilityConnectorBridgeUrl('https://gb.ceip.energy', 'revoke')).toBe('https://gb.ceip.energy/cmd/revoke');
  });

  it('builds and verifies signed bridge provenance headers', async () => {
    const headers = await buildUtilityConnectorBridgeRequestSignature({
      method: 'GET',
      requestUrl: 'https://gb.ceip.energy/cmd/feed',
      bodyText: '',
      signingSecret: 'bridge-secret',
      signingKeyId: 'bridge-key-1',
      issuer: 'supabase-utility-connector-green-button',
      originalHost: 'gb.ceip.energy',
      originalProto: 'https',
      clientIp: '203.0.113.5',
      requestId: 'req-1',
      timestamp: '2026-04-26T12:00:00.000Z',
      nonce: 'nonce-1',
    });

    const seenNonces = new Set<string>();
    const verification = await verifyUtilityConnectorBridgeRequestSignature({
      method: 'GET',
      requestUrl: 'https://gb.ceip.energy/cmd/feed',
      bodyText: '',
      headers,
      signingSecret: 'bridge-secret',
      expectedKeyId: 'bridge-key-1',
      expectedIssuer: 'supabase-utility-connector-green-button',
      expectedHost: 'gb.ceip.energy',
      allowedClockSkewSec: 300,
      now: () => new Date('2026-04-26T12:04:00.000Z'),
      direction: 'supabase_to_bridge',
      registerNonce: async (record) => {
        if (seenNonces.has(record.nonce)) return false;
        seenNonces.add(record.nonce);
        return true;
      },
    });

    expect(verification.ok).toBe(true);
    if (verification.ok) {
      expect(verification.metadata.requestId).toBe('req-1');
      expect(verification.metadata.originalHost).toBe('gb.ceip.energy');
    }
  });

  it('rejects missing or replayed signed provenance headers', async () => {
    const signedHeaders = await buildUtilityConnectorBridgeRequestSignature({
      method: 'GET',
      requestUrl: 'https://gb.ceip.energy/cmd/feed',
      bodyText: '',
      signingSecret: 'bridge-secret',
      signingKeyId: 'bridge-key-1',
      issuer: 'supabase-utility-connector-green-button',
      originalHost: 'gb.ceip.energy',
      timestamp: '2026-04-26T12:00:00.000Z',
      nonce: 'nonce-replay',
    });

    const seenNonces = new Set<string>();
    const firstPass = await verifyUtilityConnectorBridgeRequestSignature({
      method: 'GET',
      requestUrl: 'https://gb.ceip.energy/cmd/feed',
      bodyText: '',
      headers: signedHeaders,
      signingSecret: 'bridge-secret',
      expectedKeyId: 'bridge-key-1',
      expectedIssuer: 'supabase-utility-connector-green-button',
      expectedHost: 'gb.ceip.energy',
      allowedClockSkewSec: 300,
      now: () => new Date('2026-04-26T12:01:00.000Z'),
      direction: 'supabase_to_bridge',
      registerNonce: async (record) => {
        if (seenNonces.has(record.nonce)) return false;
        seenNonces.add(record.nonce);
        return true;
      },
    });
    expect(firstPass.ok).toBe(true);

    const replay = await verifyUtilityConnectorBridgeRequestSignature({
      method: 'GET',
      requestUrl: 'https://gb.ceip.energy/cmd/feed',
      bodyText: '',
      headers: signedHeaders,
      signingSecret: 'bridge-secret',
      expectedKeyId: 'bridge-key-1',
      expectedIssuer: 'supabase-utility-connector-green-button',
      expectedHost: 'gb.ceip.energy',
      allowedClockSkewSec: 300,
      now: () => new Date('2026-04-26T12:01:30.000Z'),
      direction: 'supabase_to_bridge',
      registerNonce: async (record) => {
        if (seenNonces.has(record.nonce)) return false;
        seenNonces.add(record.nonce);
        return true;
      },
    });
    expect(replay).toEqual({
      ok: false,
      error: 'Bridge nonce replay detected.',
    });

    const missingHeaders = await verifyUtilityConnectorBridgeRequestSignature({
      method: 'GET',
      requestUrl: 'https://gb.ceip.energy/cmd/feed',
      bodyText: '',
      headers: {},
      signingSecret: 'bridge-secret',
      expectedKeyId: 'bridge-key-1',
      expectedIssuer: 'supabase-utility-connector-green-button',
      expectedHost: 'gb.ceip.energy',
      direction: 'supabase_to_bridge',
    });
    expect(missingHeaders).toEqual({
      ok: false,
      error: 'Missing bridge provenance headers.',
    });
  });
});
