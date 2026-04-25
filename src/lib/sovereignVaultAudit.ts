export type SovereignVaultAuditAction =
  | 'consent_granted'
  | 'consent_revoked'
  | 'config_changed'
  | 'export_started'
  | 'export_completed'
  | 'import_succeeded'
  | 'import_failed';

export interface SovereignVaultAuditEntry {
  id: string;
  action: SovereignVaultAuditAction;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export const SOVEREIGN_VAULT_AUDIT_STORAGE_KEY = 'ceip_sovereign_vault_audit_v1';
export const SOVEREIGN_VAULT_CONSENT_STORAGE_KEY = 'ceip_sovereign_vault_consent_v1';

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

function generateAuditId(): string {
  return `vault_audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getSovereignVaultAuditEntries(storage?: StorageLike): SovereignVaultAuditEntry[] {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return [];
  try {
    const raw = resolvedStorage.getItem(SOVEREIGN_VAULT_AUDIT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendSovereignVaultAuditEntry(
  action: SovereignVaultAuditAction,
  metadata: Record<string, unknown> = {},
  storage?: StorageLike,
): SovereignVaultAuditEntry {
  const entry: SovereignVaultAuditEntry = {
    id: generateAuditId(),
    action,
    createdAt: new Date().toISOString(),
    metadata,
  };
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return entry;
  const nextEntries = [entry, ...getSovereignVaultAuditEntries(resolvedStorage)].slice(0, 100);
  resolvedStorage.setItem(SOVEREIGN_VAULT_AUDIT_STORAGE_KEY, JSON.stringify(nextEntries));
  return entry;
}

export function getSovereignVaultConsent(storage?: StorageLike): boolean {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return false;
  return resolvedStorage.getItem(SOVEREIGN_VAULT_CONSENT_STORAGE_KEY) === 'true';
}

export function setSovereignVaultConsent(accepted: boolean, storage?: StorageLike): void {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return;
  resolvedStorage.setItem(SOVEREIGN_VAULT_CONSENT_STORAGE_KEY, accepted ? 'true' : 'false');
}
