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
import { HelpButton } from './HelpButton';
import { DataTable } from './DataTable';
import { DataExporter } from './DataExporter';
import { LoadingSpinner } from './LoadingSpinner';
import { RealTimeDashboard } from './RealTimeDashboard';
import { InvestmentCards } from './InvestmentCards';
import { ResilienceMap } from './ResilienceMap';
import { InnovationSearch } from './InnovationSearch';
import { IndigenousDashboard } from './IndigenousDashboard';
import { StakeholderDashboard } from './StakeholderDashboard';
import GridOptimizationDashboard from './GridOptimizationDashboard';
import SecurityDashboard from './SecurityDashboard';
import { FeatureAvailability } from './FeatureAvailability';
import { Zap, Database, Activity, Home, BarChart3, TrendingUp, GraduationCap, Globe, Wifi, Radio, Signal, AlertCircle, CheckCircle, Clock, MapPin, Gauge, TrendingDown, Shield, Lock, Info, Sun, Wind, Battery, Server, Fuel, Package, Atom, Cable, Car, Thermometer, Factory, Leaf, Users } from 'lucide-react';
import { CONTAINER_CLASSES, TEXT_CLASSES, COLOR_SCHEMES, RESPONSIVE_UTILS } from '../lib/ui/layout';
import NavigationRibbon from './NavigationRibbon';
import FooterSettingsMenu from './FooterSettingsMenu';
import { isFeatureEnabled, getFeature, type FeatureStatus } from '../lib/featureFlags';
import HouseholdEnergyAdvisor from './HouseholdEnergyAdvisor';
import AnalyticsTrendsDashboard from './AnalyticsTrendsDashboard';
import RenewableOptimizationHub from './RenewableOptimizationHub';
import CurtailmentAnalyticsDashboard from './CurtailmentAnalyticsDashboard';
import StorageDispatchDashboard from './StorageDispatchDashboard';
import AIDataCentreDashboard from './AIDataCentreDashboard';
import HydrogenEconomyDashboard from './HydrogenEconomyDashboard';
import CriticalMineralsSupplyChainDashboard from './CriticalMineralsSupplyChainDashboard';
import SMRDeploymentDashboard from './SMRDeploymentDashboard';
import GridInterconnectionQueueDashboard from './GridInterconnectionQueueDashboard';
import CapacityMarketDashboard from './CapacityMarketDashboard';
import EVChargingDashboard from './EVChargingDashboard';
import VPPAggregationDashboard from './VPPAggregationDashboard';
import HeatPumpDashboard from './HeatPumpDashboard';
import CCUSProjectsDashboard from './CCUSProjectsDashboard';
import CarbonEmissionsDashboard from './CarbonEmissionsDashboard';
// Help ID mapping for each page/tab
const helpIdByTab: Record<string, string> = {
  Home: 'tab.home',
  Dashboard: 'dashboard.overview',
  HouseholdAdvisor: 'page.household-advisor',
  Provinces: 'page.provinces',
  Analytics: 'page.analytics',
  Trends: 'page.analytics', // Legacy support
  Investment: 'page.investment',
  Resilience: 'page.resilience',
  Innovation: 'page.innovation',
  Indigenous: 'page.indigenous',
  Stakeholders: 'page.stakeholders',
  GridOptimization: 'page.gridops',
  Security: 'page.security',
  Features: 'page.features',
  Education: 'page.education',
  RenewableOptimization: 'page.renewable-optimization',
  CurtailmentAnalytics: 'page.curtailment-analytics',
  StorageDispatch: 'page.storage-dispatch',
  AIDataCentres: 'page.ai-datacentres',
  HydrogenHub: 'page.hydrogen-hub',
  CriticalMinerals: 'page.critical-minerals',
  SMRDeployment: 'page.smr-deployment',
  GridQueue: 'page.grid-queue',
  CapacityMarket: 'page.capacity-market',
  EVCharging: 'page.ev-charging',
  VPPAggregation: 'page.vpp-aggregation',
  HeatPumps: 'page.heat-pumps',
  CCUSProjects: 'page.ccus-projects',
  CarbonDashboard: 'page.carbon-emissions'
};

// Toggle debug logs via VITE_DEBUG_LOGS=true
const DEBUG_LOGS: boolean = ((import.meta as any).env?.VITE_DEBUG_LOGS === 'true');

// Map tabs to feature IDs for feature flag checking
const tabToFeatureMap: Record<string, string> = {
  'Dashboard': 'energy_analytics',
  'Investment': 'investment_analysis',
  'Resilience': 'resilience_analysis',
  'Innovation': 'innovation_tracking',
  'Indigenous': 'indigenous_dashboard',
  'Stakeholders': 'stakeholder_coordination',
  'GridOptimization': 'grid_optimization',
  'Security': 'security_assessment',
  // Home, Provinces, Trends, Features always shown
};

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

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(query)
        )
      );
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter(row => {
        const dateField = row.date || row.datetime || row.market_date;
        if (!dateField) return true;

        const rowDate = new Date(dateField).toISOString().split('T')[0];
        return rowDate >= start && rowDate <= end;
      });
    }

    if (filters.selectedFields) {
      Object.entries(filters.selectedFields).forEach(([field, values]) => {
        if (values.length > 0) {
          filtered = filtered.filter(row => values.includes(String(row[field])));
        }
      });
    }

    setState(prev => ({ ...prev, filteredData: filtered }));
  }, [filters, state.data]);

  // Handle case where users might have 'Education' or 'Trends' tab saved or bookmarked
  useEffect(() => {
    if (activeTab === 'Education') {
      setActiveTab('Dashboard');
    }
    if (activeTab === 'Trends') {
      setActiveTab('Analytics');
    }
  }, [activeTab]);

  // Navigation tabs reorganized by monetization priority (Top 12 visible, rest in dropdown)
  // ⭐⭐⭐⭐⭐ = Premium (5-star), ⭐⭐⭐⭐ = Strong (4-star), ⭐⭐⭐ = Moderate (3-star)
  const coreNavigationTabs = [
    { id: 'Home', label: 'Home', icon: Home }, // Gateway
    { id: 'Dashboard', label: 'Dashboard', icon: BarChart3 }, // ⭐⭐⭐⭐⭐
    { id: 'AIDataCentres', label: 'AI Data Centres', icon: Server }, // ⭐⭐⭐⭐⭐
    { id: 'Analytics', label: 'Analytics & Trends', icon: TrendingUp }, // ⭐⭐⭐⭐⭐ PROMOTED
    { id: 'HydrogenHub', label: 'Hydrogen Hub', icon: Fuel }, // ⭐⭐⭐⭐⭐
    { id: 'CriticalMinerals', label: 'Critical Minerals', icon: Package }, // ⭐⭐⭐⭐⭐
    { id: 'EVCharging', label: 'EV Charging', icon: Car }, // ⭐⭐⭐⭐⭐ PROMOTED
    { id: 'CarbonDashboard', label: 'Carbon Emissions', icon: Leaf }, // ⭐⭐⭐⭐⭐ PROMOTED
    { id: 'CCUSProjects', label: 'CCUS Projects', icon: Factory }, // ⭐⭐⭐⭐⭐ PROMOTED
    { id: 'Investment', label: 'Investment', icon: TrendingUp }, // ⭐⭐⭐⭐⭐ PROMOTED
    { id: 'RenewableOptimization', label: 'Renewable Forecasts', icon: Sun }, // ⭐⭐⭐⭐ PROMOTED
    { id: 'HouseholdAdvisor', label: 'My Energy AI', icon: Home } // ⭐⭐⭐
  ];

  const moreNavigationTabs = [
    // 4-Star Features (Strong monetization)
    { id: 'StorageDispatch', label: 'Storage Dispatch', icon: Battery }, // ⭐⭐⭐⭐
    { id: 'SMRDeployment', label: 'SMR Tracker', icon: Atom }, // ⭐⭐⭐⭐
    { id: 'CapacityMarket', label: 'Capacity Market', icon: BarChart3 }, // ⭐⭐⭐⭐
    { id: 'VPPAggregation', label: 'VPP & DER', icon: Radio }, // ⭐⭐⭐⭐
    // 3-Star Features (Moderate monetization)
    { id: 'Provinces', label: 'Provinces', icon: Globe }, // ⭐⭐⭐
    { id: 'GridQueue', label: 'Grid Queue', icon: Cable }, // ⭐⭐⭐
    { id: 'HeatPumps', label: 'Heat Pumps', icon: Thermometer }, // ⭐⭐⭐
    { id: 'CurtailmentAnalytics', label: 'Curtailment Reduction', icon: Wind }, // ⭐⭐⭐
    { id: 'GridOptimization', label: 'Grid Ops', icon: Activity }, // ⭐⭐⭐
    // 2-Star Features (Limited monetization)
    { id: 'Resilience', label: 'Resilience', icon: Shield }, // ⭐⭐
    { id: 'Innovation', label: 'Innovation', icon: Zap } // ⭐⭐
    // Moved to Footer/Settings: Indigenous, Stakeholders, Security, Features
  ];

  // Footer Settings Items - Low-priority/admin features (2-star and below)
  const footerSettingsItems = [
    {
      id: 'Indigenous',
      label: 'Indigenous Energy',
      icon: Users,
      description: 'First Nations energy sovereignty and projects'
    },
    {
      id: 'Stakeholders',
      label: 'Stakeholders',
      icon: Users,
      description: 'Multi-party coordination and collaboration'
    },
    {
      id: 'Security',
      label: 'Security',
      icon: Lock,
      description: 'Cybersecurity monitoring and assessment'
    },
    {
      id: 'Features',
      label: 'Features',
      icon: Info,
      description: 'Feature availability and status'
    }
  ];

  // Add feature status badges and filter based on feature flags
  const navigationTabs = React.useMemo(() => {
    const allTabs = [...coreNavigationTabs, ...moreNavigationTabs];
    return allTabs.map(tab => {
      const featureId = tabToFeatureMap[tab.id];
      if (!featureId) return { ...tab, badge: null }; // Always show non-mapped tabs

      const feature = getFeature(featureId);
      if (!feature) return { ...tab, badge: null };

      // Add badge based on feature status
      let badge = null;
      if (feature.status === 'partial') {
        badge = 'Limited';
      } else if (feature.status === 'deferred') {
        badge = 'Soon';
      }

      return { ...tab, badge, status: feature.status };
    }).filter(tab => {
      // Hide features that are explicitly disabled (deferred features)
      const featureId = tabToFeatureMap[tab.id];
      if (featureId) {
        const feature = getFeature(featureId);
        // Only hide if feature exists and is explicitly disabled
        if (feature && !feature.enabled) {
          return false;
        }
      }
      return true;
    });
  }, []);

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
  }, [state.activeDataset, loadDataset]);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

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
    <div className="min-h-screen bg-slate-900">
      {/* Primary Navigation Header */}
      <header className="nav-header">
        <div className="nav-container">
          <a href="/" className="nav-logo flex items-center gap-sm">
            <Zap className="h-6 w-6 text-electric" />
            <span>Canada Energy Intelligence</span>
          </a>
          <ul className="nav-menu">
            <li>
              <a href="/about" className="nav-link">
                About
              </a>
            </li>
            <li>
              <a href="/contact" className="nav-link">
                Contact
              </a>
            </li>
            <li>
              <a
                href="https://docs.canada-energy.net"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
              >
                Documentation
              </a>
            </li>
          </ul>
          <div className="flex items-center gap-md">
            <div className="text-right">
              <div className="text-tertiary text-small">Total Records</div>
              <div className="metric-value text-electric">
                {state.filteredData.length.toLocaleString()}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={state.loading}
              className="btn btn-secondary btn-sm"
            >
              <Activity className="h-4 w-4" />
              <span>{state.loading ? 'Loading...' : 'Refresh'}</span>
            </button>
            <div className="ml-2">
              <HelpButton id={helpIdByTab[activeTab] ?? 'dashboard.overview'} />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Menu: sticky horizontal ribbon with dark theme */}
      <nav className="bg-secondary border-b border-[var(--border-subtle)] sticky-top">
        <div className={CONTAINER_CLASSES.page}>
          <NavigationRibbon
            tabs={navigationTabs.map(t => ({
              id: t.id,
              label: t.label,
              icon: t.icon,
              badge: t.badge
            }))}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />
        </div>
      </nav>

      <div className={CONTAINER_CLASSES.page}>
        {activeTab === 'Dashboard' ? (
          <RealTimeDashboard />
        ) : activeTab === 'HouseholdAdvisor' ? (
          <HouseholdEnergyAdvisor />
        ) : activeTab === 'Analytics' ? (
          <AnalyticsTrendsDashboard />
        ) : activeTab === 'Home' ? (
          // Home Tab - Simplified Landing Page with Clear CTAs
          <div className="space-y-12 -mt-8">
            {/* Simplified Hero Section */}
            <section className="hero-section -mx-8 lg:-mx-16">
              <div className="hero-content text-center">
                <h1 className="hero-title">
                  Canada Energy Intelligence Platform
                </h1>
                <p className="hero-subtitle max-w-3xl mx-auto">
                  Real-time monitoring and AI-powered insights for Canadian energy infrastructure.
                </p>
                <div className="flex flex-col sm:flex-row gap-md justify-center mt-6">
                  <button
                    onClick={() => setActiveTab('Dashboard')}
                    className="btn btn-primary btn-lg"
                  >
                    Explore Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('Analytics')}
                    className="btn btn-secondary btn-lg"
                  >
                    View Analytics
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
                          className={`badge ${
                            status?.status === 'connected'
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
                    onClick={() => setActiveTab('Analytics')}
                    className="btn btn-primary"
                  >
                    View Analytics
                  </button>
                  <button
                    onClick={() => setActiveTab('Dashboard')}
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
                          className={`text-xs font-medium ${
                            item.tone === 'success' ? 'text-success' : 'text-electric'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('Provinces')}
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
                    onClick={() => setActiveTab('Analytics')}
                    className="w-full mt-4 btn btn-secondary btn-sm"
                  >
                    View Detailed Trends
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'Provinces' ? (
          // Provinces Tab - Real-time Streaming with Dark Theme
          <div className="space-y-8">
            {/* Page Header */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-md">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{background: 'rgba(0, 217, 255, 0.1)'}}>
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
                        <div className={`p-2 rounded-full ${
                          status.status === 'connected' ? 'bg-success/20' : 
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
                          <div className={`text-sm font-medium ${
                            status.status === 'connected' ? 'text-success' : 
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
                      <div className={`w-3 h-3 rounded-full ${
                        item.status === 'connected' ? 'bg-success' : 'bg-electric animate-pulse'
                      }`}></div>
                      <div className="flex-1">
                        <div className="font-semibold text-primary">{item.province}</div>
                        <div className="text-sm text-tertiary">{item.source} • {item.datasets} datasets</div>
                      </div>
                      <span className={`badge ${
                        item.status === 'connected' ? 'badge-success' : 'badge-info'
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
                    onClick={() => setActiveTab('Dashboard')}
                    className="mt-4 btn btn-primary"
                  >
                    View Live Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'Trends' ? (
          // Trends Tab - Analytics View with Shader Effects
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/50">
              <div className="absolute inset-0 shader-bg-secondary animate-gradient-xy"></div>
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative z-10 p-8">
                <div className="text-center animate-fade-in">
                  <div className="glass-card p-6 rounded-full w-20 h-20 mx-auto mb-6 animate-float">
                    <TrendingUp className="h-10 w-10 text-white mx-auto" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">Trend Analysis</h2>
                  <p className="text-xl text-white/90 mb-8 animate-fade-in-delayed">
                    Advanced analytics and trend identification across Canadian energy data streams
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-fade-in-slow">
                    <div className="glass-card p-6 rounded-xl text-white">
                      <TrendingUp className="h-8 w-8 text-blue-300 mb-3" />
                      <h3 className="font-semibold mb-2">Peak Demand Patterns</h3>
                      <p className="text-sm text-white/80">Historical and predictive analysis of energy demand peaks</p>
                    </div>
                    <div className="glass-card p-6 rounded-xl text-white">
                      <BarChart3 className="h-8 w-8 text-green-300 mb-3" />
                      <h3 className="font-semibold mb-2">Generation Trends</h3>
                      <p className="text-sm text-white/80">Long-term trends in renewable vs traditional energy generation</p>
                    </div>
                    <div className="glass-card p-6 rounded-xl text-white">
                      <Gauge className="h-8 w-8 text-purple-300 mb-3" />
                      <h3 className="font-semibold mb-2">Price Volatility</h3>
                      <p className="text-sm text-white/80">Market price analysis and volatility patterns</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('Dashboard')}
                    className="mt-8 glass-card text-white px-6 py-3 rounded-lg font-medium transition-all hover:bg-white/20 animate-fade-in-slow"
                  >
                    Explore Trends in Dashboard
                  </button>
                </div>
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
          <>
            {/* Phase 2 Components */}
            {activeTab === 'Resilience' && (
              <div className="space-y-8">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/50">
                  <div className="absolute inset-0 shader-bg-accent animate-gradient-xy"></div>
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="relative z-10 p-8">
                    <div className="text-center animate-fade-in">
                      <div className="glass-card p-6 rounded-full w-20 h-20 mx-auto mb-6 animate-float">
                        <Shield className="h-10 w-10 text-white mx-auto" />
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-4">Infrastructure Resilience</h2>
                      <p className="text-xl text-white/90 mb-8 animate-fade-in-delayed">
                        Climate scenario modeling and vulnerability assessment for critical infrastructure
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-fade-in-slow">
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Shield className="h-8 w-8 text-red-300 mb-3" />
                          <h3 className="font-semibold mb-2">Risk Assessment</h3>
                          <p className="text-sm text-white/80">Advanced climate vulnerability analysis</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <MapPin className="h-8 w-8 text-blue-300 mb-3" />
                          <h3 className="font-semibold mb-2">Asset Mapping</h3>
                          <p className="text-sm text-white/80">Comprehensive infrastructure inventory</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Gauge className="h-8 w-8 text-green-300 mb-3" />
                          <h3 className="font-semibold mb-2">Scenario Planning</h3>
                          <p className="text-sm text-white/80">Future climate impact modeling</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <ResilienceMap />
              </div>
            )}

            {activeTab === 'Investment' && (
              <div className="space-y-8">
                <InvestmentCards />
              </div>
            )}

            {activeTab === 'Innovation' && (
              <div className="space-y-8">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/50">
                  <div className="absolute inset-0 shader-bg-primary animate-gradient-xy"></div>
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="relative z-10 p-8">
                    <div className="text-center animate-fade-in">
                      <div className="glass-card p-6 rounded-full w-20 h-20 mx-auto mb-6 animate-float">
                        <Zap className="h-10 w-10 text-white mx-auto" />
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-4">Innovation Hub</h2>
                      <p className="text-xl text-white/90 mb-8 animate-fade-in-delayed">
                        AI-powered research and technology innovation for sustainable energy solutions
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-fade-in-slow">
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Zap className="h-8 w-8 text-yellow-300 mb-3" />
                          <h3 className="font-semibold mb-2">Technology Search</h3>
                          <p className="text-sm text-white/80">Advanced patent and innovation discovery</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <TrendingUp className="h-8 w-8 text-green-300 mb-3" />
                          <h3 className="font-semibold mb-2">Market Analysis</h3>
                          <p className="text-sm text-white/80">Emerging technology market insights</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Gauge className="h-8 w-8 text-purple-300 mb-3" />
                          <h3 className="font-semibold mb-2">Feasibility Studies</h3>
                          <p className="text-sm text-white/80">Technical and economic viability assessment</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <InnovationSearch />
              </div>
            )}

            {/* Phase 3 Components */}
            {activeTab === 'Indigenous' && (
              <div className="space-y-8">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/50">
                  <div className="absolute inset-0 shader-bg-energy animate-gradient-xy"></div>
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="relative z-10 p-8">
                    <div className="text-center animate-fade-in">
                      <div className="glass-card p-6 rounded-full w-20 h-20 mx-auto mb-6 animate-float">
                        <Shield className="h-10 w-10 text-white mx-auto" />
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-4">Indigenous Energy Sovereignty</h2>
                      <p className="text-xl text-white/90 mb-8 animate-fade-in-delayed">
                        Respectful integration of Indigenous knowledge and governance in energy planning
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-fade-in-slow">
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Shield className="h-8 w-8 text-blue-300 mb-3" />
                          <h3 className="font-semibold mb-2">Traditional Knowledge</h3>
                          <p className="text-sm text-white/80">Integration of Indigenous ecological knowledge</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <MapPin className="h-8 w-8 text-green-300 mb-3" />
                          <h3 className="font-semibold mb-2">Territory Mapping</h3>
                          <p className="text-sm text-white/80">Traditional territory and consultation tracking</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Gauge className="h-8 w-8 text-orange-300 mb-3" />
                          <h3 className="font-semibold mb-2">FPIC Compliance</h3>
                          <p className="text-sm text-white/80">Free, Prior, Informed Consent workflows</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <IndigenousDashboard />
              </div>
            )}

            {activeTab === 'Stakeholders' && (
              <div className="space-y-8">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/50">
                  <div className="absolute inset-0 shader-bg-secondary animate-gradient-xy"></div>
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="relative z-10 p-8">
                    <div className="text-center animate-fade-in">
                      <div className="glass-card p-6 rounded-full w-20 h-20 mx-auto mb-6 animate-float">
                        <Zap className="h-10 w-10 text-white mx-auto" />
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-4">Stakeholder Coordination</h2>
                      <p className="text-xl text-white/90 mb-8 animate-fade-in-delayed">
                        Multi-stakeholder engagement and collaboration platform for energy projects
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-fade-in-slow">
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Zap className="h-8 w-8 text-purple-300 mb-3" />
                          <h3 className="font-semibold mb-2">Engagement Tracking</h3>
                          <p className="text-sm text-white/80">Comprehensive stakeholder communication logs</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <MapPin className="h-8 w-8 text-blue-300 mb-3" />
                          <h3 className="font-semibold mb-2">Impact Mapping</h3>
                          <p className="text-sm text-white/80">Geographic stakeholder impact analysis</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Gauge className="h-8 w-8 text-green-300 mb-3" />
                          <h3 className="font-semibold mb-2">Consensus Building</h3>
                          <p className="text-sm text-white/80">Collaborative decision-making support</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <StakeholderDashboard />
              </div>
            )}

            {/* Phase 4 Components */}
            {activeTab === 'GridOptimization' && (
              <div className="space-y-8">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/50">
                  <div className="absolute inset-0 shader-bg-primary animate-gradient-xy"></div>
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="relative z-10 p-8">
                    <div className="text-center animate-fade-in">
                      <div className="glass-card p-6 rounded-full w-20 h-20 mx-auto mb-6 animate-float">
                        <Activity className="h-10 w-10 text-white mx-auto" />
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-4">Grid Optimization</h2>
                      <p className="text-xl text-white/90 mb-8 animate-fade-in-delayed">
                        Advanced grid management and optimization for reliable energy distribution
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-fade-in-slow">
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Activity className="h-8 w-8 text-cyan-300 mb-3" />
                          <h3 className="font-semibold mb-2">Load Balancing</h3>
                          <p className="text-sm text-white/80">Real-time grid load optimization</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Gauge className="h-8 w-8 text-yellow-300 mb-3" />
                          <h3 className="font-semibold mb-2">Predictive Maintenance</h3>
                          <p className="text-sm text-white/80">AI-driven equipment health monitoring</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <TrendingUp className="h-8 w-8 text-green-300 mb-3" />
                          <h3 className="font-semibold mb-2">Efficiency Analytics</h3>
                          <p className="text-sm text-white/80">Performance optimization insights</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <GridOptimizationDashboard />
              </div>
            )}

            {activeTab === 'Security' && (
              <div className="space-y-8">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/50">
                  <div className="absolute inset-0 shader-bg-accent animate-gradient-xy"></div>
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="relative z-10 p-8">
                    <div className="text-center animate-fade-in">
                      <div className="glass-card p-6 rounded-full w-20 h-20 mx-auto mb-6 animate-float">
                        <Lock className="h-10 w-10 text-white mx-auto" />
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-4">Cybersecurity & Monitoring</h2>
                      <p className="text-xl text-white/90 mb-8 animate-fade-in-delayed">
                        Enterprise-grade security monitoring and threat detection for energy infrastructure
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-fade-in-slow">
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Shield className="h-8 w-8 text-red-300 mb-3" />
                          <h3 className="font-semibold mb-2">Threat Detection</h3>
                          <p className="text-sm text-white/80">Advanced cybersecurity monitoring</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Lock className="h-8 w-8 text-blue-300 mb-3" />
                          <h3 className="font-semibold mb-2">Access Control</h3>
                          <p className="text-sm text-white/80">Multi-factor authentication and authorization</p>
                        </div>
                        <div className="glass-card p-6 rounded-xl text-white">
                          <Activity className="h-8 w-8 text-green-300 mb-3" />
                          <h3 className="font-semibold mb-2">Incident Response</h3>
                          <p className="text-sm text-white/80">Automated security incident management</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <SecurityDashboard />
              </div>
            )}

            {/* Renewable Optimization Tab - Phase 1 */}
            {activeTab === 'RenewableOptimization' && (
              <RenewableOptimizationHub />
            )}

            {/* Curtailment Analytics Tab - Phase 2 */}
            {activeTab === 'CurtailmentAnalytics' && (
              <CurtailmentAnalyticsDashboard />
            )}

            {/* Storage Dispatch Tab - Phase 5 */}
            {activeTab === 'StorageDispatch' && (
              <StorageDispatchDashboard />
            )}

            {/* AI Data Centre Dashboard - Phase 1A (Strategic Priority) */}
            {activeTab === 'AIDataCentres' && (
              <AIDataCentreDashboard />
            )}

            {/* Hydrogen Economy Hub Dashboard - Phase 1A (Strategic Priority) */}
            {activeTab === 'HydrogenHub' && (
              <HydrogenEconomyDashboard />
            )}

            {/* Critical Minerals Supply Chain Dashboard - Phase 1A (Strategic Priority) */}
            {activeTab === 'CriticalMinerals' && (
              <CriticalMineralsSupplyChainDashboard />
            )}

            {/* SMR Deployment Dashboard - Phase 2 Gap Analysis */}
            {activeTab === 'SMRDeployment' && (
              <SMRDeploymentDashboard />
            )}

            {/* Grid Interconnection Queue Dashboard - Phase 2 Gap Analysis */}
            {activeTab === 'GridQueue' && (
              <GridInterconnectionQueueDashboard />
            )}

            {/* Capacity Market Dashboard - Phase 2 Gap Analysis */}
            {activeTab === 'CapacityMarket' && (
              <CapacityMarketDashboard />
            )}

            {/* EV Charging Infrastructure Dashboard - Phase 2 Gap Analysis */}
            {activeTab === 'EVCharging' && (
              <EVChargingDashboard />
            )}

            {/* VPP Aggregation Dashboard - Phase 2 Gap Analysis */}
            {activeTab === 'VPPAggregation' && (
              <VPPAggregationDashboard />
            )}

            {/* Heat Pump Deployment Dashboard - Phase 2 Gap Analysis */}
            {activeTab === 'HeatPumps' && (
              <HeatPumpDashboard />
            )}

            {/* CCUS Projects Dashboard - Phase 8 */}
            {activeTab === 'CCUSProjects' && (
              <CCUSProjectsDashboard />
            )}

            {/* Carbon Emissions Dashboard - Phase 8 */}
            {activeTab === 'CarbonDashboard' && (
              <CarbonEmissionsDashboard />
            )}

            {/* Features Tab */}
            {activeTab === 'Features' && (
              <FeatureAvailability />
            )}

            {/* Fallback for undefined tabs */}
            {!['Dashboard', 'Home', 'Provinces', 'Trends', 'Investment', 'Resilience', 'Innovation', 'Indigenous', 'Stakeholders', 'GridOptimization', 'Security', 'Features', 'Education', 'RenewableOptimization', 'CurtailmentAnalytics', 'StorageDispatch', 'Analytics', 'HouseholdAdvisor', 'AIDataCentres', 'HydrogenHub', 'CriticalMinerals', 'SMRDeployment', 'GridQueue', 'CapacityMarket', 'EVCharging', 'VPPAggregation', 'HeatPumps', 'CCUSProjects', 'CarbonDashboard'].includes(activeTab) && (
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
          </>
        )}
      </div>

      {/* Footer Settings Menu - Low-priority/admin features */}
      <FooterSettingsMenu
        items={footerSettingsItems}
        activeItem={footerSettingsItems.some(item => item.id === activeTab) ? activeTab : undefined}
        onSelect={setActiveTab}
      />
    </div>
  );
};
