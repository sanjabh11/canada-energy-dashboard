import React, { useState } from 'react';
import { Book, Code, Zap, Globe, ChevronDown, ChevronRight, Copy, Check, ExternalLink } from 'lucide-react';

interface Endpoint {
  method: 'GET' | 'POST';
  path: string;
  name: string;
  description: string;
  category: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  response?: string;
}

const API_ENDPOINTS: Endpoint[] = [
  // Analytics
  { method: 'GET', path: '/api-v2-analytics-national-overview', name: 'National Overview', description: 'Get national energy statistics and key metrics', category: 'Analytics' },
  { method: 'GET', path: '/api-v2-analytics-provincial-metrics', name: 'Provincial Metrics', description: 'Provincial energy generation and consumption data', category: 'Analytics' },
  { method: 'GET', path: '/api-v2-analytics-trends', name: 'Energy Trends', description: 'Historical trends and forecasts', category: 'Analytics' },
  
  // Grid Operations
  { method: 'GET', path: '/api-v2-grid-status', name: 'Grid Status', description: 'Real-time grid status across provinces', category: 'Grid Operations' },
  { method: 'GET', path: '/api-v2-grid-stability-metrics', name: 'Grid Stability', description: 'Stability metrics and reliability indicators', category: 'Grid Operations' },
  { method: 'GET', path: '/api-v2-grid-optimization-recommendations', name: 'Grid Optimization', description: 'AI-powered grid optimization recommendations', category: 'Grid Operations' },
  { method: 'GET', path: '/api-v2-grid-regions', name: 'Grid Regions', description: 'Regional grid infrastructure data', category: 'Grid Operations' },
  
  // Market Data
  { method: 'GET', path: '/api-v2-ieso-queue', name: 'IESO Queue', description: 'Ontario IESO connection queue and projects', category: 'Market Data' },
  { method: 'GET', path: '/api-v2-aeso-queue', name: 'AESO Queue', description: 'Alberta AESO connection queue and projects', category: 'Market Data' },
  { method: 'GET', path: '/api-v2-capacity-market', name: 'Capacity Market', description: 'Capacity market data and auctions', category: 'Market Data' },
  { method: 'GET', path: '/api-v2-cross-border-trade', name: 'Cross-Border Trade', description: 'Canada-US electricity trade data', category: 'Market Data' },
  
  // Renewables & Clean Energy
  { method: 'GET', path: '/api-v2-renewable-forecast', name: 'Renewable Forecast', description: 'Solar and wind generation forecasts', category: 'Renewables' },
  { method: 'GET', path: '/api-v2-curtailment-reduction', name: 'Curtailment Analysis', description: 'Renewable curtailment data and reduction strategies', category: 'Renewables' },
  { method: 'GET', path: '/api-v2-hydrogen-hub', name: 'Hydrogen Hub', description: 'Hydrogen production and infrastructure data', category: 'Renewables' },
  { method: 'GET', path: '/api-v2-heat-pump-programs', name: 'Heat Pump Programs', description: 'Provincial heat pump incentive programs', category: 'Renewables' },
  
  // Indigenous Energy
  { method: 'GET', path: '/api-v2-indigenous-projects', name: 'Indigenous Projects', description: 'Indigenous-led energy projects database', category: 'Indigenous Energy' },
  { method: 'GET', path: '/api-v2-indigenous-territories', name: 'Indigenous Territories', description: 'Traditional territory mapping data', category: 'Indigenous Energy' },
  { method: 'GET', path: '/api-v2-indigenous-consultations', name: 'Consultations', description: 'Consultation status and FPIC tracking', category: 'Indigenous Energy' },
  { method: 'GET', path: '/api-v2-indigenous-tek', name: 'Traditional Knowledge', description: 'Traditional ecological knowledge integration', category: 'Indigenous Energy' },
  { method: 'GET', path: '/api-v2-indigenous-reporting', name: 'Indigenous Reporting', description: 'Funder reporting and impact metrics', category: 'Indigenous Energy' },
  
  // Carbon & Climate
  { method: 'GET', path: '/api-v2-carbon-emissions', name: 'Carbon Emissions', description: 'Emissions data by sector and province', category: 'Carbon & Climate' },
  { method: 'GET', path: '/api-v2-ccus-projects', name: 'CCUS Projects', description: 'Carbon capture and storage projects', category: 'Carbon & Climate' },
  { method: 'GET', path: '/api-v2-climate-policy', name: 'Climate Policy', description: 'Provincial and federal climate policies', category: 'Carbon & Climate' },
  
  // Investment & Finance
  { method: 'GET', path: '/api-v2-investment-project-analysis', name: 'Project Analysis', description: 'Investment project feasibility analysis', category: 'Investment' },
  { method: 'GET', path: '/api-v2-investment-portfolio-optimization', name: 'Portfolio Optimization', description: 'Energy portfolio optimization tools', category: 'Investment' },
  { method: 'GET', path: '/api-v2-esg-finance', name: 'ESG Finance', description: 'ESG metrics and sustainable finance data', category: 'Investment' },
  
  // Industrial
  { method: 'GET', path: '/api-v2-industrial-decarb', name: 'Industrial Decarbonization', description: 'Industrial sector decarbonization data', category: 'Industrial' },
  { method: 'GET', path: '/api-v2-minerals-supply-chain', name: 'Critical Minerals', description: 'Critical minerals supply chain data', category: 'Industrial' },
  { method: 'GET', path: '/api-v2-ai-datacentres', name: 'AI Data Centres', description: 'Data centre energy demand and locations', category: 'Industrial' },
  
  // Resilience
  { method: 'GET', path: '/api-v2-resilience-assets', name: 'Resilience Assets', description: 'Grid resilience infrastructure', category: 'Resilience' },
  { method: 'GET', path: '/api-v2-resilience-hazards', name: 'Climate Hazards', description: 'Climate hazard mapping for energy infrastructure', category: 'Resilience' },
  { method: 'GET', path: '/api-v2-resilience-vulnerability-map', name: 'Vulnerability Map', description: 'Infrastructure vulnerability assessment', category: 'Resilience' },
  { method: 'GET', path: '/api-v2-resilience-adaptation-plan', name: 'Adaptation Plans', description: 'Climate adaptation planning data', category: 'Resilience' },
  
  // Innovation
  { method: 'GET', path: '/api-v2-innovation-technology-readiness', name: 'Technology Readiness', description: 'Clean energy technology readiness levels', category: 'Innovation' },
  { method: 'GET', path: '/api-v2-innovation-market-opportunities', name: 'Market Opportunities', description: 'Emerging clean energy market opportunities', category: 'Innovation' },
  
  // Compliance
  { method: 'GET', path: '/api-v2-cer-compliance', name: 'CER Compliance', description: 'Canada Energy Regulator compliance data', category: 'Compliance' },
  
  // EV & Transport
  { method: 'GET', path: '/api-v2-ev-charging', name: 'EV Charging', description: 'EV charging infrastructure data', category: 'Transport' },
];

const CATEGORIES = [...new Set(API_ENDPOINTS.map(e => e.category))];

export function ApiDocsPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Analytics');
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  function handleCopyEndpoint(path: string) {
    const fullUrl = `https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedEndpoint(path);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-700/80 p-3 rounded-xl">
              <Book className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">API Documentation</h1>
              <p className="text-blue-100 text-sm mt-1">
                Access Canada's most comprehensive energy intelligence data via REST API.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-6">
            <a
              href="/api-keys"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-semibold transition-colors"
            >
              <Zap className="h-4 w-4" />
              Get API Key
            </a>
            <a
              href="/"
              className="text-blue-200 hover:text-white text-sm font-medium"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Quick Start */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Code className="h-5 w-5 text-cyan-400" />
            Quick Start
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">1. Get your API key</h3>
              <p className="text-sm text-slate-400">
                Create an API key from the <a href="/api-keys" className="text-cyan-400 hover:underline">API Keys page</a>.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">2. Make your first request</h3>
              <pre className="bg-slate-900 p-4 rounded-lg text-xs text-emerald-300 overflow-x-auto">
{`curl -X GET \\
  'https://YOUR_PROJECT.supabase.co/functions/v1/api-v2-analytics-national-overview' \\
  -H 'apikey: YOUR_API_KEY' \\
  -H 'Content-Type: application/json'`}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">3. Parse the response</h3>
              <pre className="bg-slate-900 p-4 rounded-lg text-xs text-cyan-300 overflow-x-auto">
{`{
  "data": {
    "total_generation_mw": 145230,
    "renewable_percent": 67.4,
    "emissions_mt_co2": 42.1,
    ...
  },
  "meta": { "timestamp": "2025-11-28T06:00:00Z" }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Endpoint Catalog */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyan-400" />
            Endpoint Catalog ({API_ENDPOINTS.length} endpoints)
          </h2>

          <div className="space-y-2">
            {CATEGORIES.map(category => {
              const endpoints = API_ENDPOINTS.filter(e => e.category === category);
              const isExpanded = expandedCategory === category;

              return (
                <div key={category} className="border border-slate-700 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isExpanded ? null : category)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-850 text-left"
                  >
                    <span className="font-semibold text-white">{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{endpoints.length} endpoints</span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-slate-800">
                      {endpoints.map(endpoint => (
                        <div key={endpoint.path} className="px-4 py-3 bg-slate-850">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900 text-emerald-300">
                                  {endpoint.method}
                                </span>
                                <code className="text-xs text-cyan-300 font-mono">{endpoint.path}</code>
                              </div>
                              <div className="text-sm font-medium text-white">{endpoint.name}</div>
                              <div className="text-xs text-slate-400 mt-1">{endpoint.description}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyEndpoint(endpoint.path)}
                              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs flex items-center gap-1"
                            >
                              {copiedEndpoint === endpoint.path ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rate Limits */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6 mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Rate Limits</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="text-lg font-bold text-white mb-1">Free</div>
              <div className="text-slate-400">100 req/day</div>
              <div className="text-emerald-400 font-medium mt-2">$0</div>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg border border-cyan-700">
              <div className="text-lg font-bold text-cyan-400 mb-1">Developer</div>
              <div className="text-slate-400">1,000 req/day</div>
              <div className="text-cyan-400 font-medium mt-2">$49/mo</div>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg border border-purple-700">
              <div className="text-lg font-bold text-purple-400 mb-1">Professional</div>
              <div className="text-slate-400">10,000 req/day</div>
              <div className="text-purple-400 font-medium mt-2">$199/mo</div>
            </div>
            <div className="p-4 bg-slate-900 rounded-lg border border-amber-700">
              <div className="text-lg font-bold text-amber-400 mb-1">Enterprise</div>
              <div className="text-slate-400">Unlimited</div>
              <div className="text-amber-400 font-medium mt-2">Custom</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
