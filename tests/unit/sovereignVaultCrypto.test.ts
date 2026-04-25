import { describe, expect, it } from 'vitest';
import {
  decryptSovereignVaultPayload,
  encryptSovereignVaultPayload,
  isSovereignVaultEnvelope,
  SOVEREIGN_VAULT_ALGORITHM,
  SOVEREIGN_VAULT_ENVELOPE_VERSION,
} from '../../src/lib/sovereignVaultCrypto';

describe('sovereign vault crypto helpers', () => {
  it('round-trips an encrypted payload through AES-GCM', async () => {
    const payload = {
      dataOwner: 'Siksika Nation',
      assets: [{ id: 'asset-1', records: 42 }],
    };

    const envelope = await encryptSovereignVaultPayload(payload, 'correct horse battery staple', 'Siksika Nation', '2026-04-25T10:00:00.000Z');
    const decrypted = await decryptSovereignVaultPayload<typeof payload>(envelope, 'correct horse battery staple');

    expect(isSovereignVaultEnvelope(envelope)).toBe(true);
    expect(envelope.version).toBe(SOVEREIGN_VAULT_ENVELOPE_VERSION);
    expect(envelope.algorithm).toBe(SOVEREIGN_VAULT_ALGORITHM);
    expect(envelope.fingerprint).toMatch(/^[a-f0-9]{8}-[a-f0-9]{8}-[a-f0-9]{8}$/);
    expect(decrypted).toEqual(payload);
  });

  it('fails closed on a wrong passphrase', async () => {
    const envelope = await encryptSovereignVaultPayload({ hello: 'world' }, 'trusted-passphrase', 'Nation');

    await expect(decryptSovereignVaultPayload(envelope, 'wrong-passphrase')).rejects.toThrow(
      'Vault import failed. Verify the passphrase and encrypted file.',
    );
  });

  it('rejects malformed envelopes before decryption', async () => {
    await expect(decryptSovereignVaultPayload({ version: 'bad' }, 'passphrase')).rejects.toThrow(
      'Malformed encrypted vault envelope.',
    );
  });
});
