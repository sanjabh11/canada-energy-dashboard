import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';
const BASE_ORIGIN = new URL(BASE_URL).origin;
const SESSION_FILE = process.env.UTILITYAPI_DEMO_OPERATOR_SESSION_FILE || '/tmp/utilityapi-demo-operator-session.json';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnymbecjgeaoxsfphrti.supabase.co';
const EDGE_BASE = (process.env.VITE_SUPABASE_EDGE_BASE || SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co')).replace(/\/$/, '');
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

function getStorageKey(url: string): string {
  const projectRef = new URL(url).host.split('.')[0];
  return `sb-${projectRef}-auth-token`;
}

test.describe('UtilityAPI demo live-origin CORS', () => {
  test('accepts authenticated browser fetches from http://127.0.0.1:4175', async ({ page }) => {
    test.skip(BASE_ORIGIN !== 'http://127.0.0.1:4175', 'This smoke test is pinned to the real 127.0.0.1 live-origin path.');
    test.skip(!ANON_KEY, 'VITE_SUPABASE_ANON_KEY is required to exercise the live browser fetch path.');
    test.skip(!fs.existsSync(SESSION_FILE), `Operator session file missing: ${SESSION_FILE}`);

    const session = JSON.parse(await fsPromises.readFile(SESSION_FILE, 'utf8'));
    const sessionMain = { ...session };
    delete sessionMain.user;
    const storageKey = getStorageKey(SUPABASE_URL);

    await page.addInitScript(({ seededStorageKey, seededSession, seededUser }) => {
      localStorage.setItem(seededStorageKey, JSON.stringify(seededSession));
      localStorage.setItem(`${seededStorageKey}-user`, JSON.stringify({ user: seededUser }));
    }, {
      seededStorageKey: storageKey,
      seededSession: sessionMain,
      seededUser: session.user,
    });

    await page.goto(`${BASE_URL}/utilityapi-demo`);
    await expect(page.getByText('Operator session active for')).toContainText('contact@igniteitserve.com');

    const responsePromise = page.waitForResponse((response) =>
      response.url() === `${EDGE_BASE}/utilityapi-demo`
      && response.request().method() === 'POST'
      && response.request().postData() === JSON.stringify({ action: 'poll_demo' }),
    );

    const result = await page.evaluate(async ({ edgeBase, anonKey, sessionStorageKey }) => {
      const raw = localStorage.getItem(sessionStorageKey);
      if (!raw) {
        return { error: 'missing_operator_session' };
      }

      const operatorSession = JSON.parse(raw) as { access_token?: string };
      try {
        const response = await fetch(`${edgeBase}/utilityapi-demo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${operatorSession.access_token ?? ''}`,
          },
          body: JSON.stringify({ action: 'poll_demo' }),
        });

        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          body = null;
        }

        return {
          status: response.status,
          body,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }, {
      edgeBase: EDGE_BASE,
      anonKey: ANON_KEY,
      sessionStorageKey: storageKey,
    });

    const response = await responsePromise;

    expect(result).not.toHaveProperty('error');
    expect(result.status).toBe(400);
    expect(response.headers()['access-control-allow-origin']).toBe(BASE_ORIGIN);
    expect(result.body).toMatchObject({
      error: 'referral or authorization_uid is required.',
    });
  });
});
