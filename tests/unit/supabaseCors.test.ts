import { afterEach, describe, expect, it } from 'vitest';
import { createCorsHeaders, getAllowedOrigins } from '../../supabase/functions/_shared/cors';

const originalDeno = (globalThis as typeof globalThis & { Deno?: { env: { get: (name: string) => string | undefined } } }).Deno;

function setCorsEnv(origins?: string) {
  (globalThis as typeof globalThis & { Deno?: { env: { get: (name: string) => string | undefined } } }).Deno = {
    env: {
      get(name: string) {
        if (name === 'CORS_ALLOWED_ORIGINS') {
          return origins;
        }
        return undefined;
      },
    },
  };
}

describe('shared Supabase CORS helper', () => {
  afterEach(() => {
    (globalThis as typeof globalThis & { Deno?: { env: { get: (name: string) => string | undefined } } }).Deno = originalDeno;
  });

  it('keeps built-in local origins when CORS_ALLOWED_ORIGINS is set', () => {
    setCorsEnv('https://app.example.com');

    const allowedOrigins = getAllowedOrigins();

    expect(allowedOrigins).toContain('https://app.example.com');
    expect(allowedOrigins).toContain('http://127.0.0.1:4175');
    expect(allowedOrigins).toContain('http://localhost:4175');
  });

  it('echoes the real local operator origin for utilityapi-demo requests', () => {
    setCorsEnv('https://app.example.com');

    const headers = createCorsHeaders(new Request('https://example.com/functions/v1/utilityapi-demo', {
      headers: {
        origin: 'http://127.0.0.1:4175',
      },
    }));

    expect(headers['Access-Control-Allow-Origin']).toBe('http://127.0.0.1:4175');
    expect(headers.Vary).toBe('Origin');
  });
});
