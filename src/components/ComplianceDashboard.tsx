/**
 * Regulatory Compliance Monitoring Dashboard
 *
 * Comprehensive monitoring of regulatory compliance across projects,
 * with violation tracking, audit trails, and AI-powered remediation.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Clock, Eye,
  FileText, Activity, Database, TrendingUp, Bell, AlertCircle,
  Archive, Settings, Star
} from 'lucide-react';
import { fetchEdgePostJson, type EdgeFetchOptions } from '../lib/edge';
import { ENDPOINTS } from '../lib/constants';
import { AcceptableFeatureInfo } from './FeatureStatusBadge';

interface ComplianceRecord {
  id: string;
  projectId: string;
  projectName: string;
  ruleId: string;
  ruleName: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'review';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  assignedTo: string;
  dueDate: string;
  remediationSteps?: string[];
}

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
}

interface ViolationAlert {
  id: string;
  ruleId: string;
  projectId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

interface ComplianceData {
  projects: Array<{
    id: string;
    projectName: string;
    complianceScore: number;
    violations: number;
    lastAudit: string;
  }>;
  violations: ComplianceRecord[];
  auditLog: AuditEntry[];
  alerts: ViolationAlert[];
}

// Enhanced mock compliance data with more realistic structures
// TODO: Replace with real Environment Canada and Provincial regulator APIs
const mockComplianceData = [
  {
    id: '项目-001',
    projectName: 'Ontario Wind Farm Expansion',
    complianceScore: 87,
    violations: 3,
    lastAudit: '2025-01-15',
    regulator: 'Environment Canada',
    jurisdiction: 'Ontario'
  },
  {
    id: '项目-002',
    projectName: 'BC Solar Array Development',
    complianceScore: 94,
    violations: 1,
    lastAudit: '2025-01-14',
    regulator: 'BC Ministry of Environment',
    jurisdiction: 'British Columbia'
  },
  {
    id: '项目-003',
    projectName: 'Quebec Hydro Reservoir Maintenance',
    complianceScore: 76,
    violations: 7,
    lastAudit: '2025-01-13',
    regulator: 'MDDELCC',
    jurisdiction: 'Quebec'
  }
];

const mockViolations = [
  {
    id: 'V-001',
    projectId: '项目-001',
    projectName: 'Ontario Wind Farm',
    ruleId: 'ENV-001',
    ruleName: 'Environmental Impact Assessment',
    status: 'non_compliant' as const,
    severity: 'high' as const,
    description: 'Insufficient biodiversity impact assessment for eagle habitat',
    timestamp: '2025-01-10T10:30:00Z',
    assignedTo: 'compliance.officer@.environ.can.gov',
    dueDate: '2025-02-15',
    remediationSteps: [
      'Conduct comprehensive biodiversity survey',
      'Submit impact mitigation plan to Environment Canada',
      'Obtain eagle habitat protection certificate'
    ]
  },
  {
    id: 'V-002',
    projectId: '项目-003',
    projectName: 'Quebec Hydro Reservoir',
    ruleId: 'SAFETY-002',
    ruleName: 'Worker Safety Protocols',
    status: 'non_compliant' as const,
    severity: 'critical' as const,
    description: 'Emergency evacuation procedures not updated for flood scenarios',
    timestamp: '2025-01-12T14:45:00Z',
    assignedTo: 'safety.manager@hydro.qc.ca',
    dueDate: '2025-02-01',
    remediationSteps: [
      'Revise emergency evacuation procedures',
      'Conduct employee safety training',
      'Install additional emergency lighting'
    ]
  }
];

const mockAuditLog = [
  {
    id: 'AUD-001',
    timestamp: '2025-01-15T09:15:00Z',
    userId: 'compliance.officer@environ.can.gov',
    action: 'Updated SARAH Report',
    resource: 'Ontario Wind Farm',
    details: 'Modified environmental impact assessment submission',
    ipAddress: '192.168.1.100'
  },
  {
    id: 'AUD-002',
    timestamp: '2025-01-14T16:22:00Z',
    userId: 'sarah.admin@gov.qc.ca',
    action: 'Reviewed Compliance Documents',
    resource: 'Quebec Hydro',
    details: 'Approved permitting documentation and safety protocols',
    ipAddress: '192.168.1.101'
  }
];

const mockAlerts = [
  {
    id: 'AL-001',
    ruleId: 'ENV-001',
    projectId: '项目-001',
    message: 'Critical environmental violation requiring immediate attention',
    severity: 'critical' as const,
    timestamp: '2025-01-10T10:30:00Z',
    status: 'active' as const
  }
];

export const ComplianceDashboard: React.FC = () => {
  const [data, setData] = useState<ComplianceData>({
    projects: mockComplianceData,
    violations: mockViolations,
    auditLog: mockAuditLog,
    alerts: mockAlerts
  });

  const [remediationAdvice, setRemediationAdvice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const remediationAbortRef = useRef<AbortController | null>(null);

  const loadComplianceData = useCallback(async (projectFilter: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      setData(prev => {
        const projectsForScore = projectFilter === 'all'
          ? prev.projects
          : prev.projects.filter(project => project.id === projectFilter);

        const complianceScores = projectsForScore.map(project => ({
          project: project.projectName,
          current: project.complianceScore,
          month1: Math.max(0, project.complianceScore - (Math.random() * 10)),
          month2: Math.max(0, project.complianceScore + (Math.random() - 0.5) * 15),
          month3: project.complianceScore
        }));

        return {
          ...prev,
          complianceScores
        } as any;
      });
    } catch (error) {
      console.error('Error loading compliance data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplianceData(selectedProject);
  }, [selectedProject, loadComplianceData]);

  // Generate remediation advice using LLM
  const loadRemediationAdvice = useCallback(async (violationId: string) => {
    remediationAbortRef.current?.abort();
    const controller = new AbortController();
    remediationAbortRef.current = controller;

    setLoadingAdvice(true);
    try {
      const violation = data.violations.find(v => v.id === violationId);
      if (!violation) return;

      // Use market-brief endpoint adapted for compliance remediation
      const { json } = await fetchEdgePostJson([
        ENDPOINTS.LLM.MARKET_BRIEF, // Adapt as needed for compliance-focused endpoint
      ], {
        datasetPath: 'compliance_violations',
        timeframe: 'current',
        focus: `environmental and safety compliance remediation for: ${violation.description}`,
        requestType: 'remediation_guidance'
      }, { signal: controller.signal } as EdgeFetchOptions);

      const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;

      if (!controller.signal.aborted) {
        setRemediationAdvice({
          violationId,
          advice: payload,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error('Remediation advice load failed:', e);
    } finally {
      if (!controller.signal.aborted) setLoadingAdvice(false);
    }
  }, [data.violations]);

  // Process chart data
  const severityChartData = [
    { name: 'Low', count: data.violations.filter(v => v.severity === 'low').length },
    { name: 'Medium', count: data.violations.filter(v => v.severity === 'medium').length },
    { name: 'High', count: data.violations.filter(v => v.severity === 'high').length },
    { name: 'Critical', count: data.violations.filter(v => v.severity === 'critical').length }
  ];

  // Time-series compliance data (mock)
  const timeSeriesData = data.projects.map(project => ({
    date: '2025-01-15',
    [project.projectName]: project.complianceScore,
    category: 'current'
  }));

  const filteredViolations = data.violations.filter(v => {
    const matchProject = selectedProject === 'all' || v.projectId === selectedProject;
    const matchSeverity = filterSeverity === 'all' || v.severity === filterSeverity;
    return matchProject && matchSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 border-red-200 bg-red-50';
      case 'high': return 'text-orange-600 border-orange-200 bg-orange-50';
      case 'medium': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'low': return 'text-blue-600 border-blue-200 bg-blue-50';
      default: return 'text-slate-600 border-slate-200 bg-slate-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    const className = "h-4 w-4";
    switch (severity) {
      case 'critical': return <XCircle className={`${className} text-red-500`} />;
      case 'high': return <AlertTriangle className={`${className} text-orange-500`} />;
      case 'medium': return <AlertCircle className={`${className} text-yellow-500`} />;
      case 'low': return <CheckCircle className={`${className} text-blue-500`} />;
      default: return <Clock className={`${className} text-slate-500`} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant': return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Compliant</span>;
      case 'non_compliant': return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">Non-compliant</span>;
      case 'pending': return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">Pending</span>;
      case 'review': return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">Under Review</span>;
      default: return <span className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-full">Unknown</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Feature Info */}
      <AcceptableFeatureInfo featureId="compliance_monitoring" />
      
      {/* Dashboard Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-green-500 p-3 rounded-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Regulatory Compliance Monitoring</h1>
              <p className="text-slate-600">Centralized compliance tracking and audit trails for environmental and safety regulations</p>
            </div>
          </div>

          {/* Data Source Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <Database className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-blue-700 text-sm">
                  <strong>Data Source:</strong> Currently using enhanced mock data for demonstration.
                  Production deployment will integrate with Environment Canada and Provincial regulator APIs.
                </p>
              </div>
            </div>
          </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <div className="text-sm text-green-600 font-medium">Compliant Projects</div>
              <div className="text-xl font-bold text-green-800">
                {data.projects.filter(p => p.complianceScore > 80).length}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
            <XCircle className="h-6 w-6 text-red-600" />
            <div>
              <div className="text-sm text-red-600 font-medium">Critical Violations</div>
              <div className="text-xl font-bold text-red-800">
                {data.violations.filter(v => v.severity === 'critical').length}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <div className="text-sm text-blue-600 font-medium">Active Audits</div>
              <div className="text-xl font-bold text-blue-800">3</div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
            <Clock className="h-6 w-6 text-purple-600" />
            <div>
              <div className="text-sm text-purple-600 font-medium">Avg Resolution Time</div>
              <div className="text-xl font-bold text-purple-800">12 days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {data.alerts.filter(a => a.status === 'active').length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2 mb-4">
            <Bell className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-800">Active Violation Alerts</h2>
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm">
              {data.alerts.filter(a => a.status === 'active').length} new
            </span>
          </div>
          <div className="space-y-3">
            {data.alerts.filter(a => a.status === 'active').map((alert) => (
              <div key={alert.id} className="p-4 rounded-lg border border-red-200 bg-red-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">
                        {data.violations.find(v => v.ruleId === alert.ruleId)?.ruleName}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">{alert.message}</div>
                      <div className="text-xs text-slate-500 mt-2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-slate-200">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'violations', label: 'Violations', icon: AlertTriangle },
            { id: 'audit', label: 'Audit Trail', icon: Archive }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-4 font-medium ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Project Compliance Scores */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Project Compliance Scores</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.projects.map((project) => (
                  <div key={project.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-slate-800">{project.projectName}</h4>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Compliance Score</span>
                          <span className={project.complianceScore > 80 ? 'text-green-600' : 'text-red-600'}>
                            {project.complianceScore}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              project.complianceScore > 80 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${project.complianceScore}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Violations</span>
                        <span className="font-semibold text-red-600">{project.violations}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Last audit: {new Date(project.lastAudit).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Violation Severity Chart */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Violation Distribution by Severity</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={severityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'violations' && (
          <div className="space-y-6">

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Projects</option>
                  {data.projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.projectName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Violations List */}
            <div className="space-y-4">
              {filteredViolations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <div>No violations found matching the filters.</div>
                </div>
              ) : (
                filteredViolations.map((violation) => (
                  <div
                    key={violation.id}
                    className={`p-6 rounded-lg border ${getSeverityColor(violation.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        {getSeverityIcon(violation.severity)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-slate-800">{violation.ruleName}</h4>
                            {getStatusBadge(violation.status)}
                          </div>
                          <div className="text-slate-600 mb-1">{violation.description}</div>
                          <div className="text-sm text-slate-500">
                            <div>Project: {violation.projectName}</div>
                            <div>Assigned to: {violation.assignedTo}</div>
                            <div>Due: {new Date(violation.dueDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {violation.remediationSteps && violation.remediationSteps.length > 0 && (
                      <div className="mt-4">
                        <button
                          onClick={() => loadRemediationAdvice(violation.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 mb-2 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          AI Remediation Guidance
                        </button>

                        {loadingAdvice ? (
                          <div className="text-slate-600">Loading AI recommendations...</div>
                        ) : (
                          <div>
                            <div className="text-sm font-medium text-slate-700 mb-2">Remediation Steps:</div>
                            <ul className="space-y-1">
                              {violation.remediationSteps.map((step, index) => (
                                <li key={index} className="text-sm text-slate-600 flex items-start">
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Audit Trail</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
              {data.auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start space-x-3 p-3 bg-white rounded-md">
                  <Archive className="h-4 w-4 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800">{entry.action}</div>
                    <div className="text-sm text-slate-600">Resource: {entry.resource}</div>
                    <div className="text-xs text-slate-500 mt-1">{entry.details}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(entry.timestamp).toLocaleString()} • {entry.userId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};