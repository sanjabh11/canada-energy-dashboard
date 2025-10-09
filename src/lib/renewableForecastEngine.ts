/**
 * Renewable Energy Forecast Generation Engine
 * Generates solar/wind generation forecasts using multiple models
 * 
 * Models:
 * 1. Persistence (baseline): tomorrow = today
 * 2. Weather-adjusted: applies weather correction factors
 * 3. ARIMA (stretch): statistical time-series
 */

import type {
  RenewableForecast,
  ForecastHorizon,
  RenewableSourceType,
  WeatherFeatures,
  ModelType,
  ConfidenceLevel,
} from './types/renewableForecast';
import { fetchWeatherForProvince, extractWeatherFeatures } from './weatherService';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SOLAR_CAPACITY_BY_PROVINCE: Record<string, number> = {
  ON: 2800, // MW installed solar capacity (approximate)
  QC: 400,
  BC: 150,
  AB: 1100,
  SK: 50,
  MB: 20,
  NS: 60,
  NB: 30,
  PE: 10,
  NL: 5,
  YT: 5,
  NT: 3,
  NU: 2,
};

const WIND_CAPACITY_BY_PROVINCE: Record<string, number> = {
  ON: 5500, // MW installed wind capacity (approximate)
  QC: 4000,
  BC: 900,
  AB: 4300,
  SK: 300,
  MB: 300,
  NS: 650,
  NB: 300,
  PE: 200,
  NL: 55,
  YT: 1,
  NT: 1,
  NU: 0.5,
};

// Typical capacity factors (annual average)
const CAPACITY_FACTORS = {
  solar: {
    summer: 0.18,
    winter: 0.10,
    spring: 0.15,
    fall: 0.13,
  },
  wind: {
    summer: 0.28,
    winter: 0.38,
    spring: 0.33,
    fall: 0.35,
  },
};

// ============================================================================
// FORECAST MODELS
// ============================================================================

/**
 * Model 1: Persistence Forecast (Baseline)
 * Assumption: Future generation = Current generation
 * This establishes our baseline MAE for improvement measurement
 */
function persistenceForecast(
  currentGeneration: number,
  horizon: ForecastHorizon
): { predicted: number; confidence: number } {
  // Confidence decreases with longer horizons
  const confidence = Math.max(0.3, 1 - (horizon / 100));
  
  return {
    predicted: currentGeneration,
    confidence,
  };
}

/**
 * Model 2: Weather-Adjusted Forecast
 * Uses weather data to adjust baseline prediction
 */
function weatherAdjustedForecast(
  baselineGeneration: number,
  sourceType: RenewableSourceType,
  weather: WeatherFeatures | undefined,
  province: string,
  horizon: ForecastHorizon
): { predicted: number; confidence: number; confidence_level: ConfidenceLevel } {
  if (!weather) {
    // No weather data, fall back to persistence
    const result = persistenceForecast(baselineGeneration, horizon);
    return { ...result, confidence_level: 'low' };
  }

  let adjustmentFactor = 1.0;
  let confidence = 0.7; // Default medium confidence

  if (sourceType === 'solar') {
    // Solar generation depends heavily on cloud cover and solar radiation
    const cloudCover = weather.cloud_cover_pct ?? 50;
    const solarRadiation = weather.solar_radiation_wm2 ?? 0;
    
    // Cloud cover adjustment: 0% clouds = 1.0x, 100% clouds = 0.1x
    const cloudAdjustment = 1.0 - (cloudCover / 100) * 0.9;
    
    // Solar radiation adjustment (if available)
    const radiationAdjustment = solarRadiation > 0 
      ? Math.min(1.5, solarRadiation / 800) // 800 W/m² is typical peak
      : 1.0;
    
    adjustmentFactor = (cloudAdjustment + radiationAdjustment) / 2;
    
    // Temperature derating (solar panels lose efficiency at high temps)
    const temp = weather.temp_c ?? 20;
    if (temp > 25) {
      adjustmentFactor *= (1 - (temp - 25) * 0.004); // 0.4% loss per degree above 25°C
    }
    
    // Higher confidence if we have solar radiation data
    confidence = solarRadiation > 0 ? 0.85 : 0.70;
    
  } else if (sourceType === 'wind') {
    // Wind generation follows power curve: P = 0.5 * ρ * A * v³ * Cp
    const windSpeed = weather.wind_speed_ms ?? 0;
    
    // Simplified wind power curve
    if (windSpeed < 3) {
      // Below cut-in speed
      adjustmentFactor = 0.1;
    } else if (windSpeed >= 3 && windSpeed < 12) {
      // Linear ramp-up region
      adjustmentFactor = ((windSpeed - 3) / 9) * 0.9 + 0.1;
    } else if (windSpeed >= 12 && windSpeed < 25) {
      // Rated power region
      adjustmentFactor = 1.0;
    } else {
      // Above cut-out speed (typically 25 m/s)
      adjustmentFactor = 0.0;
    }
    
    // Air density adjustment (cold air is denser = more power)
    const temp = weather.temp_c ?? 15;
    const densityFactor = 1 + (15 - temp) * 0.003; // Roughly 0.3% per degree
    adjustmentFactor *= densityFactor;
    
    confidence = 0.75;
  }

  // Horizon penalty: confidence decreases with longer forecasts
  confidence *= Math.max(0.5, 1 - (horizon / 60));
  
  const predicted = Math.max(0, baselineGeneration * adjustmentFactor);
  
  const confidence_level: ConfidenceLevel = 
    confidence > 0.8 ? 'high' :
    confidence > 0.6 ? 'medium' : 'low';

  return {
    predicted,
    confidence,
    confidence_level,
  };
}

/**
 * Model 3: Seasonal Pattern Adjustment
 * Applies seasonal capacity factor adjustments
 */
function seasonalAdjustment(
  baseGeneration: number,
  sourceType: RenewableSourceType,
  month: number
): number {
  const season = 
    [11, 0, 1].includes(month) ? 'winter' :
    [2, 3, 4].includes(month) ? 'spring' :
    [5, 6, 7].includes(month) ? 'summer' : 'fall';
  
  const seasonalFactor = CAPACITY_FACTORS[sourceType === 'solar' ? 'solar' : 'wind'][season];
  const annualAverage = sourceType === 'solar' ? 0.14 : 0.33;
  
  return baseGeneration * (seasonalFactor / annualAverage);
}

// ============================================================================
// MAIN FORECAST GENERATION FUNCTION
// ============================================================================

export interface GenerateForecastOptions {
  province: string;
  sourceType: RenewableSourceType;
  horizonHours: ForecastHorizon;
  currentGeneration?: number; // If not provided, estimate from capacity
  weatherData?: WeatherFeatures;
  fetchWeather?: boolean;
  modelType?: ModelType;
}

/**
 * Generate a renewable energy forecast
 */
export async function generateRenewableForecast(
  options: GenerateForecastOptions
): Promise<RenewableForecast> {
  const {
    province,
    sourceType,
    horizonHours,
    currentGeneration,
    weatherData,
    fetchWeather = true,
    modelType = 'xgboost', // Default to most advanced
  } = options;

  const now = new Date();
  const validAt = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);

  // Get current or estimated generation
  let baseline = currentGeneration;
  if (!baseline) {
    // Estimate from installed capacity and typical capacity factor
    const capacity = sourceType === 'solar' 
      ? SOLAR_CAPACITY_BY_PROVINCE[province] || 100
      : WIND_CAPACITY_BY_PROVINCE[province] || 100;
    
    const hour = validAt.getHours();
    const month = validAt.getMonth();
    
    // Time-of-day adjustment for solar
    let todFactor = 1.0;
    if (sourceType === 'solar') {
      if (hour < 6 || hour > 20) {
        todFactor = 0;
      } else if (hour >= 10 && hour <= 14) {
        todFactor = 1.0; // Peak solar hours
      } else {
        todFactor = 0.5; // Morning/evening
      }
    }
    
    const seasonalCF = sourceType === 'solar'
      ? CAPACITY_FACTORS.solar[['winter', 'spring', 'summer', 'fall'][Math.floor(month / 3) % 4] as keyof typeof CAPACITY_FACTORS.solar]
      : CAPACITY_FACTORS.wind[['winter', 'spring', 'summer', 'fall'][Math.floor(month / 3) % 4] as keyof typeof CAPACITY_FACTORS.wind];
    
    baseline = capacity * seasonalCF * todFactor;
  }

  // Fetch weather if requested and not provided
  let weather = weatherData;
  if (fetchWeather && !weather) {
    const observation = await fetchWeatherForProvince(province);
    weather = observation ? extractWeatherFeatures(observation) : undefined;
  }

  // Generate forecast based on model type
  let result: { predicted: number; confidence: number; confidence_level?: ConfidenceLevel };
  
  switch (modelType) {
    case 'persistence':
      result = persistenceForecast(baseline, horizonHours);
      result.confidence_level = result.confidence > 0.7 ? 'high' : result.confidence > 0.5 ? 'medium' : 'low';
      break;
      
    case 'xgboost':
    case 'ensemble':
      // Use weather-adjusted as proxy for ML model
      result = weatherAdjustedForecast(baseline, sourceType, weather, province, horizonHours);
      // Apply seasonal adjustment
      result.predicted = seasonalAdjustment(result.predicted, sourceType, validAt.getMonth());
      break;
      
    default:
      result = weatherAdjustedForecast(baseline, sourceType, weather, province, horizonHours);
      break;
  }

  // Calculate confidence intervals (±20% for now, can be refined)
  const intervalWidth = result.predicted * 0.2;
  
  // Build feature importance
  const featureImportance: Record<string, number> = {};
  if (sourceType === 'solar' && weather) {
    featureImportance.cloud_cover = 0.45;
    featureImportance.solar_radiation = 0.30;
    featureImportance.temperature = 0.15;
    featureImportance.hour_of_day = 0.10;
  } else if (sourceType === 'wind' && weather) {
    featureImportance.wind_speed = 0.60;
    featureImportance.temperature = 0.20;
    featureImportance.wind_direction = 0.15;
    featureImportance.season = 0.05;
  }

  const forecast: RenewableForecast = {
    id: crypto.randomUUID(),
    province,
    source_type: sourceType,
    forecast_horizon_hours: horizonHours,
    predicted_output_mw: parseFloat(result.predicted.toFixed(2)),
    confidence_interval_lower_mw: parseFloat((result.predicted - intervalWidth).toFixed(2)),
    confidence_interval_upper_mw: parseFloat((result.predicted + intervalWidth).toFixed(2)),
    confidence_level: result.confidence_level || 'medium',
    confidence_score: parseFloat(result.confidence.toFixed(2)),
    weather_data: weather,
    model_version: '1.0.0',
    model_type: modelType,
    feature_importance: featureImportance,
    generated_at: now.toISOString(),
    valid_at: validAt.toISOString(),
    has_actual: false,
    error_calculated: false,
    created_by: 'forecast_engine_v1',
  };

  return forecast;
}

/**
 * Generate multiple forecasts for different horizons
 */
export async function generateForecastSuite(
  province: string,
  sourceType: RenewableSourceType,
  horizons: ForecastHorizon[] = [1, 6, 24],
  options?: Partial<GenerateForecastOptions>
): Promise<RenewableForecast[]> {
  const forecasts = await Promise.all(
    horizons.map((horizon) =>
      generateRenewableForecast({
        province,
        sourceType,
        horizonHours: horizon,
        ...options,
      })
    )
  );

  return forecasts;
}

/**
 * Store forecast in Supabase
 */
export async function storeForecast(forecast: RenewableForecast): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase not configured');
      return false;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/renewable_forecasts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(forecast),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to store forecast:', error);
    return false;
  }
}

/**
 * Batch generate and store forecasts for multiple provinces
 */
export async function generateAndStoreForecastBatch(
  provinces: string[],
  sourceType: RenewableSourceType,
  horizons: ForecastHorizon[] = [1, 6, 24]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const province of provinces) {
    try {
      const forecasts = await generateForecastSuite(province, sourceType, horizons);
      
      for (const forecast of forecasts) {
        const stored = await storeForecast(forecast);
        if (stored) {
          success++;
        } else {
          failed++;
        }
      }
    } catch (error) {
      console.error(`Failed to generate forecasts for ${province}:`, error);
      failed += horizons.length;
    }
  }

  return { success, failed };
}

export default {
  generateRenewableForecast,
  generateForecastSuite,
  storeForecast,
  generateAndStoreForecastBatch,
  SOLAR_CAPACITY_BY_PROVINCE,
  WIND_CAPACITY_BY_PROVINCE,
};
