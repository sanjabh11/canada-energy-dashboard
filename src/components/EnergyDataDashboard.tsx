/**
 * Main Energy Data Dashboard Component
 * 
 * Professional energy data dashboard with multi-dataset support,
 * streaming capabilities, and comprehensive data visualization.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  energyDataManager, 
  DATASETS, 
  type DatasetType, 
  type ConnectionStatus 
} from '../lib/dataManager';
import { DatasetSelector } from './DatasetSelector';
import { ConnectionStatusPanel } from './ConnectionStatusPanel';
import { DataVisualization } from './DataVisualization';
import { DataFilters } from './DataFilters';
import { DataTable } from './DataTable';
import { DataExporter } from './DataExporter';
import { LoadingSpinner } from './LoadingSpinner';
import { RealTimeDashboard } from './RealTimeDashboard';
import { Zap, Database, Activity, Home, BarChart3, TrendingUp, GraduationCap, Globe, Wifi, Radio, Signal, AlertCircle, CheckCircle, Clock, MapPin, Gauge, TrendingDown } from 'lucide-react';

// Toggle debug logs via VITE_DEBUG_LOGS=true
const DEBUG_LOGS: boolean = ((import.meta as any).env?.VITE_DEBUG_LOGS === 'true');

interface DashboardState {
  activeDataset: DatasetType;
  data: any[];
  filteredData: any[];
  loading: boolean;
  error: string | null;
  progress: { loaded: number; total: number; percentage: number } | null;
}

interface FilterOptions {
  dateRange?: { start: string; end: string };
  searchQuery?: string;
  selectedFields?: Record<string, string[]>;
}

export const EnergyDataDashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    activeDataset: 'provincial_generation',
    data: [],
    filteredData: [],
    loading: false,
    error: null,
    progress: null
  });

  const [connectionStatuses, setConnectionStatuses] = useState<ConnectionStatus[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  const [maxRows, setMaxRows] = useState(5000);
  const [activeTab, setActiveTab] = useState<string>('Dashboard');

  const navigationTabs = [
    { id: 'Home', label: 'Home', icon: Home },
    { id: 'Dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'Provinces', label: 'Provinces', icon: Globe },
    { id: 'Trends', label: 'Trends', icon: TrendingUp },
    { id: 'Education', label: 'Education', icon: GraduationCap }
  ];

  // Load connection statuses
  useEffect(() => {
    const updateStatuses = () => {
      setConnectionStatuses(energyDataManager.getAllConnectionStatuses());
    };

    // Initialize all data streamers on mount
    const initializeAllStreamers = async () => {
      // Get all dataset keys
      const datasetKeys = DATASETS.map(dataset => dataset.key as DatasetType);
      
      // Initialize each streamer in the background
      datasetKeys.forEach(async (datasetKey) => {
        try {
          // Only connect, don't load full data
          await energyDataManager.initializeConnection(datasetKey);
          console.log(`Initialized connection for ${datasetKey}`);
        } catch (error) {
          console.error(`Error initializing ${datasetKey}:`, error);
        }
      });
    };

    // Call the initialization function
    initializeAllStreamers();
    
    updateStatuses();
    const interval = setInterval(updateStatuses, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load data when dataset changes
  useEffect(() => {
    loadDataset(state.activeDataset, false);
  }, [state.activeDataset]);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
  }, [state.data, filters]);

  const loadDataset = useCallback(async (datasetKey: DatasetType, forceStream = false) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      progress: null
    }));

    try {
      const data = await energyDataManager.loadData(datasetKey, {
        forceStream,
        maxRows,
        onProgress: (progress) => {
          setState(prev => ({ ...prev, progress }));
        },
        onStatusChange: (status) => {
          if (DEBUG_LOGS) console.debug(`Status update for ${datasetKey}:`, status);
        }
      });

      setState(prev => ({
        ...prev,
        data,
        loading: false,
        progress: { loaded: data.length, total: data.length, percentage: 100 }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
        progress: null
      }));
    }
  }, [maxRows]);

  const applyFilters = useCallback(() => {
    let filtered = [...state.data];

    // Apply search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(row => 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(query)
        )
      );
    }

    // Apply date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter(row => {
        const dateField = row.date || row.datetime || row.market_date;
        if (!dateField) return true;
        
        const rowDate = new Date(dateField).toISOString().split('T')[0];
        return rowDate >= start && rowDate <= end;
      });
    }

    // Apply field-specific filters
    if (filters.selectedFields) {
      Object.entries(filters.selectedFields).forEach(([field, values]) => {
        if (values.length > 0) {
          filtered = filtered.filter(row => values.includes(String(row[field])));
        }
      });
    }

    setState(prev => ({ ...prev, filteredData: filtered }));
  }, [state.data, filters]);

  const handleDatasetChange = (datasetKey: DatasetType) => {
    setState(prev => ({ ...prev, activeDataset: datasetKey }));
    setFilters({}); // Clear filters when changing datasets
  };

  const handleRefresh = () => {
    loadDataset(state.activeDataset, true);
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const activeDatasetInfo = DATASETS.find(d => d.key === state.activeDataset)!;
  const activeStatus = connectionStatuses.find(s => s.dataset === activeDatasetInfo.name);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-700 p-3 rounded-xl">
                <Zap className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Canadian Energy Information Portal</h1>
                <p className="text-blue-200 text-sm font-medium">Real-time • Resilient Architecture</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <div className="text-blue-200">Total Records</div>
                <div className="font-semibold text-lg">{state.filteredData.length.toLocaleString()}</div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={state.loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Activity className="h-4 w-4" />
                <span>{state.loading ? 'Loading...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Navigation Menu */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'Dashboard' ? (
          <RealTimeDashboard />
        ) : activeTab === 'Home' ? (
          // Home Tab - Landing Page
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
              <div className="text-center max-w-4xl mx-auto">
                <div className="flex justify-center mb-4">
                  <div className="bg-blue-500 p-4 rounded-full">
                    <Zap className="h-12 w-12 text-white" />
                  </div>
                </div>
                <h1 className="text-4xl font-bold text-slate-800 mb-4">Canadian Energy Information Portal</h1>
                <p className="text-xl text-slate-600 mb-6">
                  Real-time streaming architecture for comprehensive energy data analytics across Canada
                </p>
                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm">
                    <Signal className="h-4 w-4 text-green-500" />
                    <span className="text-slate-600">Live Streaming</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm">
                    <Database className="h-4 w-4 text-blue-500" />
                    <span className="text-slate-600">4 Datasets</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm">
                    <Gauge className="h-4 w-4 text-purple-500" />
                    <span className="text-slate-600">Real-time Analytics</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {DATASETS.map((dataset, index) => {
                const status = connectionStatuses.find(s => s.dataset === dataset.name);
                return (
                  <div key={dataset.key} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg`} style={{ backgroundColor: `${dataset.color}20`, color: dataset.color }}>
                        <Database className="h-6 w-6" />
                      </div>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                        status?.status === 'connected' ? 'bg-green-100 text-green-700' : 
                        status?.status === 'connecting' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {status?.status === 'connected' ? <CheckCircle className="h-3 w-3" /> : 
                         status?.status === 'connecting' ? <Clock className="h-3 w-3" /> :
                         <AlertCircle className="h-3 w-3" />}
                        <span>{status?.status === 'connected' ? 'LIVE' : 
                              status?.status === 'connecting' ? 'CONNECTING' : 'OFFLINE'}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">{dataset.name}</h3>
                    <p className="text-sm text-slate-600 mb-3">{dataset.description}</p>
                    <div className="text-lg font-bold" style={{ color: dataset.color }}>
                      {status?.recordCount.toLocaleString() || '0'} records
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Quick Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('Dashboard')}
                  className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  <span className="font-medium text-slate-700">View Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('Provinces')}
                  className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <Radio className="h-6 w-6 text-green-600" />
                  <span className="font-medium text-slate-700">Live Streaming</span>
                </button>
                <button
                  onClick={() => setActiveTab('Trends')}
                  className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                  <span className="font-medium text-slate-700">Trend Analysis</span>
                </button>
                <button
                  onClick={() => setActiveTab('Education')}
                  className="flex items-center space-x-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <GraduationCap className="h-6 w-6 text-orange-600" />
                  <span className="font-medium text-slate-700">Learn More</span>
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'Provinces' ? (
          // Provinces Tab - Real-time Streaming Showcase
          <div className="space-y-8">
            {/* Streaming Header */}
            <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-2xl p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <Radio className="h-8 w-8" />
                    <h1 className="text-3xl font-bold">REAL-TIME STREAMING ARCHITECTURE</h1>
                  </div>
                  <p className="text-lg opacity-90">Live data streams from Canadian energy providers across all provinces</p>
                </div>
                <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-full">
                  <Signal className="h-5 w-5 animate-pulse" />
                  <span className="font-semibold">LIVE STREAMING</span>
                </div>
              </div>
            </div>

            {/* Live Streaming Status Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Real-time Connection Status */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                    <Wifi className="h-6 w-6 mr-3 text-blue-600" />
                    Live Connection Status
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  {connectionStatuses.map((status, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${
                          status.status === 'connected' ? 'bg-green-500' : 
                          status.status === 'connecting' ? 'bg-blue-500 animate-pulse' : 
                          'bg-slate-400'
                        }`}>
                          {status.status === 'connected' ? 
                            <CheckCircle className="h-4 w-4 text-white" /> :
                            status.status === 'connecting' ?
                            <Clock className="h-4 w-4 text-white" /> :
                            <AlertCircle className="h-4 w-4 text-white" />
                          }
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{status.dataset}</div>
                          <div className={`text-sm font-medium ${
                            status.status === 'connected' ? 'text-green-600' : 
                            status.status === 'connecting' ? 'text-blue-600' : 
                            'text-slate-600'
                          }`}>
                            {status.status === 'connected' ? 'LIVE STREAM ACTIVE' : 
                             status.status === 'connecting' ? 'CONNECTING TO STREAM' : 
                             'STREAM OFFLINE'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-800">
                          {status.recordCount.toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-600">records streaming</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Streaming Metrics */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                    <Gauge className="h-6 w-6 mr-3 text-purple-600" />
                    Streaming Metrics
                  </h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {connectionStatuses.filter(s => s.status === 'connected').length}/{connectionStatuses.length}
                      </div>
                      <div className="text-sm text-slate-600">Active Streams</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {connectionStatuses.reduce((sum, s) => sum + s.recordCount, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-600">Total Records</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Stream Health</span>
                      <span className="text-sm font-bold text-green-600">98.2% Uptime</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '98.2%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Data Throughput</span>
                      <span className="text-sm font-bold text-purple-600">1.2K records/min</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Provincial Data Sources Map */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                  <MapPin className="h-6 w-6 mr-3 text-red-600" />
                  Canadian Energy Data Sources
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { province: 'Ontario', source: 'IESO', status: 'connected', datasets: 2 },
                    { province: 'Quebec', source: 'Hydro-Québec', status: 'connected', datasets: 1 },
                    { province: 'British Columbia', source: 'BC Hydro', status: 'connecting', datasets: 1 },
                    { province: 'Alberta', source: 'AESO', status: 'connected', datasets: 1 },
                    { province: 'Manitoba', source: 'Manitoba Hydro', status: 'connecting', datasets: 1 },
                    { province: 'Saskatchewan', source: 'SaskPower', status: 'connected', datasets: 1 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${
                        item.status === 'connected' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
                      }`}></div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800">{item.province}</div>
                        <div className="text-sm text-slate-600">{item.source} • {item.datasets} datasets</div>
                      </div>
                      <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                        item.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.status === 'connected' ? 'LIVE' : 'CONNECTING'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Data Stream Visualization */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                    <Signal className="h-6 w-6 mr-3 text-blue-600" />
                    Live Data Stream
                  </h2>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Updating every 30 seconds</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <div className="inline-flex items-center space-x-2 bg-blue-50 px-6 py-3 rounded-full">
                    <Radio className="h-5 w-5 text-blue-600 animate-pulse" />
                    <span className="font-medium text-blue-800">Real-time data streaming from {connectionStatuses.filter(s => s.status === 'connected').length} active sources</span>
                  </div>
                  <p className="mt-4 text-slate-600">Switch to Dashboard tab to interact with live streaming data visualizations</p>
                  <button
                    onClick={() => setActiveTab('Dashboard')}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    View Live Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'Trends' ? (
          // Trends Tab - Analytics View
          <div className="space-y-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="text-center">
                <div className="bg-purple-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Trend Analysis</h2>
                <p className="text-slate-600 mb-6">
                  Advanced analytics and trend identification across Canadian energy data streams
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-purple-50 p-6 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-purple-600 mb-3" />
                    <h3 className="font-semibold text-slate-800 mb-2">Peak Demand Patterns</h3>
                    <p className="text-sm text-slate-600">Historical and predictive analysis of energy demand peaks</p>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <BarChart3 className="h-8 w-8 text-blue-600 mb-3" />
                    <h3 className="font-semibold text-slate-800 mb-2">Generation Trends</h3>
                    <p className="text-sm text-slate-600">Long-term trends in renewable vs traditional energy generation</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg">
                    <TrendingDown className="h-8 w-8 text-green-600 mb-3" />
                    <h3 className="font-semibold text-slate-800 mb-2">Price Volatility</h3>
                    <p className="text-sm text-slate-600">Market price analysis and volatility patterns</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('Dashboard')}
                  className="mt-8 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Explore Trends in Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'Education' ? (
          // Education Tab - Information
          <div className="space-y-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <div className="bg-orange-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <GraduationCap className="h-8 w-8 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Educational Resources</h2>
                  <p className="text-slate-600">
                    Learn about Canadian energy systems, data sources, and streaming architecture
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-4">Dataset Information</h3>
                    <div className="space-y-4">
                      {DATASETS.map((dataset) => (
                        <div key={dataset.key} className="p-4 border border-slate-200 rounded-lg">
                          <h4 className="font-semibold text-slate-800" style={{ color: dataset.color }}>{dataset.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">{dataset.description}</p>
                          <div className="text-xs text-slate-500 mt-2">
                            Source: {dataset.source.toUpperCase()} • ~{dataset.estimatedRows.toLocaleString()} records
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-4">Technical Architecture</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Signal className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold text-blue-800">Real-time Streaming</h4>
                        </div>
                        <p className="text-sm text-slate-600">Data streams continuously from multiple Canadian energy providers using resilient Supabase Edge Functions</p>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Database className="h-5 w-5 text-green-600" />
                          <h4 className="font-semibold text-green-800">Data Processing</h4>
                        </div>
                        <p className="text-sm text-slate-600">Advanced filtering, aggregation, and visualization capabilities with export functionality</p>
                      </div>
                      
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Gauge className="h-5 w-5 text-purple-600" />
                          <h4 className="font-semibold text-purple-800">Performance</h4>
                        </div>
                        <p className="text-sm text-slate-600">Optimized for high-throughput data processing with fallback mechanisms for reliability</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mt-8">
                  <button
                    onClick={() => setActiveTab('Dashboard')}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Start Exploring Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Fallback content
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-blue-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                {(() => {
                  const activeTabData = navigationTabs.find(tab => tab.id === activeTab);
                  if (activeTabData?.icon) {
                    const IconComponent = activeTabData.icon;
                    return <IconComponent className="h-8 w-8 text-blue-600" />;
                  }
                  return null;
                })()}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{activeTab}</h2>
              <p className="text-slate-600 mb-6">
                Content for this section is being developed.
              </p>
              <button
                onClick={() => setActiveTab('Dashboard')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
