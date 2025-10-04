/**
 * Household Energy Advisor - Type Definitions
 * Core types for the AI-powered household energy advisor system
 */

export type HomeType = 'house' | 'apartment' | 'condo' | 'townhouse';
export type HeatingType = 'gas' | 'electric' | 'oil' | 'heat-pump' | 'dual' | 'other';
export type Province = 'ON' | 'AB' | 'BC' | 'QC' | 'SK' | 'MB' | 'NS' | 'NB' | 'PE' | 'NL' | 'YT' | 'NT' | 'NU';

export interface HouseholdProfile {
  userId: string;
  province: Province;
  postalCode: string;
  homeType: HomeType;
  squareFootage: number;
  occupants: number;
  heatingType: HeatingType;
  hasAC: boolean;
  hasSolar: boolean;
  hasEV: boolean;
  utilityProvider: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyUsage {
  month: string; // YYYY-MM format
  consumption_kwh: number;
  cost_cad: number;
  peakUsageHours: number[]; // Hours of day (0-23)
  weather?: {
    avgTemp: number;
    heatingDegreeDays: number;
    coolingDegreeDays: number;
  };
  notes?: string;
}

export interface HouseholdBenchmark {
  expectedUsage: number; // kWh per month
  avgCost: number; // CAD per month
  similarHomesAvg: number; // Average of similar homes
  percentile: number; // User's percentile (0-100)
  comparisonText: string; // e.g., "15% above average"
}

export interface ProvincialPricing {
  province: Province;
  currentPrice: number; // cents per kWh
  hasTOUPricing: boolean;
  touRates?: {
    offPeak: number;
    midPeak: number;
    onPeak: number;
    offPeakHours: string; // e.g., "19:00-07:00"
    onPeakHours: string;
  };
  seasonalRates?: {
    winter: number;
    summer: number;
  };
  lastUpdated: string;
}

export type RecommendationCategory = 'behavioral' | 'upgrade' | 'rebate' | 'emergency' | 'education';
export type RecommendationPriority = 'high' | 'medium' | 'low';
export type RecommendationEffort = 'easy' | 'moderate' | 'significant';

export interface PotentialSavings {
  monthly: number; // CAD
  annual: number; // CAD
  kwh: number; // kWh saved
  co2Reduction: number; // kg CO2e
}

export interface ActionStep {
  step: string;
  estimatedTime?: string;
  difficulty?: 'easy' | 'moderate' | 'hard';
  cost?: number; // CAD
}

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  potentialSavings: PotentialSavings;
  effort: RecommendationEffort;
  actionSteps: ActionStep[];
  relatedRebates?: string[]; // IDs of applicable rebates
  implementedAt?: string; // ISO timestamp when user implemented
  isCompleted?: boolean;
}

export type RebateProvider = 'federal' | 'provincial' | 'municipal' | 'utility' | 'other';
export type RebateType = 
  | 'heat-pump' 
  | 'insulation' 
  | 'windows' 
  | 'solar' 
  | 'EV-charger' 
  | 'smart-thermostat'
  | 'appliance'
  | 'home-retrofit'
  | 'energy-audit'
  | 'other';

export interface RebateEligibility {
  incomeLimit?: number; // CAD per year
  homeOwner?: boolean;
  minHomeAge?: number; // years
  requiresAudit?: boolean;
  otherCriteria?: string[];
}

export interface Rebate {
  id: string;
  name: string;
  provider: RebateProvider;
  province: Province | 'ALL';
  amount: {
    min: number;
    max: number;
  };
  type: RebateType;
  eligibility: RebateEligibility;
  applicationUrl: string;
  deadline?: string;
  description: string;
  estimatedProcessingTime?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  context?: {
    recommendations?: Recommendation[];
    rebates?: Rebate[];
    metrics?: Record<string, any>;
  };
}

export interface ConversationContext {
  householdProfile: HouseholdProfile;
  recentUsage: MonthlyUsage[];
  currentRecommendations: Recommendation[];
  provincialData: ProvincialPricing;
  sessionId: string;
}

export interface AlertConfig {
  priceSpikes: boolean;
  highUsage: boolean;
  rebateOpportunities: boolean;
  savingsTips: boolean;
}

export interface UserPreferences {
  userId: string;
  language: 'en' | 'fr';
  alertConfig: AlertConfig;
  notificationMethod: 'email' | 'sms' | 'push' | 'none';
  privacyConsent: {
    dataStorage: boolean;
    analytics: boolean;
    marketing: boolean;
    consentDate: string;
  };
}

export interface EnergyAlert {
  id: string;
  userId: string;
  type: 'price-spike' | 'high-usage' | 'rebate-match' | 'tip' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: string;
  expiresAt?: string;
  isRead: boolean;
}

// Analytics and Tracking
export interface UsageComparison {
  current: number;
  previous: number;
  percentChange: number;
  trend: 'up' | 'down' | 'stable';
  comparisonPeriod: string;
}

export interface SavingsTracker {
  userId: string;
  implementedRecommendations: Recommendation[];
  totalSavedKwh: number;
  totalSavedCAD: number;
  totalCO2Reduced: number; // kg
  savingsHistory: Array<{
    month: string;
    savedKwh: number;
    savedCAD: number;
  }>;
  lastUpdated: string;
}

export interface PeerComparison {
  userUsage: number; // kWh
  peerAverage: number; // kWh
  percentile: number; // 0-100
  peerGroup: {
    province: Province;
    homeType: HomeType;
    squareFootage: { min: number; max: number };
    occupants: number;
    sampleSize: number;
  };
}
