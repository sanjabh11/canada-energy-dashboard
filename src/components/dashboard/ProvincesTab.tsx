/**
 * ProvincesTab - Provincial data streams view
 * Extracted from EnergyDataDashboard.tsx for code splitting
 */
import React from 'react';
import { Radio, Wifi, Signal, Gauge, MapPin, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { type ConnectionStatus } from '../../lib/dataManager';

interface ProvincesTabProps {
  connectionStatuses: ConnectionStatus[];
  onNavigate: (tab: string) => void;
}

export function ProvincesTab({ connectionStatuses, onNavigate }: ProvincesTabProps) {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-md">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0, 217, 255, 0.1)' }}>
                <Radio className="h-6 w-6 text-electric" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary">Provincial Data Streams</h1>
                <p className="text-secondary mt-1">Live data from Canadian energy providers</p>
              </div>
            </div>
            <span className="badge badge-success flex items-center gap-2">
              <Signal className="h-4 w-4 animate-pulse" />
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* Live Streaming Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Connection Status */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title flex items-center">
              <Wifi className="h-5 w-5 mr-3 text-electric" />
              Live Connection Status
            </h2>
          </div>
          <div className="card-body space-y-4">
            {connectionStatuses.map((status, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${status.status === 'connected' ? 'bg-success/20' :
                    status.status === 'connecting' ? 'bg-electric/20 animate-pulse' :
                      'bg-tertiary/20'
                    }`}>
                    {status.status === 'connected' ?
                      <CheckCircle className="h-4 w-4 text-success" /> :
                      status.status === 'connecting' ?
                        <Clock className="h-4 w-4 text-electric" /> :
                        <AlertCircle className="h-4 w-4 text-tertiary" />
                    }
                  </div>
                  <div>
                    <div className="font-semibold text-primary">{status.dataset}</div>
                    <div className={`text-sm font-medium ${status.status === 'connected' ? 'text-success' :
                      status.status === 'connecting' ? 'text-electric' :
                        'text-tertiary'
                      }`}>
                      {status.status === 'connected' ? 'LIVE STREAM ACTIVE' :
                        status.status === 'connecting' ? 'CONNECTING TO STREAM' :
                          'STREAM OFFLINE'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-electric">
                    {status.recordCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-tertiary">records streaming</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Streaming Metrics */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title flex items-center">
              <Gauge className="h-5 w-5 mr-3 text-electric" />
              Streaming Metrics
            </h2>
          </div>
          <div className="card-body space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary p-4 rounded-lg">
                <div className="text-2xl font-bold text-electric">
                  {connectionStatuses.filter(s => s.status === 'connected').length}/{connectionStatuses.length}
                </div>
                <div className="text-sm text-tertiary">Active Streams</div>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <div className="text-2xl font-bold text-success">
                  {connectionStatuses.reduce((sum, s) => sum + s.recordCount, 0).toLocaleString()}
                </div>
                <div className="text-sm text-tertiary">Total Records</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-secondary">Stream Health</span>
                <span className="text-sm font-bold text-success">98.2% Uptime</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: '98.2%' }}></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-secondary">Data Throughput</span>
                <span className="text-sm font-bold text-electric">1.2K records/min</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-electric h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Provincial Data Sources Map */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title flex items-center">
            <MapPin className="h-5 w-5 mr-3 text-electric" />
            Canadian Energy Data Sources
          </h2>
        </div>
        <div className="card-body">
          <div className="grid-responsive-auto">
            {[
              { province: 'Ontario', source: 'IESO', status: 'connected', datasets: 2 },
              { province: 'Quebec', source: 'Hydro-Québec', status: 'connected', datasets: 1 },
              { province: 'British Columbia', source: 'BC Hydro', status: 'connecting', datasets: 1 },
              { province: 'Alberta', source: 'AESO', status: 'connected', datasets: 1 },
              { province: 'Manitoba', source: 'Manitoba Hydro', status: 'connecting', datasets: 1 },
              { province: 'Saskatchewan', source: 'SaskPower', status: 'connected', datasets: 1 }
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-3 p-4 bg-secondary rounded-lg">
                <div className={`w-3 h-3 rounded-full ${item.status === 'connected' ? 'bg-success' : 'bg-electric animate-pulse'
                  }`}></div>
                <div className="flex-1">
                  <div className="font-semibold text-primary">{item.province}</div>
                  <div className="text-sm text-tertiary">{item.source} • {item.datasets} datasets</div>
                </div>
                <span className={`badge ${item.status === 'connected' ? 'badge-success' : 'badge-info'
                  }`}>
                  {item.status === 'connected' ? 'LIVE' : 'CONNECTING'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Data Stream Visualization */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="card-title flex items-center">
              <Signal className="h-5 w-5 mr-3 text-electric" />
              Live Data Stream
            </h2>
            <div className="flex items-center space-x-2 text-sm text-tertiary">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span>Updating every 30 seconds</span>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="text-center py-8">
            <div className="inline-flex items-center space-x-2 bg-secondary px-6 py-3 rounded-full">
              <Radio className="h-5 w-5 text-electric animate-pulse" />
              <span className="font-medium text-primary">Real-time data streaming from {connectionStatuses.filter(s => s.status === 'connected').length} active sources</span>
            </div>
            <p className="mt-4 text-secondary">Switch to Dashboard tab to interact with live streaming data visualizations</p>
            <button
              onClick={() => onNavigate('Dashboard')}
              className="mt-4 btn btn-primary"
            >
              View Live Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
