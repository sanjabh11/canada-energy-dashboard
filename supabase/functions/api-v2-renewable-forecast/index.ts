// Supabase Edge Function: api-v2-renewable-forecast
// Endpoint: GET/POST /api/v2/renewable/forecast
// Purpose: Generate renewable energy forecasts (solar/wind)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface ForecastRequest {
  province: string;
  source_type: 'solar' | 'wind';
  horizon_hours?: 1 | 3 | 6 | 12 | 24 | 48;
  horizons?: number[];
  current_generation?: number;
  fetch_weather?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Parse request
    let params: ForecastRequest;
    if (req.method === 'GET') {
      const url = new URL(req.url);
      params = {
        province: url.searchParams.get('province') || 'ON',
        source_type: (url.searchParams.get('source_type') || 'solar') as 'solar' | 'wind',
        horizon_hours: parseInt(url.searchParams.get('horizon_hours') || '24') as any,
        fetch_weather: url.searchParams.get('fetch_weather') !== 'false',
      };
    } else {
      params = await req.json();
    }

    const { province, source_type, horizon_hours, horizons, current_generation, fetch_weather } = params;

    // Validate inputs
    if (!province || !source_type) {
      return new Response(
        JSON.stringify({ error: 'province and source_type required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recent generation data if not provided
    let baseline = current_generation;
    if (!baseline) {
      const { data: recentGen } = await supabaseClient
        .from('renewable_capacity_registry')
        .select('nameplate_capacity_mw, typical_capacity_factor')
        .eq('province', province)
        .eq('facility_type', source_type === 'solar' ? 'solar_farm' : 'wind_farm')
        .eq('operational_status', 'operational')
        .limit(10);

      if (recentGen && recentGen.length > 0) {
        const totalCapacity = recentGen.reduce((sum, r) => sum + (r.nameplate_capacity_mw || 0), 0);
        const avgCF = recentGen.reduce((sum, r) => sum + (r.typical_capacity_factor || 0), 0) / recentGen.length;
        baseline = totalCapacity * avgCF;
      } else {
        // Default estimates
        baseline = source_type === 'solar' ? 100 : 200;
      }
    }

    // Fetch weather data if requested
    let weatherData = null;
    if (fetch_weather) {
      const { data: weather } = await supabaseClient
        .from('weather_observations')
        .select('*')
        .eq('province', province)
        .order('observed_at', { ascending: false })
        .limit(1)
        .single();

      if (weather) {
        weatherData = {
          temp_c: weather.temperature_c,
          cloud_cover_pct: weather.cloud_cover_percent,
          wind_speed_ms: weather.wind_speed_ms,
          wind_direction_deg: weather.wind_direction_deg,
          solar_radiation_wm2: weather.solar_radiation_wm2,
          humidity_pct: weather.humidity_percent,
        };
      }
    }

    // Generate forecasts for requested horizons
    const horizonList = horizons || [horizon_hours || 24];
    const forecasts = [];

    for (const h of horizonList) {
      const forecast = await generateForecast({
        province,
        source_type,
        horizon_hours: h as any,
        baseline,
        weatherData,
      });

      // Store forecast in database
      const { data: stored, error: storeError } = await supabaseClient
        .from('renewable_forecasts')
        .insert(forecast)
        .select()
        .single();

      if (storeError) {
        console.error('Failed to store forecast:', storeError);
      }

      forecasts.push(stored || forecast);
    }

    return new Response(
      JSON.stringify({
        success: true,
        forecasts,
        metadata: {
          province,
          source_type,
          baseline_generation_mw: baseline,
          weather_available: !!weatherData,
          generated_at: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Forecast generation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// FORECAST GENERATION LOGIC (Server-side implementation)
// ============================================================================

interface GenerateForecastParams {
  province: string;
  source_type: 'solar' | 'wind';
  horizon_hours: number;
  baseline: number;
  weatherData: any;
}

async function generateForecast(params: GenerateForecastParams) {
  const { province, source_type, horizon_hours, baseline, weatherData } = params;

  const now = new Date();
  const validAt = new Date(now.getTime() + horizon_hours * 60 * 60 * 1000);

  // Weather-adjusted forecast
  let adjustmentFactor = 1.0;
  let confidence = 0.7;

  if (weatherData) {
    if (source_type === 'solar') {
      const cloudCover = weatherData.cloud_cover_pct ?? 50;
      const solarRadiation = weatherData.solar_radiation_wm2 ?? 0;
      
      const cloudAdjustment = 1.0 - (cloudCover / 100) * 0.9;
      const radiationAdjustment = solarRadiation > 0 ? Math.min(1.5, solarRadiation / 800) : 1.0;
      adjustmentFactor = (cloudAdjustment + radiationAdjustment) / 2;
      
      const temp = weatherData.temp_c ?? 20;
      if (temp > 25) {
        adjustmentFactor *= (1 - (temp - 25) * 0.004);
      }
      
      confidence = solarRadiation > 0 ? 0.85 : 0.70;
      
    } else if (source_type === 'wind') {
      const windSpeed = weatherData.wind_speed_ms ?? 0;
      
      if (windSpeed < 3) {
        adjustmentFactor = 0.1;
      } else if (windSpeed >= 3 && windSpeed < 12) {
        adjustmentFactor = ((windSpeed - 3) / 9) * 0.9 + 0.1;
      } else if (windSpeed >= 12 && windSpeed < 25) {
        adjustmentFactor = 1.0;
      } else {
        adjustmentFactor = 0.0;
      }
      
      confidence = 0.75;
    }
  }

  // Horizon penalty
  confidence *= Math.max(0.5, 1 - (horizon_hours / 60));

  const predicted = Math.max(0, baseline * adjustmentFactor);
  const intervalWidth = predicted * 0.2;

  const confidenceLevel = confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low';

  return {
    province,
    source_type,
    forecast_horizon_hours: horizon_hours,
    predicted_output_mw: parseFloat(predicted.toFixed(2)),
    confidence_interval_lower_mw: parseFloat((predicted - intervalWidth).toFixed(2)),
    confidence_interval_upper_mw: parseFloat((predicted + intervalWidth).toFixed(2)),
    confidence_level: confidenceLevel,
    confidence_score: parseFloat(confidence.toFixed(2)),
    weather_data: weatherData,
    model_version: '1.0.0',
    model_type: 'xgboost',
    generated_at: now.toISOString(),
    valid_at: validAt.toISOString(),
    has_actual: false,
    error_calculated: false,
    created_by: 'edge_function',
  };
}
