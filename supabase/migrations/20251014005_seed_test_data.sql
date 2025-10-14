BEGIN;

-- Seed 30 days of provincial generation data (ON, AB, BC with multiple sources)
DO $$
DECLARE
  v_date date;
  v_province text;
  v_source text;
  v_gen_gwh double precision;
BEGIN
  FOR i IN 0..29 LOOP
    v_date := current_date - i;
    
    -- Ontario
    INSERT INTO public.provincial_generation (date, province_code, source, generation_gwh)
    VALUES 
      (v_date, 'ON', 'nuclear', 180 + random() * 40),
      (v_date, 'ON', 'hydro', 60 + random() * 20),
      (v_date, 'ON', 'gas', 40 + random() * 30),
      (v_date, 'ON', 'wind', 20 + random() * 15),
      (v_date, 'ON', 'solar', 5 + random() * 5)
    ON CONFLICT DO NOTHING;
    
    -- Alberta
    INSERT INTO public.provincial_generation (date, province_code, source, generation_gwh)
    VALUES 
      (v_date, 'AB', 'gas', 120 + random() * 30),
      (v_date, 'AB', 'coal', 80 + random() * 20),
      (v_date, 'AB', 'wind', 30 + random() * 20),
      (v_date, 'AB', 'hydro', 10 + random() * 5)
    ON CONFLICT DO NOTHING;
    
    -- British Columbia
    INSERT INTO public.provincial_generation (date, province_code, source, generation_gwh)
    VALUES 
      (v_date, 'BC', 'hydro', 140 + random() * 30),
      (v_date, 'BC', 'gas', 20 + random() * 10),
      (v_date, 'BC', 'wind', 5 + random() * 5)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Seed 7 days of hourly Ontario demand (24 hours × 7 days = 168 rows)
DO $$
DECLARE
  v_hour timestamptz;
  v_demand double precision;
BEGIN
  FOR i IN 0..167 LOOP
    v_hour := now() - (i || ' hours')::interval;
    v_demand := 14000 + random() * 4000 + 2000 * sin((extract(hour from v_hour)::double precision - 12) * pi() / 12);
    
    INSERT INTO public.ontario_hourly_demand (hour, market_demand_mw, ontario_demand_mw)
    VALUES (v_hour, v_demand, v_demand * 0.98)
    ON CONFLICT (hour) DO NOTHING;
  END LOOP;
END $$;

-- Seed 7 days of hourly Ontario prices (168 rows)
DO $$
DECLARE
  v_datetime timestamptz;
  v_hoep double precision;
BEGIN
  FOR i IN 0..167 LOOP
    v_datetime := now() - (i || ' hours')::interval;
    v_hoep := 30 + random() * 40 + 15 * sin((extract(hour from v_datetime)::double precision - 14) * pi() / 12);
    
    INSERT INTO public.ontario_prices (datetime, hoep, global_adjustment)
    VALUES (v_datetime, v_hoep, 10 + random() * 5)
    ON CONFLICT (datetime) DO NOTHING;
  END LOOP;
END $$;

-- Seed battery state for Ontario
INSERT INTO public.batteries_state (province, soc_percent, soc_mwh, capacity_mwh, power_rating_mw, last_updated)
VALUES ('ON', 65.0, 65.0, 100.0, 50.0, now())
ON CONFLICT (province) DO UPDATE SET
  soc_percent = EXCLUDED.soc_percent,
  soc_mwh = EXCLUDED.soc_mwh,
  last_updated = EXCLUDED.last_updated;

-- Seed 10 storage dispatch logs
DO $$
DECLARE
  v_battery_id uuid;
  v_ts timestamptz;
  v_power_mw double precision;
  v_duration double precision;
  v_action text;
  v_soc_before numeric;
  v_soc_after numeric;
  v_reason text;
  v_expected_revenue double precision;
BEGIN
  SELECT id INTO v_battery_id FROM public.batteries_state WHERE province = 'ON' LIMIT 1;
  
  FOR i IN 0..9 LOOP
    v_ts := now() - (i * 2 || ' hours')::interval;
    v_action := CASE WHEN i % 2 = 0 THEN 'charge' ELSE 'discharge' END;
    v_power_mw := 25 + random() * 20;
    v_duration := 1.0;
    v_soc_before := 50 + random() * 30;
    v_soc_after := GREATEST(5, LEAST(95, v_soc_before + (CASE WHEN v_action = 'charge' THEN 5 ELSE -5 END)));
    v_reason := CASE WHEN v_action = 'charge' THEN 'Absorb renewable surplus' ELSE 'Peak shaving' END;
    v_expected_revenue := 500 + random() * 1000;

    INSERT INTO public.storage_dispatch_logs (
      province,
      battery_id,
      action,
      power_mw,
      magnitude_mw,
      soc_before_percent,
      soc_after_percent,
      soc_before_mwh,
      soc_after_mwh,
      reason,
      expected_revenue_cad,
      renewable_absorption,
      curtailment_mitigation,
      grid_price_cad_per_mwh,
      dispatched_at,
      decision_timestamp
    )
    VALUES (
      'ON',
      v_battery_id,
      v_action,
      v_power_mw,
      v_power_mw,
      v_soc_before,
      v_soc_after,
      v_soc_before,
      v_soc_after,
      v_reason,
      v_expected_revenue,
      (i % 2 = 0),
      (i % 3 = 0),
      30 + random() * 40,
      v_ts,
      v_ts
    );
  END LOOP;
END $$;

-- Seed ops_runs heartbeat
INSERT INTO public.ops_runs (run_type, status, completed_at)
VALUES ('ingestion', 'success', now() - interval '5 minutes')
ON CONFLICT DO NOTHING;

-- Seed minimal forecast_performance_metrics
INSERT INTO public.forecast_performance_metrics (mae, timestamp, calculated_at, solar_mae_percent, wind_mae_percent, confidence_score)
VALUES 
  (5.2, now() - interval '1 hour', now() - interval '1 hour', 4.8, 5.6, 0.92),
  (4.9, now() - interval '2 hours', now() - interval '2 hours', 4.5, 5.3, 0.94),
  (5.5, now() - interval '3 hours', now() - interval '3 hours', 5.1, 5.9, 0.90)
ON CONFLICT DO NOTHING;

COMMIT;
