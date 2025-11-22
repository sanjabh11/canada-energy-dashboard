import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CONTAINER_CLASSES } from '../lib/ui/layout';
import { HelpButton } from './HelpButton';
import { useWebSocketConsultation } from '../hooks/useWebSocket';
import {
  BarChart,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
  Bar,
  Pie
} from 'recharts';
import TerritorialMap, { type MapPoint, type TerritoryBoundary } from './TerritorialMap';
import { AlertTriangle, Plus, Edit, X, Download, Shield, Users, Calendar, Save } from 'lucide-react';
import { localStorageManager, type IndigenousProjectRecord } from '../lib/localStorageManager';
import { AcceptableFeatureInfo } from './FeatureStatusBadge';

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

const CONSULTATION_STATUS_COLORS: Record<TerritoryData['consultationStatus'], string> = {
  completed: '#10b981',
  ongoing: '#f59e0b',
  pending: '#ef4444',
  not_started: '#6b7280'
};

const DEFAULT_TERRITORIES: TerritoryData[] = [
  {
    id: 'treaty-5',
    name: 'Treaty 5 Territory',
    coordinates: [
      [55, -95],
      [55.6, -96.2],
      [54.4, -96.6]
    ],
    consultationStatus: 'completed',
    community: 'Cree, Ojibwe, Dene',
    traditionalTerritory: 'Treaty 5 Territory',
    lastActivity: '2024-04-15T00:00:00.000Z'
  },
  {
    id: 'treaty-9',
    name: 'Treaty 9 Territory',
    coordinates: [
      [50, -80],
      [50.7, -81.5],
      [49.6, -82.1]
    ],
    consultationStatus: 'ongoing',
    community: 'Ojibwe, Cree, Oji-Cree',
    traditionalTerritory: 'Treaty 9 Territory',
    lastActivity: '2024-05-02T00:00:00.000Z'
  },
  {
    id: 'dene',
    name: 'Dene Territory',
    coordinates: [
      [60, -120],
      [60.8, -118.6],
      [59.5, -119.2]
    ],
    consultationStatus: 'pending',
    community: 'Dene, Sahtu, North Slave',
    traditionalTerritory: 'Dene Territory',
    lastActivity: '2024-03-21T00:00:00.000Z'
  }
];

const DEFAULT_MAP_POINTS: MapPoint[] = [
  {
    id: 'treaty-5-point',
    lat: 55,
    lng: -95,
    title: 'Treaty 5 Consultation',
    type: 'consultation',
    status: 'completed',
    description: 'Community wind partnership review.'
  },
  {
    id: 'treaty-9-point',
    lat: 50,
    lng: -80,
    title: 'Treaty 9 Energy Forum',
    type: 'consultation',
    status: 'active',
    description: 'Joint planning meeting with utilities & leadership.'
  },
  {
    id: 'dene-point',
    lat: 60,
    lng: -120,
    title: 'Dene FPIC Workshop',
    type: 'consultation',
    status: 'pending',
    description: 'FPIC readiness workshops with advisors.'
  }
];

const derivePolygon = (coordinates: [number, number][]): [number, number][][] => {
  if (coordinates.length < 3) {
    return [];
  }

  const ring = coordinates.map(([lat, lng]) => [lng, lat] as [number, number]);
  if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push([...ring[0]] as [number, number]);
  }

  return [ring];
};

const buildTerritoryBoundary = (territory: TerritoryData, index: number): TerritoryBoundary => {
  const polygon = derivePolygon(territory.coordinates);
  const centroid = territory.coordinates[0]
    ? ([territory.coordinates[0][0], territory.coordinates[0][1]] as [number, number])
    : undefined;

  return {
    id: territory.id || `territory-${index}`,
    name: territory.name,
    consultationStatus: territory.consultationStatus,
    color: CONSULTATION_STATUS_COLORS[territory.consultationStatus] ?? '#3b82f6',
    metadata: {
      indigenousGroups: territory.community
        ? territory.community.split(',').map((group) => group.trim()).filter(Boolean)
        : [],
      area: polygon.length > 0 ? 120000 : undefined
    },
    coordinates: polygon,
    centroid
  };
};

const buildMapPoint = (territory: TerritoryData, index: number): MapPoint | null => {
  const primaryCoord = territory.coordinates[0];
  if (!primaryCoord) {
    return null;
  }

  const [lat, lng] = primaryCoord;
  const status: MapPoint['status'] =
    territory.consultationStatus === 'completed'
      ? 'completed'
      : territory.consultationStatus === 'ongoing'
      ? 'active'
      : 'pending';

  return {
    id: `territory-point-${territory.id ?? index}`,
    lat,
    lng,
    title: `${territory.name} consultation`,
    type: 'consultation',
    status,
    description: `Community: ${territory.community || 'TBD'}`
  };
};

export const IndigenousDashboard: React.FC = () => {
  const [territories, setTerritories] = useState<TerritoryData[]>(DEFAULT_TERRITORIES);
  const [fpicWorkflows, setFpicWorkflows] = useState<FPICWorkflow[]>([]);
  const [tekEntries, setTekEntries] = useState<TEKEntry[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryData | null>(
    DEFAULT_TERRITORIES[0] ?? null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced state for real data management
  const [indigenousProjects, setIndigenousProjects] = useState<IndigenousProjectRecord[]>([]);
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [newProject, setNewProject] = useState<Partial<IndigenousProjectRecord>>({
    name: '',
    territory_name: '',
    community: '',
    consultation_status: 'not_started',
    fpic_status: 'required'
  });

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

  // Load initial data from local storage
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load real data from local storage
      const projects = localStorageManager.getIndigenousProjects();
      setIndigenousProjects(projects);

      // Convert projects to territory data for map display
      const territoryData: TerritoryData[] = projects.map(project => ({
        id: project.id,
        name: project.territory_name,
        coordinates: [[-95, 55]], // Default coordinates - would be real in production
        consultationStatus: project.consultation_status,
        community: project.community,
        traditionalTerritory: project.traditional_territory,
        lastActivity: project.updated_at
      }));

      setTerritories(territoryData);

      // Legacy mock data for demonstration - gradually being replaced
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
          custodians: ['Elder Council'],
          relatedTerritories: ['Dene Territory']
        }
      ];

      // Merge real data with legacy mock data (temporary during transition)
      setTerritories([...territoryData, ...mockTerritories]);
      setFpicWorkflows(mockFpicWorkflows);
      setTekEntries(mockTekEntries);

      setLoading(false);
    } catch (error) {
      console.error('Error loading Indigenous dashboard data:', error);
      setError('Failed to load Indigenous data');
      setLoading(false);
    }
  };

  // Project management functions
  const handleAddProject = () => {
    if (!newProject.name || !newProject.territory_name || !newProject.community) {
      alert('Please fill in all required fields');
      return;
    }

    const projectData = {
      name: newProject.name!,
      territory_name: newProject.territory_name!,
      community: newProject.community!,
      consultation_status: newProject.consultation_status || 'not_started',
      fpic_status: newProject.fpic_status || 'required',
      data_source: 'user_input' as const,
      governance_status: 'pending' as const,
      territory_id: `territory_${Date.now()}`,
      traditional_territory: newProject.territory_name || '',
      benefit_sharing: {},
      consultation_log: []
    };

    const projectId = localStorageManager.addIndigenousProject(projectData);
    
    // Refresh data
    loadInitialData();
    
    // Reset form
    setNewProject({
      name: '',
      territory_name: '',
      community: '',
      consultation_status: 'not_started',
      fpic_status: 'required'
    });
    setShowAddProject(false);
  };

  const handleUpdateProject = (projectId: string, updates: Partial<IndigenousProjectRecord>) => {
    localStorageManager.updateIndigenousProject(projectId, updates);
    loadInitialData();
    setEditingProject(null);
  };

  const exportData = () => {
    const data = localStorageManager.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ceip_indigenous_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  const effectiveTerritories = territories.length > 0 ? territories : DEFAULT_TERRITORIES;

  const territoryBoundaries = useMemo<TerritoryBoundary[]>(
    () => effectiveTerritories.map(buildTerritoryBoundary),
    [effectiveTerritories]
  );

  const mapPoints = useMemo<MapPoint[]>(() => {
    const derived = effectiveTerritories
      .map(buildMapPoint)
      .filter((point): point is MapPoint => point !== null);
    return derived.length > 0 ? derived : DEFAULT_MAP_POINTS;
  }, [effectiveTerritories]);

  const territoryList = effectiveTerritories;

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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-electric"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className={CONTAINER_CLASSES.page}>
        {/* Feature Info */}
        <AcceptableFeatureInfo featureId="indigenous_dashboard" />

        <section className="hero-section hero-section--compact mb-8">
          <div className="hero-content">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="hero-title">
                    Indigenous Energy Sovereignty Dashboard
                  </h1>
                  <HelpButton id="module.indigenous.overview" />
                </div>
                <p className="hero-subtitle mt-2">
                  Track consultations, traditional knowledge, and territory management
                </p>
              </div>
              <div className="self-start">
                <HelpButton
                  id="module.indigenous.governance"
                  className="text-warning hover:bg-amber-500 border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Governance Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5 mr-3 flex-shrink-0" />
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
        </section>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card card-metric p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-primary metric-label">Total Territories</h3>
              <HelpButton id="metric.indigenous.total_territories" />
            </div>
            <p className="text-3xl font-bold text-electric mt-2 metric-value">{dashboardMetrics.totalTerritories}</p>
          </div>

          <div className="card card-metric p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-primary metric-label">Ongoing Consultations</h3>
              <HelpButton id="metric.indigenous.ongoing_consultations" />
            </div>
            <p className="text-3xl font-bold text-warning mt-2 metric-value">{dashboardMetrics.ongoingConsultations}</p>
          </div>

          <div className="card card-metric p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-primary metric-label">Completed</h3>
              <HelpButton id="metric.indigenous.completed_consultations" />
            </div>
            <p className="text-3xl font-bold text-success mt-2 metric-value">{dashboardMetrics.completedConsultations}</p>
          </div>

          <div className="card card-metric p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-primary metric-label">Completion Rate</h3>
              <HelpButton id="metric.indigenous.completion_rate" />
            </div>
            <p className="text-3xl font-bold text-electric mt-2 metric-value">
              {dashboardMetrics.completionRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Consultation Status Chart */}
          <div className="card shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary">Consultation Status</h3>
              <HelpButton id="chart.indigenous.consultation_status" />
            </div>
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
          <div className="card shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary">Traditional Ecological Knowledge</h3>
              <HelpButton id="chart.indigenous.tek_categories" />
            </div>
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
          <div className="card shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary">Territory Map</h3>
              <HelpButton id="module.indigenous.map" />
            </div>
            <div className="h-96">
              <TerritorialMap
                territories={territoryBoundaries}
                mapPoints={mapPoints}
                config={{
                  center: [-95, 55],
                  zoom: 4,
                  showBoundaries: true,
                  showPoints: true,
                  showLabels: true
                }}
                onTerritoryClick={(boundary) => {
                  const match = territoryList.find(
                    (territory) => territory.id === boundary.id || territory.name === boundary.name
                  );
                  setSelectedTerritory(match ?? territoryList[0] ?? null);
                }}
                onPointClick={(point) => {
                  const match = territoryList.find((territory) => {
                    const [lat, lng] = territory.coordinates[0] ?? [undefined, undefined];
                    return lat === point.lat && lng === point.lng;
                  });
                  setSelectedTerritory(match ?? territoryList[0] ?? null);
                }}
              />
            </div>
          </div>

          {/* Territories List */}
          <div className="card shadow p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">Territories</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {territoryList.length === 0 ? (
                <div className="text-center text-tertiary text-sm">
                  No Indigenous territories available. Confirm Supabase seed ran.
                </div>
              ) : territoryList.map((territory) => (
                <div
                  key={territory.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedTerritory?.id === territory.id
                      ? 'border-blue-500 bg-secondary'
                      : 'border-[var(--border-subtle)] hover-border-[var(--border-medium)]'
                  }`}
                  onClick={() => setSelectedTerritory(territory)}
                >
                  <h4 className="font-medium text-primary">{territory.name}</h4>
                  <p className="text-sm text-secondary">{territory.community || 'Community TBD'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      territory.consultationStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      territory.consultationStatus === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                      territory.consultationStatus === 'pending' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {territory.consultationStatus.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-tertiary">
                      {territory.lastActivity
                        ? new Date(territory.lastActivity).toLocaleDateString('en-CA')
                        : 'Date TBD'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Territory Details */}
          <div className="card shadow p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">
              {selectedTerritory ? selectedTerritory.name : 'Select a Territory'}
            </h3>

            {selectedTerritory && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary">Community</label>
                  <p className="text-primary">{selectedTerritory.community}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary">Consultation Status</label>
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
                  <label className="block text-sm font-medium text-secondary">Traditional Territory</label>
                  <p className="text-primary">{selectedTerritory.traditionalTerritory}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary">Last Activity</label>
                  <p className="text-primary">
                    {new Date(selectedTerritory.lastActivity).toLocaleDateString('en-CA')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* TEK Latest Entries */}
          <div className="card shadow p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">Recent TEK Entries</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {tekEntries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-medium text-primary">{entry.title}</h4>
                  <p className="text-sm text-secondary line-clamp-2">{entry.description}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-tertiary">
                    <span>{entry.community}</span>
                    <span>{entry.category}</span>
                  </div>
                  <p className="text-xs text-tertiary mt-1">
                    {new Date(entry.dateRecorded).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cultural Protocol Section */}
        <div className="mt-8 card shadow p-6">
          <h3 className="text-xl font-semibold text-primary mb-4">
            Cultural Protocol & FPIC Status
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary">
                  <th className="px-4 py-2 text-left text-sm font-medium text-secondary">Territory</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-secondary">Stage</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-secondary">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-secondary">Participants</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-secondary">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {fpicWorkflows.slice(0, 10).map((workflow) => (
                  <tr key={workflow.id} className="hover:bg-secondary">
                    <td className="px-4 py-2 text-sm text-primary">
                      {territories.find(t => t.id === workflow.territoryId)?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-2 text-sm text-secondary">
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
                    <td className="px-4 py-2 text-sm text-secondary">
                      {workflow.participants.length} participants
                    </td>
                    <td className="px-4 py-2 text-sm text-tertiary">
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
              wsConnected ? 'bg-secondary0' : 'bg-secondary0'
            }`}></span>
            <span className="text-secondary">
              {wsConnected ? 'WebSocket Connected' : 'WebSocket Offline'}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-secondary0' : 'bg-secondary0'
            }`}></span>
            <span className="text-secondary">
              {connectionStatus === 'connected' ? 'Data Stream Active' : 'Data Stream Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Project Management Section */}
      <div className="card shadow p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-primary">Indigenous Energy Projects</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddProject(true)}
              className="flex items-center gap-2 px-4 py-2 bg-electric text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Project
            </button>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              Export Data
            </button>
          </div>
        </div>

        {/* Project List */}
        <div className="space-y-4">
          {indigenousProjects.map((project) => (
            <div key={project.id} className="border border-[var(--border-subtle)] rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-primary">{project.name}</h4>
                  <p className="text-sm text-secondary mt-1">{project.community}</p>
                  <p className="text-sm text-tertiary">{project.territory_name}</p>
                  
                  <div className="flex items-center gap-4 mt-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      project.consultation_status === 'completed' ? 'bg-green-100 text-green-800' :
                      project.consultation_status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                      project.consultation_status === 'pending' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.consultation_status.replace('_', ' ').toUpperCase()}
                    </span>
                    
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      project.fpic_status === 'obtained' ? 'bg-green-100 text-green-800' :
                      project.fpic_status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      project.fpic_status === 'declined' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      FPIC: {project.fpic_status.replace('_', ' ').toUpperCase()}
                    </span>

                    {project.governance_status && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.governance_status === 'approved' ? 'bg-green-100 text-green-800' :
                        project.governance_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {project.governance_status.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {project.benefit_sharing.revenue_share_percent && (
                    <p className="text-sm text-secondary mt-2">
                      Revenue Share: {project.benefit_sharing.revenue_share_percent}%
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingProject(project.id)}
                    className="p-2 text-tertiary hover:text-secondary transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              </div>

              {/* Consultation Log */}
              {project.consultation_log.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h5 className="font-medium text-secondary mb-2">Recent Consultations</h5>
                  <div className="space-y-2">
                    {project.consultation_log.slice(-2).map((log, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex items-center gap-2 text-secondary">
                          <Calendar size={14} />
                          {new Date(log.date).toLocaleDateString()}
                          <Users size={14} />
                          {log.participants.length} participants
                        </div>
                        <p className="text-tertiary mt-1">{log.outcomes.join('; ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {indigenousProjects.length === 0 && (
            <div className="text-center py-8 text-tertiary">
              <Shield size={48} className="mx-auto mb-4 text-slate-300" />
              <p>No Indigenous energy projects recorded yet.</p>
              <p className="text-sm">Add your first project to start tracking consultation and benefit-sharing.</p>
            </div>
          )}
        </div>

        {/* Add Project Modal */}
        {showAddProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Add Indigenous Energy Project</h4>
                <button
                  onClick={() => setShowAddProject(false)}
                  className="text-tertiary hover:text-secondary"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newProject.name || ''}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Treaty 5 Wind Energy Partnership"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Territory Name *
                  </label>
                  <input
                    type="text"
                    value={newProject.territory_name || ''}
                    onChange={(e) => setNewProject({...newProject, territory_name: e.target.value})}
                    className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Treaty 5 Territory"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Community *
                  </label>
                  <input
                    type="text"
                    value={newProject.community || ''}
                    onChange={(e) => setNewProject({...newProject, community: e.target.value})}
                    className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Cree, Ojibwe, Dene"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Consultation Status
                  </label>
                  <select
                    value={newProject.consultation_status || 'not_started'}
                    onChange={(e) => setNewProject({...newProject, consultation_status: e.target.value as any})}
                    className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    FPIC Status
                  </label>
                  <select
                    value={newProject.fpic_status || 'required'}
                    onChange={(e) => setNewProject({...newProject, fpic_status: e.target.value as any})}
                    className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="required">Required</option>
                    <option value="in_progress">In Progress</option>
                    <option value="obtained">Obtained</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleAddProject}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-electric text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save size={16} />
                  Save Project
                </button>
                <button
                  onClick={() => setShowAddProject(false)}
                  className="px-4 py-2 text-secondary border border-[var(--border-medium)] rounded-lg hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndigenousDashboard;