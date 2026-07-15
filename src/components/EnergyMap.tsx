import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface EnergyFacility {
  id: string;
  name: string;
  type: 'generation' | 'hydrogen' | 'data_centre' | 'resilience' | 'weather';
  province: string;
  latitude: number;
  longitude: number;
  capacity?: number;
  description?: string;
}

interface EnergyMapProps {
  facilities: EnergyFacility[];
  height?: string;
  initialZoom?: number;
  onFacilityClick?: (facility: EnergyFacility) => void;
}

const TYPE_COLORS: Record<EnergyFacility['type'], string> = {
  generation: '#3b82f6',
  hydrogen: '#10b981',
  data_centre: '#8b5cf6',
  resilience: '#f59e0b',
  weather: '#06b6d4',
};

const TYPE_LABELS: Record<EnergyFacility['type'], string> = {
  generation: 'Power Generation',
  hydrogen: 'Hydrogen Facility',
  data_centre: 'AI Data Centre',
  resilience: 'Resilience Asset',
  weather: 'Weather Station',
};

const CANADA_CENTER: [number, number] = [-106.3, 56.1];

export const EnergyMap: React.FC<EnergyMapProps> = ({
  facilities,
  height = '500px',
  initialZoom = 3,
  onFacilityClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupsRef = useRef<maplibregl.Popup[]>([]);
  const [selectedType, setSelectedType] = useState<Set<EnergyFacility['type']>>(
    new Set(Object.keys(TYPE_COLORS) as EnergyFacility['type'][]),
  );

  const geojson = useMemo(() => {
    const filtered = facilities.filter(
      (f) =>
        selectedType.has(f.type) &&
        typeof f.latitude === 'number' &&
        typeof f.longitude === 'number' &&
        !isNaN(f.latitude) &&
        !isNaN(f.longitude),
    );
    return {
      type: 'FeatureCollection' as const,
      features: filtered.map((f) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [f.longitude, f.latitude] as [number, number],
        },
        properties: {
          id: f.id,
          name: f.name,
          type: f.type,
          province: f.province,
          capacity: f.capacity,
          description: f.description ?? '',
        },
      })),
    };
  }, [facilities, selectedType]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: CANADA_CENTER,
      zoom: initialZoom,
      attributionControl: {} as maplibregl.AttributionControlOptions,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      map.addSource('facilities', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 40,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'facilities',
        filter: ['>=', ['get', 'cluster'], 1] as unknown as boolean,
        paint: {
          'circle-color': '#3b82f6',
          'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 30],
          'circle-opacity': 0.6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'facilities',
        filter: ['>=', ['get', 'cluster'], 1] as unknown as boolean,
        layout: {
          'text-field': '{point_count}',
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#fff',
        },
      });

      map.addLayer({
        id: 'facilities-circle',
        type: 'circle',
        source: 'facilities',
        filter: ['!', ['get', 'cluster']] as unknown as boolean,
        paint: {
          'circle-color': [
            'match',
            ['get', 'type'],
            'generation',
            TYPE_COLORS.generation,
            'hydrogen',
            TYPE_COLORS.hydrogen,
            'data_centre',
            TYPE_COLORS.data_centre,
            'resilience',
            TYPE_COLORS.resilience,
            'weather',
            TYPE_COLORS.weather,
            '#666',
          ],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 4, 8, 8, 12, 12],
          'circle-opacity': 0.8,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#fff',
        },
      });

      map.on('click', 'facilities-circle', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['facilities-circle'],
        });
        if (!features.length) return;
        const props = features[0].properties;
        const coords = (features[0].geometry as { coordinates: [number, number] }).coordinates;

        const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(coords)
          .setHTML(
            `<div style="padding:4px 8px;min-width:180px">
              <div style="font-weight:600;font-size:13px;margin-bottom:4px">${props.name}</div>
              <div style="font-size:11px;color:#666;margin-bottom:2px">${TYPE_LABELS[props.type as EnergyFacility['type']] ?? props.type}</div>
              <div style="font-size:11px;color:#999">${props.province}</div>
              ${props.capacity ? `<div style="font-size:11px;margin-top:4px"><b>${props.capacity}</b> MW</div>` : ''}
              ${props.description ? `<div style="font-size:11px;margin-top:4px;color:#666">${props.description}</div>` : ''}
            </div>`,
          )
          .addTo(map);

        popupsRef.current.push(popup);

        if (onFacilityClick) {
          const facility = facilities.find((f) => f.id === props.id);
          if (facility) onFacilityClick(facility);
        }
      });

      map.on('mouseenter', 'facilities-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'facilities-circle', () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters'],
        });
        if (!features.length) return;
        const clusterId = (features[0].properties as { cluster_id: number }).cluster_id;
        const source = map.getSource('facilities') as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            center: (features[0].geometry as { coordinates: [number, number] }).coordinates,
            zoom,
          });
        });
      });
    });

    mapRef.current = map;

    return () => {
      popupsRef.current.forEach((p) => p.remove());
      popupsRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource('facilities') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }
  }, [geojson]);

  const toggleType = (type: EnergyFacility['type']) => {
    setSelectedType((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const facilityCount = facilities.filter((f) => selectedType.has(f.type)).length;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div ref={containerRef} style={{ width: '100%', height }} className="bg-gray-100 dark:bg-gray-800" />

      <div className="absolute left-3 top-3 z-10 rounded-lg bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm dark:bg-gray-900/90">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Facility Types ({facilityCount})
        </div>
        <div className="flex flex-col gap-1.5">
          {(Object.keys(TYPE_COLORS) as EnergyFacility['type'][]).map((type) => (
            <label key={type} className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={selectedType.has(type)}
                onChange={() => toggleType(type)}
                className="h-3 w-3 rounded"
              />
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[type] }}
              />
              {TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
