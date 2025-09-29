import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname;

    console.log('Help function called with path:', path);

    // Handle manifest request
    if (path.includes('manifest')) {
      const { data, error } = await supabaseClient
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
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({
        manifest: data || []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Handle specific help ID request
    const pathParts = path.split('/');
    const helpId = pathParts[pathParts.length - 1];

    if (helpId && helpId !== 'help-simple') {
      const { data, error } = await supabaseClient
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
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Convert markdown to HTML
      let bodyHtml = data.body_md || '';
      bodyHtml = bodyHtml
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

      return new Response(JSON.stringify({
        id: data.id,
        short_text: data.short_text,
        body_html: bodyHtml,
        related_sources: data.related_sources,
        last_updated: data.last_updated
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      error: 'Endpoint not found',
      path: path
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Help function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
