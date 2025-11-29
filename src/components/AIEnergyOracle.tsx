/**
 * AI Energy Oracle Dashboard - Predictive Intelligence
 * 
 * AI-powered energy intelligence platform that supports predictive insights
 * and decision support for energy monitoring.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Brain, Zap, AlertTriangle, TrendingUp, Target, MessageSquare, 
  Activity, Shield, Lightbulb, Clock, Globe, Search, Mic, 
  Play, Pause, Settings, Download, Share, Eye, ChevronRight,
  Cpu, Database, Network, Gauge
} from 'lucide-react';
import { aiOracle, type EnergyForecast, type EnergyAnomaly, type IntelligentAlert, type NaturalLanguageResponse } from '../lib/aiOracle';

interface OracleState {
  isActive: boolean;
  mode: 'monitoring' | 'predicting' | 'optimizing' | 'briefing';
  lastUpdate: string;
  processingLoad: number;
  activeModels: string[];
}

interface PredictiveInsight {
  id: string;
  type: 'forecast' | 'anomaly' | 'opportunity' | 'risk';
  title: string;
  description: string;
  confidence: number;
  timeframe: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  data: any;
}

export const AIEnergyOracle: React.FC = () => {
  const [oracleState, setOracleState] = useState<OracleState>({
    isActive: true,
    mode: 'monitoring',
    lastUpdate: new Date().toISOString(),
    processingLoad: 0,
    activeModels: ['demand-forecast', 'anomaly-detection', 'price-prediction']
  });

  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [forecast, setForecast] = useState<EnergyForecast | null>(null);
  const [anomalies, setAnomalies] = useState<EnergyAnomaly[]>([]);
  const [alerts, setAlerts] = useState<IntelligentAlert[]>([]);
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [nlResponse, setNlResponse] = useState<NaturalLanguageResponse | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Real-time processing simulation
  const processingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const insightInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRealTimeProcessing = useCallback(() => {
    if (processingInterval.current) {
      clearInterval(processingInterval.current);
      processingInterval.current = null;
    }
    if (insightInterval.current) {
      clearInterval(insightInterval.current);
      insightInterval.current = null;
    }
  }, []);

  const generateNewInsight = useCallback(() => {
    const insightTypes = ['forecast', 'anomaly', 'opportunity', 'risk'] as const;
    const impacts = ['low', 'medium', 'high', 'critical'] as const;

    const newInsight: PredictiveInsight = {
      id: `insight_${Date.now()}`,
      type: insightTypes[Math.floor(Math.random() * insightTypes.length)],
      title: 'New AI-Generated Insight',
      description: 'Real-time analysis has identified a new pattern requiring attention.',
      confidence: Math.floor(Math.random() * 40) + 60,
      timeframe: Math.random() > 0.5 ? '2 hours' : '1 day',
      impact: impacts[Math.floor(Math.random() * impacts.length)],
      actionable: Math.random() > 0.3,
      data: {}
    };

    setInsights(prev => [newInsight, ...prev.slice(0, 9)]);
  }, []);

  const startRealTimeProcessing = useCallback(() => {
    stopRealTimeProcessing();

    processingInterval.current = setInterval(() => {
      setOracleState(prev => ({
        ...prev,
        processingLoad: Math.random() * 100,
        lastUpdate: new Date().toISOString()
      }));
    }, 2000);

    insightInterval.current = setInterval(() => {
      generateNewInsight();
    }, 15000);
  }, [generateNewInsight, stopRealTimeProcessing]);

  const generateInitialInsights = useCallback(async () => {
    const initialInsights: PredictiveInsight[] = [
      {
        id: 'insight_001',
        type: 'forecast',
        title: 'Peak Demand Surge Predicted',
        description: 'AI models predict 15% demand increase in Ontario grid within next 4 hours due to temperature drop and industrial activity patterns.',
        confidence: 87,
        timeframe: '4 hours',
        impact: 'high',
        actionable: true,
        data: { predicted_increase: 15, affected_regions: ['Toronto', 'Ottawa', 'Hamilton'] }
      },
      {
        id: 'insight_002',
        type: 'opportunity',
        title: 'Optimal Wind Generation Window',
        description: 'Weather patterns indicate ideal wind conditions for next 6 hours. Recommend maximizing wind farm output and reducing gas generation.',
        confidence: 92,
        timeframe: '6 hours',
        impact: 'medium',
        actionable: true,
        data: { potential_savings: 450000, co2_reduction: 125 }
      },
      {
        id: 'insight_003',
        type: 'risk',
        title: 'Supply Chain Vulnerability Detected',
        description: 'Critical minerals supply risk elevated due to geopolitical tensions. Lithium and rare earth imports may face disruption.',
        confidence: 73,
        timeframe: '30 days',
        impact: 'critical',
        actionable: true,
        data: { affected_minerals: ['Lithium', 'Rare Earth'], risk_increase: 25 }
      },
      {
        id: 'insight_004',
        type: 'anomaly',
        title: 'Unusual Grid Frequency Pattern',
        description: 'AI detected subtle frequency variations in Alberta grid that may indicate equipment stress or cyber interference.',
        confidence: 68,
        timeframe: 'immediate',
        impact: 'medium',
        actionable: true,
        data: { frequency_deviation: 0.15, affected_substations: 3 }
      }
    ];

    setInsights(initialInsights);
  }, []);

  useEffect(() => {
    if (oracleState.isActive) {
      startRealTimeProcessing();
      generateInitialInsights();
    } else {
      stopRealTimeProcessing();
    }

    return () => {
      stopRealTimeProcessing();
    };
  }, [oracleState.isActive, startRealTimeProcessing, stopRealTimeProcessing, generateInitialInsights]);

  const handleNaturalLanguageQuery = async () => {
    if (!naturalLanguageQuery.trim()) return;
    
    setLoading(true);
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResponse: NaturalLanguageResponse = {
        answer: `Based on current data analysis, ${naturalLanguageQuery.toLowerCase()} shows interesting patterns. The AI Oracle has identified several key trends and correlations that may be relevant to your query.`,
        data_sources: ['IESO Real-time Data', 'Weather Canada', 'Statistics Canada'],
        visualizations: [
          {
            type: 'chart',
            config: { type: 'line', title: 'Trend Analysis' },
            data: Array.from({ length: 24 }, (_, i) => ({
              hour: i,
              value: Math.random() * 100 + 50
            }))
          }
        ],
        follow_up_questions: [
          'What are the main drivers of this trend?',
          'How does this compare to historical patterns?',
          'What actions should be taken?'
        ],
        confidence: Math.floor(Math.random() * 30) + 70,
        generated_at: new Date().toISOString()
      };
      
      setNlResponse(mockResponse);
    } catch (error) {
      console.error('Error processing natural language query:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    // In a real implementation, this would start/stop speech recognition
    if (!isListening) {
      setTimeout(() => setIsListening(false), 3000); // Auto-stop after 3 seconds
    }
  };

  const getInsightIcon = (type: PredictiveInsight['type']) => {
    switch (type) {
      case 'forecast': return <TrendingUp className="text-blue-500" size={20} />;
      case 'anomaly': return <AlertTriangle className="text-red-500" size={20} />;
      case 'opportunity': return <Lightbulb className="text-green-500" size={20} />;
      case 'risk': return <Shield className="text-orange-500" size={20} />;
      default: return <Activity className="text-gray-500" size={20} />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Oracle Header */}
      <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 rounded-lg shadow-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Brain size={32} className="text-blue-300" />
              {oracleState.isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Energy Oracle</h1>
              <p className="text-blue-200">Predictive Intelligence • Real-time Analysis • Autonomous Insights</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-blue-200">Processing Load</div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-blue-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-500"
                    style={{ width: `${oracleState.processingLoad}%` }}
                  ></div>
                </div>
                <span className="text-sm font-mono">{oracleState.processingLoad.toFixed(0)}%</span>
              </div>
            </div>
            
            <button
              onClick={() => setOracleState(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                oracleState.isActive 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {oracleState.isActive ? <Pause size={16} /> : <Play size={16} />}
              {oracleState.isActive ? 'Pause' : 'Activate'}
            </button>
          </div>
        </div>

        {/* Oracle Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Cpu size={16} className="text-blue-300" />
              <span className="text-sm font-medium">Active Models</span>
            </div>
            <div className="text-lg font-bold">{oracleState.activeModels.length}</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Database size={16} className="text-green-300" />
              <span className="text-sm font-medium">Data Sources</span>
            </div>
            <div className="text-lg font-bold">12</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Network size={16} className="text-purple-300" />
              <span className="text-sm font-medium">Insights Generated</span>
            </div>
            <div className="text-lg font-bold">{insights.length}</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Gauge size={16} className="text-yellow-300" />
              <span className="text-sm font-medium">Accuracy</span>
            </div>
            <div className="text-lg font-bold">94.2%</div>
          </div>
        </div>
      </div>

      {/* Natural Language Interface */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold text-slate-900">Ask the Oracle</h3>
        </div>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={naturalLanguageQuery}
              onChange={(e) => setNaturalLanguageQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNaturalLanguageQuery()}
              placeholder="Ask anything about Canada's energy system... e.g., 'What will Ontario's peak demand be tomorrow?'"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
            />
            <button
              onClick={toggleVoiceInput}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${
                isListening ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Mic size={16} />
            </button>
          </div>
          
          <button
            onClick={handleNaturalLanguageQuery}
            disabled={loading || !naturalLanguageQuery.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Search size={16} />
            )}
            {loading ? 'Analyzing...' : 'Ask Oracle'}
          </button>
        </div>

        {/* Natural Language Response */}
        {nlResponse && (
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="text-blue-600" size={16} />
                <span className="font-medium text-slate-900">Oracle Response</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Confidence: {nlResponse.confidence}%</span>
                <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${nlResponse.confidence}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <p className="text-slate-700 mb-4">{nlResponse.answer}</p>
            
            {nlResponse.visualizations.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-slate-900 mb-2">Generated Visualization</h5>
                <div className="h-48 bg-white rounded border">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={nlResponse.visualizations[0].data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {nlResponse.follow_up_questions.length > 0 && (
              <div>
                <h5 className="font-medium text-slate-900 mb-2">Suggested Follow-up Questions</h5>
                <div className="flex flex-wrap gap-2">
                  {nlResponse.follow_up_questions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setNaturalLanguageQuery(question)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Predictive Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Insights */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="text-yellow-500" size={20} />
              <h3 className="text-lg font-semibold text-slate-900">Predictive Insights</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock size={14} />
              <span>Updated {new Date(oracleState.lastUpdate).toLocaleTimeString()}</span>
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {insights.map((insight) => (
              <div key={insight.id} className={`border rounded-lg p-3 ${getImpactColor(insight.impact)}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(insight.type)}
                    <h4 className="font-medium">{insight.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span>{insight.confidence}%</span>
                    <span>•</span>
                    <span>{insight.timeframe}</span>
                  </div>
                </div>
                <p className="text-sm mb-2">{insight.description}</p>
                {insight.actionable && (
                  <button className="flex items-center gap-1 text-xs font-medium hover:underline">
                    View Actions <ChevronRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* System Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-green-500" size={20} />
            <h3 className="text-lg font-semibold text-slate-900">Oracle Performance</h3>
          </div>
          
          <div className="space-y-4">
            {/* Processing Load Chart */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">AI Processing Load</span>
                <span className="text-sm text-slate-600">{oracleState.processingLoad.toFixed(1)}%</span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={Array.from({ length: 20 }, (_, i) => ({
                    time: i,
                    load: Math.random() * 100
                  }))}>
                    <defs>
                      <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="load" stroke="#3B82F6" fillOpacity={1} fill="url(#loadGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model Status */}
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Active AI Models</h4>
              <div className="space-y-2">
                {oracleState.activeModels.map((model, index) => (
                  <div key={model} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm text-slate-700 capitalize">{model.replace('-', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-slate-600">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Center */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="text-purple-600" size={20} />
            <h3 className="text-lg font-semibold text-slate-900">Intelligent Action Center</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <Settings size={14} />
              Configure
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-blue-600" size={16} />
              <span className="font-medium text-blue-900">Optimization Opportunities</span>
            </div>
            <p className="text-sm text-blue-700 mb-3">3 high-impact optimizations identified</p>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Review Recommendations →
            </button>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-red-600" size={16} />
              <span className="font-medium text-red-900">Risk Mitigation</span>
            </div>
            <p className="text-sm text-red-700 mb-3">2 critical risks require immediate attention</p>
            <button className="text-sm text-red-600 hover:text-red-800 font-medium">
              View Action Plan →
            </button>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="text-green-600" size={16} />
              <span className="font-medium text-green-900">Innovation Opportunities</span>
            </div>
            <p className="text-sm text-green-700 mb-3">5 emerging technologies to evaluate</p>
            <button className="text-sm text-green-600 hover:text-green-800 font-medium">
              Explore Technologies →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEnergyOracle;
