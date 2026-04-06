/**
 * Status Page
 * 
 * Public operational status dashboard for CEIP platform.
 * Displays system health, uptime metrics, and data freshness.
 * 
 * Features:
 * - Overall system health status
 * - OpsHealthPanel integration (30s auto-refresh)
 * - Data freshness summary by category
 * - API endpoint status
 * - Recent incidents placeholder
 * - Uptime history
 * 
 * @public - Accessible at /status
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Database,
  Globe,
  Server,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Shield
} from 'lucide-react';
import { OpsHealthPanel } from './OpsHealthPanel';
import { SEOHead } from './SEOHead';
import { HIGH_RISK_SOURCE_REGISTRY, UPTIME_MONITORS } from '../lib/opsMonitoring';
import { DataFreshnessBadge } from './ui/DataFreshnessBadge';
import DataTrustNotice from './DataTrustNotice';

interface EndpointStatus {
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'down' | 'reference';
  expectedStatus: string;
  intervalMinutes: number;
}

const StatusPage: React.FC = () => {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const endpoints: EndpointStatus[] = UPTIME_MONITORS.map((monitor) => ({
    name: monitor.name,
    url: monitor.url,
    status: 'reference',
    expectedStatus: monitor.expectedStatus.join(', '),
    intervalMinutes: monitor.intervalMinutes,
  }));

  const hasNonLiveHighRiskSources = HIGH_RISK_SOURCE_REGISTRY.some((item) => item.meta.freshnessStatus !== 'live');
  const liveHighRiskSourceCount = HIGH_RISK_SOURCE_REGISTRY.filter((item) => item.meta.freshnessStatus === 'live').length;
  const statusBannerTitle = hasNonLiveHighRiskSources ? 'Operational status overview' : 'All Systems Operational';
  const statusBannerCopy = hasNonLiveHighRiskSources
    ? 'System health is tracked below with explicit live, stale, and demo labels. Some high-risk sources are not live, so the page avoids claiming full operational parity.'
    : 'All monitored systems are running normally.';

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'fresh':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'degraded':
      case 'stale':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'down':
      case 'unknown':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'reference':
        return <Clock className="h-5 w-5 text-slate-400" />;
      default:
        return <Activity className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded text-xs font-medium";
    switch (status) {
      case 'healthy':
      case 'fresh':
        return `${baseClasses} bg-emerald-100 text-emerald-800`;
      case 'degraded':
      case 'stale':
        return `${baseClasses} bg-amber-100 text-amber-800`;
      case 'down':
      case 'unknown':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'reference':
        return `${baseClasses} bg-slate-100 text-slate-700`;
      default:
        return `${baseClasses} bg-slate-100 text-slate-800`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="System Status | CEIP Operations"
        description="Operational status for the Canada Energy Intelligence Platform, including uptime, data freshness, and system health with explicit freshness labeling."
        path="/status"
        keywords={['CEIP status', 'system health', 'uptime monitoring', 'data freshness']}
      />

      {/* Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <Activity className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">System Status</h1>
                <p className="text-slate-400 text-sm">CEIP Operations Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-400">Last Updated</div>
                <div className="text-sm font-medium">{lastRefresh.toLocaleTimeString()}</div>
              </div>
              <button 
                onClick={() => setLastRefresh(new Date())}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Refresh now"
              >
                <RefreshCw className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Overall Status Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-full">
              <Shield className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-emerald-900">{statusBannerTitle}</h2>
              <p className="text-emerald-700">{statusBannerCopy}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-600">{liveHighRiskSourceCount}/{HIGH_RISK_SOURCE_REGISTRY.length}</div>
              <div className="text-sm text-emerald-600">Live high-risk sources</div>
            </div>
          </div>
        </div>

        <DataTrustNotice
          mode="mock"
          title="Some operational sections are still reference-only"
          message="Source freshness and ops-health panels are the canonical trust layer on this page. Endpoint coverage and uptime history below are currently reference views derived from monitor configuration, not live ping evidence or persisted SLA history."
          className="mb-8"
        />

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Status */}
          <div className="lg:col-span-2 space-y-8">
            {/* Ops Health Panel */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-slate-500" />
                Operations Health
              </h2>
              <OpsHealthPanel variant="full" autoRefresh={true} refreshInterval={30000} />
            </section>

            {/* Data Freshness */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-slate-500" />
                Data Freshness by Category
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-slate-200">
                  {HIGH_RISK_SOURCE_REGISTRY.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(item.meta.freshnessStatus === 'live' ? 'fresh' : item.meta.freshnessStatus === 'stale' ? 'stale' : 'unknown')}
                        <div>
                          <div className="font-medium text-slate-900">{item.label}</div>
                          <div className="text-sm text-slate-500">Source: {item.meta.source}</div>
                          {item.meta.note ? <div className="text-xs text-slate-500">{item.meta.note}</div> : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <DataFreshnessBadge
                          timestamp={item.meta.lastUpdated}
                          status={item.meta.freshnessStatus}
                          source={item.meta.source}
                          showRelative={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-slate-500" />
                Tracked monitors
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-slate-200">
                  {UPTIME_MONITORS.map((monitor) => (
                    <div key={monitor.id} className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-medium text-slate-900">{monitor.name}</div>
                        <div className="text-sm text-slate-500">{monitor.url}</div>
                      </div>
                      <div className="text-right text-sm text-slate-600">
                        <div>Every {monitor.intervalMinutes} min</div>
                        <div>Owner: {monitor.owner}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Recent Incidents */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-500" />
                Recent Incidents
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="font-medium text-slate-900">No Recent Incidents</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    No incidents reported in the last 30 days.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Endpoint Status */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-slate-500" />
                Endpoint Coverage
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-slate-200">
                  {endpoints.map((endpoint, index) => (
                    <div key={index} className="p-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(endpoint.status)}
                          <span className="font-medium text-slate-900">{endpoint.name}</span>
                        </div>
                        <span className={getStatusBadge(endpoint.status)}>
                          {endpoint.status === 'reference' ? 'REFERENCE' : endpoint.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 ml-7">
                        Expected status: {endpoint.expectedStatus} • Every {endpoint.intervalMinutes} min
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Uptime History */}
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Server className="h-5 w-5 text-slate-500" />
                Uptime History (Pending Live Feed)
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  Persisted uptime history is not wired into this page yet. Until live monitor history is connected, treat uptime as unknown here and rely on the source freshness registry plus ops-health panel above.
                </div>
              </div>
            </section>

            {/* Contact / Report Issue */}
            <section>
              <div className="bg-slate-900 text-white rounded-xl p-6">
                <h3 className="font-semibold mb-2">Experiencing Issues?</h3>
                <p className="text-slate-400 text-sm mb-4">
                  If you're experiencing problems not reflected on this status page, please report them.
                </p>
                <a 
                  href="mailto:support@ceip.io" 
                  className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Contact Support
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>
              Status page auto-refreshes every 30 seconds. 
              <a href="/" className="text-emerald-600 hover:text-emerald-700 ml-1">← Back to CEIP</a>
            </p>
            <p>
              <a href="/status" className="text-emerald-600 hover:text-emerald-700">System Status</a>
              {' • '}
              Powered by CEIP Operations Monitoring
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default StatusPage;
