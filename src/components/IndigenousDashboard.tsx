import React, { useState, useEffect } from 'react';
import { CONTAINER_CLASSES } from '../lib/ui/layout';
import { useStreamingData } from '../hooks/useStreamingData';
import { useWebSocketConsultation } from '../hooks/useWebSocket';
import { BarChart, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart, Bar, Pie } from 'recharts';
import TerritorialMap, { mockTerritories, mockMapPoints } from './TerritorialMap';
import { AlertTriangle } from 'lucide-react';

// Interfaces for Indigenous dashboard data
export interface TerritoryData {
  id: string;
  name: string;
  coordinates: [number, number][];
  consultationStatus: 'not_started' | 'ongoing' | 'completed' | 'pending';
  community: string;
  traditionalTerritory: string;
  lastActivity: string;
}

export interface FPICWorkflow {
  id: string;
  territoryId: string;
  stage: 'information' | 'consultation' | 'negotiation' | 'agreement';
  status: 'pending' | 'approved' | 'declined' | 'deferred';
  participants: string[];
  dateCreated: string;
  lastUpdated: string;
}

export interface TEKEntry {
  id: string;
  title: string;
  category: 'cultural' | 'environmental' | 'spiritual' | 'economic';
  description: string;
  community: string;
  dateRecorded: string;
  custodians: string[];
  relatedTerritories: string[];
}

export const IndigenousDashboard: React.FC = () => {
  const [territories, setTerritories] = useState<TerritoryData[]>([]);
  const [fpicWorkflows, setFpicWorkflows] = useState<FPICWorkflow[]>([]);
  const [tekEntries, setTekEntries] = useState<TEKEntry[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use streaming data for real Indigenous data (governance-compliant sources)
  // IMPORTANT: Only use data that has been approved through proper governance processes
  // const { data: indigenousData, connectionStatus } = useStreamingData('indigenous');

  // For now, using governance-approved public data sources only
  // TODO: Implement real Indigenous data integration with proper governance approval
  const indigenousData = [];
  const connectionStatus = 'connected';

  // Use WebSocket for real-time consultation updates
  const {
    messages: wsMessages,
    connectionStatus: wsConnectionStatus,
    isConnected: wsConnected,
    sendMessage: sendWsMessage
  } = useWebSocketConsultation('general-consultation');

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Mock data for demonstration - in production, this would come from Supabase
      const mockTerritories: TerritoryData[] = [
        {
          id: '1',
          name: 'Treaty 5 Territory',
          coordinates: [[-95, 55]],
          consultationStatus: 'completed' as const,
          community: 'Cree, Ojibwe, Dene',
          traditionalTerritory: 'Treaty 5 Territory',
          lastActivity: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Treaty 9 Territory',
          coordinates: [[-80, 50]],
          consultationStatus: 'ongoing' as const,
          community: 'Ojibwe, Cree, Oji-Cree',
          traditionalTerritory: 'Treaty 9 Territory',
          lastActivity: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Dene Territory',
          coordinates: [[-120, 60]],
          consultationStatus: 'pending' as const,
          community: 'Dene, Sahtu, North Slave',
          traditionalTerritory: 'Dene Territory',
          lastActivity: new Date().toISOString()
        }
      ];

      const mockFpicWorkflows = [
        {
          id: '1',
          territoryId: '1',
          stage: 'agreement' as const,
          status: 'approved' as const,
          participants: ['Community Council', 'Energy Company', 'Government'],
          dateCreated: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        {
          id: '2',
          territoryId: '2',
          stage: 'consultation' as const,
          status: 'pending' as const,
          participants: ['Community Council', 'Energy Company'],
          dateCreated: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      ];

      const mockTekEntries = [
        {
          id: '1',
          title: 'Traditional Land Use Mapping',
          category: 'cultural' as const,
          description: 'Documenting traditional hunting and fishing territories',
          community: 'Cree Nation',
          dateRecorded: new Date().toISOString(),
          custodians: ['Elder John', 'Knowledge Keeper Mary'],
          relatedTerritories: ['Treaty 5 Territory']
        },
        {
          id: '2',
          title: 'Medicinal Plant Knowledge',
          category: 'environmental' as const,
          description: 'Traditional uses of local medicinal plants',
          community: 'Ojibwe Community',
          dateRecorded: new Date().toISOString(),
          custodians: ['Traditional Healer'],
          relatedTerritories: ['Treaty 9 Territory']
        },
        {
          id: '3',
          title: 'Ceremonial Practices',
          category: 'spiritual' as const,
          description: 'Sacred sites and ceremonial locations',
          community: 'Dene First Nation',
          dateRecorded: new Date().toISOString(),
          custodians: ['Spiritual Leader'],
          relatedTerritories: ['Dene Territory']
        }
      ];

      setTerritories(mockTerritories);
      setFpicWorkflows(mockFpicWorkflows);
      setTekEntries(mockTekEntries);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard metrics
  const dashboardMetrics = React.useMemo(() => {
    const total = territories.length;
    const ongoing = territories.filter(t => t.consultationStatus === 'ongoing').length;
    const completed = territories.filter(t => t.consultationStatus === 'completed').length;
    const pending = territories.filter(t => t.consultationStatus === 'pending').length;

    return {
      totalTerritories: total,
      ongoingConsultations: ongoing,
      completedConsultations: completed,
      pendingConsultations: pending,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }, [territories]);

  // Prepare chart data
  const consultationChartData = [
    { name: 'Completed', value: dashboardMetrics.completedConsultations, color: '#10b981' },
    { name: 'Ongoing', value: dashboardMetrics.ongoingConsultations, color: '#f59e0b' },
    { name: 'Pending', value: dashboardMetrics.pendingConsultations, color: '#ef4444' },
    { name: 'Not Started', value: dashboardMetrics.totalTerritories - dashboardMetrics.completedConsultations - dashboardMetrics.ongoingConsultations - dashboardMetrics.pendingConsultations, color: '#6b7280' }
  ];

  const tekByCategoryData = [
    { name: 'Cultural', value: tekEntries.filter(e => e.category === 'cultural').length },
    { name: 'Environmental', value: tekEntries.filter(e => e.category === 'environmental').length },
    { name: 'Spiritual', value: tekEntries.filter(e => e.category === 'spiritual').length },
    { name: 'Economic', value: tekEntries.filter(e => e.category === 'economic').length }
  ];

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
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Indigenous Energy Sovereignty Dashboard
          </h1>
          <p className="text-slate-600 mb-4">
            Track consultations, traditional knowledge, and territory management
          </p>

          {/* Governance Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-2">Governance & Data Sovereignty Notice</h3>
                <p className="text-amber-700 text-sm">
                  This dashboard currently uses placeholder data for demonstration purposes.
                  Real Indigenous data integration requires formal governance agreements and
                  Free, Prior, Informed Consent (FPIC) from affected communities.
                  Contact Indigenous governance representatives before implementing real data sources.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Total Territories</h3>
            <p className="text-3xl font-bold text-blue-600">{dashboardMetrics.totalTerritories}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Ongoing Consultations</h3>
            <p className="text-3xl font-bold text-yellow-600">{dashboardMetrics.ongoingConsultations}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Completed</h3>
            <p className="text-3xl font-bold text-green-600">{dashboardMetrics.completedConsultations}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Completion Rate</h3>
            <p className="text-3xl font-bold text-purple-600">
              {dashboardMetrics.completionRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Consultation Status Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Consultation Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={consultationChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {consultationChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* TEK Categories Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Traditional Ecological Knowledge</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tekByCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Territory Map and Lists */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Territory Map */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Territory Map</h3>
            <div className="h-96">
              <TerritorialMap
                territories={mockTerritories.map(mt => ({
                  id: mt.id,
                  name: mt.name,
                  coordinates: mt.coordinates,
                  color: mt.color,
                  consultationStatus: mt.consultationStatus,
                  metadata: mt.metadata
                }))}
                mapPoints={mockMapPoints}
                config={{
                  center: [-95, 55],
                  zoom: 4,
                  showBoundaries: true,
                  showPoints: true,
                  showLabels: true
                }}
                onTerritoryClick={(territory) => {
                  const foundTerritory = territories.find(t => t.name === territory.name) || territories[0];
                  setSelectedTerritory(foundTerritory || null);
                }}
                onPointClick={(point) => {
                  console.log('Point clicked:', point);
                }}
              />
            </div>
          </div>

          {/* Territories List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Territories</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {territories.length === 0 ? (
                mockTerritories.map((territory) => (
                  <div
                    key={territory.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedTerritory?.name === territory.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedTerritory({
                      id: territory.id,
                      name: territory.name,
                      coordinates: territory.coordinates[0] || [],
                      consultationStatus: territory.consultationStatus,
                      community: territory.metadata.indigenousGroups.join(', '),
                      traditionalTerritory: territory.metadata.indigenousGroups.join(', '),
                      lastActivity: new Date().toISOString()
                    })}
                  >
                    <h4 className="font-medium text-slate-900">{territory.name}</h4>
                    <p className="text-sm text-slate-600">{territory.metadata.indigenousGroups.join(', ')}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        territory.consultationStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        territory.consultationStatus === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                        territory.consultationStatus === 'pending' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {territory.consultationStatus.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500">
                        {territory.metadata.area.toLocaleString()} km²
                      </span>
                    </div>
                  </div>
                ))
              ) : territories.map((territory) => (
                <div
                  key={territory.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedTerritory?.id === territory.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedTerritory(territory)}
                >
                  <h4 className="font-medium text-slate-900">{territory.name}</h4>
                  <p className="text-sm text-slate-600">{territory.community}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      territory.consultationStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      territory.consultationStatus === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                      territory.consultationStatus === 'pending' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {territory.consultationStatus.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(territory.lastActivity).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Territory Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              {selectedTerritory ? selectedTerritory.name : 'Select a Territory'}
            </h3>

            {selectedTerritory && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Community</label>
                  <p className="text-slate-900">{selectedTerritory.community}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Consultation Status</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                    selectedTerritory.consultationStatus === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedTerritory.consultationStatus === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                    selectedTerritory.consultationStatus === 'pending' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTerritory.consultationStatus.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Traditional Territory</label>
                  <p className="text-slate-900">{selectedTerritory.traditionalTerritory}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Last Activity</label>
                  <p className="text-slate-900">
                    {new Date(selectedTerritory.lastActivity).toLocaleDateString('en-CA')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* TEK Latest Entries */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Recent TEK Entries</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {tekEntries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-medium text-slate-900">{entry.title}</h4>
                  <p className="text-sm text-slate-600 line-clamp-2">{entry.description}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                    <span>{entry.community}</span>
                    <span>{entry.category}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(entry.dateRecorded).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cultural Protocol Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">
            Cultural Protocol & FPIC Status
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Territory</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Stage</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Participants</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {fpicWorkflows.slice(0, 10).map((workflow) => (
                  <tr key={workflow.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm text-slate-900">
                      {territories.find(t => t.id === workflow.territoryId)?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {workflow.stage.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        workflow.status === 'approved' ? 'bg-green-100 text-green-800' :
                        workflow.status === 'declined' ? 'bg-red-100 text-red-800' :
                        workflow.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {workflow.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {workflow.participants.length} participants
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-500">
                      {new Date(workflow.lastUpdated).toLocaleDateString()}
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
              {wsConnected ? 'WebSocket Connected' : 'WebSocket Offline'}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            <span className="text-slate-600">
              {connectionStatus === 'connected' ? 'Data Stream Active' : 'Data Stream Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndigenousDashboard;