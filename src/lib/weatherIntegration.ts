/**
 * Weather Integration - Hybrid Strategy
 * 
 * Primary: Open-Meteo (keyless, free, global coverage)
 * Calibration: Environment Canada ECCC (Canada-specific accuracy)
 * 
 * Features needed for renewable forecasting:
 * - Cloud cover (solar)
 * - Wind speed & direction (wind)
 * - Temperature (solar efficiency)
 * - Solar radiation (solar)
 */

import type { ProvenanceMetadata } from './types/provenance';
import { createProvenance } from './types/provenance';

export interface WeatherData {
  timestamp: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  cloud_cover_percent: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  solar_radiation_wm2?: number;
  humidity_percent?: number;
  pressure_hpa?: number;
  provenance: ProvenanceMetadata;
}

export interface ProvinceCentroid {
  latitude: number;
  longitude: number;
  name: string;
}

/**
 * Province centroids for weather queries
 */
export const PROVINCE_CENTROIDS: Record<string, ProvinceCentroid> = {
  ON: { latitude: 51.2538, longitude: -85.3232, name: 'Ontario' },
  AB: { latitude: 53.9333, longitude: -116.5765, name: 'Alberta' },
  BC: { latitude: 53.7267, longitude: -127.6476, name: 'British Columbia' },
  QC: { latitude: 52.9399, longitude: -73.5491, name: 'Quebec' },
  MB: { latitude: 53.7609, longitude: -98.8139, name: 'Manitoba' },
  SK: { latitude: 52.9399, longitude: -106.4509, name: 'Saskatchewan' },
  NS: { latitude: 44.6819, longitude: -63.7443, name: 'Nova Scotia' },
  NB: { latitude: 46.5653, longitude: -66.4619, name: 'New Brunswick' },
};

/**
 * Fetch weather from Open-Meteo (primary source)
 * 
 * Free, no API key required, excellent for operational forecasting
 * https://open-meteo.com/en/docs
 */
export async function fetchOpenMeteoWeather(
  province: string,
  forecastHours: number = 24
): Promise<WeatherData[]> {
  const centroid = PROVINCE_CENTROIDS[province];
  if (!centroid) {
    throw new Error(`Unknown province: ${province}`);
  }

  const { latitude, longitude } = centroid;

  // Build API URL
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: [
      'temperature_2m',
      'cloudcover',
      'windspeed_10m',
      'winddirection_10m',
      'shortwave_radiation',
      'relativehumidity_2m',
      'surface_pressure',
    ].join(','),
    forecast_hours: forecastHours.toString(),
    timezone: 'America/Toronto', // Adjust per province if needed
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CanadaEnergyDashboard/1.0 (learning-project)',
      },
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Parse hourly data
    const weatherData: WeatherData[] = [];
    const hourly = data.hourly;

    for (let i = 0; i < hourly.time.length; i++) {
      weatherData.push({
        timestamp: hourly.time[i],
        latitude,
        longitude,
        temperature_c: hourly.temperature_2m[i] || 0,
        cloud_cover_percent: hourly.cloudcover[i] || 0,
        wind_speed_ms: hourly.windspeed_10m[i] || 0,
        wind_direction_deg: hourly.winddirection_10m[i] || 0,
        solar_radiation_wm2: hourly.shortwave_radiation?.[i],
        humidity_percent: hourly.relativehumidity_2m?.[i],
        pressure_hpa: hourly.surface_pressure?.[i],
        provenance: createProvenance('real_stream', 'Open-Meteo', 0.85, {
          notes: 'Global weather model, not Canada-specific',
        }),
      });
    }

    return weatherData;
  } catch (error) {
    console.error('Open-Meteo fetch error:', error);
    throw error;
  }
}

/**
 * Fetch weather from Environment Canada (ECCC)
 * 
 * Canada-specific, higher accuracy for calibration
 * https://eccc-msc.github.io/open-data/
 */
export async function fetchECCCWeather(
  province: string
): Promise<WeatherData | null> {
  // ECCC API requires station IDs - simplified approach for now
  // In production, would map provinces to nearest stations
  
  // For now, return null and rely on Open-Meteo
  // TODO: Implement ECCC station lookup and data parsing
  
  console.warn('ECCC weather integration not yet implemented - using Open-Meteo only');
  return null;
}

/**
 * Hybrid weather fetch with calibration
 * 
 * 1. Fetch from Open-Meteo (primary)
 * 2. Optionally calibrate with ECCC observations
 * 3. Return with provenance metadata
 */
export async function fetchHybridWeather(
  province: string,
  forecastHours: number = 24,
  useCalibration: boolean = true
): Promise<WeatherData[]> {
  // Fetch Open-Meteo data
  const openMeteoData = await fetchOpenMeteoWeather(province, forecastHours);

  if (!useCalibration) {
    return openMeteoData;
  }

  // Attempt ECCC calibration
  try {
    const ecccCurrent = await fetchECCCWeather(province);
    
    if (ecccCurrent) {
      // Apply bias correction based on current ECCC observation
      return applyCalibratio(openMeteoData, ecccCurrent, province);
    }
  } catch (error) {
    console.warn('ECCC calibration failed, using Open-Meteo raw:', error);
  }

  return openMeteoData;
}

/**
 * Apply calibration to Open-Meteo data using ECCC observations
 * 
 * Computes bias corrections and adjusts confidence intervals
 */
function applyCalibratio(
  openMeteoData: WeatherData[],
  ecccObservation: WeatherData,
  province: string
): WeatherData[] {
  // Find nearest Open-Meteo timestamp to ECCC observation
  const ecccTime = new Date(ecccObservation.timestamp).getTime();
  const nearest = openMeteoData.reduce((prev, curr) => {
    const prevDiff = Math.abs(new Date(prev.timestamp).getTime() - ecccTime);
    const currDiff = Math.abs(new Date(curr.timestamp).getTime() - ecccTime);
    return currDiff < prevDiff ? curr : prev;
  });

  // Calculate biases
  const tempBias = ecccObservation.temperature_c - nearest.temperature_c;
  const windBias = ecccObservation.wind_speed_ms - nearest.wind_speed_ms;
  const cloudBias = ecccObservation.cloud_cover_percent - nearest.cloud_cover_percent;

  // Apply bias corrections
  return openMeteoData.map(data => ({
    ...data,
    temperature_c: data.temperature_c + tempBias * 0.7, // 70% correction
    wind_speed_ms: Math.max(0, data.wind_speed_ms + windBias * 0.6),
    cloud_cover_percent: Math.max(0, Math.min(100, data.cloud_cover_percent + cloudBias * 0.5)),
    provenance: createProvenance('calibrated', 'Open-Meteo + ECCC', 0.92, {
      calibration_source: 'ECCC',
      calibrated: true,
      notes: `Calibrated with ECCC observation from ${ecccObservation.timestamp}`,
    }),
  }));
}

/**
 * Get current weather for immediate use
 */
export async function getCurrentWeather(province: string): Promise<WeatherData | null> {
  try {
    const forecast = await fetchHybridWeather(province, 1);
    return forecast[0] || null;
  } catch (error) {
    console.error('Failed to fetch current weather:', error);
    return null;
  }
}

/**
 * Cache weather data with 30-minute TTL
 */
const weatherCache = new Map<string, { data: WeatherData[]; expires: number }>();

export async function getCachedWeather(
  province: string,
  forecastHours: number = 24,
  cacheDuration: number = 30 * 60 * 1000 // 30 minutes
): Promise<WeatherData[]> {
  const cacheKey = `${province}-${forecastHours}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  const fresh = await fetchHybridWeather(province, forecastHours);
  weatherCache.set(cacheKey, {
    data: fresh,
    expires: Date.now() + cacheDuration,
  });

  return fresh;
}

/**
 * Fallback weather generator for when APIs are unavailable
 * 
 * Returns indicative values with clearly marked provenance
 */
export function generateFallbackWeather(
  province: string,
  timestamp: string
): WeatherData {
  const centroid = PROVINCE_CENTROIDS[province] || PROVINCE_CENTROIDS.ON;
  const hour = new Date(timestamp).getHours();
  
  // Simplified seasonal/diurnal patterns
  const isDaytime = hour >= 6 && hour <= 18;
  const seasonalTemp = 15; // Simplified - would use month-based lookup
  
  return {
    timestamp,
    latitude: centroid.latitude,
    longitude: centroid.longitude,
    temperature_c: seasonalTemp + (isDaytime ? 5 : -5),
    cloud_cover_percent: 40 + Math.random() * 30,
    wind_speed_ms: 3 + Math.random() * 5,
    wind_direction_deg: Math.random() * 360,
    solar_radiation_wm2: isDaytime ? 400 + Math.random() * 400 : 0,
    humidity_percent: 60 + Math.random() * 20,
    provenance: createProvenance('proxy_indicative', 'Fallback Generator', 0.4, {
      notes: 'Fallback weather data - API unavailable',
    }),
  };
}

/**
 * Widen confidence intervals when using fallback or uncalibrated data
 */
export function adjustConfidenceInterval(
  baseInterval: number,
  provenance: ProvenanceMetadata
): number {
  if (provenance.type === 'proxy_indicative') {
    return baseInterval * 1.5; // 50% wider
  } else if (provenance.type === 'real_stream' && !provenance.calibrated) {
    return baseInterval * 1.2; // 20% wider
  }
  return baseInterval;
}
