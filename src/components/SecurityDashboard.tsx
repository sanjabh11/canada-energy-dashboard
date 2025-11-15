import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CONTAINER_CLASSES } from '../lib/ui/layout';
import { useStreamingData } from '../hooks/useStreamingData';
import { useWebSocketConsultation } from '../hooks/useWebSocket';
import { fetchEdgeJson } from '../lib/edge';
import { BarChart, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { Shield, AlertTriangle, Eye, Lock, Zap, Activity, TrendingUp, Target, Clock, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { PartialFeatureWarning } from './FeatureStatusBadge';
import { HelpButton } from './HelpButton';

// Interfaces for Security Dashboard
export interface ThreatModel {
  id: string;
  type: 'cyber' | 'physical' | 'supply_chain' | 'geopolitical' | 'natural_disaster';
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: number; // 0-1
  impact: number; // 0-1
  description: string;
  affectedAssets: string[];
  mitigationStrategies: string[];
  detectionMethods: string[];
  lastAssessed: string;
  riskScore: number; // calculated from likelihood * impact
}

export interface SecurityIncident {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'contained' | 'resolved';
  description: string;
  affectedSystems: string[];
  timestamp: string;
  responseTime: number; // minutes
  resolutionTime?: number; // minutes
}

export interface SecurityMetrics {
  overallRiskScore: number;
  activeIncidents: number;
  criticalVulnerabilities: number;
  complianceScore: number;
  threatDetectionRate: number;
  lastUpdated: string;
}

export interface MitigationStrategy {
  id: string;
  threatId: string;
  strategy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  implementationStatus: 'planned' | 'in_progress' | 'implemented' | 'effective';
  expectedEffectiveness: number; // 0-1
  cost: number;
  timeline: string;
  responsibleParty: string;
}

const SecurityDashboard: React.FC = () => {
  const [threatModels, setThreatModels] = useState<ThreatModel[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [mitigationStrategies, setMitigationStrategies] = useState<MitigationStrategy[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use streaming data for security monitoring
  const { data: securityData, connectionStatus, isUsingRealData } = useStreamingData('security-events');

  // Use WebSocket for real-time security alerts
  const {
    messages: wsMessages,
    connectionStatus: wsConnectionStatus,
    isConnected: wsConnected,
    sendMessage: sendWsMessage
  } = useWebSocketConsultation('security-monitoring');

  // Load initial data
  const inferSeverity = useCallback((impact: number, likelihood: number): ThreatModel['severity'] => {
    const score = impact * likelihood;
    if (score >= 0.6) return 'critical';
    if (score >= 0.4) return 'high';
    if (score >= 0.2) return 'medium';
    return 'low';
  }, []);

  const mapThreatModel = useCallback((record: any): ThreatModel | null => {
    if (!record) return null;

    return {
      id: record.id || `threat_${record.vector || record.category || Date.now()}`,
      type: (record.category || 'cyber') as ThreatModel['type'],
      severity: (record.severity || inferSeverity(record.impact ?? 0, record.likelihood ?? 0)) as ThreatModel['severity'],
      likelihood: Number(record.likelihood ?? 0),
      impact: Number(record.impact ?? 0),
      description: record.description || record.mitigation_summary || 'Threat description pending',
      affectedAssets: Array.isArray(record.affected_assets) ? record.affected_assets : [],
      mitigationStrategies: Array.isArray(record.mitigation_strategies) ? record.mitigation_strategies : [],
      detectionMethods: Array.isArray(record.detection_methods) ? record.detection_methods : [],
      lastAssessed: record.last_reviewed || record.lastAssessed || new Date().toISOString(),
      riskScore: Number(record.likelihood ?? 0) * Number(record.impact ?? 0)
    };
  }, [inferSeverity]);

  const mapIncident = useCallback((record: any, fallbackId: string | number): SecurityIncident | null => {
    if (!record) return null;

    return {
      id: record.id || `incident_${fallbackId}`,
      type: String(record.incident_type || record.type || 'unknown'),
      severity: (record.severity || 'medium') as SecurityIncident['severity'],
      status: (record.status || 'detected') as SecurityIncident['status'],
      description: record.description || 'Security event detected',
      affectedSystems: Array.isArray(record.affected_systems) ? record.affected_systems : [],
      timestamp: record.detected_at || record.timestamp || new Date().toISOString(),
      responseTime: Number(record.response_time_minutes ?? record.responseTime ?? 0),
      resolutionTime: record.resolution_time_minutes ?? record.resolutionTime
        ? Number(record.resolution_time_minutes ?? record.resolutionTime)
        : undefined
    };
  }, []);

  const mapMitigation = useCallback((record: any): MitigationStrategy | null => {
    if (!record) return null;

    return {
      id: record.id || `mitigation_${record.strategy_name || Date.now()}`,
      threatId: record.related_threat || record.threatId || '',
      strategy: record.strategy_name || record.strategy || 'Mitigation strategy',
      priority: (record.priority || 'medium') as MitigationStrategy['priority'],
      implementationStatus: (record.status || 'planned') as MitigationStrategy['implementationStatus'],
      expectedEffectiveness: Number(record.effectiveness ?? record.expectedEffectiveness ?? 0),
      cost: Number(record.cost_estimate ?? record.cost ?? 0),
      timeline: `${record.time_to_implement_days ?? record.timeline ?? 0} days`,
      responsibleParty: record.responsible_party || record.responsibleParty || 'Unassigned'
    };
  }, []);

  const extractThreatModels = useCallback((payload: any): ThreatModel[] => {
    const list = Array.isArray(payload?.threats) ? payload.threats : Array.isArray(payload) ? payload : [];
    return list.map(mapThreatModel).filter((item): item is ThreatModel => item !== null);
  }, [mapThreatModel]);

  const extractIncidents = useCallback((payload: any): SecurityIncident[] => {
    const list = Array.isArray(payload?.incidents) ? payload.incidents : Array.isArray(payload) ? payload : [];
    return list.map((record, index) => mapIncident(record, index)).filter((item): item is SecurityIncident => item !== null);
  }, [mapIncident]);

  const extractMetrics = useCallback((payload: any): SecurityMetrics | null => {
    const source = Array.isArray(payload) ? payload[0] : payload;
    if (!source) return null;

    return {
      overallRiskScore: Number(source.overall_risk_score ?? source.overallRiskScore ?? 0),
      activeIncidents: Number(source.active_incidents_count ?? source.activeIncidents ?? 0),
      criticalVulnerabilities: Number(source.critical_vulnerabilities ?? source.criticalVulnerabilities ?? 0),
      complianceScore: Number(source.compliance_score ?? source.complianceScore ?? 0),
      threatDetectionRate: Number(source.detection_rate ?? source.threatDetectionRate ?? 0),
      lastUpdated: source.last_updated || source.lastUpdated || new Date().toISOString()
    };
  }, []);

  const extractMitigations = useCallback((payload: any): MitigationStrategy[] => {
    const list = Array.isArray(payload?.strategies) ? payload.strategies : Array.isArray(payload) ? payload : [];
    return list.map(mapMitigation).filter((item): item is MitigationStrategy => item !== null);
  }, [mapMitigation]);

  const loadSecurityData = useCallback(async () => {
    try {
      setLoading(true);

      const [threatResult, incidentResult, metricsResult, mitigationResult] = await Promise.all([
        fetchEdgeJson([
          'api-v2-security-threat-models',
          'api/security/threat-models'
        ]),
        fetchEdgeJson([
          'api-v2-security-incidents',
          'api/security/incidents'
        ]),
        fetchEdgeJson([
          'api-v2-security-metrics',
          'api/security/metrics'
        ]),
        fetchEdgeJson([
          'api-v2-security-mitigation-strategies',
          'api/security/mitigation-strategies'
        ])
      ]);

      const mappedThreats: ThreatModel[] = extractThreatModels(threatResult.json);
      setThreatModels(mappedThreats);

      const mappedIncidents: SecurityIncident[] = extractIncidents(incidentResult.json);
      setIncidents(mappedIncidents);

      const mappedMetrics = extractMetrics(metricsResult.json);
      setSecurityMetrics(mappedMetrics);

      const mappedStrategies: MitigationStrategy[] = extractMitigations(mitigationResult.json);
      setMitigationStrategies(mappedStrategies);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isEdgeDisabled = message.includes('VITE_ENABLE_EDGE_FETCH=false');
      if (!isEdgeDisabled) {
        console.error('Failed to load security data', err);
      }

      setError(
        isEdgeDisabled
          ? 'Supabase Edge fetch disabled via configuration. Showing security fallback dataset.'
          : err instanceof Error
            ? err.message
            : 'Failed to load security data'
      );
    } finally {
      setLoading(false);
    }
  }, [extractIncidents, extractMetrics, extractMitigations, extractThreatModels]);

  const processSecurityData = useCallback((data: any[]) => {
    if (data.length === 0) return;

    const newIncidents = data
      .map((event, index) => mapIncident(event, `stream_${Date.now()}_${index}`))
      .filter((item): item is SecurityIncident => item !== null);

    if (newIncidents.length === 0) return;

    setIncidents(prev => [...newIncidents, ...prev].slice(0, 100)); // Keep last 100 incidents
  }, [mapIncident]);

  useEffect(() => {
    loadSecurityData();
  }, [selectedTimeframe, loadSecurityData]);

  useEffect(() => {
    if (securityData.length > 0) {
      processSecurityData(securityData);
    }
  }, [securityData, processSecurityData]);

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    if (!securityMetrics) return null;

    const activeIncidents = incidents.filter(i => i.status !== 'resolved').length;
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const avgResponseTime = incidents.length > 0
      ? incidents.reduce((sum, i) => sum + i.responseTime, 0) / incidents.length
      : 0;

    return {
      overallRiskScore: securityMetrics.overallRiskScore,
      activeIncidents,
      criticalIncidents,
      complianceScore: securityMetrics.complianceScore,
      threatDetectionRate: securityMetrics.threatDetectionRate,
      avgResponseTime
    };
  }, [securityMetrics, incidents]);

  // Prepare threat model data for scatter plot
  const threatScatterData = useMemo(() => {
    return threatModels.map(threat => ({
      x: threat.likelihood * 100,
      y: threat.impact * 100,
      name: threat.type,
      severity: threat.severity,
      riskScore: threat.riskScore
    }));
  }, [threatModels]);

  // Prepare incident timeline data
  const incidentTimelineData = useMemo(() => {
    const last24Hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - i);
      return hour.toISOString().substring(0, 13); // YYYY-MM-DDTHH
    }).reverse();

    return last24Hours.map(hour => {
      const hourIncidents = incidents.filter(incident =>
        incident.timestamp.startsWith(hour)
      );

      return {
        hour: hour.substring(11, 13) + ':00', // HH:00
        incidents: hourIncidents.length,
        critical: hourIncidents.filter(i => i.severity === 'critical').length,
        resolved: hourIncidents.filter(i => i.status === 'resolved').length
      };
    });
  }, [incidents]);

  // Prepare threat type distribution
  const threatTypeData = useMemo(() => {
    const typeCount = threatModels.reduce((acc, threat) => {
      acc[threat.type] = (acc[threat.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCount).map(([type, count]) => ({
      type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      color: type === 'cyber' ? '#ef4444' : type === 'physical' ? '#f59e0b' : type === 'supply_chain' ? '#3b82f6' : '#10b981'
    }));
  }, [threatModels]);

  // Prepare mitigation status data
  const mitigationStatusData = useMemo(() => {
    const statusCount = mitigationStrategies.reduce((acc, strategy) => {
      acc[strategy.implementationStatus] = (acc[strategy.implementationStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCount).map(([status, count]) => ({
      status: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      color: status === 'implemented' ? '#10b981' : status === 'in_progress' ? '#f59e0b' : status === 'planned' ? '#6b7280' : '#ef4444'
    }));
  }, [mitigationStrategies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={CONTAINER_CLASSES.page}>
        {/* Feature Warning */}
        <PartialFeatureWarning featureId="security_assessment" />
        
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">
              Security Assessment Dashboard
            </h1>
            <HelpButton id="security.overview" />
          </div>
          <p className="text-slate-600">
            Threat modeling, incident monitoring, and security mitigation strategies
          </p>
        </header>

        {/* Security Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                (dashboardMetrics?.overallRiskScore || 0) < 30 ? 'bg-green-100 text-green-700' :
                (dashboardMetrics?.overallRiskScore || 0) < 70 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {(dashboardMetrics?.overallRiskScore || 0) < 30 ? <Shield className="h-3 w-3" /> :
                 (dashboardMetrics?.overallRiskScore || 0) < 70 ? <AlertTriangle className="h-3 w-3" /> :
                 <AlertCircle className="h-3 w-3" />}
                <span>{(dashboardMetrics?.overallRiskScore || 0) < 30 ? 'LOW RISK' :
                       (dashboardMetrics?.overallRiskScore || 0) < 70 ? 'MEDIUM RISK' : 'HIGH RISK'}</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Overall Risk Score</h3>
            <p className="text-3xl font-bold text-red-600">
              {dashboardMetrics?.overallRiskScore?.toFixed(1) || '0.0'}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Out of 100 (lower is better)
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                (dashboardMetrics?.activeIncidents || 0) === 0 ? 'bg-green-100 text-green-700' :
                (dashboardMetrics?.activeIncidents || 0) < 5 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                <AlertTriangle className="h-3 w-3" />
                <span>{(dashboardMetrics?.activeIncidents || 0) === 0 ? 'CLEAR' : 'ACTIVE'}</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Active Incidents</h3>
            <p className="text-3xl font-bold text-orange-600">
              {dashboardMetrics?.activeIncidents || 0}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {dashboardMetrics?.criticalIncidents || 0} critical incidents
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                (dashboardMetrics?.complianceScore || 0) > 90 ? 'bg-green-100 text-green-700' :
                (dashboardMetrics?.complianceScore || 0) > 70 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                <Target className="h-3 w-3" />
                <span>{(dashboardMetrics?.complianceScore || 0) > 90 ? 'COMPLIANT' : 'MONITOR'}</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Compliance Score</h3>
            <p className="text-3xl font-bold text-blue-600">
              {dashboardMetrics?.complianceScore?.toFixed(1) || '0.0'}%
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Regulatory compliance rating
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                (dashboardMetrics?.threatDetectionRate || 0) > 95 ? 'bg-green-100 text-green-700' :
                (dashboardMetrics?.threatDetectionRate || 0) > 80 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                <Activity className="h-3 w-3" />
                <span>{(dashboardMetrics?.threatDetectionRate || 0) > 95 ? 'EXCELLENT' : 'GOOD'}</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Detection Rate</h3>
            <p className="text-3xl font-bold text-green-600">
              {dashboardMetrics?.threatDetectionRate?.toFixed(1) || '0.0'}%
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Threat detection effectiveness
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Threat Risk Matrix */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Threat Risk Matrix</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={threatScatterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, 100]}
                  label={{ value: 'Likelihood (%)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0, 100]}
                  label={{ value: 'Impact (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `${value}%`,
                    name === 'x' ? 'Likelihood' : 'Impact'
                  ]}
                  labelFormatter={(label) => `Threat: ${threatScatterData.find(d => d.x === label)?.name || 'Unknown'}`}
                />
                <Scatter
                  dataKey="y"
                  fill="#ef4444"
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    const color = payload.severity === 'critical' ? '#ef4444' :
                                 payload.severity === 'high' ? '#f59e0b' :
                                 payload.severity === 'medium' ? '#3b82f6' : '#10b981';
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={color}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-slate-600">
              Risk matrix showing threat likelihood vs impact. Circle size indicates risk score.
            </div>
          </div>

          {/* Incident Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Incident Timeline (24h)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incidentTimelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="incidents" stackId="a" fill="#ef4444" name="Total Incidents" />
                <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" />
                <Bar dataKey="resolved" stackId="b" fill="#10b981" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Threat Types Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Threat Types Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={threatTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, count }) => `${type}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {threatTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Mitigation Strategies Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Mitigation Strategies Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mitigationStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Incidents Table */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Recent Security Incidents</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Type</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Severity</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Description</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Response Time</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {incidents.slice(0, 10).map((incident) => (
                  <tr key={incident.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm text-slate-900">
                      {incident.type.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                        incident.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        incident.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {incident.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                        incident.status === 'resolved' ? 'bg-green-100 text-green-700' :
                        incident.status === 'contained' ? 'bg-blue-100 text-blue-700' :
                        incident.status === 'investigating' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {incident.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600 max-w-xs truncate">
                      {incident.description}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {incident.responseTime}min
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-500">
                      {new Date(incident.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-4 flex items-center justify-end space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full ${
              wsConnected ? 'bg-green-500' : 'bg-yellow-500'
            }`}></span>
            <span className="text-slate-600">
              {wsConnected ? 'Real-time Security Monitoring Active' : 'Security Monitoring Offline'}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            <span className="text-slate-600">
              {connectionStatus === 'connected' ? 'Security Data Stream Active' : 'Security Data Stream Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;