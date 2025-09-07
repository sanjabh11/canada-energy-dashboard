import React, { useState, useEffect, useRef } from 'react';

// Interface definitions for map components
export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'consultation' | 'land_right' | 'cultural' | 'stakeholder';
  status?: 'active' | 'pending' | 'completed' | 'urgent';
  consultationId?: string;
  description?: string;
}

export interface TerritoryBoundary {
  id: string;
  name: string;
  coordinates: [number, number][][];
  color: string;
  consultationStatus: 'not_started' | 'ongoing' | 'completed' | 'pending';
  metadata: {
    area: number;
    population: number;
    indigenousGroups: string[];
    traditionalTerritories: string[];
  };
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
  showBoundaries: boolean;
  showPoints: boolean;
  showLabels: boolean;
  theme: 'light' | 'dark' | 'satellite';
}

// Simple SVG-based map component (production would use Leaflet or Mapbox)
export const TerritorialMap: React.FC<{
  territories?: TerritoryBoundary[];
  mapPoints?: MapPoint[];
  config?: Partial<MapConfig>;
  onPointClick?: (point: MapPoint) => void;
  onTerritoryClick?: (territory: TerritoryBoundary) => void;
  className?: string;
}> = ({
  territories = [],
  mapPoints = [],
  config = {},
  onPointClick,
  onTerritoryClick,
  className = ""
}) => {
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryBoundary | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [hoveredTerritory, setHoveredTerritory] = useState<TerritoryBoundary | null>(null);
  const [mapConfig, setMapConfig] = useState<MapConfig>({
    center: [-95, 55], // Center of Canada
    zoom: 4,
    bounds: [[40, -140], [85, -50]], // Canada bounds
    showBoundaries: true,
    showPoints: true,
    showLabels: true,
    theme: 'light',
    ...config
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const [mapSize, setMapSize] = useState({ width: 800, height: 600 });

  // Update map size on resize
  useEffect(() => {
    const updateSize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setMapSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Geographic projection functions
  const getPointCoordinates = (lat: number, lng: number): [number, number] => {
    // Simple projection scaled for Canada
    const scale = mapConfig.zoom * 10;
    const x = mapSize.width / 2 + (lng - mapConfig.center[1]) * scale;
    const y = mapSize.height / 2 + (mapConfig.center[0] - lat) * scale;

    return [x, y];
  };

  const getBoundaryPath = (coordinates: [number, number][][]): string => {
    return coordinates[0]?.map((coord, index) => {
      const [x, y] = getPointCoordinates(coord[1], coord[0]);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join('') + 'Z';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#10b981'; // green
      case 'ongoing': return '#f59e0b'; // yellow
      case 'pending': return '#ef4444'; // red
      case 'not_started': return '#6b7280'; // gray
      default: return '#3b82f6'; // blue
    }
  };

  const getPointIcon = (type: string): string => {
    switch (type) {
      case 'consultation': return '📋';
      case 'land_right': return '🏔️';
      case 'cultural': return '🎭';
      case 'stakeholder': return '👥';
      default: return '📍';
    }
  };

  const handlePointClick = (point: MapPoint, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedPoint(point);
    setSelectedTerritory(null);
    onPointClick?.(point);
  };

  const handleTerritoryClick = (territory: TerritoryBoundary, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedTerritory(territory);
    setSelectedPoint(null);
    onTerritoryClick?.(territory);
  };

  return (
    <div className={`territorial-map-container ${className}`}>
      {/* Map Controls */}
      <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={mapConfig.showBoundaries}
                onChange={(e) => setMapConfig(prev => ({ ...prev, showBoundaries: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Boundaries</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={mapConfig.showPoints}
                onChange={(e) => setMapConfig(prev => ({ ...prev, showPoints: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Points</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={mapConfig.showLabels}
                onChange={(e) => setMapConfig(prev => ({ ...prev, showLabels: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Labels</span>
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Zoom:</span>
          <input
            type="range"
            min="1"
            max="8"
            value={mapConfig.zoom}
            onChange={(e) => setMapConfig(prev => ({ ...prev, zoom: parseInt(e.target.value) }))}
            className="w-20"
          />
        </div>
      </div>

      {/* Map Container */}
      <div className="relative bg-slate-100 rounded-lg overflow-hidden shadow-inner border border-slate-200">
        <svg
          ref={svgRef}
          width="100%"
          height="500"
          viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}
          className="bg-slate-50"
          onClick={() => {
            setSelectedTerritory(null);
            setSelectedPoint(null);
          }}
        >
          {/* Territory Boundaries */}
          {mapConfig.showBoundaries && territories.map((territory) => (
            <g key={territory.id}>
              <path
                d={getBoundaryPath(territory.coordinates)}
                fill={getStatusColor(territory.consultationStatus)}
                fillOpacity="0.3"
                stroke={getStatusColor(territory.consultationStatus)}
                strokeWidth="2"
                className="cursor-pointer hover:fill-opacity-50 transition-all"
                onClick={(e) => handleTerritoryClick(territory, e)}
                onMouseEnter={() => setHoveredTerritory(territory)}
                onMouseLeave={() => setHoveredTerritory(null)}
              />

              {mapConfig.showLabels && (() => {
                const centerCoord = territory.coordinates[0]?.reduce(
                  (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
                  [0, 0]
                );
                if (!centerCoord || territory.coordinates[0]?.length === 0) return null;

                const centerLat = centerCoord[1] / territory.coordinates[0].length;
                const centerLng = centerCoord[0] / territory.coordinates[0].length;
                const [x, y] = getPointCoordinates(centerLat, centerLng);

                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-slate-700 text-sm font-medium pointer-events-none select-none"
                    style={{ fontSize: '12px' }}
                  >
                    {territory.name}
                  </text>
                );
              })()}
            </g>
          ))}

          {/* Map Points */}
          {mapConfig.showPoints && mapPoints.map((point) => {
            const [x, y] = getPointCoordinates(point.lat, point.lng);

            return (
              <g
                key={point.id}
                className="cursor-pointer"
                onClick={(e) => handlePointClick(point, e)}
              >
                {/* Point marker */}
                <circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill={getStatusColor(point.status || 'pending')}
                  stroke="white"
                  strokeWidth="2"
                  className="hover:r-10 transition-all"
                />

                {/* Point icon */}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-lg pointer-events-none select-none"
                  style={{
                    fontSize: '12px',
                    filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'
                  }}
                >
                  {getPointIcon(point.type)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Territory Info Panel */}
        {(hoveredTerritory || selectedTerritory) && (
          <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-xs">
            <h3 className="font-bold text-slate-800 mb-2">
              {(selectedTerritory || hoveredTerritory)?.name}
            </h3>

            {(selectedTerritory || hoveredTerritory) && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    (selectedTerritory || hoveredTerritory)?.consultationStatus === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : (selectedTerritory || hoveredTerritory)?.consultationStatus === 'ongoing'
                      ? 'bg-yellow-100 text-yellow-800'
                      : (selectedTerritory || hoveredTerritory)?.consultationStatus === 'pending'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {((selectedTerritory || hoveredTerritory)?.consultationStatus)?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">Area:</span>
                  <span>{(selectedTerritory || hoveredTerritory)?.metadata.area.toLocaleString()} km²</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-600">Population:</span>
                  <span>{(selectedTerritory || hoveredTerritory)?.metadata.population.toLocaleString()}</span>
                </div>

                <div>
                  <span className="text-slate-600 text-xs">Indigenous Groups:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(selectedTerritory || hoveredTerritory)?.metadata.indigenousGroups.slice(0, 3).map((group, index) => (
                      <span key={index} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">
                        {group}
                      </span>
                    ))}
                    {((selectedTerritory || hoveredTerritory)?.metadata.indigenousGroups.length || 0) > 3 && (
                      <span className="text-slate-500 text-xs">+{(selectedTerritory || hoveredTerritory)?.metadata.indigenousGroups.length - 3} more</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Point Info Panel */}
        {selectedPoint && (
          <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-xs">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center">
              <span className="mr-2">{getPointIcon(selectedPoint.type)}</span>
              {selectedPoint.title}
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Type:</span>
                <span className="capitalize">{selectedPoint.type.replace('_', ' ')}</span>
              </div>

              {selectedPoint.status && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedPoint.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : selectedPoint.status === 'active'
                      ? 'bg-blue-100 text-blue-800'
                      : selectedPoint.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedPoint.status.toUpperCase()}
                  </span>
                </div>
              )}

              {selectedPoint.description && (
                <div>
                  <span className="text-slate-600">Description:</span>
                  <p className="mt-1 text-slate-700">{selectedPoint.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow border">
          <h5 className="font-semibold text-slate-800 mb-2">Legend</h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Ongoing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span>Not Started</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading/Empty States */}
      {territories.length === 0 && mapPoints.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 bg-opacity-80">
          <div className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Territory Data</h3>
            <p className="text-slate-600">Map data is being loaded...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced mock territory data with more realistic Canadian boundaries
// TODO: Replace with Open Government of Canada boundary datasets and Indigenous territory shapefiles
export const mockTerritories: TerritoryBoundary[] = [
  {
    id: 'treaty5',
    name: 'Treaty 5 Territory',
    coordinates: [
      [[-102, 55], [-88, 55], [-88, 50], [-102, 50], [-102, 55]]
    ],
    color: '#10b981',
    consultationStatus: 'completed',
    metadata: {
      area: 227000,
      population: 85420,
      indigenousGroups: ['Cree', 'Ojibwe', 'Dene'],
      traditionalTerritories: ['Treaty 5 Lands', 'Hudson Bay Lowlands']
    }
  },
  {
    id: 'treaty9',
    name: 'Treaty 9 Territory',
    coordinates: [
      [[-92, 52], [-78, 52], [-78, 48], [-92, 48], [-92, 52]]
    ],
    color: '#f59e0b',
    consultationStatus: 'ongoing',
    metadata: {
      area: 245000,
      population: 128000,
      indigenousGroups: ['Ojibwe', 'Cree', 'Oji-Cree'],
      traditionalTerritories: ['James Bay', 'Hudson Bay Coast', 'Abitibi Region']
    }
  },
  {
    id: 'dene',
    name: 'Dene Territory',
    coordinates: [
      [[-125, 65], [-105, 65], [-105, 58], [-125, 58], [-125, 65]]
    ],
    color: '#ef4444',
    consultationStatus: 'pending',
    metadata: {
      area: 195000,
      population: 28900,
      indigenousGroups: ['Dene', 'Sahtu', 'North Slave', 'Dehcho'],
      traditionalTerritories: ['Northwest Territories', 'Sahtu Settlement Area']
    }
  },
  {
    id: 'nunavut',
    name: 'Nunavut Settlement Area',
    coordinates: [
      [[-120, 72], [-60, 72], [-60, 60], [-120, 60], [-120, 72]]
    ],
    color: '#8b5cf6',
    consultationStatus: 'ongoing',
    metadata: {
      area: 443000,
      population: 39200,
      indigenousGroups: ['Inuit', 'Inuvialuit'],
      traditionalTerritories: ['Nunavut', 'Baffin Island', 'High Arctic']
    }
  },
  {
    id: 'yukon',
    name: 'Yukon First Nations Territories',
    coordinates: [
      [[-141, 70], [-122, 70], [-122, 60], [-141, 60], [-141, 70]]
    ],
    color: '#06b6d4',
    consultationStatus: 'completed',
    metadata: {
      area: 135000,
      population: 42100,
      indigenousGroups: ['Yukon First Nations', 'Kwanlin Dun', 'Selkirk'],
      traditionalTerritories: ['Yukon Territory', 'Klondike Region']
    }
  }
];

export const mockMapPoints: MapPoint[] = [
  {
    id: 'p01',
    lat: 49.5,
    lng: -93.5,
    title: 'Kenora Consultation Hub',
    type: 'consultation',
    status: 'active',
    description: 'Main consultation office for Treaty 5 lands'
  },
  {
    id: 'p02',
    lat: 50.2,
    lng: -86.2,
    title: 'Moose Factory Community Office',
    type: 'stakeholder',
    status: 'active',
    description: 'James Bay Cree First Nation consultation office'
  },
  {
    id: 'p03',
    lat: 58.8,
    lng: -114.5,
    title: 'Traditional Fishing Grounds',
    type: 'cultural',
    status: 'urgent',
    description: 'Sacred fishing grounds requiring special protection'
  },
  {
    id: 'p04',
    lat: 55.3,
    lng: -115.2,
    title: 'Winter Traditional Territory',
    type: 'land_right',
    status: 'pending',
    description: 'Historical hunting and trapping lands'
  }
];

export default TerritorialMap;