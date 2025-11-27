import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Briefcase, TrendingUp, Activity, Wifi, WifiOff } from 'lucide-react';
import { financialEngine, type CashFlow, type InvestmentMetrics, type SimpleInvestment } from '../lib/financialCalculations';
import { useStreamingData } from '../hooks/useStreamingData';
import { CONTAINER_CLASSES, CHART_CONFIGS, TEXT_CLASSES, COLOR_SCHEMES, LAYOUT_UTILS } from '../lib/ui/layout';

// Mock investment data with realistic positive cash flows
const mockInvestments: SimpleInvestment[] = [
  {
    id: 1,
    name: 'Ontario Solar Farm',
    description: 'Large-scale photovoltaic installation',
    cashFlows: [
      { amount: -15000000, period: 0, description: 'Capital investment' },
      { amount: 5200000, period: 1, description: 'Revenue' },
      { amount: 5400000, period: 2, description: 'Revenue' },
      { amount: 5600000, period: 3, description: 'Revenue' },
      { amount: 5800000, period: 4, description: 'Revenue' },
      { amount: 6000000, period: 5, description: 'Revenue' }
    ],
    discountRate: 0.08,
    analysis: undefined
  },
  {
    id: 2,
    name: 'Battery Storage',
    description: '4MW battery storage system',
    cashFlows: [
      { amount: -7800000, period: 0, description: 'Capital investment' },
      { amount: 3500000, period: 1, description: 'Revenue' },
      { amount: 3700000, period: 2, description: 'Revenue' },
      { amount: 3900000, period: 3, description: 'Revenue' },
      { amount: 4100000, period: 4, description: 'Revenue' },
      { amount: 4300000, period: 5, description: 'Revenue' }
    ],
    discountRate: 0.10,
    analysis: undefined
  },
  {
    id: 3,
    name: 'Wind Energy Project',
    description: 'Offshore wind farm with 50 turbines',
    cashFlows: [
      { amount: -25000000, period: 0, description: 'Capital investment' },
      { amount: 8000000, period: 1, description: 'Revenue' },
      { amount: 8500000, period: 2, description: 'Revenue' },
      { amount: 9000000, period: 3, description: 'Revenue' },
      { amount: 9500000, period: 4, description: 'Revenue' },
      { amount: 10000000, period: 5, description: 'Revenue' },
      { amount: 10500000, period: 6, description: 'Revenue' }
    ],
    discountRate: 0.12,
    analysis: undefined
  }
];

export const InvestmentCards: React.FC = () => {
  // Use real streaming IESO data
  const { data: demandData, connectionStatus, isUsingRealData, error } = useStreamingData('ontario-demand');
  const [investments, setInvestments] = useState<SimpleInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Create investments based on real data or fallback
  const createDynamicInvestments = useCallback((demand: number, price: number, useRealData: boolean) => {
    // Base investment size on real demand data
    const baseInvestmentPerMW = 1500; // $1.5M per MW installed capacity
    const baseRevenuePerMW = price * 8760 * 0.12; // Annual revenue based on electricity price

    return [
      {
        id: 1,
        name: useRealData ? `Ontario Solar Investment (${demand.toLocaleString()} MW demand)` : 'Ontario Solar Farm',
        description: useRealData
          ? `Real-time solar investment based on current Ontario electricity demand of ${demand.toLocaleString()} MW at ${(price * 100).toFixed(1)}¢/kWh`
          : 'Large-scale photovoltaic installation',
        cashFlows: [
          { amount: -(demand * baseInvestmentPerMW * 0.8), period: 0, description: 'Capital investment' },
          { amount: demand * baseInvestmentPerMW * 0.18, period: 1, description: 'Year 1 revenue' },
          { amount: demand * baseInvestmentPerMW * 0.20, period: 2, description: 'Year 2 revenue' },
          { amount: demand * baseInvestmentPerMW * 0.22, period: 3, description: 'Year 3 revenue' },
          { amount: demand * baseInvestmentPerMW * 0.24, period: 4, description: 'Year 4 revenue' },
          { amount: demand * baseInvestmentPerMW * 0.26, period: 5, description: 'Year 5 revenue' },
        ],
        discountRate: 0.08,
        analysis: undefined
      },

      {
        id: 2,
        name: useRealData ? 'Battery Storage for Peak Demand' : 'Battery Storage System',
        description: useRealData
          ? `Grid stabilization for ${demand.toLocaleString()} MW Ontario demand`
          : '4MW battery storage system',
        cashFlows: [
          { amount: -(demand * 400), period: 0, description: 'Battery system capital' },
          { amount: demand * 80, period: 1, description: 'Peak shaving revenue' },
          { amount: demand * 90, period: 2, description: 'Grid services revenue' },
          { amount: demand * 95, period: 3, description: 'Frequency regulation' },
          { amount: demand * 100, period: 4, description: 'Ancillary services' },
        ],
        discountRate: 0.10,
        analysis: undefined
      },

      {
        id: 3,
        name: useRealData ? `Wind Development (${(demand * 0.6).toLocaleString()} MW capacity)` : 'Wind Energy Project',
        description: useRealData
          ? `Offshore wind farm development for ${demand.toLocaleString()} MW peak demand`
          : 'Offshore wind farm with 50 turbines',
        cashFlows: [
          { amount: -(demand * 2000), period: 0, description: 'Wind farm development' },
          { amount: demand * 500, period: 1, description: 'Year 1 wind energy revenue' },
          { amount: demand * 550, period: 2, description: 'Year 2 wind energy revenue' },
          { amount: demand * 600, period: 3, description: 'Year 3 wind energy revenue' },
          { amount: demand * 650, period: 4, description: 'Year 4 wind energy revenue' },
          { amount: demand * 700, period: 5, description: 'Year 5 wind energy revenue' },
        ],
        discountRate: 0.12,
        analysis: undefined
      }
    ];
  }, []);

  // Process real IESO data and create investments
  useEffect(() => {
    if (demandData.length > 0) {
      // Latest IESO data point
      const latestPoint = demandData[demandData.length - 1];
      const currentDemand = latestPoint.values.demand_mw || 10000; // Default to 10GW if not available
      const currentPrice = latestPoint.values.price_cents_kwh || 8.5; // Default price

      // Create dynamic investments based on real data
      const dynamicInvestments = createDynamicInvestments(currentDemand, currentPrice, isUsingRealData);

      // Calculate NPV/IRR for each investment
      const analyzedInvestments = dynamicInvestments.map(investment => {
        if (!investment.analysis) {
          const analysis = financialEngine.analyzeInvestment(
            investment.cashFlows,
            investment.discountRate
          );
          return { ...investment, analysis };
        }
        return investment;
      });

      setInvestments(analyzedInvestments);
      setLoading(false);
      setFallbackMode(!isUsingRealData);
    } else if (demandData.length === 0 && (connectionStatus === 'connected' || connectionStatus === 'error')) {
      // Fallback to enhanced static data if no streaming data available
      const fallbackInvestments = createDynamicInvestments(12000, 9.2, false);
      const analyzedInvestments = fallbackInvestments.map(investment => ({
        ...investment,
        analysis: financialEngine.analyzeInvestment(investment.cashFlows, investment.discountRate)
      }));

      setInvestments(analyzedInvestments);
      setLoading(false);
      setFallbackMode(true);
    }
  }, [demandData, isUsingRealData, connectionStatus, createDynamicInvestments]);

  // Calculate portfolio metrics
  const portfolioMetrics = React.useMemo(() => {
    const analyzedInvestments = investments.filter(inv => inv.analysis);
    const totalNPV = analyzedInvestments.reduce((sum, inv) => sum + (inv.analysis?.npv || 0), 0);
    const totalInvestment = analyzedInvestments.reduce((sum, inv) => sum + Math.abs(inv.cashFlows[0]?.amount || 0), 0);

    return {
      totalNPV,
      totalInvestment,
      netReturn: totalNPV - totalInvestment
    };
  }, [investments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 animate-spin text-electric" />
          <span className="text-secondary">Loading investment analysis...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Hero Section with Improved Layout */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900 via-green-900 to-teal-900">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
        </div>

        <div className={CONTAINER_CLASSES.page}>
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-serif font-light text-white mb-6 tracking-tight animate-fade-in">
              Investment Portfolio
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400 font-medium">
                Analysis
              </span>
            </h1>

            <p className={`${TEXT_CLASSES.body} text-xl lg:text-2xl text-green-100 font-light max-w-3xl mx-auto leading-relaxed animate-fade-in-delayed`}>
              AI-powered financial analysis with real-time market data integration
            </p>
          </div>
        </div>
      </div>

      <div className={CONTAINER_CLASSES.page}>
        {/* Portfolio Key Metrics with Improved Grid */}
        <div className={CONTAINER_CLASSES.gridDashboard}>
          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <TrendingUp className={`h-8 w-8 ${COLOR_SCHEMES.success.accent}`} />
              <div>
                <div className={`${TEXT_CLASSES.metricLabel} ${COLOR_SCHEMES.success.accent}`}>Total NPV</div>
                <div className={TEXT_CLASSES.metric}>
                  ${(portfolioMetrics.totalNPV / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <Activity className={`h-8 w-8 ${COLOR_SCHEMES.primary.accent}`} />
              <div>
                <div className={`${TEXT_CLASSES.metricLabel} ${COLOR_SCHEMES.primary.accent}`}>Total Investment</div>
                <div className={TEXT_CLASSES.metric}>
                  ${(portfolioMetrics.totalInvestment / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <Briefcase className={`h-8 w-8 ${COLOR_SCHEMES.info.accent}`} />
              <div>
                <div className={`${TEXT_CLASSES.metricLabel} ${COLOR_SCHEMES.info.accent}`}>Net Return</div>
                <div className={TEXT_CLASSES.metric}>
                  ${(portfolioMetrics.netReturn / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <TrendingUp className={`h-8 w-8 ${COLOR_SCHEMES.warning.accent}`} />
              <div>
                <div className={`${TEXT_CLASSES.metricLabel} ${COLOR_SCHEMES.warning.accent}`}>Portfolio Health</div>
                <div className={TEXT_CLASSES.metric}>
                  {portfolioMetrics.totalNPV > 0 ? 'Strong' : 'Attention Needed'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Risk Analysis Summary with Improved Layout */}
        <div className="card p-6 mb-8">
          <h3 className={`${TEXT_CLASSES.heading3} mb-4`}>AI Risk Analysis Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className={`${TEXT_CLASSES.body} font-semibold ${COLOR_SCHEMES.info.accent}`}>Market Risk</div>
              <div className={TEXT_CLASSES.body}>Low - Strong renewable demand</div>
            </div>
            <div className="space-y-2">
              <div className={`${TEXT_CLASSES.body} font-semibold ${COLOR_SCHEMES.info.accent}`}>Regulatory Risk</div>
              <div className={TEXT_CLASSES.body}>Medium - Policy changes possible</div>
            </div>
            <div className="space-y-2">
              <div className={`${TEXT_CLASSES.body} font-semibold ${COLOR_SCHEMES.info.accent}`}>Technology Risk</div>
              <div className={TEXT_CLASSES.body}>Low - Proven technologies in use</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Data Status with Enhanced Layout */}
      <div
        className={`px-6 py-4 rounded-lg text-sm mx-6 mb-6 bg-secondary border ${
          isUsingRealData && connectionStatus === 'connected'
            ? 'border-green-500/60 text-secondary'
            : fallbackMode
              ? 'border-electric/60 text-secondary'
              : 'border-yellow-500/70 text-secondary'
        }`}
      >
        <div className={CONTAINER_CLASSES.flexBetween}>
          {isUsingRealData && connectionStatus === 'connected' ? (
            <>
              <Wifi className={`h-5 w-5 ${COLOR_SCHEMES.success.accent}`} />
              <div className="flex-1 ml-4">
                <div className={`${TEXT_CLASSES.body} font-semibold text-success`}>🎯 LIVE Ontario Market Data</div>
                <div className={`${TEXT_CLASSES.bodySmall} text-success opacity-80`}>
                  Investments calculated from real-time IESO demand data
                  {demandData.length > 0 && demandData[demandData.length - 1] &&
                    ` (${demandData[demandData.length - 1].values.demand_mw?.toLocaleString() || '0'} MW demand)`
                  }
                </div>
              </div>
            </>
          ) : fallbackMode ? (
            <>
              <Briefcase className={`h-5 w-5 ${COLOR_SCHEMES.primary.accent}`} />
              <div className="flex-1 ml-4">
                <div className={`${TEXT_CLASSES.body} font-semibold text-primary`}>💡 Enhanced Analysis Mode</div>
                <div className={`${TEXT_CLASSES.bodySmall} text-secondary opacity-80`}>
                  Using calculated models with Ontario market conditions
                </div>
              </div>
            </>
          ) : (
            <>
              <WifiOff className={`h-5 w-5 ${COLOR_SCHEMES.warning.accent}`} />
              <div className="flex-1 ml-4">
                <div className={`${TEXT_CLASSES.body} font-semibold text-warning`}>
                  {connectionStatus === 'connecting' ? '🔄 Connecting...' : '⚠️ Connection Issue'}
                </div>
                <div className={`${TEXT_CLASSES.bodySmall} text-secondary opacity-80`}>
                  {connectionStatus === 'connecting'
                    ? 'Establishing connection to live market data'
                    : 'Using enhanced calculation models'
                  }
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Investment Cards Grid with Improved Responsive Layout */}
      <div className={`${CONTAINER_CLASSES.page} pb-8`}>
        <div className={LAYOUT_UTILS.generateGridClasses(3, true)}>
          {investments.map((investment) => {
            const { npv, irr } = investment.analysis || {};

            return (
              <div key={investment.id} className={`${CONTAINER_CLASSES.card} hover:shadow-xl transition-all duration-500 hover:scale-[1.02] group`}>
                {/* Card Header with Enhanced Layout */}
                <div className={`${CONTAINER_CLASSES.cardHeader} bg-gradient-to-r from-emerald-600 to-green-600 text-white group-hover:from-emerald-700 group-hover:to-green-700 transition-all duration-300`}>
                  <div className={CONTAINER_CLASSES.flexBetween}>
                    <div className="flex-1">
                      <h3 className={`${TEXT_CLASSES.heading3} mb-2 text-white`}>{investment.name}</h3>
                      <p className={`${TEXT_CLASSES.body} text-emerald-100 text-sm leading-relaxed`}>{investment.description}</p>
                    </div>
                  </div>
                </div>

                {/* Card Content with Improved Spacing */}
                <div className={CONTAINER_CLASSES.cardBody}>
                  {/* Key Metrics with Enhanced Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={`text-center p-4 bg-gradient-to-br ${COLOR_SCHEMES.success.bg} rounded-xl border ${COLOR_SCHEMES.success.border} group-hover:shadow-md transition-all duration-300`}>
                      <div className={`${TEXT_CLASSES.bodySmall} ${COLOR_SCHEMES.success.accent} mb-2 font-semibold`}>NPV</div>
                      <div className={`${TEXT_CLASSES.metric} ${COLOR_SCHEMES.success.text}`}>
                        {npv !== null && npv !== undefined ? `${(npv / 1000000).toFixed(2)}M` : '—'}
                      </div>
                    </div>

                    <div className={`text-center p-4 bg-gradient-to-br ${COLOR_SCHEMES.primary.bg} rounded-xl border ${COLOR_SCHEMES.primary.border} group-hover:shadow-md transition-all duration-300`}>
                      <div className={`${TEXT_CLASSES.bodySmall} ${COLOR_SCHEMES.primary.accent} mb-2 font-semibold`}>IRR</div>
                      <div className={`${TEXT_CLASSES.metric} ${COLOR_SCHEMES.primary.text}`}>
                        {irr !== null && irr !== undefined ? `${(irr * 100).toFixed(1)}%` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Discount Rate with Improved Styling */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className={`${TEXT_CLASSES.body} font-semibold text-slate-700`}>Discount Rate:</span>
                    <span className={`${TEXT_CLASSES.body} ml-2 ${COLOR_SCHEMES.primary.accent} font-bold`}>
                      {(investment.discountRate * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Real-time Update Indicator with Enhanced Layout */}
                  {isUsingRealData && connectionStatus === 'connected' && (
                    <div className={`${CONTAINER_CLASSES.flexBetween} mt-6 pt-4 border-t border-slate-200/50`}>
                      <div className={`flex items-center space-x-2 ${TEXT_CLASSES.bodySmall} ${COLOR_SCHEMES.success.accent}`}>
                        <div className={`w-2 h-2 bg-green-500 rounded-full animate-pulse`}></div>
                        <span className="font-semibold">Auto-updating every minute</span>
                      </div>
                      <div className={`${TEXT_CLASSES.caption} text-slate-500`}>
                        Last updated: {demandData.length > 0 && new Date(demandData[demandData.length - 1]?.timestamp || Date.now()).toLocaleTimeString('en-CA', {
                          hour12: false,
                          timeZone: 'America/Toronto'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};