/**
 * Main Energy Data Dashboard Component
 * 
 * Professional energy data dashboard with multi-dataset support,
 * streaming capabilities, and comprehensive data visualization.
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
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
import { AuthButton } from './auth';
import { DataTable } from './DataTable';
import { DataExporter } from './DataExporter';
import { LoadingSpinner } from './LoadingSpinner';
import { RealTimeDashboard } from './RealTimeDashboard';
import { MiniLoadingSpinner } from './LoadingSpinner';
import DataTrustNotice from './DataTrustNotice';

// Lazy-loaded tab components — only the active tab's code is fetched
const InvestmentCards = React.lazy(() => import('./InvestmentCards').then(m => ({ default: m.InvestmentCards })));
const ResilienceMap = React.lazy(() => import('./ResilienceMap').then(m => ({ default: m.ResilienceMap })));
const InnovationSearch = React.lazy(() => import('./InnovationSearch').then(m => ({ default: m.InnovationSearch })));
const IndigenousDashboard = React.lazy(() => import('./IndigenousDashboard'));
const StakeholderDashboard = React.lazy(() => import('./StakeholderDashboard').then(m => ({ default: m.StakeholderDashboard })));
const GridOptimizationDashboard = React.lazy(() => import('./GridOptimizationDashboard'));
const SecurityDashboard = React.lazy(() => import('./SecurityDashboard'));
const FeatureAvailability = React.lazy(() => import('./FeatureAvailability').then(m => ({ default: m.FeatureAvailability })));
import { Zap, Database, Activity, Home, BarChart3, TrendingUp, GraduationCap, Globe, Wifi, Radio, Signal, AlertCircle, CheckCircle, Clock, MapPin, Gauge, TrendingDown, Shield, Lock, Info, Sun, Wind, Battery, Server, Fuel, Package, Atom, Cable, Car, Thermometer, Factory, Leaf, Users, Cpu, Scale, DollarSign, Snowflake, Recycle, AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { CONTAINER_CLASSES, TEXT_CLASSES, COLOR_SCHEMES, RESPONSIVE_UTILS } from '../lib/ui/layout';
import NavigationRibbon from './NavigationRibbon';
import FooterSettingsMenu from './FooterSettingsMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ui/ThemeToggle';
import { isFeatureEnabled, getFeature, type FeatureStatus } from '../lib/featureFlags';
import { getRecordCountFact } from '../lib/platformFacts';
const HouseholdEnergyAdvisor = React.lazy(() => import('./HouseholdEnergyAdvisor'));
const AnalyticsTrendsDashboard = React.lazy(() => import('./AnalyticsTrendsDashboard'));
const RenewableOptimizationHub = React.lazy(() => import('./RenewableOptimizationHub'));
const CurtailmentAnalyticsDashboard = React.lazy(() => import('./CurtailmentAnalyticsDashboard'));
const StorageDispatchDashboard = React.lazy(() => import('./StorageDispatchDashboard'));
const AIDataCentreDashboard = React.lazy(() => import('./AIDataCentreDashboard'));
const HydrogenEconomyDashboard = React.lazy(() => import('./HydrogenEconomyDashboard'));
const CriticalMineralsSupplyChainDashboard = React.lazy(() => import('./CriticalMineralsSupplyChainDashboard'));
const SMRDeploymentDashboard = React.lazy(() => import('./SMRDeploymentDashboard'));
const GridInterconnectionQueueDashboard = React.lazy(() => import('./GridInterconnectionQueueDashboard'));
const CapacityMarketDashboard = React.lazy(() => import('./CapacityMarketDashboard'));
const EVChargingDashboard = React.lazy(() => import('./EVChargingDashboard'));
const VPPAggregationDashboard = React.lazy(() => import('./VPPAggregationDashboard'));
const HeatPumpDashboard = React.lazy(() => import('./HeatPumpDashboard'));
const CCUSProjectsDashboard = React.lazy(() => import('./CCUSProjectsDashboard'));
const CarbonEmissionsDashboard = React.lazy(() => import('./CarbonEmissionsDashboard'));
const DigitalTwinDashboard = React.lazy(() => import('./DigitalTwinDashboard'));
const CanadianClimatePolicyDashboard = React.lazy(() => import('./CanadianClimatePolicyDashboard'));
const ESGFinanceDashboard = React.lazy(() => import('./ESGFinanceDashboard'));
const IndustrialDecarbDashboard = React.lazy(() => import('./IndustrialDecarbDashboard'));
const ArcticEnergySecurityMonitor = React.lazy(() => import('./ArcticEnergySecurityMonitor'));
import { useTranslation } from '../lib/i18n';
const ImpactMetricsDashboard = React.lazy(() => import('./ImpactMetricsDashboard').then(m => ({ default: m.ImpactMetricsDashboard })));
const CrisisScenarioSimulator = React.lazy(() => import('./CrisisScenarioSimulator').then(m => ({ default: m.CrisisScenarioSimulator })));
import { SEOHead, SEO_CONFIGS } from './SEOHead';
import { HomeTab, ProvincesTab, TabHero } from './dashboard';
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
  CarbonDashboard: 'page.carbon-emissions',
  ESGFinance: 'page.esg-finance',
  DigitalTwin: 'page.digital-twin',
  ClimatePolicy: 'page.climate-policy',
  IndustrialDecarb: 'page.industrial-decarb',
  ArcticEnergy: 'page.arctic-energy'
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
  'DigitalTwin': 'digital_twin',
  'HouseholdAdvisor': 'household_advisor',
  'ClimatePolicy': 'climate_policy',
  'ESGFinance': 'esg_finance',
  'IndustrialDecarb': 'industrial_decarb',
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

interface EnergyDataDashboardProps {
  initialTab?: string;
}

export function EnergyDataDashboard({ initialTab = 'Dashboard' }: EnergyDataDashboardProps) {
  const { t } = useTranslation();
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
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'Dashboard');

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
    { id: 'ESGFinance', label: 'Sustainable Finance & ESG', icon: DollarSign }, // ⭐⭐⭐⭐⭐ PROMOTED
    { id: 'IndustrialDecarb', label: 'Industrial Decarb', icon: Factory }, // ⭐⭐⭐⭐ PROMOTED (paired with ESG)
    { id: 'CCUSProjects', label: 'CCUS Projects', icon: Factory }, // ⭐⭐⭐⭐⭐ PROMOTED
    { id: 'Investment', label: 'Investment', icon: TrendingUp }, // ⭐⭐⭐⭐⭐ PROMOTED
    { id: 'RenewableOptimization', label: 'Renewable Energy Optimization Hub', icon: Sun }, // ⭐⭐⭐⭐ PROMOTED
    { id: 'HouseholdAdvisor', label: 'My Energy AI', icon: Home } // ⭐⭐⭐
  ];

  const moreNavigationTabs = [
    // 4-Star Features (Strong monetization)
    { id: 'StorageDispatch', label: 'Storage Dispatch', icon: Battery }, // ⭐⭐⭐⭐
    { id: 'SMRDeployment', label: 'SMR Tracker', icon: Atom }, // ⭐⭐⭐⭐
    { id: 'CapacityMarket', label: 'Capacity Market', icon: BarChart3 }, // ⭐⭐⭐⭐
    { id: 'VPPAggregation', label: 'VPP & DER', icon: Radio }, // ⭐⭐⭐⭐
    { id: 'LandfillMethane', label: 'Landfill Methane', icon: Recycle, path: '/landfill-methane' }, // ⭐⭐⭐⭐ NEW - EPA LandGEM Calculator
    // 3-Star Features (Moderate monetization)
    { id: 'Provinces', label: 'Provinces', icon: Globe }, // ⭐⭐⭐
    { id: 'GridQueue', label: 'Grid Queue', icon: Cable }, // ⭐⭐⭐
    { id: 'HeatPumps', label: 'Heat Pumps', icon: Thermometer }, // ⭐⭐⭐
    { id: 'CurtailmentAnalytics', label: 'Curtailment Reduction', icon: Wind }, // ⭐⭐⭐
    { id: 'GridOptimization', label: 'Grid Ops', icon: Activity }, // ⭐⭐⭐
    { id: 'DigitalTwin', label: 'Digital Twin', icon: Cpu }, // ⭐⭐⭐
    { id: 'ClimatePolicy', label: 'Climate Policy', icon: Scale }, // ⭐⭐⭐
    { id: 'ArcticEnergy', label: 'Arctic Energy Security', icon: Snowflake }, // ⭐⭐ Arctic & Northern
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
  const allTabs = [...coreNavigationTabs, ...moreNavigationTabs];
  const navigationTabs = allTabs.map(tab => {
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
  const visibleRecordsFact = getRecordCountFact(state.filteredData.length, 'visible');

  // Determine SEO config based on active tab
  const getSEOConfig = () => {
    switch (activeTab) {
      case 'Indigenous': return SEO_CONFIGS.indigenous;
      case 'ClimatePolicy': return SEO_CONFIGS.climatePolicy;
      case 'AIDataCentre': return SEO_CONFIGS.aiDataCentre;
      case 'Resilience': return SEO_CONFIGS.resilience;
      default: return SEO_CONFIGS.dashboard;
    }
  };
  const seoConfig = getSEOConfig();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* SEO Head - injects per-page meta tags */}
      <SEOHead {...seoConfig} />

      {/* Primary Navigation Header */}
      <header className="nav-header" role="banner">
        <div className="nav-container">
          <a
            href="/"
            className="nav-logo flex items-center gap-sm"
            aria-label={t.dashboard.title}
          >
            <Zap className="h-6 w-6 text-electric" />
            <span>{t.dashboard.title}</span>
          </a>
          <ul className="nav-menu" role="navigation" aria-label="Site links">
            <li>
              <a href="/about" className="nav-link">
                {t.nav.about}
              </a>
            </li>
            <li>
              <a href="/contact" className="nav-link">
                {t.nav.contact}
              </a>
            </li>
            <li>
              <a
                href="/api-docs"
                className="nav-link"
              >
                {t.nav.docs}
              </a>
            </li>
          </ul>
          <div className="flex items-center gap-md">
            <div className="text-right">
              <div className="text-tertiary text-small">{visibleRecordsFact.label}</div>
              <div className="metric-value text-electric">{visibleRecordsFact.value}</div>
              <div className="ml-4">
                <AuthButton />
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
            <ThemeToggle compact={true} />
            <LanguageSwitcher variant="toggle" compact={true} />
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
              badge: t.badge,
              ...(t as any).path && { path: (t as any).path } // Preserve external route paths
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
          <HomeTab connectionStatuses={connectionStatuses} onNavigate={setActiveTab} t={t} />
        ) : activeTab === 'Provinces' ? (
          <ProvincesTab connectionStatuses={connectionStatuses} onNavigate={setActiveTab} />
        ) : activeTab === 'Trends' ? (
          <div className="space-y-8">
            <TabHero
              icon={TrendingUp}
              title="Trend Analysis"
              subtitle="Advanced analytics and trend identification across Canadian energy data streams"
              cards={[
                { icon: TrendingUp, iconColor: 'text-blue-300', title: 'Peak Demand Patterns', description: 'Historical and predictive analysis of energy demand peaks' },
                { icon: BarChart3, iconColor: 'text-green-300', title: 'Generation Trends', description: 'Long-term trends in renewable vs traditional energy generation' },
                { icon: Gauge, iconColor: 'text-purple-300', title: 'Price Volatility', description: 'Market price analysis and volatility patterns' },
              ]}
            />
          </div>
        ) : activeTab === 'Education' ? (
          // Education Tab - Information
          <div className="space-y-8">
            <div className="card p-6 shadow-sm border border-[var(--border-subtle)]">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <div className="bg-orange-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <GraduationCap className="h-8 w-8 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-primary mb-2">Educational Resources</h2>
                  <p className="text-secondary">
                    Learn about Canadian energy systems, data sources, and streaming architecture
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-semibold text-primary mb-4">Dataset Information</h3>
                    <div className="space-y-4">
                      {DATASETS.map((dataset) => (
                        <div key={dataset.key} className="p-4 border border-[var(--border-subtle)] rounded-lg">
                          <h4 className="font-semibold text-primary" style={{ color: dataset.color }}>{dataset.name}</h4>
                          <p className="text-sm text-secondary mt-1">{dataset.description}</p>
                          <div className="text-xs text-tertiary mt-2">
                            Source: {dataset.source.toUpperCase()} • ~{dataset.estimatedRows.toLocaleString()} records
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-primary mb-4">Technical Architecture</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-secondary rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Signal className="h-5 w-5 text-electric" />
                          <h4 className="font-semibold text-blue-800">Live-When-Available Streaming</h4>
                        </div>
                        <p className="text-sm text-secondary">Data is pulled from multiple Canadian energy providers using resilient Supabase Edge Functions, with freshness and fallback states surfaced where available.</p>
                      </div>

                      <div className="p-4 bg-secondary rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Database className="h-5 w-5 text-success" />
                          <h4 className="font-semibold text-green-800">Data Processing</h4>
                        </div>
                        <p className="text-sm text-secondary">Advanced filtering, aggregation, and visualization capabilities with export functionality</p>
                      </div>

                      <div className="p-4 bg-secondary rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Gauge className="h-5 w-5 text-electric" />
                          <h4 className="font-semibold text-purple-800">Performance</h4>
                        </div>
                        <p className="text-sm text-secondary">Optimized for high-throughput data processing with fallback mechanisms for reliability</p>
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
          <Suspense fallback={<div className="flex items-center justify-center p-12"><MiniLoadingSpinner className="text-lg" /></div>}>
            {/* Phase 2 Components */}
            {activeTab === 'Resilience' && (
              <div className="space-y-8">
                <TabHero icon={Shield} title="Infrastructure Resilience" subtitle="Climate scenario modeling and vulnerability assessment for critical infrastructure" shaderClass="shader-bg-accent" cards={[
                  { icon: Shield, iconColor: 'text-red-300', title: 'Risk Assessment', description: 'Advanced climate vulnerability analysis' },
                  { icon: MapPin, iconColor: 'text-blue-300', title: 'Asset Mapping', description: 'Comprehensive infrastructure inventory' },
                  { icon: Gauge, iconColor: 'text-green-300', title: 'Scenario Planning', description: 'Future climate impact modeling' },
                ]} />
                <ResilienceMap />
                <CrisisScenarioSimulator />
              </div>
            )}

            {activeTab === 'Investment' && (
              <div className="space-y-8">
                <DataTrustNotice
                  mode="fallback"
                  title="Investment analysis is trust-labeled"
                  message="This page now distinguishes live stream inputs from fallback market assumptions. Use the freshness badge inside the investment view before treating outputs as current market guidance."
                />
                <InvestmentCards />
              </div>
            )}

            {activeTab === 'Innovation' && (
              <div className="space-y-8">
                <TabHero icon={Zap} title="Innovation Hub" subtitle="AI-powered research and technology innovation for sustainable energy solutions" shaderClass="shader-bg-primary" cards={[
                  { icon: Zap, iconColor: 'text-yellow-300', title: 'Technology Search', description: 'Advanced patent and innovation discovery' },
                  { icon: TrendingUp, iconColor: 'text-green-300', title: 'Market Analysis', description: 'Emerging technology market insights' },
                  { icon: Gauge, iconColor: 'text-purple-300', title: 'Feasibility Studies', description: 'Technical and economic viability assessment' },
                ]} />
                <InnovationSearch />
              </div>
            )}

            {/* Phase 3 Components */}
            {activeTab === 'Indigenous' && (
              <div className="space-y-8">
                <TabHero icon={Shield} title="Indigenous Energy Sovereignty" subtitle="Respectful integration of Indigenous knowledge and governance in energy planning" shaderClass="shader-bg-energy" cards={[
                  { icon: Shield, iconColor: 'text-blue-300', title: 'Traditional Knowledge', description: 'Integration of Indigenous ecological knowledge' },
                  { icon: MapPin, iconColor: 'text-green-300', title: 'Territory Mapping', description: 'Traditional territory and consultation tracking' },
                  { icon: Gauge, iconColor: 'text-orange-300', title: 'FPIC Compliance', description: 'Free, Prior, Informed Consent workflows' },
                ]} />
                <IndigenousDashboard />
              </div>
            )}

            {activeTab === 'Stakeholders' && (
              <div className="space-y-8">
                <TabHero icon={Zap} title="Stakeholder Coordination" subtitle="Multi-stakeholder engagement and collaboration platform for energy projects" cards={[
                  { icon: Zap, iconColor: 'text-purple-300', title: 'Engagement Tracking', description: 'Comprehensive stakeholder communication logs' },
                  { icon: MapPin, iconColor: 'text-blue-300', title: 'Impact Mapping', description: 'Geographic stakeholder impact analysis' },
                  { icon: Gauge, iconColor: 'text-green-300', title: 'Consensus Building', description: 'Collaborative decision-making support' },
                ]} />
                <StakeholderDashboard />
              </div>
            )}

            {/* Phase 4 Components */}
            {activeTab === 'GridOptimization' && (
              <div className="space-y-8">
                <TabHero icon={Activity} title="Grid Optimization" subtitle="Advanced grid management and optimization for reliable energy distribution" shaderClass="shader-bg-primary" cards={[
                  { icon: Activity, iconColor: 'text-cyan-300', title: 'Load Balancing', description: 'Live-when-available grid load optimization with fallback disclosure' },
                  { icon: Gauge, iconColor: 'text-yellow-300', title: 'Predictive Maintenance', description: 'AI-driven equipment health monitoring' },
                  { icon: TrendingUp, iconColor: 'text-green-300', title: 'Efficiency Analytics', description: 'Performance optimization insights' },
                ]} />
                <GridOptimizationDashboard />
              </div>
            )}

            {activeTab === 'Security' && (
              <div className="space-y-8">
                <TabHero icon={Lock} title="Cybersecurity & Monitoring" subtitle="Enterprise-grade security monitoring and threat detection for energy infrastructure" shaderClass="shader-bg-accent" cards={[
                  { icon: Shield, iconColor: 'text-red-300', title: 'Threat Detection', description: 'Advanced cybersecurity monitoring' },
                  { icon: Lock, iconColor: 'text-blue-300', title: 'Access Control', description: 'Multi-factor authentication and authorization' },
                  { icon: Activity, iconColor: 'text-green-300', title: 'Incident Response', description: 'Automated security incident management' },
                ]} />
                <ErrorBoundary fallback={
                  <div className="card p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Security Dashboard Unavailable</h3>
                    <p className="text-secondary mb-4">The security monitoring system is currently offline. Please try again later.</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="btn btn-primary"
                    >
                      Reload Dashboard
                    </button>
                  </div>
                }>
                  <SecurityDashboard />
                </ErrorBoundary>
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

            {/* Sustainable Finance & ESG Dashboard */}
            {activeTab === 'ESGFinance' && (
              <div className="space-y-8">
                <ESGFinanceDashboard />
                {/* Impact Metrics Dashboard (Gap #12) */}
                <ImpactMetricsDashboard showExport={true} />
              </div>
            )}

            {/* Industrial Decarbonization Dashboard */}
            {activeTab === 'IndustrialDecarb' && (
              <IndustrialDecarbDashboard />
            )}

            {/* Arctic & Northern Energy Security Dashboard (Diesel-to-Renewable Optimizer) */}
            {activeTab === 'ArcticEnergy' && (
              <ArcticEnergySecurityMonitor />
            )}

            {/* Digital Twin Dashboard */}
            {activeTab === 'DigitalTwin' && (
              <DigitalTwinDashboard />
            )}

            {/* Climate Policy Dashboard */}
            {activeTab === 'ClimatePolicy' && (
              <CanadianClimatePolicyDashboard />
            )}

            {/* Features Tab */}
            {activeTab === 'Features' && (
              <FeatureAvailability />
            )}

            {/* Fallback for undefined tabs */}
            {!['Dashboard', 'Home', 'Provinces', 'Trends', 'Investment', 'Resilience', 'Innovation', 'Indigenous', 'Stakeholders', 'GridOptimization', 'Security', 'Features', 'Education', 'RenewableOptimization', 'CurtailmentAnalytics', 'StorageDispatch', 'Analytics', 'HouseholdAdvisor', 'AIDataCentres', 'HydrogenHub', 'CriticalMinerals', 'SMRDeployment', 'GridQueue', 'CapacityMarket', 'EVCharging', 'VPPAggregation', 'HeatPumps', 'CCUSProjects', 'CarbonDashboard', 'ESGFinance', 'DigitalTwin', 'ClimatePolicy', 'IndustrialDecarb', 'ArcticEnergy'].includes(activeTab) && (
              <div className="card border border-[var(--border-subtle)] p-8 text-center">
                <div className="max-w-md mx-auto">
                  <div className="bg-secondary p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    {(() => {
                      const activeTabData = navigationTabs.find(tab => tab.id === activeTab);
                      if (activeTabData?.icon) {
                        const IconComponent = activeTabData.icon;
                        return <IconComponent className="h-8 w-8 text-electric" />;
                      }
                      return null;
                    })()}
                  </div>
                  <h2 className="text-2xl font-bold text-primary mb-2">{activeTab}</h2>
                  <p className="text-secondary mb-6">
                    Content for this section is being developed.
                  </p>
                  <button
                    onClick={() => setActiveTab('Dashboard')}
                    className="bg-electric hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}
          </Suspense>
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
