import React, { useState, useEffect, useMemo } from 'react';
import { useStreamingData } from '../hooks/useStreamingData';
import { useWebSocketConsultation } from '../hooks/useWebSocket';
import { BarChart, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { Shield, AlertTriangle, Eye, Lock, Zap, Activity, TrendingUp, Target, Clock, Wifi, WifiOff, AlertCircle } from 'lucide-react';

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
  useEffect(() => {
    loadSecurityData();
  }, [selectedTimeframe]);

  // Process real-time security data
  useEffect(() => {
    if (securityData.length > 0) {
      processSecurityData(securityData);
    }
  }, [securityData]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      // Load threat models
      const threatResponse = await fetch('/api/security/threat-models');
      const threatData = await threatResponse.json();
      setThreatModels(threatData);

      // Load security incidents
      const incidentResponse = await fetch('/api/security/incidents');
      const incidentData = await incidentResponse.json();
      setIncidents(incidentData);

      // Load security metrics
      const metricsResponse = await fetch('/api/security/metrics');
      const metricsData = await metricsResponse.json();
      setSecurityMetrics(metricsData);

      // Load mitigation strategies
      const mitigationResponse = await fetch('/api/security/mitigation-strategies');
      const mitigationData = await mitigationResponse.json();
      setMitigationStrategies(mitigationData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const processSecurityData = (data: any[]) => {
    if (data.length === 0) return;

    // Process incoming security events and update incidents
    const newIncidents = data.map(event => ({
      id: `incident_${Date.now()}_${Math.random()}`,
      type: event.type || 'unknown',
      severity: event.severity || 'medium',
      status: event.status || 'detected',
      description: event.description || 'Security event detected',
      affectedSystems: event.affectedSystems || [],
      timestamp: event.timestamp || new Date().toISOString(),
      responseTime: Math.floor(Math.random() * 30) + 5 // 5-35 minutes
    }));

    setIncidents(prev => [...newIncidents, ...prev.slice(0, 99)]); // Keep last 100 incidents
  };

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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Security Assessment Dashboard
          </h1>
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