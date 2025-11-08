// Supabase Edge Function: aeso-ingestion-cron
// Periodic cron job to ingest AESO (Alberta) real-time grid data
// Runs every 5 minutes to keep Alberta grid data fresh
// Critical for tracking 10GW+ AI data centre queue impact

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const AESO_STREAM_FUNCTION = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, '') + '/functions/v1/stream-aeso-grid-data';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  // Verify this is a cron request (Supabase adds this header)
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET') || '';

  // Allow both service role key and cron secret
  const isAuthorized = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` ||
                       authHeader === `Bearer ${cronSecret}` ||
                       req.headers.get('x-supabase-cron') === 'true';

  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - must be called via Supabase Cron' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('AESO Cron: Starting ingestion at', new Date().toISOString());

    // Call the stream-aeso-grid-data function
    const response = await fetch(AESO_STREAM_FUNCTION!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log('AESO Cron: Ingestion successful', result);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'AESO data ingestion completed',
          timestamp: new Date().toISOString(),
          result,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('AESO Cron: Ingestion failed', result);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Ingestion failed',
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err: any) {
    console.error('AESO Cron: Error calling stream function', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
