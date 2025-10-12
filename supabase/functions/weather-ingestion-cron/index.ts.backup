/**
 * Weather Ingestion Cron Job
 * Fetches hourly weather data from Open-Meteo API (free, no key required)
 * Calculates confidence scores based on data age and source
 * Runs every hour via Supabase cron
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Province coordinates (major cities for weather data)
const PROVINCE_COORDS: Record<string, { lat: number; lon: number; city: string }> = {
  ON: { lat: 43.65, lon: -79.38, city: 'Toronto' },
  AB: { lat: 51.05, lon: -114.07, city: 'Calgary' },
  BC: { lat: 49.28, lon: -123.12, city: 'Vancouver' },
  QC: { lat: 45.50, lon: -73.57, city: 'Montreal' },
  MB: { lat: 49.90, lon: -97.14, city: 'Winnipeg' },
  SK: { lat: 50.45, lon: -104.62, city: 'Regina' },
  NS: { lat: 44.65, lon: -63.57, city: 'Halifax' },
  NB: { lat: 45.96, lon: -66.64, city: 'Fredericton' },
};

interface WeatherData {
  temperature_c: number;
  wind_speed_kmh: number;
  wind_direction_degrees: number;
  cloud_cover_percent: number;
  solar_irradiance_w_m2: number;
  humidity_percent: number;
  pressure_hpa: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const provinces = Object.keys(PROVINCE_COORDS);
    const results: any[] = [];

    // Fetch weather for each province
    for (const province of provinces) {
      const coords = PROVINCE_COORDS[province];
      
      try {
        // Open-Meteo API (free, no key required)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?` +
          `latitude=${coords.lat}&longitude=${coords.lon}` +
          `&current=temperature_2m,relative_humidity_2m,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m` +
          `&hourly=shortwave_radiation` +
          `&timezone=auto`;

        const response = await fetch(weatherUrl);
        
        if (!response.ok) {
          console.error(`Failed to fetch weather for ${province}:`, response.statusText);
          continue;
        }

        const data = await response.json();
        
        // Extract current weather
        const current = data.current;
        const hourly = data.hourly;
        
        // Get current solar irradiance (W/m²)
        const currentHourIndex = 0; // Most recent hour
        const solarIrradiance = hourly?.shortwave_radiation?.[currentHourIndex] || 0;
        
        // Calculate confidence score
        // 1.0 = fresh data (< 1 hour old)
        // 0.9 = recent data (1-2 hours old)
        // 0.8 = older data (2-3 hours old)
        const dataAge = new Date().getTime() - new Date(current.time).getTime();
        const ageHours = dataAge / (1000 * 60 * 60);
        let confidenceScore = 1.0;
        if (ageHours > 1) confidenceScore = 0.9;
        if (ageHours > 2) confidenceScore = 0.8;
        if (ageHours > 3) confidenceScore = 0.7;
        
        // Prepare weather observation
        const observation = {
          province,
          timestamp: new Date(current.time).toISOString(),
          temperature_c: current.temperature_2m,
          wind_speed_kmh: current.wind_speed_10m * 3.6, // m/s to km/h
          wind_direction_degrees: current.wind_direction_10m,
          cloud_cover_percent: current.cloud_cover,
          solar_irradiance_w_m2: solarIrradiance,
          humidity_percent: current.relative_humidity_2m,
          pressure_hpa: current.surface_pressure,
          data_source: 'open_meteo',
          confidence_score: confidenceScore,
          provenance: 'real_time',
          quality_flags: {
            calibrated: true,
            age_hours: ageHours,
            missing_fields: [],
            source_api: 'open-meteo',
            city: coords.city,
          },
        };

        // Insert into database
        const { data: inserted, error } = await supabase
          .from('weather_observations')
          .insert(observation)
          .select()
          .single();

        if (error) {
          // Ignore duplicate key errors (same timestamp)
          if (!error.message.includes('duplicate key')) {
            console.error(`Error inserting weather for ${province}:`, error);
          }
        } else {
          results.push({
            province,
            city: coords.city,
            temperature_c: observation.temperature_c,
            wind_speed_kmh: observation.wind_speed_kmh,
            solar_irradiance_w_m2: observation.solar_irradiance_w_m2,
            confidence_score: confidenceScore,
            timestamp: observation.timestamp,
          });
        }
      } catch (error) {
        console.error(`Error processing weather for ${province}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Weather data ingested for ${results.length}/${provinces.length} provinces`,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Weather ingestion error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
