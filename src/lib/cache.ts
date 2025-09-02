// Minimal IndexedDB cache helper with safe fallbacks
// Stores dataset arrays by dataset key.

export type CacheValue = any[];

class MemoryFallback {
  private store = new Map<string, CacheValue>();
  async getItem(key: string): Promise<CacheValue | undefined> { return this.store.get(key); }
  async setItem(key: string, value: CacheValue): Promise<void> { this.store.set(key, value); }
  async deleteItem(key: string): Promise<void> { this.store.delete(key); }
  async clear(): Promise<void> { this.store.clear(); }
  async keys(): Promise<string[]> { return Array.from(this.store.keys()); }
}

const DB_NAME = 'energy-cache';
const STORE_NAME = 'datasets';
const DB_VERSION = 1;

function hasIndexedDB(): boolean {
  try { return typeof indexedDB !== 'undefined'; } catch { return false; }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    tx.oncomplete = () => resolve(result as T);
    tx.onerror = () => reject(tx.error);
    let result: unknown;
    (async () => {
      try {
        result = await fn(store);
      } catch (e) {
        reject(e);
      }
    })();
  });
}

class IDBCache {
  async getItem(key: string): Promise<CacheValue | undefined> {
    return withStore('readonly', (store) => new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as CacheValue | undefined);
      req.onerror = () => reject(req.error);
    }));
  }

  async setItem(key: string, value: CacheValue): Promise<void> {
    return withStore('readwrite', (store) => new Promise((resolve, reject) => {
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }

  async deleteItem(key: string): Promise<void> {
    return withStore('readwrite', (store) => new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }

  async clear(): Promise<void> {
    return withStore('readwrite', (store) => new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }

  async keys(): Promise<string[]> {
    return withStore('readonly', (store) => new Promise((resolve, reject) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
      req.onerror = () => reject(req.error);
    }));
  }
}

export const cache = hasIndexedDB() ? new IDBCache() : new MemoryFallback();
