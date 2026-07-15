import React, { useState, useMemo } from 'react';
import { EnergyMap, type EnergyFacility } from './EnergyMap';
import { SEOHead } from './SEOHead';

const SAMPLE_FACILITIES: EnergyFacility[] = [
  { id: 'gen-1', name: 'Bruce Nuclear GS', type: 'generation', province: 'ON', latitude: 44.28, longitude: -81.59, capacity: 6430, description: 'Largest nuclear plant in North America' },
  { id: 'gen-2', name: 'Darlington Nuclear GS', type: 'generation', province: 'ON', latitude: 43.87, longitude: -78.71, capacity: 3512 },
  { id: 'gen-3', name: 'Pickering Nuclear GS', type: 'generation', province: 'ON', latitude: 43.78, longitude: -79.06, capacity: 3100 },
  { id: 'gen-4', name: 'Churchill Falls', type: 'generation', province: 'NL', latitude: 53.46, longitude: -64.09, capacity: 5428, description: 'Hydroelectric' },
  { id: 'gen-5', name: 'BC Site C', type: 'generation', province: 'BC', latitude: 56.22, longitude: -121.0, capacity: 1100, description: 'Hydroelectric (under construction)' },
  { id: 'gen-6', name: 'Shepherd Energy Centre', type: 'generation', province: 'AB', latitude: 50.85, longitude: -113.92, capacity: 860, description: 'Natural gas cogeneration' },
  { id: 'gen-7', name: 'Buffalo Atlee Wind', type: 'generation', province: 'AB', latitude: 50.42, longitude: -110.55, capacity: 144, description: 'Wind farm' },
  { id: 'gen-8', name: 'Greengate Power', type: 'generation', province: 'AB', latitude: 50.17, longitude: -112.38, capacity: 300, description: 'Solar farm' },
  { id: 'gen-9', name: 'Manitoba Hydro Grand Rapids', type: 'generation', province: 'MB', latitude: 53.17, longitude: -99.25, capacity: 472, description: 'Hydroelectric' },
  { id: 'gen-10', name: 'Point Lepreau', type: 'generation', province: 'NB', latitude: 45.09, longitude: -66.44, capacity: 660, description: 'Nuclear' },

  { id: 'h2-1', name: 'Air Products Edmonton', type: 'hydrogen', province: 'AB', latitude: 53.55, longitude: -113.49, capacity: 1650, description: 'Blue hydrogen facility' },
  { id: 'h2-2', name: 'Suncor Hydrogen', type: 'hydrogen', province: 'AB', latitude: 56.73, longitude: -111.38, capacity: 900, description: 'Grey hydrogen from upgrading' },
  { id: 'h2-3', name: 'Hydrogen Optimized Owen Sound', type: 'hydrogen', province: 'ON', latitude: 44.57, longitude: -80.93, capacity: 50, description: 'Green hydrogen pilot' },

  { id: 'dc-1', name: 'AWS Montreal', type: 'data_centre', province: 'QC', latitude: 45.50, longitude: -73.57, capacity: 100, description: 'AI/ML workloads' },
  { id: 'dc-2', name: 'Google Toronto', type: 'data_centre', province: 'ON', latitude: 43.65, longitude: -79.38, capacity: 50 },
  { id: 'dc-3', name: 'Microsoft Quebec', type: 'data_centre', province: 'QC', latitude: 46.81, longitude: -71.21, capacity: 80 },

  { id: 'res-1', name: 'TC Energy Pump Station 1', type: 'resilience', province: 'AB', latitude: 56.30, longitude: -110.50, description: 'Pipeline infrastructure' },
  { id: 'res-2', name: 'Enbridge Mainline', type: 'resilience', province: 'ON', latitude: 49.25, longitude: -89.98, description: 'Critical pipeline corridor' },

  { id: 'wx-1', name: 'Calgary Weather Station', type: 'weather', province: 'AB', latitude: 51.05, longitude: -114.07, description: 'AESO weather feed' },
  { id: 'wx-2', name: 'Edmonton Weather Station', type: 'weather', province: 'AB', latitude: 53.55, longitude: -113.49 },
  { id: 'wx-3', name: 'Toronto Weather Station', type: 'weather', province: 'ON', latitude: 43.65, longitude: -79.38 },
  { id: 'wx-4', name: 'Montreal Weather Station', type: 'weather', province: 'QC', latitude: 45.50, longitude: -73.57 },
];

export const EnergyMapPage: React.FC = () => {
  const [facilities] = useState(SAMPLE_FACILITIES);

  const stats = useMemo(() => {
    const byType = facilities.reduce(
      (acc, f) => {
        acc[f.type] = (acc[f.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const totalCapacity = facilities
      .filter((f) => f.capacity)
      .reduce((sum, f) => sum + (f.capacity ?? 0), 0);
    return { byType, totalCapacity, total: facilities.length };
  }, [facilities]);

  return (
    <div id="main-content" className="min-h-screen bg-primary">
      <SEOHead
        title="Energy Facility Map — Canadian Energy Intelligence Platform"
        description="Interactive map of Canadian energy facilities: power generation, hydrogen production, AI data centres, resilience assets, and weather stations."
        path="/energy-map"
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Canadian Energy Facility Map</h1>
          <p className="mt-1 text-sm text-secondary">
            Interactive geographic visualization of {stats.total} facilities across Canada.
            Total mapped capacity: {stats.totalCapacity.toLocaleString()} MW.
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="card p-3 text-center">
              <div className="text-lg font-bold text-primary">{count}</div>
              <div className="text-xs text-secondary capitalize">{type.replace('_', ' ')}</div>
            </div>
          ))}
        </div>

        <EnergyMap facilities={facilities} height="600px" initialZoom={3} />

        <div className="mt-4 text-xs text-tertiary">
          <p>
            Map shows sample facility locations. In production, this connects to live Supabase data from
            resilience_assets, ai_data_centres, hydrogen_projects, and weather_observations tables.
            Click markers for facility details. Use the legend to filter by type.
          </p>
        </div>
      </div>
    </div>
  );
};
