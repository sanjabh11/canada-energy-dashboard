import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getEdgeBaseUrl } from '../lib/config';

interface ApiKeySummary {
  id: string;
  label: string | null;
  created_at: string;
  is_active: boolean;
  expires_at: string | null;
  usage_count: number | null;
}

export function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  useEffect(() => {
    void loadKeys();
  }, []);

  async function loadKeys() {
    try {
      setLoadingKeys(true);
      setError(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData?.session;
      if (!session) {
        setError('You need to be signed in to manage API keys.');
        setKeys([]);
        return;
      }

      const base = getEdgeBaseUrl();
      if (!base) {
        setError('Edge functions are not configured (missing SUPABASE_URL).');
        return;
      }

      const res = await fetch(`${base}/api-keys-admin`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message || body?.error || 'Failed to load API keys.');
        setKeys([]);
        return;
      }

      const body = await res.json();
      setKeys(Array.isArray(body.keys) ? body.keys : []);
    } catch (err: any) {
      console.error('Failed to load API keys', err);
      setError('Failed to load API keys.');
    } finally {
      setLoadingKeys(false);
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;

    try {
      setCreating(true);
      setError(null);
      setNewSecret(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData?.session;
      if (!session) {
        setError('You need to be signed in to create API keys.');
        return;
      }

      const base = getEdgeBaseUrl();
      if (!base) {
        setError('Edge functions are not configured (missing SUPABASE_URL).');
        return;
      }

      const res = await fetch(`${base}/api-keys-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ label: newLabel }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message || body?.error || 'Failed to create API key.');
        return;
      }

      const body = await res.json();
      const created: ApiKeySummary | null = body?.key ?? null;
      const secret: string | null = body?.secret ?? null;

      if (created) {
        setKeys((prev) => [created, ...prev]);
      }
      if (secret) {
        setNewSecret(secret);
      }
      setNewLabel('');
    } catch (err: any) {
      console.error('Failed to create API key', err);
      setError('Failed to create API key.');
    } finally {
      setCreating(false);
    }
  }
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings & Integrations</h1>
            <p className="text-slate-300 text-sm mt-1">Manage account settings and explore API access options.</p>
          </div>
          <a
            href="/"
            className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-6">
            <h2 className="text-lg font-semibold mb-2">API Access & Keys</h2>
            <p className="text-slate-300 text-sm mb-4">
              The ESG Finance and Industrial Decarbonization APIs are live and protected by API keys and
              basic rate limiting. You can start by using your project anon key for prototypes, or create
              dedicated keys for sponsors and external consumers.
            </p>
            <p className="text-slate-300 text-sm mb-4">
              For detailed parameters, examples, and authentication details, see the developer docs in{' '}
              <a
                href="https://github.com/sanjabh11/canada-energy-dashboard/blob/main/docs/api-esg-industrial.md"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
              >
                <code className="px-1 py-0.5 bg-slate-900 rounded">docs/api-esg-industrial.md</code>
              </a>{' '}
              inside this repository.
            </p>

            <div className="mt-4 border-t border-slate-700 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">My API Keys</h3>
                <button
                  onClick={loadKeys}
                  className="text-xs text-slate-300 hover:text-white underline-offset-2 hover:underline"
                  disabled={loadingKeys}
                >
                  {loadingKeys ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-950/40 border border-red-700 rounded-md p-2">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateKey} className="space-y-2">
                <label className="block text-xs text-slate-300 mb-1">Label</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Dunsky pilot, ICE partner"
                    className="flex-1 rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-3 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating…' : 'Create Key'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Keys are scoped to your user account via <code className="px-1 py-0.5 bg-slate-900 rounded">created_by</code>.
                </p>
              </form>

              {newSecret && (
                <div className="mt-3 text-xs text-amber-300 bg-amber-950/40 border border-amber-700 rounded-md p-2">
                  <div className="font-semibold mb-1">New key created</div>
                  <div className="font-mono break-all text-[11px]">
                    {newSecret}
                  </div>
                  <div className="mt-1">
                    This secret is shown only once. Store it securely in your environment variables or secret manager.
                  </div>
                </div>
              )}

              <div className="mt-3 max-h-40 overflow-y-auto border border-slate-700/80 rounded-md">
                <table className="w-full text-xs text-slate-200">
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left">Label</th>
                      <th className="px-3 py-2 text-left">Created</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingKeys && keys.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-center text-slate-400">
                          Loading keys…
                        </td>
                      </tr>
                    ) : keys.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-center text-slate-500">
                          No keys yet. Create one above to start integrating.
                        </td>
                      </tr>
                    ) : (
                      keys.map((k) => (
                        <tr key={k.id} className="border-t border-slate-800/80">
                          <td className="px-3 py-2 align-top">
                            {k.label || 'Untitled key'}
                          </td>
                          <td className="px-3 py-2 align-top text-slate-400">
                            {new Date(k.created_at).toLocaleDateString('en-CA')}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <span
                              className={
                                k.is_active
                                  ? 'inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200'
                                  : 'inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-300'
                              }
                            >
                              {k.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top text-right text-slate-400">
                            {k.usage_count ?? 0}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-6">
            <h2 className="text-lg font-semibold mb-2">Account & Preferences</h2>
            <p className="text-slate-300 text-sm mb-4">
              Core account details, subscription status, and AI usage are managed on your Profile page today.
              This Settings area is reserved for future organization-level controls and deeper integrations.
            </p>
            <a
              href="/profile"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium text-white transition-colors"
            >
              Open Profile
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

export default SettingsPage;
