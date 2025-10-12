// supabase/functions/help/index.ts
// Supabase Edge Function for serving educational help content
// Handles /api/help/manifest and /api/help/{id} routes
// Converts Markdown to HTML server-side for performance

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    // Allow common headers used by Supabase client and our frontend
    'Access-Control-Allow-Headers': [
      'content-type',
      'authorization',
      'apikey',
      'x-client-info',
      'x-user-id'
    ].join(', '),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    // Expose rate-limit or other useful headers if added later
    'Access-Control-Expose-Headers': [
      'x-ratelimit-limit',
      'x-ratelimit-remaining'
    ].join(', '),
  };
}

serve(async (req) => {
  try {
    const { method } = req;
    const url = new URL(req.url);

    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // Only allow GET requests
    if (method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // Parse the path - support both /api/help/manifest and /functions/v1/api/help/manifest
    const path = url.pathname.replace(/\/$/, ''); // trim trailing slash
    let route = path;

    console.log('Help function called with path:', path);

    // Normalize when invoked under Supabase functions mount points so routes are consistent
    // Examples:
    //  - /functions/v1/help/api/help/manifest  -> /api/help/manifest
    //  - /functions/v1/api/help/manifest      -> /api/help/manifest
    route = route.replace(/^\/functions\/v1\/help/, '');
    route = route.replace(/^\/functions\/v1\/api\/help/, '/api/help');
    // Also normalize when invoked on the functions subdomain with function name prefix
    //  - /help/api/help/manifest -> /api/help/manifest
    route = route.replace(/^\/help\/api\/help/, '/api/help');
    // Handle direct function invocation
    route = route.replace(/^\/help/, '');
    
    console.log('Normalized route:', route);

    // GET /api/help/manifest
    if (route === '/api/help/manifest' || route === '/manifest') {
      const { data, error } = await supa
        .from('help_content')
        .select('id, short_text')
        .order('id');

      if (error) {
        console.error('Manifest fetch error:', error);
        return new Response(JSON.stringify({
          error: 'Failed to fetch help manifest',
          details: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      }

      return new Response(JSON.stringify({
        manifest: data || []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // GET /api/help/{id}
    const helpIdMatch = route.match(/^\/api\/help\/(.+)$/) || route.match(/^\/(.+)$/);
    if (helpIdMatch) {
      const helpId = helpIdMatch[1];

      const { data, error } = await supa
        .from('help_content')
        .select('*')
        .eq('id', helpId)
        .single();

      if (error || !data) {
        console.error('Help content fetch error:', error);
        return new Response(JSON.stringify({
          error: 'Help content not found',
          id: helpId
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      }

      // Convert Markdown to HTML (server-side for performance)
      // Simple markdown-to-HTML conversion (basic implementation)
      let bodyHtml = data.body_md || '';
      bodyHtml = bodyHtml
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

      return new Response(JSON.stringify({
        id: data.id,
        short_text: data.short_text,
        body_html: bodyHtml,
        related_sources: data.related_sources || [],
        last_updated: data.last_updated,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // Route not found
    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: String(err)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }
});