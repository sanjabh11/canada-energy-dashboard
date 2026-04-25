import { describe, expect, it } from 'vitest';
import {
  appendSovereignVaultAuditEntry,
  getSovereignVaultAuditEntries,
  getSovereignVaultConsent,
  setSovereignVaultConsent,
  type StorageLike,
} from '../../src/lib/sovereignVaultAudit';

class MemoryStorage implements StorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('sovereign vault audit log', () => {
  it('stores consent and appends audit entries locally', () => {
    const storage = new MemoryStorage();

    expect(getSovereignVaultConsent(storage)).toBe(false);
    setSovereignVaultConsent(true, storage);
    appendSovereignVaultAuditEntry('consent_granted', { actor: 'operator' }, storage);
    appendSovereignVaultAuditEntry('export_completed', { fingerprint: 'abc' }, storage);

    const entries = getSovereignVaultAuditEntries(storage);

    expect(getSovereignVaultConsent(storage)).toBe(true);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.action).toBe('export_completed');
    expect(entries[1]?.action).toBe('consent_granted');
  });
});
