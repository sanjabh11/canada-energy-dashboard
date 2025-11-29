/**
 * Native Land Digital API Integration
 * 
 * Provides authentic Indigenous territory boundaries from native-land.ca
 * API Documentation: https://native-land.ca/resources/api-docs/
 * 
 * This integration is CRITICAL for the Indigenous Energy Intelligence Platform
 * as it provides the only comprehensive database of traditional territories.
 */

const NATIVE_LAND_API_BASE = 'https://native-land.ca/api/index.php';

export interface NativeLandTerritory {
  type: 'Feature';
  properties: {
    Name: string;
    FrenchName?: string;
    Slug: string;
    description?: string;
    color?: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface NativeLandResponse {
  type: 'FeatureCollection';
  features: NativeLandTerritory[];
}

export interface TerritorySearchResult {
  id: string;
  name: string;
  frenchName?: string;
  slug: string;
  description?: string;
  color?: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  centroid: {
    lat: number;
    lng: number;
  };
  geometry: NativeLandTerritory['geometry'];
}

/**
 * Search for territories by name
 */
export async function searchTerritories(query: string): Promise<TerritorySearchResult[]> {
  try {
    const url = `${NATIVE_LAND_API_BASE}?maps=territories&name=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Native Land API error: ${response.status}`);
    }
    
    const data: NativeLandTerritory[] = await response.json();
    return data.map(transformTerritory);
  } catch (error) {
    console.error('Error searching Native Land territories:', error);
    return [];
  }
}

/**
 * Get territories at a specific coordinate (lat/lng)
 */
export async function getTerritoriesAtPoint(lat: number, lng: number): Promise<TerritorySearchResult[]> {
  try {
    const url = `${NATIVE_LAND_API_BASE}?maps=territories&position=${lat},${lng}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Native Land API error: ${response.status}`);
    }
    
    const data: NativeLandTerritory[] = await response.json();
    return data.map(transformTerritory);
  } catch (error) {
    console.error('Error fetching territories at point:', error);
    return [];
  }
}

/**
 * Get all territories (cached for performance)
 * Note: This returns a large dataset, use sparingly
 */
let cachedTerritories: TerritorySearchResult[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function getAllTerritories(): Promise<TerritorySearchResult[]> {
  const now = Date.now();
  
  if (cachedTerritories && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedTerritories;
  }
  
  try {
    const url = `${NATIVE_LAND_API_BASE}?maps=territories`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Native Land API error: ${response.status}`);
    }
    
    const data: NativeLandTerritory[] = await response.json();
    cachedTerritories = data.map(transformTerritory);
    cacheTimestamp = now;
    
    return cachedTerritories;
  } catch (error) {
    console.error('Error fetching all territories:', error);
    return cachedTerritories || [];
  }
}

/**
 * Get Canadian territories only (filtered by bounding box)
 */
export async function getCanadianTerritories(): Promise<TerritorySearchResult[]> {
  const allTerritories = await getAllTerritories();
  
  // Canada bounding box (approximate)
  const CANADA_BOUNDS = {
    north: 83.0,
    south: 41.7,
    east: -52.6,
    west: -141.0
  };
  
  return allTerritories.filter(territory => {
    const { centroid } = territory;
    return (
      centroid.lat >= CANADA_BOUNDS.south &&
      centroid.lat <= CANADA_BOUNDS.north &&
      centroid.lng >= CANADA_BOUNDS.west &&
      centroid.lng <= CANADA_BOUNDS.east
    );
  });
}

/**
 * Get territories by province (approximate based on centroid)
 */
export async function getTerritoriesByProvince(province: string): Promise<TerritorySearchResult[]> {
  const provinceBounds: Record<string, { north: number; south: number; east: number; west: number }> = {
    'Alberta': { north: 60.0, south: 49.0, east: -110.0, west: -120.0 },
    'British Columbia': { north: 60.0, south: 48.3, east: -114.0, west: -139.0 },
    'Manitoba': { north: 60.0, south: 49.0, east: -89.0, west: -102.0 },
    'New Brunswick': { north: 48.1, south: 44.6, east: -63.8, west: -69.1 },
    'Newfoundland and Labrador': { north: 60.4, south: 46.6, east: -52.6, west: -67.8 },
    'Northwest Territories': { north: 78.8, south: 60.0, east: -102.0, west: -136.5 },
    'Nova Scotia': { north: 47.0, south: 43.4, east: -59.7, west: -66.4 },
    'Nunavut': { north: 83.1, south: 51.7, east: -61.2, west: -120.7 },
    'Ontario': { north: 56.9, south: 41.7, east: -74.3, west: -95.2 },
    'Prince Edward Island': { north: 47.1, south: 45.9, east: -62.0, west: -64.4 },
    'Quebec': { north: 62.6, south: 45.0, east: -57.1, west: -79.8 },
    'Saskatchewan': { north: 60.0, south: 49.0, east: -101.4, west: -110.0 },
    'Yukon': { north: 69.6, south: 60.0, east: -124.0, west: -141.0 }
  };
  
  const bounds = provinceBounds[province];
  if (!bounds) {
    console.warn(`Unknown province: ${province}`);
    return [];
  }
  
  const allTerritories = await getAllTerritories();
  
  return allTerritories.filter(territory => {
    const { centroid } = territory;
    return (
      centroid.lat >= bounds.south &&
      centroid.lat <= bounds.north &&
      centroid.lng >= bounds.west &&
      centroid.lng <= bounds.east
    );
  });
}

/**
 * Transform Native Land API response to our internal format
 */
function transformTerritory(feature: NativeLandTerritory): TerritorySearchResult {
  const { properties, geometry } = feature;
  
  // Calculate bounds and centroid from geometry
  const { bounds, centroid } = calculateBoundsAndCentroid(geometry);
  
  return {
    id: properties.Slug,
    name: properties.Name,
    frenchName: properties.FrenchName,
    slug: properties.Slug,
    description: properties.description,
    color: properties.color || '#8B4513', // Default brown for territories
    bounds,
    centroid,
    geometry
  };
}

/**
 * Calculate bounding box and centroid from GeoJSON geometry
 */
function calculateBoundsAndCentroid(geometry: NativeLandTerritory['geometry']): {
  bounds: { north: number; south: number; east: number; west: number };
  centroid: { lat: number; lng: number };
} {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  
  const processCoordinates = (coords: number[][]) => {
    for (const [lng, lat] of coords) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      sumLat += lat;
      sumLng += lng;
      count++;
    }
  };
  
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates as number[][][]) {
      processCoordinates(ring);
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates as number[][][][]) {
      for (const ring of polygon) {
        processCoordinates(ring);
      }
    }
  }
  
  return {
    bounds: {
      north: maxLat,
      south: minLat,
      east: maxLng,
      west: minLng
    },
    centroid: {
      lat: count > 0 ? sumLat / count : 0,
      lng: count > 0 ? sumLng / count : 0
    }
  };
}

// GeoJSON FeatureCollection type for Mapbox compatibility
interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: string;
    properties: Record<string, unknown>;
    geometry: NativeLandTerritory['geometry'];
  }>;
}

/**
 * Convert Native Land territory to Mapbox-compatible GeoJSON
 */
export function toMapboxGeoJSON(territories: TerritorySearchResult[]): GeoJSONFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: territories.map(territory => ({
      type: 'Feature' as const,
      id: territory.id,
      properties: {
        name: territory.name,
        frenchName: territory.frenchName,
        slug: territory.slug,
        description: territory.description,
        color: territory.color
      },
      geometry: territory.geometry
    }))
  };
}

/**
 * Get territory info for a project location
 * Returns all overlapping territories for a given lat/lng
 */
export async function getProjectTerritoryInfo(lat: number, lng: number): Promise<{
  territories: TerritorySearchResult[];
  primaryTerritory: TerritorySearchResult | null;
  territoryNames: string[];
}> {
  const territories = await getTerritoriesAtPoint(lat, lng);
  
  return {
    territories,
    primaryTerritory: territories.length > 0 ? territories[0] : null,
    territoryNames: territories.map(t => t.name)
  };
}

/**
 * Validate if a project is on traditional territory
 * Used for UNDRIP compliance checking
 */
export async function validateProjectTerritory(
  projectLat: number,
  projectLng: number,
  claimedTerritoryName: string
): Promise<{
  isValid: boolean;
  matchedTerritory: TerritorySearchResult | null;
  allTerritories: TerritorySearchResult[];
  message: string;
}> {
  const territories = await getTerritoriesAtPoint(projectLat, projectLng);
  
  const matchedTerritory = territories.find(
    t => t.name.toLowerCase().includes(claimedTerritoryName.toLowerCase()) ||
         claimedTerritoryName.toLowerCase().includes(t.name.toLowerCase())
  );
  
  if (matchedTerritory) {
    return {
      isValid: true,
      matchedTerritory,
      allTerritories: territories,
      message: `Project location confirmed on ${matchedTerritory.name} traditional territory.`
    };
  }
  
  if (territories.length > 0) {
    return {
      isValid: false,
      matchedTerritory: null,
      allTerritories: territories,
      message: `Project location is on ${territories.map(t => t.name).join(', ')} territory, not ${claimedTerritoryName}.`
    };
  }
  
  return {
    isValid: false,
    matchedTerritory: null,
    allTerritories: [],
    message: 'No traditional territory data found for this location.'
  };
}

export default {
  searchTerritories,
  getTerritoriesAtPoint,
  getAllTerritories,
  getCanadianTerritories,
  getTerritoriesByProvince,
  toMapboxGeoJSON,
  getProjectTerritoryInfo,
  validateProjectTerritory
};
