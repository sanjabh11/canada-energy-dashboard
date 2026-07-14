/**
 * Weather API Integration Service
 * Fetches current weather data for renewable energy forecasting
 *
 * APIs Used:
 * 1. Environment Canada (Free, official Canadian data)
 * 2. OpenWeatherMap (Backup, requires API key)
 */

import type { WeatherObservation, WeatherFeatures, WeatherSource } from './types/renewableForecast';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENVIRONMENT_CANADA_BASE_URL = 'https://api.weather.gc.ca';
const OPENWEATHERMAP_BASE_URL = 'https://api.openweathermap.org/data/3.0';
const OPEN_METEO_GEM_HRDPS_URL = 'https://api.open-meteo.com/v1/gem';
const OPEN_METEO_GEM_RDPS_URL = 'https://api.open-meteo.com/v1/gem?model=rdps';

function isExternalWeatherFetchEnabled(): boolean {
  return String(import.meta.env.VITE_ENABLE_WEATHER_FETCH ?? '').toLowerCase() === 'true';
}

// Provincial capital coordinates for weather stations
const PROVINCIAL_COORDINATES: Record<string, { lat: number; lon: number; station?: string }> = {
  ON: { lat: 43.6532, lon: -79.3832, station: 'YYZ' }, // Toronto
  QC: { lat: 45.5017, lon: -73.5673, station: 'YUL' }, // Montreal
  BC: { lat: 49.2827, lon: -123.1207, station: 'YVR' }, // Vancouver
  AB: { lat: 51.0447, lon: -114.0719, station: 'YYC' }, // Calgary
  MB: { lat: 49.8951, lon: -97.1384, station: 'YWG' }, // Winnipeg
  SK: { lat: 50.4452, lon: -104.6189, station: 'YQR' }, // Regina
  NS: { lat: 44.6488, lon: -63.5752, station: 'YHZ' }, // Halifax
  NB: { lat: 45.9636, lon: -66.6431, station: 'YFC' }, // Fredericton
  PE: { lat: 46.2382, lon: -63.1311, station: 'YYG' }, // Charlottetown
  NL: { lat: 47.5615, lon: -52.7126, station: 'YYT' }, // St. John's
  YT: { lat: 60.7212, lon: -135.0568, station: 'YXY' }, // Whitehorse
  NT: { lat: 62.454, lon: -114.3718, station: 'YZF' }, // Yellowknife
  NU: { lat: 63.7467, lon: -68.517, station: 'YFB' }, // Iqaluit
};

// ============================================================================
// ENVIRONMENT CANADA API
// ============================================================================

interface EnvironmentCanadaResponse {
  properties: {
    temperature?: { value: number };
    dewpoint?: { value: number };
    windSpeed?: { value: number };
    windDirection?: { value: number };
    humidity?: { value: number };
    pressure?: { value: number };
    condition?: string;
    iconCode?: string;
  };
  timestamp: string;
}

/**
 * Fetch weather from Environment Canada
 * Note: API structure is simplified - actual implementation may vary
 */
async function fetchEnvironmentCanadaWeather(province: string): Promise<WeatherObservation | null> {
  try {
    const coords = PROVINCIAL_COORDINATES[province];
    if (!coords) {
      console.warn(`No coordinates for province: ${province}`);
      return null;
    }

    // Environment Canada API endpoint (this is a placeholder - actual API may differ)
    // Real implementation would use: https://dd.weather.gc.ca/observations/xml/
    const url = `${ENVIRONMENT_CANADA_BASE_URL}/observations?lat=${coords.lat}&lon=${coords.lon}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`Environment Canada API error: ${response.status}`);
      return null;
    }

    const data: EnvironmentCanadaResponse = await response.json();

    return {
      id: crypto.randomUUID(),
      province,
      station_id: coords.station,
      latitude: coords.lat,
      longitude: coords.lon,
      temperature_c: data.properties.temperature?.value,
      humidity_percent: data.properties.humidity?.value,
      wind_speed_ms: data.properties.windSpeed?.value
        ? data.properties.windSpeed.value / 3.6
        : undefined, // km/h to m/s
      wind_direction_deg: data.properties.windDirection?.value,
      condition_code: data.properties.condition,
      source: 'environment_canada',
      observed_at: data.timestamp,
      received_at: new Date().toISOString(),
      raw_data: data,
    };
  } catch (error) {
    console.error('Environment Canada fetch error:', error);
    return null;
  }
}

// ============================================================================
// ECCC HRDPS / RDPS via Open-Meteo GEM API
// ============================================================================

interface OpenMeteoGemResponse {
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    precipitation: number[];
    cloud_cover: number[];
    shortwave_radiation: number[];
    dew_point_2m: number[];
    surface_pressure: number[];
  };
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    precipitation: number;
    cloud_cover: number;
    shortwave_radiation: number;
    dew_point_2m: number;
    surface_pressure: number;
  };
}

/**
 * Fetch weather from ECCC HRDPS (2.5km) or RDPS (10km) via Open-Meteo GEM API.
 *
 * HRDPS provides pan-Canadian 2.5km resolution 48-hour forecasts.
 * RDPS provides 10km resolution for longer horizons.
 * Both are free via Open-Meteo's GEM endpoint (no API key required).
 *
 * This replaces the placeholder provincial-capital weather with real NWP data
 * suitable for weather-informed demand forecasting, renewable generation
 * forecasting, and extreme-event robustness.
 *
 * References:
 *   - ECCC HRDPS: https://eccc-msc.github.io/open-data/msc-data/nwp_hrdps/readme_hrdps_en/
 *   - Open-Meteo GEM API: https://open-meteo.com/en/docs/gem-api
 */
async function fetchHrdpsWeather(
  province: string,
  model: 'hrdps' | 'rdps' = 'hrdps',
): Promise<WeatherObservation | null> {
  try {
    const coords = PROVINCIAL_COORDINATES[province];
    if (!coords) {
      console.warn(`No coordinates for province: ${province}`);
      return null;
    }

    const baseUrl = model === 'hrdps' ? OPEN_METEO_GEM_HRDPS_URL : OPEN_METEO_GEM_RDPS_URL;

    const params = new URLSearchParams({
      latitude: coords.lat.toString(),
      longitude: coords.lon.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'wind_speed_10m',
        'wind_direction_10m',
        'precipitation',
        'cloud_cover',
        'shortwave_radiation',
        'dew_point_2m',
        'surface_pressure',
      ].join(','),
      hourly: [
        'temperature_2m',
        'relative_humidity_2m',
        'wind_speed_10m',
        'wind_direction_10m',
        'precipitation',
        'cloud_cover',
        'shortwave_radiation',
        'dew_point_2m',
        'surface_pressure',
      ].join(','),
      forecast_days: model === 'hrdps' ? '2' : '3',
      timezone: 'America/Toronto',
    });

    const url = `${baseUrl}?${params.toString()}`;

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`Open-Meteo GEM API error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as OpenMeteoGemResponse;
    const current = data.current;

    return {
      id: crypto.randomUUID(),
      province,
      station_id: `${model.toUpperCase()}_${coords.station ?? province}`,
      latitude: coords.lat,
      longitude: coords.lon,
      temperature_c: current.temperature_2m,
      humidity_percent: current.relative_humidity_2m,
      wind_speed_ms: current.wind_speed_10m,
      wind_direction_deg: current.wind_direction_10m,
      cloud_cover_percent: current.cloud_cover,
      precipitation_mm: current.precipitation,
      solar_radiation_wm2: current.shortwave_radiation,
      condition_code:
        current.cloud_cover > 75 ? 'Cloudy' : current.cloud_cover > 25 ? 'Partly Cloudy' : 'Clear',
      source: model === 'hrdps' ? 'eccc_hrdps' : 'eccc_rdps',
      observed_at: current.time,
      received_at: new Date().toISOString(),
      raw_data: data,
    };
  } catch (error) {
    console.error(`ECCC ${model.toUpperCase()} fetch error:`, error);
    return null;
  }
}

/**
 * Fetch HRDPS forecast time series for a province.
 *
 * Returns hourly forecast data for the next 48 hours (HRDPS) or 72 hours (RDPS),
 * suitable for demand forecasting feature engineering.
 */
export async function fetchHrdpsForecastSeries(
  province: string,
  model: 'hrdps' | 'rdps' = 'hrdps',
  hours = 48,
): Promise<Array<{
  time: string;
  temperature_c: number;
  humidity_pct: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  precipitation_mm: number;
  cloud_cover_pct: number;
  solar_radiation_wm2: number;
  dew_point_c: number;
  surface_pressure_hpa: number;
}> | null> {
  try {
    const coords = PROVINCIAL_COORDINATES[province];
    if (!coords) return null;

    const baseUrl = model === 'hrdps' ? OPEN_METEO_GEM_HRDPS_URL : OPEN_METEO_GEM_RDPS_URL;

    const params = new URLSearchParams({
      latitude: coords.lat.toString(),
      longitude: coords.lon.toString(),
      hourly: [
        'temperature_2m',
        'relative_humidity_2m',
        'wind_speed_10m',
        'wind_direction_10m',
        'precipitation',
        'cloud_cover',
        'shortwave_radiation',
        'dew_point_2m',
        'surface_pressure',
      ].join(','),
      forecast_days: model === 'hrdps' ? '2' : '3',
      timezone: 'America/Toronto',
    });

    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as OpenMeteoGemResponse;
    const h = data.hourly;
    const n = Math.min(hours, h.time.length);

    return Array.from({ length: n }, (_, i) => ({
      time: h.time[i],
      temperature_c: h.temperature_2m[i],
      humidity_pct: h.relative_humidity_2m[i],
      wind_speed_ms: h.wind_speed_10m[i],
      wind_direction_deg: h.wind_direction_10m[i],
      precipitation_mm: h.precipitation[i],
      cloud_cover_pct: h.cloud_cover[i],
      solar_radiation_wm2: h.shortwave_radiation[i],
      dew_point_c: h.dew_point_2m[i],
      surface_pressure_hpa: h.surface_pressure[i],
    }));
  } catch (error) {
    console.error(`ECCC ${model.toUpperCase()} forecast series error:`, error);
    return null;
  }
}

// ============================================================================
// OPENWEATHERMAP API
// ============================================================================

interface OpenWeatherMapResponse {
  coord: { lat: number; lon: number };
  weather: Array<{ id: number; main: string; description: string }>;
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: { all: number };
  rain?: { '1h': number };
  snow?: { '1h': number };
  dt: number;
  sys: { country: string };
  name: string;
}

/**
 * Fetch weather from OpenWeatherMap
 * Requires API key in environment variable: VITE_OPENWEATHERMAP_API_KEY
 */
async function fetchOpenWeatherMapWeather(province: string): Promise<WeatherObservation | null> {
  try {
    const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      console.warn('OpenWeatherMap API key not configured');
      return null;
    }

    const coords = PROVINCIAL_COORDINATES[province];
    if (!coords) {
      return null;
    }

    const url = `${OPENWEATHERMAP_BASE_URL}/onecall?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric&exclude=minutely,hourly,daily,alerts`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`OpenWeatherMap API error: ${response.status}`);
      return null;
    }

    const data: OpenWeatherMapResponse = await response.json();

    return {
      id: crypto.randomUUID(),
      province,
      station_id: `OWM_${coords.station}`,
      latitude: data.coord.lat,
      longitude: data.coord.lon,
      temperature_c: data.main.temp,
      humidity_percent: data.main.humidity,
      wind_speed_ms: data.wind.speed,
      wind_direction_deg: data.wind.deg,
      cloud_cover_percent: data.clouds.all,
      precipitation_mm: data.rain?.['1h'] || data.snow?.['1h'],
      condition_code: data.weather[0]?.main,
      source: 'openweathermap',
      observed_at: new Date(data.dt * 1000).toISOString(),
      received_at: new Date().toISOString(),
      raw_data: data,
    };
  } catch (error) {
    console.error('OpenWeatherMap fetch error:', error);
    return null;
  }
}

// ============================================================================
// MAIN WEATHER SERVICE
// ============================================================================

export interface WeatherServiceOptions {
  preferredSource?: WeatherSource;
  fallbackEnabled?: boolean;
  cacheMinutes?: number;
}

/**
 * Fetch current weather data for a province
 * Tries Environment Canada first (free), falls back to OpenWeatherMap
 */
export async function fetchWeatherForProvince(
  province: string,
  options: WeatherServiceOptions = {},
): Promise<WeatherObservation | null> {
  if (!isExternalWeatherFetchEnabled()) {
    return null;
  }

  const { preferredSource = 'environment_canada', fallbackEnabled = true } = options;

  let observation: WeatherObservation | null = null;

  // Try preferred source first
  if (preferredSource === 'eccc_hrdps') {
    observation = await fetchHrdpsWeather(province, 'hrdps');
    if (!observation && fallbackEnabled) {
      observation = await fetchEnvironmentCanadaWeather(province);
      if (!observation) {
        observation = await fetchOpenWeatherMapWeather(province);
      }
    }
  } else if (preferredSource === 'eccc_rdps') {
    observation = await fetchHrdpsWeather(province, 'rdps');
    if (!observation && fallbackEnabled) {
      observation = await fetchHrdpsWeather(province, 'hrdps');
      if (!observation) {
        observation = await fetchEnvironmentCanadaWeather(province);
      }
    }
  } else if (preferredSource === 'environment_canada') {
    observation = await fetchEnvironmentCanadaWeather(province);
    if (!observation && fallbackEnabled) {
      observation = await fetchHrdpsWeather(province, 'hrdps');
      if (!observation) {
        observation = await fetchOpenWeatherMapWeather(province);
      }
    }
  } else if (preferredSource === 'openweathermap') {
    observation = await fetchOpenWeatherMapWeather(province);
    if (!observation && fallbackEnabled) {
      observation = await fetchHrdpsWeather(province, 'hrdps');
      if (!observation) {
        observation = await fetchEnvironmentCanadaWeather(province);
      }
    }
  }

  return observation;
}

/**
 * Fetch weather for multiple provinces in parallel
 */
export async function fetchWeatherForProvinces(
  provinces: string[],
  options: WeatherServiceOptions = {},
): Promise<Record<string, WeatherObservation | null>> {
  const results = await Promise.all(
    provinces.map(async (province) => ({
      province,
      observation: await fetchWeatherForProvince(province, options),
    })),
  );

  return Object.fromEntries(results.map((r) => [r.province, r.observation]));
}

/**
 * Extract weather features for ML forecasting
 */
export function extractWeatherFeatures(observation: WeatherObservation | null): WeatherFeatures {
  if (!observation) {
    return {};
  }

  return {
    temp_c: observation.temperature_c,
    cloud_cover_pct: observation.cloud_cover_percent,
    wind_speed_ms: observation.wind_speed_ms,
    wind_direction_deg: observation.wind_direction_deg,
    precipitation_mm: observation.precipitation_mm,
    humidity_pct: observation.humidity_percent,
    solar_radiation_wm2: observation.solar_radiation_wm2,
  };
}

/**
 * Store weather observation in Supabase
 */
export async function storeWeatherObservation(observation: WeatherObservation): Promise<boolean> {
  console.warn(
    'storeWeatherObservation is deprecated in the client; use the weather-ingestion-cron or a server-side writer instead.',
    observation.source,
  );
  return false;
}

/**
 * Fetch recent weather observations from database
 */
export async function fetchRecentWeatherObservations(
  province: string,
  hours: number = 24,
): Promise<WeatherObservation[]> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return [];
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const url = new URL(`${supabaseUrl}/rest/v1/weather_observations`);
    url.searchParams.set('province', `eq.${province}`);
    url.searchParams.set('observed_at', `gte.${since}`);
    url.searchParams.set('order', 'observed_at.desc');
    url.searchParams.set('limit', '100');

    const response = await fetch(url.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch weather observations:', error);
    return [];
  }
}

// ============================================================================
// MOCK DATA GENERATOR (for development/testing)
// ============================================================================

export function generateMockWeather(province: string): WeatherObservation {
  const coords = PROVINCIAL_COORDINATES[province] || { lat: 45, lon: -75 };
  const now = new Date();
  const hour = now.getHours();

  // Simulate realistic Canadian weather patterns
  const isWinter = [0, 1, 2, 11].includes(now.getMonth());
  const baseTemp = isWinter ? -10 + Math.random() * 15 : 15 + Math.random() * 15;

  return {
    id: crypto.randomUUID(),
    province,
    station_id: `MOCK_${coords.station || province}`,
    latitude: coords.lat,
    longitude: coords.lon,
    temperature_c: parseFloat(baseTemp.toFixed(1)),
    humidity_percent: parseFloat((40 + Math.random() * 40).toFixed(1)),
    wind_speed_ms: parseFloat((2 + Math.random() * 8).toFixed(1)),
    wind_direction_deg: parseFloat((Math.random() * 360).toFixed(0)),
    cloud_cover_percent: parseFloat((Math.random() * 100).toFixed(0)),
    solar_radiation_wm2:
      hour >= 6 && hour <= 18 ? parseFloat((200 + Math.random() * 600).toFixed(0)) : 0,
    precipitation_mm: Math.random() > 0.8 ? parseFloat((Math.random() * 5).toFixed(1)) : 0,
    condition_code: Math.random() > 0.7 ? 'Cloudy' : 'Clear',
    source: 'openweathermap',
    observed_at: now.toISOString(),
    received_at: now.toISOString(),
    raw_data: { mock: true },
  };
}

export default {
  fetchWeatherForProvince,
  fetchWeatherForProvinces,
  extractWeatherFeatures,
  storeWeatherObservation,
  fetchRecentWeatherObservations,
  generateMockWeather,
  PROVINCIAL_COORDINATES,
};
