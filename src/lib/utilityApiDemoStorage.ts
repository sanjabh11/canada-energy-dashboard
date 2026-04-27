import { cache } from './cache';
import type { UtilityApiDemoSessionPointer, UtilityApiDemoSessionRecord } from './utilityApiDemo';

const DEMO_PREFIX = 'utilityapi-demo:';
const ACTIVE_POINTER_KEY = 'ceip.utilityapi-demo.active';
const STALE_SESSION_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_SESSIONS = 4;

function sessionKey(sessionId: string) {
  return `${DEMO_PREFIX}${sessionId}`;
}

function getSessionStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    return null;
  }
  return null;
}

function isQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'QuotaExceededError'
    : error instanceof Error && /quota/i.test(error.message);
}

export function loadActiveUtilityApiDemoPointer(): UtilityApiDemoSessionPointer | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(ACTIVE_POINTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UtilityApiDemoSessionPointer;
    if (!parsed?.sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveUtilityApiDemoPointer(pointer: UtilityApiDemoSessionPointer) {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.setItem(ACTIVE_POINTER_KEY, JSON.stringify(pointer));
}

export function clearActiveUtilityApiDemoPointer() {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.removeItem(ACTIVE_POINTER_KEY);
}

export async function loadUtilityApiDemoSession(sessionId: string): Promise<UtilityApiDemoSessionRecord | null> {
  const stored = await cache.getItem(sessionKey(sessionId));
  if (!stored || stored.length === 0) return null;
  return (stored[0] as UtilityApiDemoSessionRecord) ?? null;
}

export async function saveUtilityApiDemoSession(session: UtilityApiDemoSessionRecord): Promise<{ quotaExceeded: boolean }> {
  try {
    await cache.setItem(sessionKey(session.sessionId), [session]);
    saveActiveUtilityApiDemoPointer({
      sessionId: session.sessionId,
      mode: session.mode,
      status: session.status,
    });
    await pruneUtilityApiDemoSessions();
    return { quotaExceeded: false };
  } catch (error) {
    if (isQuotaExceeded(error)) {
      saveActiveUtilityApiDemoPointer({
        sessionId: session.sessionId,
        mode: session.mode,
        status: session.status,
      });
      return { quotaExceeded: true };
    }
    throw error;
  }
}

export async function deleteUtilityApiDemoSession(sessionId: string) {
  await cache.deleteItem(sessionKey(sessionId));
  const active = loadActiveUtilityApiDemoPointer();
  if (active?.sessionId === sessionId) {
    clearActiveUtilityApiDemoPointer();
  }
}

export async function clearAllUtilityApiDemoSessions() {
  const keys = await cache.keys();
  const matches = keys.filter((key) => key.startsWith(DEMO_PREFIX));
  await Promise.all(matches.map((key) => cache.deleteItem(key)));
  clearActiveUtilityApiDemoPointer();
}

export async function pruneUtilityApiDemoSessions() {
  const keys = await cache.keys();
  const demoKeys = keys.filter((key) => key.startsWith(DEMO_PREFIX));
  const records = await Promise.all(demoKeys.map(async (key) => {
    const stored = await cache.getItem(key);
    const record = (stored?.[0] as UtilityApiDemoSessionRecord | undefined) ?? null;
    return { key, record };
  }));

  const now = Date.now();
  const staleKeys = records
    .filter(({ record }) => !record || now - Date.parse(record.updatedAt) > STALE_SESSION_MS)
    .map(({ key }) => key);
  await Promise.all(staleKeys.map((key) => cache.deleteItem(key)));

  const freshRecords = records
    .filter(({ key }) => !staleKeys.includes(key))
    .filter(({ record }) => Boolean(record))
    .sort((left, right) => Date.parse(right.record!.updatedAt) - Date.parse(left.record!.updatedAt));

  const overflow = freshRecords.slice(MAX_SESSIONS);
  if (overflow.length > 0) {
    await Promise.all(overflow.map(({ key }) => cache.deleteItem(key)));
  }
}
