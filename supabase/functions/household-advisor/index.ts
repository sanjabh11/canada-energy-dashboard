/**
 * Household Energy Advisor Edge Function
 * Provides AI-powered energy recommendations via Gemini API
 * Enhanced with real-time grid context and optimization opportunities
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchGridContext, formatGridContext, analyzeOpportunities } from '../llm/grid_context.ts';
import { buildHouseholdAdvisorPrompt } from '../llm/prompt_templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HouseholdAdvisorRequest {
  userMessage: string;
  userId: string;
  context?: {
    province: string;
    homeType: string;
    squareFootage: number;
    occupants: number;
    heatingType: string;
    avgUsage?: number;
    avgCost?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const { userMessage, userId, context }: HouseholdAdvisorRequest = await req.json();

    if (!userMessage || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userMessage, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.warn('GEMINI_API_KEY not set, returning mock response');
      
      // Fetch real-time grid context for grid-aware recommendations
      const gridContext = await fetchGridContext(supabase);
      const gridContextFormatted = formatGridContext(gridContext);
      const opportunities = analyzeOpportunities(gridContext);

      // Calculate baseline comparison for context
      const persistenceBaseline = context?.avgUsage ? context.avgUsage * 1.15 : null;
      const potentialSavings = persistenceBaseline && context?.avgUsage 
        ? ((persistenceBaseline - context.avgUsage) / persistenceBaseline * 100).toFixed(1)
        : null;

      // Compute data freshness from ops_runs or demand tables
      let dataFreshnessMin = 999;
      try {
        const { data: lastRun } = await supabase
          .from('ops_runs')
          .select('completed_at')
          .eq('run_type', 'ingestion')
          .eq('status', 'success')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const lastTs = lastRun?.completed_at || null;
        if (lastTs) {
          dataFreshnessMin = Math.floor((Date.now() - new Date(lastTs).getTime()) / 60000);
        } else {
          const { data: recentHour } = await supabase
            .from('ontario_hourly_demand')
            .select('hour')
            .order('hour', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (recentHour?.hour) {
            dataFreshnessMin = Math.floor((Date.now() - new Date(recentHour.hour).getTime()) / 60000);
          }
        }
      } catch (_) { /* ignore */ }

      // Build enhanced system prompt with grid context and baseline awareness
      const systemPrompt = `You are an expert energy advisor for Canadian households with REAL-TIME grid awareness. You provide personalized, actionable advice on reducing electricity costs and consumption.

${gridContextFormatted}

${opportunities.length > 0 ? `\nOPTIMIZATION OPPORTUNITIES DETECTED:\n${opportunities.join('\n')}\n` : ''}

USER CONTEXT:
- Province: ${context?.province || 'Unknown'}
- Home Type: ${context?.homeType || 'Unknown'}
- Square Footage: ${context?.squareFootage || 'Unknown'}
- Occupants: ${context?.occupants || 'Unknown'}
- Heating Type: ${context?.heatingType || 'Unknown'}
- Average Monthly Usage: ${context?.avgUsage ? context.avgUsage.toFixed(0) + ' kWh' : 'Unknown'}
- Average Monthly Cost: ${context?.avgCost ? '$' + context.avgCost.toFixed(2) : 'Unknown'}
${potentialSavings ? `- Potential Savings vs Baseline: ${potentialSavings}% improvement available` : ''}

DATA PROVENANCE:
- Battery State: ${gridContext.batteries.length > 0 ? 'Real-time from batteries_state table' : 'Not available'}
- Curtailment: ${gridContext.curtailment.length > 0 ? `${gridContext.curtailment.length} events from curtailment_events table` : 'No active curtailment'}
- Forecast Performance: ${gridContext.forecast ? `Solar MAE ${gridContext.forecast.solar_mae_percent?.toFixed(1)}%, Wind MAE ${gridContext.forecast.wind_mae_percent?.toFixed(1)}%` : 'Not available'}
- Pricing: ${gridContext.pricing ? `HOEP $${gridContext.pricing.hoep?.toFixed(2)}/MWh from ontario_prices table` : 'Not available'}

Provide specific, actionable recommendations that:
1. **CITE CURRENT GRID CONDITIONS** from the real-time state above
2. Are relevant to their province and home characteristics
3. Include estimated savings in dollars and kWh with confidence intervals
4. **COMPARE TO BASELINE** - show improvement vs doing nothing
5. Consider time-of-use pricing where applicable
6. Reference available rebates and incentives
7. **PROVIDE MULTI-HORIZON RECOMMENDATIONS**: immediate (1h), short-term (6h), daily (24h)
8. **FRAME IN ROI TERMS**: upfront cost, monthly savings, payback period
9. Are practical and easy to implement

ALWAYS include data source citations and confidence levels. Keep responses concise (3-4 paragraphs) and conversational.

You MUST end every response with a footer:
Confidence: [0.0-1.0]
Data Freshness: ${dataFreshnessMin} minutes
Limitations: [one sentence]`;

      // Return mock response for development
      const mockResponse = {
        response: `Thank you for your question about energy usage. Based on your ${context?.homeType || 'home'} in ${context?.province || 'your province'}, I can help you save money and reduce consumption. What specific aspect would you like to explore further?\n\nConfidence: 0.7\nData Freshness: ${dataFreshnessMin} minutes\nLimitations: Mock responder used due to missing API key`,
        confidence: 0.7,
        data_freshness_min: dataFreshnessMin,
        timestamp: new Date().toISOString(),
        mode: 'mock'
      };

      return new Response(
        JSON.stringify(mockResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-LLM-Mode': 'mock' } }
      );
    }

    // Fetch real-time grid context for enhanced recommendations
    const gridContext = await fetchGridContext(supabase);
    const gridContextStr = formatGridContext(gridContext);
    const opportunities = analyzeOpportunities(gridContext);

    // Build enhanced system prompt with grid context
    let systemPrompt = buildHouseholdAdvisorPrompt(
      gridContextStr,
      opportunities,
      context || null,
      userMessage
    );

    // Append strict output requirements for confidence and freshness footer
    // Compute data freshness similar to mock path
    let dataFreshnessMin = 999;
    try {
      const { data: lastRun } = await supabase
        .from('ops_runs')
        .select('completed_at')
        .eq('run_type', 'ingestion')
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastTs = lastRun?.completed_at || null;
      if (lastTs) {
        dataFreshnessMin = Math.floor((Date.now() - new Date(lastTs).getTime()) / 60000);
      } else {
        const { data: recentHour } = await supabase
          .from('ontario_hourly_demand')
          .select('hour')
          .order('hour', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (recentHour?.hour) {
          dataFreshnessMin = Math.floor((Date.now() - new Date(recentHour.hour).getTime()) / 60000);
        }
      }
    } catch (_) { /* ignore */ }

    systemPrompt += `\n\nYou MUST end every response with:\nConfidence: [0.0-1.0]\nData Freshness: ${dataFreshnessMin} minutes\nLimitations: [one sentence]`;

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            topP: 0.9,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API failed: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    let aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
      'I apologize, but I had trouble generating a response. Please try asking your question again.';

    // Ensure footer exists even if model ignored instruction
    if (!/Confidence:\s*/i.test(aiResponse)) {
      aiResponse += `\n\nConfidence: 0.8\nData Freshness: ${dataFreshnessMin} minutes\nLimitations: Based on available grid data at request time`;
    }

    // Store conversation in database (optional)
    try {
      await supabase.from('household_chat_messages').insert({
        household_id: userId,
        session_id: `session_${Date.now()}`,
        role: 'user',
        content: userMessage,
      });

      await supabase.from('household_chat_messages').insert({
        household_id: userId,
        session_id: `session_${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
      });
    } catch (dbError) {
      console.error('Database storage error:', dbError);
      // Continue even if storage fails
    }

    // Return response with grid context metadata
    return new Response(
      JSON.stringify({
        response: aiResponse,
        confidence: 0.9,
        data_freshness_min: dataFreshnessMin,
        timestamp: new Date().toISOString(),
        grid_opportunities: opportunities.length,
        grid_context_used: true,
        mode: 'active'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-LLM-Mode': 'active' } }
    );

  } catch (error) {
    console.error('Household advisor error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
