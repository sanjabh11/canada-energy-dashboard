/**
 * HomeTab - Landing page content for the Energy Data Dashboard
 * Extracted from EnergyDataDashboard.tsx for code splitting
 */
import React from 'react';
import { Database, CheckCircle, Clock, AlertCircle, MapPin, Gauge, TrendingUp, BarChart3 } from 'lucide-react';
import { DATASETS, type ConnectionStatus } from '../../lib/dataManager';

interface HomeTabProps {
  connectionStatuses: ConnectionStatus[];
  onNavigate: (tab: string) => void;
  t: any;
}

export function HomeTab({ connectionStatuses, onNavigate, t }: HomeTabProps) {
  return (
    <div className="space-y-12 -mt-8">
      {/* Simplified Hero Section */}
      <section
        className="hero-section hero-section--full -mx-8 lg:-mx-16"
        aria-labelledby="home-hero-title"
      >
        <div className="hero-content text-center">
          <h1 id="home-hero-title" className="hero-title">
            {t.home.heroTitle}
          </h1>
          <p className="hero-subtitle max-w-3xl mx-auto">
            {t.home.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-md justify-center mt-6">
            <button
              onClick={() => onNavigate('Dashboard')}
              className="btn btn-primary btn-lg"
            >
              {t.home.ctaExploreDashboard}
            </button>
            <button
              onClick={() => onNavigate('Analytics')}
              className="btn btn-secondary btn-lg"
            >
              {t.home.ctaViewAnalytics}
            </button>
          </div>
        </div>
      </section>

      {/* Quick Insights Grid */}
      <div className="grid-responsive-cards px-4">
        {DATASETS.map((dataset, index) => {
          const status = connectionStatuses.find(s => s.dataset === dataset.name);
          return (
            <div
              key={dataset.key}
              className="card"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${dataset.color}20`, color: dataset.color }}
                  >
                    <Database className="h-6 w-6" />
                  </div>
                  <div
                    className={`badge ${status?.status === 'connected'
                      ? 'badge-success'
                      : status?.status === 'connecting'
                        ? 'badge-info'
                        : 'badge-warning'
                      }`}
                  >
                    {status?.status === 'connected' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : status?.status === 'connecting' ? (
                      <Clock className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    <span>
                      {status?.status === 'connected'
                        ? 'Live'
                        : status?.status === 'connecting'
                          ? 'Connecting'
                          : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <h3 className="card-title mb-1">{dataset.name}</h3>
                <p className="card-description mb-3">{dataset.description}</p>
                <div className="metric-value text-electric">
                  {status?.recordCount.toLocaleString() || '0'} records
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key CTA Section */}
      <div className="card text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="card-title mb-4">Ready for Deeper Insights?</h2>
          <p className="text-secondary mb-6">
            Explore advanced analytics, scenario modeling, and AI-powered recommendations to optimize your energy strategy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('Analytics')}
              className="btn btn-primary"
            >
              View Analytics
            </button>
            <button
              onClick={() => onNavigate('Dashboard')}
              className="btn btn-secondary"
            >
              Live Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Map/Chart Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provincial Overview */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <MapPin className="h-6 w-6 mr-3 text-electric" />
              Provincial Overview
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              {[
                { province: 'Ontario', status: 'LIVE', tone: 'success' },
                { province: 'Quebec', status: 'LIVE', tone: 'success' },
                { province: 'Alberta', status: 'LIVE', tone: 'success' },
                { province: 'BC', status: 'CONNECTING', tone: 'info' }
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                >
                  <span className="font-medium text-primary">{item.province}</span>
                  <span
                    className={`text-xs font-medium ${item.tone === 'success' ? 'text-success' : 'text-electric'
                      }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('Provinces')}
              className="w-full mt-4 btn btn-secondary btn-sm"
            >
              View All Provinces
            </button>
          </div>
        </div>

        {/* Energy Mix Preview */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <Gauge className="h-6 w-6 mr-3 text-electric" />
              Energy Mix
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-tertiary">Renewable</span>
                <span className="text-sm font-medium text-success">67%</span>
              </div>
              <div className="w-full rounded-full h-2 bg-secondary">
                <div
                  className="h-2 rounded-full"
                  style={{ width: '67%', backgroundColor: 'var(--color-success)' }}
                ></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-tertiary">Traditional</span>
                <span className="text-sm font-medium text-secondary">33%</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('Analytics')}
              className="w-full mt-4 btn btn-secondary btn-sm"
            >
              View Detailed Trends
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
