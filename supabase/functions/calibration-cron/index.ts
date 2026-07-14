// Supabase Edge Function: calibration-cron
// Fetches actual demand data, compares to prior forecasts,
// and records calibration observations for the conformal prediction pipeline.
// Runs hourly via GitHub Actions or Supabase Cron.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  const isAuthorized =
    authHeader === `Bearer ${SERVICE_ROLE_KEY}` ||
    authHeader === `Bearer ${CRON_SECRET}` ||
    req.headers.get("x-supabase-cron") === "true";

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const tsStr = oneHourAgo.toISOString();

  try {
    // 1. Fetch actual demand from AESO public API
    const aesoUrl = "https://api.aeso.ca/report/v1.1/price/poolAvg";
    const aesoResponse = await fetch(
      `${aesoUrl}?startDate=${tsStr.slice(0, 10)}&endDate=${tsStr.slice(0, 10)}`,
      { headers: { "X-API-Key": Deno.env.get("AESO_API_KEY") || "" } },
    );

    let actualMw: number | null = null;
    if (aesoResponse.ok) {
      const aesoData = await aesoResponse.json();
      const poolPrice = aesoData?.return?.["Pool Price"];
      if (poolPrice && poolPrice.length > 0) {
        actualMw = parseFloat(poolPrice[0].price);
      }
    }

    // 2. Fetch the most recent forecast from our DB
    const { data: forecasts, error: fcError } = await supabase
      .from("demand_forecasts")
      .select("forecast_mw, lower_q, upper_q, timestamp")
      .eq("source", "aeso")
      .order("timestamp", { ascending: false })
      .limit(1);

    if (fcError) {
      console.error("Forecast fetch error:", fcError);
    }

    // 3. Record calibration observation if we have both forecast and actual
    if (forecasts && forecasts.length > 0 && actualMw !== null) {
      const fc = forecasts[0];
      const lower = fc.lower_q || fc.forecast_mw * 0.96;
      const upper = fc.upper_q || fc.forecast_mw * 1.04;
      const nonconformity = Math.max(lower - actualMw, actualMw - upper);
      const covered = actualMw >= lower && actualMw <= upper;

      const { error: obsError } = await supabase
        .from("conformal_observations")
        .insert({
          source: "aeso",
          timestamp: tsStr,
          forecast_mw: fc.forecast_mw,
          actual_mw: actualMw,
          lower_q: lower,
          upper_q: upper,
          nonconformity_score: nonconformity,
          covered,
        });

      if (obsError) {
        console.error("Observation insert error:", obsError);
      }

      // 4. Update ACI state
      const { data: stateRows } = await supabase
        .from("conformal_calibration_state")
        .select("*")
        .eq("source", "aeso")
        .limit(1);

      const currentState = stateRows?.[0];
      const gamma = currentState?.gamma || 0.01;
      const targetAlpha = currentState?.target_alpha || 0.10;
      const oldAlpha = currentState?.alpha || targetAlpha;
      const calSize = (currentState?.calibration_size || 0) + 1;

      // ACI update: alpha_{t+1} = alpha_t + gamma * (covered - (1 - target_alpha))
      const err = covered ? 1 - (1 - targetAlpha) : -(1 - targetAlpha);
      const newAlpha = Math.max(0.001, Math.min(0.5, oldAlpha + gamma * err));

      // Compute rolling empirical coverage (last 100 observations)
      const { data: recentObs } = await supabase
        .from("conformal_observations")
        .select("covered")
        .eq("source", "aeso")
        .order("timestamp", { ascending: false })
        .limit(100);

      const empCoverage = recentObs
        ? recentObs.filter((o) => o.covered).length / Math.max(1, recentObs.length)
        : 0;

      if (currentState) {
        await supabase
          .from("conformal_calibration_state")
          .update({
            alpha: newAlpha,
            calibration_size: calSize,
            empirical_coverage: empCoverage,
            last_observation_timestamp: tsStr,
            updated_at: now.toISOString(),
          })
          .eq("source", "aeso");
      } else {
        await supabase.from("conformal_calibration_state").insert({
          source: "aeso",
          alpha: newAlpha,
          target_alpha: targetAlpha,
          gamma,
          empirical_coverage: empCoverage,
          calibration_size: calSize,
          last_observation_timestamp: tsStr,
          last_reset_date: now.toISOString().slice(0, 10),
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          observation: {
            forecast: fc.forecast_mw,
            actual: actualMw,
            covered,
            nonconformity,
          },
          aciState: {
            alpha: newAlpha,
            calibrationSize: calSize,
            empiricalCoverage: empCoverage,
          },
          timestamp: now.toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "No forecast/actual pair available for calibration",
        timestamp: now.toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Calibration cron error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(err),
        timestamp: now.toISOString(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
