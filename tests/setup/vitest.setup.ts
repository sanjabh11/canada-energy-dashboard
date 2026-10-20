import WebSocket from 'ws';

// jsdom under Vitest 4 exposes localStorage as a bare object without the
// Storage API; install a functional in-memory Storage so DOM tests work.
if (
  typeof localStorage === 'undefined' ||
  typeof localStorage.clear !== 'function'
) {
  class MemoryStorage implements Storage {
    private data = new Map<string, string>();
    get length() { return this.data.size; }
    clear() { this.data.clear(); }
    getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null; }
    key(index: number) { return [...this.data.keys()][index] ?? null; }
    removeItem(key: string) { this.data.delete(key); }
    setItem(key: string, value: string) { this.data.set(key, String(value)); }
  }
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
  }
}

if (typeof globalThis.WebSocket === 'undefined') {
  Object.defineProperty(globalThis, 'WebSocket', {
    value: WebSocket,
    configurable: true,
  });
}
