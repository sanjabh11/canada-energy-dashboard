/**
 * CER (Canada Energy Regulator) Compliance Dashboard
 * 
 * Comprehensive monitoring and tracking of CER regulatory compliance
 * across Canadian energy infrastructure including pipelines, power lines,
 * processing plants, and storage facilities.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Shield, AlertTriangle, CheckCircle, Clock, FileText,
  MapPin, Factory, Zap, Gauge, TrendingUp, Eye, Search,
  Filter, Download, Calendar, Users, Settings, Package as PackageIcon
} from 'lucide-react';
import {
  canadianRegulatoryService,
  type CERComplianceRecord,
  type CERMarketOversight
} from '../lib/canadianRegulatory';
import { HelpButton } from './HelpButton';

interface ComplianceMetrics {
  totalFacilities: number;
  compliantFacilities: number;
  nonCompliantFacilities: number;
  underReviewFacilities: number;
  complianceRate: number;
  criticalViolations: number;
  upcomingInspections: number;
}

interface FilterOptions {
  province: string;
  facilityType: string;
  complianceStatus: string;
  operator: string;
}

const COMPLIANCE_COLORS = {
  compliant: '#10B981',
  non_compliant: '#EF4444',
  under_review: '#F59E0B',
  conditional: '#8B5CF6'
};

const FACILITY_TYPE_ICONS = {
  pipeline: Factory,
  power_line: Zap,
  processing_plant: Settings,
  storage_facility: PackageIcon
};

export const CERComplianceDashboard: React.FC = () => {
  const [complianceRecords, setComplianceRecords] = useState<CERComplianceRecord[]>([]);
  const [marketOversight, setMarketOversight] = useState<CERMarketOversight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<CERComplianceRecord | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'facilities' | 'violations' | 'market'>('overview');
  
  const [filters, setFilters] = useState<FilterOptions>({
    province: '',
    facilityType: '',
    complianceStatus: '',
    operator: ''
  });

  useEffect(() => {
    loadComplianceData();
  }, [filters]);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      // Fetch from CER compliance API
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_EDGE_BASE}/api-v2-cer-compliance?province=${filters.province || ''}&type=${filters.facilityType || ''}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const apiData = await response.json();
      console.log('[CER] Loaded from API:', apiData);

      // Transform API data to dashboard format
      const records = apiData.records?.map((r: any) => ({
        id: r.id,
        facility_id: r.id,
        facility_name: r.company_name || 'Unknown Facility',
        facility_type: 'pipeline',
        operator: r.company_name,
        province: r.province,
        cer_regulation: 'CER Act',
        compliance_status: r.severity === 'Low' ? 'compliant' : 'under_review',
        last_inspection_date: r.date,
        next_inspection_due: new Date(new Date(r.date).getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        violations: r.severity !== 'Low' ? [{
          violation_id: r.id,
          violation_type: r.incident_type,
          severity: r.severity.toLowerCase(),
          description: r.description,
          date_identified: r.date,
          corrective_action_required: r.status === 'Open',
          corrective_action_deadline: new Date(new Date(r.date).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: r.status.toLowerCase().replace(' ', '_')
        }] : [],
        environmental_conditions: [],
        safety_performance: {
          incident_count: 0,
          lost_time_injury_frequency: 0,
          environmental_incidents: 0,
          near_misses: 0
        },
        notes: r.description
      })) || [];

      setComplianceRecords(records);

      // Use sample data for market oversight (not in API yet)
      const sampleMarketOversight: CERMarketOversight[] = [];
      setMarketOversight(sampleMarketOversight);

      // Fallback to sample data if API returns empty
      if (records.length === 0) {
        console.log('[CER] Using sample data fallback');
        const sampleComplianceRecords: CERComplianceRecord[] = [
        {
          id: 'cer_001',
          facility_id: 'TC_001',
          facility_name: 'Trans Mountain Pipeline System',
          facility_type: 'pipeline',
          operator: 'Trans Mountain Corporation',
          province: 'Alberta',
          cer_regulation: 'CER Act - Pipeline Safety',
          compliance_status: 'compliant',
          last_inspection_date: '2024-08-15',
          next_inspection_due: '2025-02-15',
          violations: [],
          environmental_conditions: [
            {
              condition_id: 'env_001',
              description: 'Wildlife crossing monitoring',
              compliance_status: 'met',
              monitoring_frequency: 'monthly',
              last_reported: '2024-09-01'
            }
          ],
          safety_performance: {
            incident_count_12m: 2,
            safety_rating: 'good',
            last_safety_audit: '2024-07-20'
          }
        },
        {
          id: 'cer_002',
          facility_id: 'NOVA_001',
          facility_name: 'NOVA Gas Transmission System',
          facility_type: 'pipeline',
          operator: 'TC Energy',
          province: 'Alberta',
          cer_regulation: 'CER Act - Pipeline Safety',
          compliance_status: 'non_compliant',
          last_inspection_date: '2024-07-10',
          next_inspection_due: '2024-10-10',
          violations: [
            {
              violation_id: 'viol_001',
              regulation_section: 'Section 6.5(1)(a)',
              severity: 'major',
              description: 'Inadequate pipeline integrity monitoring',
              date_identified: '2024-07-10',
              remediation_deadline: '2024-12-31',
              status: 'in_progress'
            }
          ],
          environmental_conditions: [
            {
              condition_id: 'env_002',
              description: 'Wetland restoration monitoring',
              compliance_status: 'not_met',
              monitoring_frequency: 'quarterly',
              last_reported: '2024-06-30'
            }
          ],
          safety_performance: {
            incident_count_12m: 5,
            safety_rating: 'needs_improvement',
            last_safety_audit: '2024-06-15'
          }
        },
        {
          id: 'cer_003',
          facility_id: 'HYDRO_001',
          facility_name: 'Manitoba-Saskatchewan Transmission Line',
          facility_type: 'power_line',
          operator: 'Manitoba Hydro',
          province: 'Manitoba',
          cer_regulation: 'CER Act - Electricity Infrastructure',
          compliance_status: 'compliant',
          last_inspection_date: '2024-09-01',
          next_inspection_due: '2025-03-01',
          violations: [],
          environmental_conditions: [
            {
              condition_id: 'env_003',
              description: 'Bird collision mitigation',
              compliance_status: 'met',
              monitoring_frequency: 'annual',
              last_reported: '2024-08-15'
            }
          ],
          safety_performance: {
            incident_count_12m: 0,
            safety_rating: 'excellent',
            last_safety_audit: '2024-08-01'
          }
        }
      ];

      const sampleMarketOversight: CERMarketOversight[] = [
        {
          id: 'market_001',
          market_participant: 'Enbridge Gas Distribution',
          participant_type: 'distributor',
          license_number: 'CER-D-001',
          license_status: 'active',
          authorized_activities: ['Natural gas distribution', 'Storage operations'],
          market_share_percent: 35.2,
          compliance_score: 92,
          recent_filings: [
            {
              filing_type: 'Rate Application',
              submission_date: '2024-08-15',
              status: 'approved',
              description: '2025 Rate Schedule Update'
            }
          ]
        }
      ];

        setComplianceRecords(sampleComplianceRecords);
        setMarketOversight(sampleMarketOversight);
      }
    } catch (error) {
      console.error('Error loading CER compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics: ComplianceMetrics = useMemo(() => {
    const total = complianceRecords.length;
    const compliant = complianceRecords.filter(r => r.compliance_status === 'compliant').length;
    const nonCompliant = complianceRecords.filter(r => r.compliance_status === 'non_compliant').length;
    const underReview = complianceRecords.filter(r => r.compliance_status === 'under_review').length;
    
    const criticalViolations = complianceRecords.reduce((sum, record) => 
      sum + record.violations.filter(v => v.severity === 'critical').length, 0
    );

    const upcomingInspections = complianceRecords.filter(record => {
      const dueDate = new Date(record.next_inspection_due);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return dueDate <= thirtyDaysFromNow;
    }).length;

    return {
      totalFacilities: total,
      compliantFacilities: compliant,
      nonCompliantFacilities: nonCompliant,
      underReviewFacilities: underReview,
      complianceRate: total > 0 ? (compliant / total) * 100 : 0,
      criticalViolations,
      upcomingInspections
    };
  }, [complianceRecords]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return complianceRecords.filter(record => {
      if (filters.province && record.province !== filters.province) return false;
      if (filters.facilityType && record.facility_type !== filters.facilityType) return false;
      if (filters.complianceStatus && record.compliance_status !== filters.complianceStatus) return false;
      if (filters.operator && !record.operator.toLowerCase().includes(filters.operator.toLowerCase())) return false;
      return true;
    });
  }, [complianceRecords, filters]);

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50 border-green-200';
      case 'non_compliant': return 'text-red-600 bg-red-50 border-red-200';
      case 'under_review': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'conditional': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSafetyRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs_improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="text-red-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">CER Compliance Dashboard</h1>
              <p className="text-slate-600">Canada Energy Regulator • Regulatory Compliance Monitoring</p>
            </div>
            <HelpButton id="cer.overview" />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 rounded-lg p-1">
              {['overview', 'facilities', 'violations', 'market'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download size={16} />
              Export Report
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Factory className="text-blue-600" size={24} />
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Facilities</p>
                <p className="text-2xl font-bold text-blue-900">{metrics.totalFacilities}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <p className="text-sm text-green-600 font-medium">Compliance Rate</p>
                <p className="text-2xl font-bold text-green-900">{metrics.complianceRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-600" size={24} />
              <div>
                <p className="text-sm text-red-600 font-medium">Critical Violations</p>
                <p className="text-2xl font-bold text-red-900">{metrics.criticalViolations}</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-orange-600" size={24} />
              <div>
                <p className="text-sm text-orange-600 font-medium">Upcoming Inspections</p>
                <p className="text-2xl font-bold text-orange-900">{metrics.upcomingInspections}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compliance Status Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Compliance Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Compliant', value: metrics.compliantFacilities, color: COMPLIANCE_COLORS.compliant },
                    { name: 'Non-Compliant', value: metrics.nonCompliantFacilities, color: COMPLIANCE_COLORS.non_compliant },
                    { name: 'Under Review', value: metrics.underReviewFacilities, color: COMPLIANCE_COLORS.under_review }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Compliant', value: metrics.compliantFacilities, color: COMPLIANCE_COLORS.compliant },
                    { name: 'Non-Compliant', value: metrics.nonCompliantFacilities, color: COMPLIANCE_COLORS.non_compliant },
                    { name: 'Under Review', value: metrics.underReviewFacilities, color: COMPLIANCE_COLORS.under_review }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Safety Performance Trends */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Safety Performance by Facility Type</h3>
            <div className="space-y-3">
              {['pipeline', 'power_line', 'processing_plant', 'storage_facility'].map((type) => {
                const facilities = complianceRecords.filter(r => r.facility_type === type);
                const avgIncidents = facilities.length > 0 
                  ? facilities.reduce((sum, f) => sum + f.safety_performance.incident_count_12m, 0) / facilities.length 
                  : 0;
                
                return (
                  <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="capitalize font-medium">{type.replace('_', ' ')}</span>
                      <span className="text-sm text-slate-600">({facilities.length} facilities)</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{avgIncidents.toFixed(1)} incidents/year</p>
                      <p className="text-sm text-slate-600">Average</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'facilities' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Facility Compliance Status</h3>
            
            {/* Filters */}
            <div className="flex items-center gap-3">
              <select
                value={filters.province}
                onChange={(e) => setFilters({...filters, province: e.target.value})}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All Provinces</option>
                <option value="Alberta">Alberta</option>
                <option value="British Columbia">British Columbia</option>
                <option value="Saskatchewan">Saskatchewan</option>
                <option value="Manitoba">Manitoba</option>
                <option value="Ontario">Ontario</option>
                <option value="Quebec">Quebec</option>
              </select>
              
              <select
                value={filters.facilityType}
                onChange={(e) => setFilters({...filters, facilityType: e.target.value})}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">All Types</option>
                <option value="pipeline">Pipeline</option>
                <option value="power_line">Power Line</option>
                <option value="processing_plant">Processing Plant</option>
                <option value="storage_facility">Storage Facility</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <div key={record.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-slate-900">{record.facility_name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium border ${getComplianceStatusColor(record.compliance_status)}`}>
                        {record.compliance_status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 mb-3">
                      <div>
                        <p className="font-medium">Operator</p>
                        <p>{record.operator}</p>
                      </div>
                      <div>
                        <p className="font-medium">Province</p>
                        <p>{record.province}</p>
                      </div>
                      <div>
                        <p className="font-medium">Type</p>
                        <p className="capitalize">{record.facility_type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="font-medium">Safety Rating</p>
                        <p className={`font-medium capitalize ${getSafetyRatingColor(record.safety_performance.safety_rating)}`}>
                          {record.safety_performance.safety_rating.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span>Last Inspection: {new Date(record.last_inspection_date).toLocaleDateString()}</span>
                      <span>Next Due: {new Date(record.next_inspection_due).toLocaleDateString()}</span>
                      <span>Violations: {record.violations.length}</span>
                      <span>Incidents (12m): {record.safety_performance.incident_count_12m}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedRecord(record)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye size={14} />
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facility Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{selectedRecord.facility_name} - Compliance Details</h4>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Violations */}
              <div>
                <h5 className="font-medium text-slate-900 mb-3">Violations ({selectedRecord.violations.length})</h5>
                {selectedRecord.violations.length > 0 ? (
                  <div className="space-y-3">
                    {selectedRecord.violations.map((violation) => (
                      <div key={violation.violation_id} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            violation.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            violation.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {violation.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            violation.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            violation.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {violation.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{violation.regulation_section}</p>
                        <p className="text-sm text-slate-600 mb-2">{violation.description}</p>
                        <div className="text-xs text-slate-500">
                          <p>Identified: {new Date(violation.date_identified).toLocaleDateString()}</p>
                          <p>Deadline: {new Date(violation.remediation_deadline).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No violations recorded</p>
                )}
              </div>

              {/* Environmental Conditions */}
              <div>
                <h5 className="font-medium text-slate-900 mb-3">Environmental Conditions</h5>
                <div className="space-y-3">
                  {selectedRecord.environmental_conditions.map((condition) => (
                    <div key={condition.condition_id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{condition.description}</span>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          condition.compliance_status === 'met' ? 'bg-green-100 text-green-800' :
                          condition.compliance_status === 'not_met' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {condition.compliance_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        <p>Frequency: {condition.monitoring_frequency}</p>
                        <p>Last Reported: {new Date(condition.last_reported).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CERComplianceDashboard;
