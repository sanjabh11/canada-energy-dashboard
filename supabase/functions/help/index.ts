// supabase/functions/help/index.ts
// Supabase Edge Function for serving educational help content
// Handles /api/help/manifest and /api/help/{id} routes
// Converts Markdown to HTML server-side for performance

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Import marked for MD->HTML conversion
import { marked } from 'https://esm.sh/marked@9.1.2';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    // Handle both function route formats
    if (path.includes('/functions/v1/api/help/')) {
      route = path.replace('/functions/v1/api/help', '/api/help');
    }

    // GET /api/help/manifest
    if (route === '/api/help/manifest') {
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
    const helpIdMatch = route.match(/^\/api\/help\/(.+)$/);
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
      let bodyHtml = '';
      try {
        marked.setOptions({
          breaks: true,
          gfm: true,
        });
        bodyHtml = marked.parse(data.body_md || '');
      } catch (mdError) {
        console.error('Markdown parsing error:', mdError);
        bodyHtml = '<p>Error parsing content</p>';
      }

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