/**
 * Household Energy Advisor - Main Component
 * AI-powered personal energy advisor for Canadian households
 */

import React, { useState, useEffect } from 'react';
import { 
  Zap, TrendingDown, DollarSign, Gift, MessageSquare, 
  Lightbulb, Home, Users, Thermometer, Car, Sun,
  TrendingUp, Award, Target, Settings, Download
} from 'lucide-react';
import { householdDataManager } from '../lib/householdDataManager';
import { generateRecommendations, calculateTotalSavings, getQuickWins } from '../lib/energyRecommendations';
import { rebateMatcher } from '../lib/rebateMatcher';
import type { 
  HouseholdProfile, 
  MonthlyUsage, 
  Recommendation,
  Rebate,
  HouseholdBenchmark,
  ProvincialPricing,
  Province
} from '../lib/types/household';
import HouseholdOnboarding from './HouseholdOnboarding';
import EnergyAdvisorChat from './EnergyAdvisorChat';
import RecommendationsPanel from './RecommendationsPanel';
import UsageAnalytics from './UsageAnalytics';

// Provincial pricing data (simplified - would come from API in production)
const PROVINCIAL_PRICING: Record<Province, ProvincialPricing> = {
  ON: {
    province: 'ON',
    currentPrice: 12.5,
    hasTOUPricing: true,
    touRates: {
      offPeak: 8.7,
      midPeak: 12.2,
      onPeak: 15.1,
      offPeakHours: '19:00-07:00, weekends',
      onPeakHours: '11:00-17:00 weekdays',
    },
    lastUpdated: new Date().toISOString(),
  },
  AB: {
    province: 'AB',
    currentPrice: 18.0,
    hasTOUPricing: false,
    lastUpdated: new Date().toISOString(),
  },
  BC: {
    province: 'BC',
    currentPrice: 10.0,
    hasTOUPricing: true,
    touRates: {
      offPeak: 9.1,
      midPeak: 13.7,
      onPeak: 14.2,
      offPeakHours: '22:00-06:00',
      onPeakHours: '16:00-20:00 weekdays',
    },
    lastUpdated: new Date().toISOString(),
  },
  QC: {
    province: 'QC',
    currentPrice: 7.5,
    hasTOUPricing: false,
    lastUpdated: new Date().toISOString(),
  },
  SK: { province: 'SK', currentPrice: 15.0, hasTOUPricing: false, lastUpdated: new Date().toISOString() },
  MB: { province: 'MB', currentPrice: 9.0, hasTOUPricing: false, lastUpdated: new Date().toISOString() },
  NS: { province: 'NS', currentPrice: 16.5, hasTOUPricing: false, lastUpdated: new Date().toISOString() },
  NB: { province: 'NB', currentPrice: 13.0, hasTOUPricing: false, lastUpdated: new Date().toISOString() },
  PE: { province: 'PE', currentPrice: 14.5, hasTOUPricing: false, lastUpdated: new Date().toISOString() },
  NL: { province: 'NL', currentPrice: 12.0, hasTOUPricing: false, lastUpdated: new Date().toISOString() },
  YT: { province: 'YT', currentPrice: 13.5, hasTOUPricing: false, lastUpdated: new Date().toISOString() },
  NT: { province: 'NT', currentPrice: 25.0, hasTOUPricing: false, lastUpdated: new Date().toISOString() },
  NU: { province: 'NU', currentPrice: 28.0, hasTOUPricing: false, lastUpdated: new Date().toISOString() },
};

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change?: string;
  positive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, change, positive }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-2">
      <div className="text-gray-500 dark:text-gray-400">{icon}</div>
      <span className={`text-sm font-medium ${
        positive === undefined ? 'text-gray-600 dark:text-gray-400' :
        positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      }`}>
        {change}
      </span>
    </div>
    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
  </div>
);

export const HouseholdEnergyAdvisor: React.FC = () => {
  const [profile, setProfile] = useState<HouseholdProfile | null>(null);
  const [usage, setUsage] = useState<MonthlyUsage[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [eligibleRebates, setEligibleRebates] = useState<Rebate[]>([]);
  const [benchmark, setBenchmark] = useState<HouseholdBenchmark | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'chat' | 'analytics'>('overview');
  const [loading, setLoading] = useState(true);

  // Load household data on mount
  useEffect(() => {
    const loadHouseholdData = async () => {
      setLoading(true);
      try {
        // Check if onboarding is complete
        const isComplete = householdDataManager.isOnboardingComplete();
        
        if (!isComplete) {
          setShowOnboarding(true);
          setLoading(false);
          return;
        }

        // Load profile
        const savedProfile = householdDataManager.getProfile();
        if (!savedProfile) {
          setShowOnboarding(true);
          setLoading(false);
          return;
        }

        setProfile(savedProfile);

        // Load usage history
        const usageHistory = householdDataManager.getUsageHistory(12);
        setUsage(usageHistory);

        // Calculate benchmark
        const benchmarkData = householdDataManager.calculateBenchmark(savedProfile);
        setBenchmark(benchmarkData);

        // Generate recommendations
        const provincialData = PROVINCIAL_PRICING[savedProfile.province];
        const recs = generateRecommendations(savedProfile, usageHistory, provincialData);
        setRecommendations(recs);
        householdDataManager.saveRecommendations(recs);

        // Find eligible rebates
        const rebates = await rebateMatcher.findEligibleRebates(savedProfile);
        setEligibleRebates(rebates);

      } catch (error) {
        console.error('Error loading household data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHouseholdData();
  }, []);

  // Handle onboarding completion
  const handleOnboardingComplete = async (completedProfile: HouseholdProfile) => {
    setProfile(completedProfile);
    setShowOnboarding(false);
    
    // Generate initial recommendations
    const provincialData = PROVINCIAL_PRICING[completedProfile.province];
    const recs = generateRecommendations(completedProfile, [], provincialData);
    setRecommendations(recs);
    
    // Find eligible rebates
    const rebates = await rebateMatcher.findEligibleRebates(completedProfile);
    setEligibleRebates(rebates);
    
    // Calculate benchmark
    const benchmarkData = householdDataManager.calculateBenchmark(completedProfile);
    setBenchmark(benchmarkData);
  };

  // Show onboarding if needed
  if (showOnboarding) {
    return <HouseholdOnboarding onComplete={handleOnboardingComplete} />;
  }

  // Loading state
  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your energy profile...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const recentUsage = usage[0];
  const avgUsage = usage.length > 0 
    ? Math.round(usage.reduce((sum, u) => sum + u.consumption_kwh, 0) / usage.length)
    : benchmark?.expectedUsage || 0;
  
  const avgCost = usage.length > 0
    ? Math.round(usage.reduce((sum, u) => sum + u.cost_cad, 0) / usage.length * 100) / 100
    : benchmark?.avgCost || 0;

  const totalPotentialSavings = calculateTotalSavings(recommendations);
  const maxRebates = rebateMatcher.calculateMaxRebates(eligibleRebates);

  const usageChange = usage.length >= 2
    ? Math.round(((usage[0].consumption_kwh - usage[1].consumption_kwh) / usage[1].consumption_kwh) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Zap className="w-8 h-8" />
                My Energy AI
              </h1>
              <p className="mt-2 text-green-100">
                Your personal energy advisor for smarter, cheaper, cleaner energy
              </p>
            </div>
            <button
              onClick={() => setShowOnboarding(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>

          {/* Profile Summary */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-green-100">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              {profile.homeType} • {profile.squareFootage} sq ft
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {profile.occupants} occupants
            </div>
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              {profile.heatingType} heating
            </div>
            {profile.hasEV && (
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                Electric Vehicle
              </div>
            )}
            {profile.hasSolar && (
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4" />
                Solar Panels
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveView('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'overview'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveView('chat')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'chat'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat with AI
              </div>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'analytics'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analytics
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                icon={<TrendingDown className="w-5 h-5" />}
                title="Average Monthly Usage"
                value={`${avgUsage} kWh`}
                change={usageChange !== 0 ? `${usageChange > 0 ? '+' : ''}${usageChange}% vs last month` : undefined}
                positive={usageChange < 0}
              />
              <StatCard 
                icon={<DollarSign className="w-5 h-5" />}
                title="Average Monthly Bill"
                value={`$${avgCost}`}
                change={benchmark ? benchmark.comparisonText : undefined}
                positive={benchmark ? benchmark.comparisonText.includes('below') : undefined}
              />
              <StatCard 
                icon={<Gift className="w-5 h-5" />}
                title="Available Rebates"
                value={`$${maxRebates.toLocaleString()}`}
                change={`${eligibleRebates.length} programs matched`}
              />
              <StatCard 
                icon={<Award className="w-5 h-5" />}
                title="Potential Savings"
                value={`$${totalPotentialSavings.annual}/year`}
                change={`From ${recommendations.length} recommendations`}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-2 space-y-6">
                {/* Top Recommendations */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Top Recommendations
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Updated {new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <RecommendationsPanel 
                    recommendations={recommendations.slice(0, 3)}
                    onImplement={(id) => {
                      householdDataManager.markRecommendationImplemented(id);
                      const updated = recommendations.map(r => 
                        r.id === id ? { ...r, isCompleted: true } : r
                      );
                      setRecommendations(updated);
                    }}
                  />
                </div>

                {/* Quick Chat */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Ask Your Energy AI
                  </h2>
                  <button
                    onClick={() => setActiveView('chat')}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all"
                  >
                    Start Conversation
                  </button>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                    Get personalized advice on reducing your energy costs
                  </p>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Rebates */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-purple-500" />
                    Your Rebates
                  </h3>
                  <div className="space-y-3">
                    {eligibleRebates.slice(0, 3).map(rebate => (
                      <div key={rebate.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white">{rebate.name}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Up to ${rebate.amount.max.toLocaleString()}
                        </p>
                        <a
                          href={rebate.applicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                        >
                          Learn more →
                        </a>
                      </div>
                    ))}
                    {eligibleRebates.length > 3 && (
                      <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                        View all {eligibleRebates.length} rebates →
                      </button>
                    )}
                  </div>
                </div>

                {/* Export Data */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Your Data
                  </h3>
                  <button
                    onClick={() => {
                      const data = householdDataManager.exportData();
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `my-energy-data-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Data
                  </button>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    All your data is stored locally on your device
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === 'chat' && (
          <EnergyAdvisorChat 
            profile={profile}
            usage={usage}
            recommendations={recommendations}
            provincialData={PROVINCIAL_PRICING[profile.province]}
          />
        )}

        {activeView === 'analytics' && (
          <UsageAnalytics 
            profile={profile}
            usage={usage}
            benchmark={benchmark}
          />
        )}
      </div>
    </div>
  );
};

export default HouseholdEnergyAdvisor;
