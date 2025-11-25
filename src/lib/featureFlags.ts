/**
 * Feature Flag System for Reduced Scope Launch
 * 
 * Centralized feature management to control which components are available
 * in production vs development environments.
 * 
 * Status Levels:
 * - PRODUCTION_READY: 4.5+/5 - Fully functional, no known issues
 * - ACCEPTABLE: 4.0-4.4/5 - Functional with documented limitations
 * - PARTIAL: 3.5-3.9/5 - Deploy with warnings, limited functionality
 * - DEFERRED: <3.5/5 - Not available in Phase 1 launch
 */

export type FeatureStatus = 'production_ready' | 'acceptable' | 'partial' | 'deferred';

export interface FeatureConfig {
  id: string;
  name: string;
  status: FeatureStatus;
  rating: number;
  enabled: boolean;
  limitations?: string[];
  comingSoon?: boolean;
  estimatedRelease?: string;
  route?: string;
  component?: string;
}

/**
 * Feature Registry - Single source of truth for all platform features
 */
export const FEATURE_REGISTRY: Record<string, FeatureConfig> = {
  // ========== PRODUCTION READY (4.5+/5) ==========
  iesoStreaming: {
    id: 'ieso_streaming',
    name: 'IESO Real-Time Data',
    status: 'production_ready',
    rating: 4.9,
    enabled: true,
    route: '/dashboard',
    component: 'RealTimeDashboard',
  },
  
  helpSystem: {
    id: 'help_system',
    name: 'Help & Education System',
    status: 'production_ready',
    rating: 4.8,
    enabled: true,
    route: '*',
    component: 'HelpModal',
  },
  
  failoverArchitecture: {
    id: 'failover_architecture',
    name: 'Resilient Data Streaming',
    status: 'production_ready',
    rating: 4.7,
    enabled: true,
    component: 'streamingService',
  },
  
  provincialGeneration: {
    id: 'provincial_generation',
    name: 'Provincial Generation Mix',
    status: 'production_ready',
    rating: 4.6,
    enabled: true,
    route: '/dashboard',
    component: 'ProvincialGenerationDataManager',
  },
  
  investmentAnalysis: {
    id: 'investment_analysis',
    name: 'Investment Decision Support',
    status: 'production_ready',
    rating: 4.6,
    enabled: true,
    route: '/investment',
    component: 'InvestmentCards',
  },
  
  llmIntegration: {
    id: 'llm_integration',
    name: 'AI-Powered Insights',
    status: 'production_ready',
    rating: 4.5,
    enabled: true,
    route: '/ai-oracle',
    component: 'AIEnergyOracle',
  },

  // ========== ACCEPTABLE (4.0-4.4/5) ==========
  innovationTracking: {
    id: 'innovation_tracking',
    name: 'Energy Innovation Opportunities',
    status: 'acceptable',
    rating: 4.4,
    enabled: true,
    limitations: [
      'Innovation database needs expansion',
      'Funding opportunity integration incomplete',
    ],
    route: '/innovation',
    component: 'InnovationSearch',
  },
  
  complianceMonitoring: {
    id: 'compliance_monitoring',
    name: 'Regulatory Compliance',
    status: 'acceptable',
    rating: 4.4,
    enabled: true,
    limitations: [
      'Uses local storage, not connected to provincial regulators',
      'Automated violation detection limited',
    ],
    route: '/compliance',
    component: 'ComplianceDashboard',
  },
  
  huggingfaceData: {
    id: 'huggingface_data',
    name: 'European Smart Meter Data',
    status: 'acceptable',
    rating: 4.3,
    enabled: true,
    limitations: ['Limited to one dataset from HuggingFace'],
    route: '/dashboard',
    component: 'RealTimeDashboard',
  },
  
  dataQuality: {
    id: 'data_quality',
    name: 'Data Quality Monitoring',
    status: 'acceptable',
    rating: 4.3,
    enabled: true,
    limitations: ['Automated alerts need refinement'],
    route: '/dashboard',
    component: 'DataQuality',
  },
  
  resilienceAnalysis: {
    id: 'resilience_analysis',
    name: 'Infrastructure Resilience',
    status: 'acceptable',
    rating: 4.3,
    enabled: true,
    limitations: [
      'Missing ECCC climate projections integration',
      'Asset location data needs verification',
    ],
    route: '/resilience',
    component: 'ResilienceMap',
  },
  
  energyAnalytics: {
    id: 'energy_analytics',
    name: 'Energy System Analytics',
    status: 'acceptable',
    rating: 4.2,
    enabled: true,
    limitations: [
      'Detailed emissions tracking per province not available',
      'Historical trend aggregation needs optimization',
    ],
    route: '/dashboard',
    component: 'EnergyDataDashboard',
  },

  esgFinance: {
    id: 'esg_finance',
    name: 'Sustainable Finance & ESG',
    status: 'acceptable',
    rating: 4.2,
    enabled: true,
    limitations: [
      'ESG datasets use seeded sample data for demonstration',
      'Supabase Edge configuration required for live analytics',
    ],
    route: '/dashboard',
    component: 'ESGFinanceDashboard',
  },

  industrialDecarb: {
    id: 'industrial_decarb',
    name: 'Industrial Decarbonization',
    status: 'acceptable',
    rating: 4.1,
    enabled: true,
    limitations: [
      'Industrial decarbonization datasets use seeded sample data for demonstration',
      'Supabase Edge configuration required for live industrial decarbonization analytics',
    ],
    route: '/dashboard',
    component: 'IndustrialDecarbDashboard',
  },

  householdAdvisor: {
    id: 'household_advisor',
    name: 'My Energy AI Advisor',
    status: 'acceptable',
    rating: 4.2,
    enabled: true,
    limitations: [
      'Household profile and usage history stored in local browser storage only',
      'Gemini API integration depends on environment configuration',
      'Onboarding flow required before full recommendations are available',
    ],
    route: '/my-energy-ai',
    component: 'HouseholdEnergyAdvisor',
  },
  
  stakeholderCoordination: {
    id: 'stakeholder_coordination',
    name: 'Stakeholder Collaboration',
    status: 'acceptable',
    rating: 4.1,
    enabled: true,
    limitations: [
      'WebSocket server not deployed - real-time collaboration simulated',
      'Multi-user testing not completed',
    ],
    route: '/stakeholder',
    component: 'StakeholderDashboard',
  },
  
  streamingArchitecture: {
    id: 'streaming_architecture',
    name: 'Core Streaming Infrastructure',
    status: 'acceptable',
    rating: 4.1,
    enabled: true,
    limitations: ['Cache size could be increased for better offline support'],
    component: 'dataStreamers',
  },
  
  indigenousDashboard: {
    id: 'indigenous_dashboard',
    name: 'Indigenous Energy Sovereignty',
    status: 'acceptable',
    rating: 4.0,
    enabled: true,
    limitations: [
      'Formal Indigenous governance review pending',
      'Territorial boundary data is placeholder (needs real GeoJSON)',
      'TEK repository integration incomplete',
    ],
    route: '/indigenous',
    component: 'IndigenousDashboard',
  },
  
  transitionTracker: {
    id: 'transition_tracker',
    name: 'Energy Transition Progress',
    status: 'acceptable',
    rating: 4.0,
    enabled: true,
    limitations: [
      'Missing real Canadian transition target data',
      'Provincial goal alignment incomplete',
      'International commitment tracking missing',
    ],
    route: '/dashboard',
    component: 'TransitionKPIs',
  },
  
  databaseSchema: {
    id: 'database_schema',
    name: 'Database Infrastructure',
    status: 'acceptable',
    rating: 4.0,
    enabled: true,
    limitations: ['6 tables deferred to Phase 2 (emissions, market, community)'],
    component: 'migrations',
  },

  // ========== PARTIAL (3.5-3.9/5) - Deploy with Warnings ==========
  mineralsSupplyChain: {
    id: 'minerals_supply_chain',
    name: 'Critical Minerals Supply Chain',
    status: 'partial',
    rating: 3.8,
    enabled: true,
    limitations: [
      '⚠️ SIMULATED DATA: Using realistic but not real supply chain data',
      'No real-time market price integration',
      'Disruption alert system not operational',
      'Not connected to Canadian Critical Minerals database',
    ],
    route: '/minerals',
    component: 'MineralsDashboard',
  },
  
  securityAssessment: {
    id: 'security_assessment',
    name: 'Energy Security Assessment',
    status: 'partial',
    rating: 3.7,
    enabled: true,
    limitations: [
      '⚠️ LIMITED FUNCTIONALITY: 3 of 4 APIs missing',
      'Threat intelligence feeds not connected',
      'Vulnerability scanning not operational',
      'Real-time threat assessment coming in Phase 2',
    ],
    route: '/security',
    component: 'SecurityDashboard',
  },
  
  gridOptimization: {
    id: 'grid_optimization',
    name: 'Grid Integration Optimization',
    status: 'partial',
    rating: 3.6,
    enabled: true,
    limitations: [
      '⚠️ FORECASTING NOT AVAILABLE: Demand and renewable output forecasts coming in Phase 2',
      'Real-time optimization uses simulated grid data',
      'AI recommendations need calibration',
    ],
    route: '/grid',
    component: 'GridOptimizationDashboard',
  },

  digitalTwin: {
    id: 'digital_twin',
    name: 'Digital Twin Energy Ecosystem',
    status: 'partial',
    rating: 3.8,
    enabled: true,
    limitations: [
      'Uses real system state from provincial generation and demand tables but scenario simulations are still simplified',
      'Stress testing scenarios do not yet feed back into operational controls',
      'AI optimization panel depends on LLM edge function configuration',
    ],
    route: '/digital-twin',
    component: 'DigitalTwinDashboard',
  },

  climatePolicy: {
    id: 'climate_policy',
    name: 'Canadian Climate Policy Dashboard',
    status: 'partial',
    rating: 3.7,
    enabled: true,
    limitations: [
      'Policy catalog coverage is focused on federal and major provincial instruments',
      'Some sectoral policies are summarized, not fully modeled',
      'Alignment with real-time emissions data still in progress',
    ],
    route: '/climate-policy',
    component: 'CanadianClimatePolicyDashboard',
  },

  // ========== DEFERRED (<3.5/5) - Not Available in Phase 1 ==========
  emissionsTracking: {
    id: 'emissions_tracking',
    name: 'Carbon Emissions Tracking & Planning',
    status: 'deferred',
    rating: 3.4,
    enabled: false,
    comingSoon: true,
    estimatedRelease: 'Phase 2 - Q1 2026',
    limitations: [
      'Feature under development',
      'All emissions APIs not yet implemented',
      'ECCC data integration in progress',
    ],
    route: '/emissions',
    component: 'EmissionsPlanner',
  },
  
  marketIntelligence: {
    id: 'market_intelligence',
    name: 'Energy Market Intelligence',
    status: 'deferred',
    rating: 3.3,
    enabled: false,
    comingSoon: true,
    estimatedRelease: 'Phase 2 - Q1 2026',
    limitations: [
      'Feature under development',
      'Market data feeds integration in progress',
      'Price forecasting capability coming soon',
    ],
    route: '/market',
    component: 'MarketIntelligence',
  },
  
  communityPlanning: {
    id: 'community_planning',
    name: 'Community Energy Planning',
    status: 'deferred',
    rating: 3.2,
    enabled: false,
    comingSoon: true,
    estimatedRelease: 'Phase 2 - Q1 2026',
    limitations: [
      'Feature under development',
      'Municipal energy data integration in progress',
      'AI-guided plan generation coming soon',
    ],
    route: '/community',
    component: 'CommunityPlanner',
  },
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureId: string): boolean {
  const feature = FEATURE_REGISTRY[featureId];
  if (!feature) {
    console.warn(`Unknown feature: ${featureId}`);
    return false;
  }
  
  // In development, allow override via environment variable
  if (import.meta.env.DEV) {
    const envOverride = import.meta.env[`VITE_FEATURE_${featureId.toUpperCase()}`];
    if (envOverride !== undefined) {
      return envOverride === 'true';
    }
  }
  
  return feature.enabled;
}

/**
 * Get feature configuration
 */
export function getFeature(featureId: string): FeatureConfig | null {
  return FEATURE_REGISTRY[featureId] || null;
}

/**
 * Get all features by status
 */
export function getFeaturesByStatus(status: FeatureStatus): FeatureConfig[] {
  return Object.values(FEATURE_REGISTRY).filter(f => f.status === status);
}

/**
 * Get feature limitations for display
 */
export function getFeatureLimitations(featureId: string): string[] {
  const feature = FEATURE_REGISTRY[featureId];
  return feature?.limitations || [];
}

/**
 * Check if feature should show "Coming Soon" badge
 */
export function isComingSoon(featureId: string): boolean {
  const feature = FEATURE_REGISTRY[featureId];
  return feature?.comingSoon === true;
}

/**
 * Get deployment stats for monitoring
 */
export function getDeploymentStats() {
  const all = Object.values(FEATURE_REGISTRY);
  return {
    total: all.length,
    productionReady: all.filter(f => f.status === 'production_ready').length,
    acceptable: all.filter(f => f.status === 'acceptable').length,
    partial: all.filter(f => f.status === 'partial').length,
    deferred: all.filter(f => f.status === 'deferred').length,
    enabled: all.filter(f => f.enabled).length,
    averageRating: (all.reduce((sum, f) => sum + f.rating, 0) / all.length).toFixed(2),
  };
}

/**
 * Validate feature flags on app initialization
 */
export function validateFeatureFlags(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  Object.entries(FEATURE_REGISTRY).forEach(([key, feature]) => {
    // Validate feature has required fields
    if (!feature.id || !feature.name || !feature.status || feature.rating === undefined) {
      errors.push(`Feature ${key} is missing required fields`);
    }
    
    // Validate rating matches status
    if (feature.status === 'production_ready' && feature.rating < 4.5) {
      errors.push(`Feature ${key} marked production_ready but rating is ${feature.rating}`);
    }
    if (feature.status === 'acceptable' && (feature.rating < 4.0 || feature.rating >= 4.5)) {
      errors.push(`Feature ${key} marked acceptable but rating is ${feature.rating}`);
    }
    if (feature.status === 'deferred' && feature.enabled) {
      errors.push(`Feature ${key} is deferred but enabled=true`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Log deployment stats on module load
if (import.meta.env.DEV) {
  const stats = getDeploymentStats();
  console.log('🚀 Feature Flag System Initialized');
  console.log('📊 Deployment Stats:', stats);
  
  const validation = validateFeatureFlags();
  if (!validation.valid) {
    console.error('⚠️ Feature flag validation errors:', validation.errors);
  }
}
