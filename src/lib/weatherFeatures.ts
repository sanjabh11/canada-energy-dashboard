/**
 * Weather Feature Engineering for Demand Forecasting
 *
 * Transforms raw HRDPS/RDPS NWP data into engineered features suitable
 * for demand forecasting models. Includes heating/cooling degree hours,
 * lagged weather features, and interaction terms.
 *
 * References:
 *   - Hyndman & Athanasopoulos, "Forecasting: Principles and Practice" (3rd ed.)
 *   - ASHRAE Standard 55-2020 (Thermal Environmental Conditions)
 *   - ECCC HRDPS: https://eccc-msc.github.io/open-data/msc-data/nwp_hrdps/readme_hrdps_en/
 */

import type { WeatherFeatures } from './types/renewableForecast';

// ============================================================================
// TYPES
// ============================================================================

export interface WeatherFeatureSet {
  /** Heating degree hours (below base temperature) */
  hdh: number;
  /** Cooling degree hours (above base temperature) */
  cdh: number;
  /** Effective temperature (wind chill / heat index adjusted) */
  effective_temp_c: number;
  /** Wind chill temperature */
  wind_chill_c: number;
  /** Heat index temperature */
  heat_index_c: number;
  /** Solar irradiance normalized (0-1 scale) */
  solar_normalized: number;
  /** Cloud cover impact factor (0=clear, 1=overcast) */
  cloud_impact: number;
  /** Wind power potential (0-1 scale, cut-in to cut-out speed) */
  wind_power_potential: number;
  /** Precipitation indicator (0=dry, 1=wet) */
  precip_indicator: number;
  /** Temperature change rate (°C/hour) */
  temp_change_rate: number;
  /** Humidity comfort index (0=comfortable, 1=extreme) */
  discomfort_index: number;
  /** Combined weather score for demand prediction */
  weather_demand_score: number;
  /** Raw weather features passthrough */
  raw: WeatherFeatures;
}

export interface WeatherFeatureConfig {
  /** Base temperature for HDD/CDD calculation (default: 18°C) */
  baseTempC: number;
  /** Wind speed cut-in (m/s, default: 3) */
  windCutIn: number;
  /** Wind speed cut-out (m/s, default: 25) */
  windCutOut: number;
  /** Rated wind speed (m/s, default: 12) */
  windRated: number;
  /** Max solar irradiance for normalization (W/m², default: 1000) */
  maxSolar: number;
  /** Precipitation threshold (mm, default: 0.1) */
  precipThreshold: number;
}

export const DEFAULT_WEATHER_FEATURE_CONFIG: WeatherFeatureConfig = {
  baseTempC: 18,
  windCutIn: 3,
  windCutOut: 25,
  windRated: 12,
  maxSolar: 1000,
  precipThreshold: 0.1,
};

// ============================================================================
// CORE FEATURE ENGINEERING
// ============================================================================

/**
 * Compute wind chill temperature using the Environment Canada formula.
 * Valid when temperature <= 10°C and wind speed >= 5 km/h (1.39 m/s).
 *
 * Reference: ECCC Wind Chill formula (J. Osczevski & R. Bluestein, 2005)
 */
export function computeWindChill(tempC: number, windSpeedMs: number): number {
  if (tempC > 10 || windSpeedMs < 1.39) return tempC;
  const windKmh = windSpeedMs * 3.6;
  const wc =
    13.12 +
    0.6215 * tempC -
    11.37 * Math.pow(windKmh, 0.16) +
    0.3965 * tempC * Math.pow(windKmh, 0.16);
  return Math.round(wc * 10) / 10;
}

/**
 * Compute heat index using the Rothfusz regression formula.
 * Valid when temperature >= 27°C and relative humidity >= 40%.
 *
 * Reference: NWS Heat Index (Rothfusz, 1990)
 */
export function computeHeatIndex(tempC: number, humidityPct: number): number {
  if (tempC < 27 || humidityPct < 40) return tempC;
  const tempF = (tempC * 9) / 5 + 32;
  const hiF =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * humidityPct -
    0.22475541 * tempF * humidityPct -
    6.83783e-3 * tempF * tempF -
    5.481717e-2 * humidityPct * humidityPct +
    1.22874e-3 * tempF * tempF * humidityPct +
    8.5282e-4 * tempF * humidityPct * humidityPct -
    1.99e-6 * tempF * tempF * humidityPct * humidityPct;
  const hiC = ((hiF - 32) * 5) / 9;
  return Math.round(hiC * 10) / 10;
}

/**
 * Compute heating degree hours (HDH) and cooling degree hours (CDH).
 *
 * HDH = max(0, baseTemp - actualTemp)
 * CDH = max(0, actualTemp - baseTemp)
 *
 * These capture the non-linear relationship between temperature and demand:
 * demand increases when temperature deviates from the comfort zone.
 */
export function computeDegreeHours(tempC: number, baseTempC: number): { hdh: number; cdh: number } {
  return {
    hdh: Math.max(0, baseTempC - tempC),
    cdh: Math.max(0, tempC - baseTempC),
  };
}

/**
 * Compute wind power potential on a 0-1 scale.
 *
 * Uses a simplified wind turbine power curve:
 *   0 below cut-in speed
 *   cubic ramp from cut-in to rated speed
 *   1 from rated to cut-out speed
 *   0 above cut-out speed
 */
export function computeWindPowerPotential(
  windSpeedMs: number,
  config: WeatherFeatureConfig,
): number {
  if (windSpeedMs < config.windCutIn || windSpeedMs > config.windCutOut) return 0;
  if (windSpeedMs >= config.windRated) return 1;
  const ratio = (windSpeedMs - config.windCutIn) / (config.windRated - config.windCutIn);
  return Math.round(ratio * ratio * ratio * 1000) / 1000;
}

/**
 * Compute the discomfort index (Thom's Discomfort Index).
 *
 * DI = T - 0.55 × (1 - RH/100) × (T - 14.5)
 *
 * Where T is temperature in °C and RH is relative humidity in %.
 * Values > 24 indicate discomfort, > 28 severe discomfort.
 *
 * Reference: E.C. Thom, "The Discomfort Index", Weatherwise, 1959
 */
export function computeDiscomfortIndex(tempC: number, humidityPct: number): number {
  const di = tempC - 0.55 * (1 - humidityPct / 100) * (tempC - 14.5);
  return Math.round(di * 10) / 10;
}

/**
 * Compute a composite weather demand score.
 *
 * Combines degree hours, wind power potential, solar irradiance, and
 * precipitation into a single score that correlates with demand deviation.
 *
 * High score → above-normal demand expected (cold + calm + dark + dry)
 * Low score → below-normal demand expected (mild + windy + sunny)
 */
export function computeWeatherDemandScore(features: WeatherFeatureSet): number {
  const hdhComponent = features.hdh / 30;
  const cdhComponent = features.cdh / 20;
  const windPenalty = (1 - features.wind_power_potential) * 0.3;
  const solarPenalty = (1 - features.solar_normalized) * 0.2;
  const score = clamp(hdhComponent * 0.4 + cdhComponent * 0.3 + windPenalty + solarPenalty, 0, 2);
  return Math.round(score * 1000) / 1000;
}

// ============================================================================
// MAIN FEATURE EXTRACTION
// ============================================================================

/**
 * Extract engineered weather features from raw NWP observations.
 *
 * @param current Current weather features
 * @param previous Previous hour weather features (for change rate)
 * @param config Feature engineering configuration
 */
export function extractWeatherFeatures(
  current: WeatherFeatures,
  previous?: WeatherFeatures,
  config: WeatherFeatureConfig = DEFAULT_WEATHER_FEATURE_CONFIG,
): WeatherFeatureSet {
  const tempC = current.temp_c ?? 18;
  const humidity = current.humidity_pct ?? 50;
  const windSpeed = current.wind_speed_ms ?? 0;
  const solar = current.solar_radiation_wm2 ?? 0;
  const cloudCover = current.cloud_cover_pct ?? 50;
  const precip = current.precipitation_mm ?? 0;

  const { hdh, cdh } = computeDegreeHours(tempC, config.baseTempC);
  const windChill = computeWindChill(tempC, windSpeed);
  const heatIndex = computeHeatIndex(tempC, humidity);
  const effectiveTemp = tempC <= 10 ? windChill : tempC >= 27 ? heatIndex : tempC;
  const windPower = computeWindPowerPotential(windSpeed, config);
  const discomfort = computeDiscomfortIndex(tempC, humidity);

  const tempChangeRate =
    previous?.temp_c != null ? Math.round((tempC - previous.temp_c) * 10) / 10 : 0;

  const solarNormalized = clamp(solar / config.maxSolar);
  const cloudImpact = clamp(cloudCover / 100);
  const precipIndicator = precip >= config.precipThreshold ? 1 : 0;

  const base: WeatherFeatureSet = {
    hdh: Math.round(hdh * 10) / 10,
    cdh: Math.round(cdh * 10) / 10,
    effective_temp_c: effectiveTemp,
    wind_chill_c: windChill,
    heat_index_c: heatIndex,
    solar_normalized: solarNormalized,
    cloud_impact: cloudImpact,
    wind_power_potential: windPower,
    precip_indicator: precipIndicator,
    temp_change_rate: tempChangeRate,
    discomfort_index: discomfort,
    weather_demand_score: 0,
    raw: current,
  };

  base.weather_demand_score = computeWeatherDemandScore(base);
  return base;
}

/**
 * Extract a time series of weather features from hourly NWP data.
 *
 * @param hourlyData Array of hourly weather features (chronological order)
 * @param config Feature engineering configuration
 */
export function extractWeatherFeatureSeries(
  hourlyData: WeatherFeatures[],
  config: WeatherFeatureConfig = DEFAULT_WEATHER_FEATURE_CONFIG,
): WeatherFeatureSet[] {
  return hourlyData.map((features, i) =>
    extractWeatherFeatures(features, i > 0 ? hourlyData[i - 1] : undefined, config),
  );
}

/**
 * Generate lagged weather features for forecasting.
 *
 * Returns features at lags of 1, 2, 3, 6, 12, and 24 hours,
 * which capture weather persistence and diurnal cycles.
 */
export function generateLaggedWeatherFeatures(
  featureSeries: WeatherFeatureSet[],
  forecastHour: number,
): Array<{ lag: number; features: WeatherFeatureSet | null }> {
  const lags = [1, 2, 3, 6, 12, 24];
  return lags.map((lag) => {
    const idx = forecastHour - lag;
    return {
      lag,
      features: idx >= 0 && idx < featureSeries.length ? featureSeries[idx] : null,
    };
  });
}

/**
 * Compute rolling statistics for weather features.
 *
 * Useful for capturing weather regimes and persistence.
 */
export function computeRollingWeatherStats(
  featureSeries: WeatherFeatureSet[],
  windowSize: number,
): Array<{
  mean_temp: number;
  std_temp: number;
  mean_wind: number;
  max_precip: number;
  mean_solar: number;
}> {
  return featureSeries.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = featureSeries.slice(start, i + 1);
    const temps = window.map((f) => f.raw.temp_c ?? 18);
    const winds = window.map((f) => f.raw.wind_speed_ms ?? 0);
    const precips = window.map((f) => f.raw.precipitation_mm ?? 0);
    const solars = window.map((f) => f.raw.solar_radiation_wm2 ?? 0);

    const meanTemp = temps.reduce((s, v) => s + v, 0) / temps.length;
    const stdTemp = Math.sqrt(temps.reduce((s, v) => s + (v - meanTemp) ** 2, 0) / temps.length);
    const meanWind = winds.reduce((s, v) => s + v, 0) / winds.length;
    const maxPrecip = Math.max(...precips);
    const meanSolar = solars.reduce((s, v) => s + v, 0) / solars.length;

    return {
      mean_temp: Math.round(meanTemp * 10) / 10,
      std_temp: Math.round(stdTemp * 10) / 10,
      mean_wind: Math.round(meanWind * 10) / 10,
      max_precip: Math.round(maxPrecip * 100) / 100,
      mean_solar: Math.round(meanSolar * 10) / 10,
    };
  });
}

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Weather-informed demand adjustment factor.
 *
 * Returns a multiplier that can be applied to a baseline demand forecast
 * to account for weather deviations from normal.
 *
 * @param features Engineered weather features
 * @param normalTempC Climate normal temperature for the season
 * @returns Adjustment factor (0.9 = 10% reduction, 1.1 = 10% increase)
 */
export function weatherDemandAdjustment(features: WeatherFeatureSet, normalTempC: number): number {
  const tempDeviation = features.effective_temp_c - normalTempC;
  const coldEffect = features.hdh > 0 ? features.hdh * 0.003 : 0;
  const heatEffect = features.cdh > 0 ? features.cdh * 0.004 : 0;
  const windEffect = (1 - features.wind_power_potential) * 0.01;
  const solarEffect = (1 - features.solar_normalized) * 0.005;

  const totalEffect = coldEffect + heatEffect + windEffect + solarEffect;
  const adjustment = 1 + clamp(totalEffect, -0.15, 0.2);

  return Math.round(adjustment * 1000) / 1000;
}

// ============================================================================
// UTILITIES
// ============================================================================

function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
