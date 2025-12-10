import React, { useEffect, useState } from 'react';
import { ProtectedRoute, useAuth } from './auth';
import { Key, Plus, Copy, Trash2, Loader, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { getEdgeBaseUrl } from '../lib/config';

interface ApiKey {
  id: string;
  label: string;
  created_at: string;
  is_active: boolean;
  expires_at: string | null;
  usage_count: number;
}

function ApiKeysPageContent() {
  const { user, isWhopUser, tier } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const baseUrl = getEdgeBaseUrl();

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    // API keys require Team tier with Whop
    if (!user || tier !== 'team') {
      setLoading(false);
      setError('API key management requires Team tier. Upgrade via Whop to access this feature.');
      return;
    }

    if (!baseUrl) {
      setLoading(false);
      setError('API endpoint not configured. Please contact support.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For Whop users, we'll need to use Whop API for key management
      // This is a placeholder - actual implementation requires Whop API integration
      setError('API key management is being migrated to Whop. Please check back soon or contact support.');
      setKeys([]);
    } catch (err) {
      console.error('Error loading API keys', err);
      setError('Network error loading API keys');
    }

    setLoading(false);
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();

    if (!user || tier !== 'team') {
      setError('API key creation requires Team tier. Upgrade via Whop to access this feature.');
      return;
    }

    if (!baseUrl) {
      setError('API endpoint not configured.');
      return;
    }

    setCreating(true);
    setError(null);
    setNewSecret(null);

    // Placeholder - Whop integration needed
    setError('API key creation is being migrated to Whop. Please contact support.');
    setCreating(false);
  }

  function handleCopySecret() {
    if (!newSecret) return;
    navigator.clipboard.writeText(newSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-700/80 p-3 rounded-xl">
              <Key className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">API Keys</h1>
              <p className="text-emerald-100 text-sm mt-1">
                Manage your API keys for programmatic access to Canada Energy data.
              </p>
            </div>
          </div>
          <a
            href="/profile"
            className="text-emerald-100 hover:text-white transition-colors text-sm font-medium"
          >
            ← Back to Profile
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Create Key Form */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Create New API Key</h2>
          </div>
          <form onSubmit={handleCreateKey} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-1">Key Label</label>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Production Server, Research Project"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {creating && <Loader className="h-4 w-4 animate-spin" />}
              <span>{creating ? 'Creating...' : 'Create Key'}</span>
            </button>
          </form>

          {error && (
            <div className="mt-4 flex items-center text-sm text-amber-300">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>{error}</span>
            </div>
          )}

          {newSecret && (
            <div className="mt-4 p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-emerald-300">Your new API key (copy it now!):</span>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-emerald-400 hover:text-emerald-200 text-xs"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-emerald-200 text-xs font-mono break-all">
                  {showSecret ? newSecret : '••••••••••••••••••••••••••••••••'}
                </code>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                This key will not be shown again. Store it securely.
              </p>
            </div>
          )}
        </div>

        {/* Key List */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Your API Keys</h2>
          </div>

          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader className="h-6 w-6 text-emerald-400 animate-spin" />
            </div>
          ) : keys.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-sm">
              No API keys yet. Create one above to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left text-slate-300">
                <thead className="border-b border-slate-700 text-slate-400">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Label</th>
                    <th className="py-2 pr-4 font-medium">Created</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Usage</th>
                    <th className="py-2 pr-4 font-medium">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map(key => (
                    <tr key={key.id} className="border-b border-slate-800 last:border-0">
                      <td className="py-2 pr-4 font-medium text-slate-100">{key.label}</td>
                      <td className="py-2 pr-4">
                        {new Date(key.created_at).toLocaleDateString('en-CA')}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${key.is_active ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'
                          }`}>
                          {key.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{key.usage_count.toLocaleString()} requests</td>
                      <td className="py-2 pr-4">
                        {key.expires_at
                          ? new Date(key.expires_at).toLocaleDateString('en-CA')
                          : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Usage Info */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Rate Limits & Tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="text-2xl font-bold text-white mb-1">Free</div>
              <div className="text-slate-400 mb-2">100 requests/day</div>
              <div className="text-emerald-400 font-medium">$0/month</div>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg border border-cyan-700">
              <div className="text-2xl font-bold text-cyan-400 mb-1">Developer</div>
              <div className="text-slate-400 mb-2">1,000 requests/day</div>
              <div className="text-cyan-400 font-medium">$49/month</div>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg border border-purple-700">
              <div className="text-2xl font-bold text-purple-400 mb-1">Professional</div>
              <div className="text-slate-400 mb-2">10,000 requests/day</div>
              <div className="text-purple-400 font-medium">$199/month</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Need higher limits? <a href="/contact" className="text-emerald-400 hover:underline">Contact us</a> for Enterprise pricing.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ApiKeysPage() {
  return (
    <ProtectedRoute requiredTier="free">
      <ApiKeysPageContent />
    </ProtectedRoute>
  );
}
