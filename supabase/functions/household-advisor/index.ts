/**
 * Household Energy Advisor Edge Function
 * Provides AI-powered energy recommendations via Gemini API
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      
      // Return mock response for development
      const mockResponse = {
        response: `Thank you for your question about energy usage. Based on your ${context?.homeType || 'home'} in ${context?.province || 'your province'}, I can help you save money and reduce consumption. What specific aspect would you like to explore further?`,
        confidence: 0.8,
        timestamp: new Date().toISOString(),
      };

      return new Response(
        JSON.stringify(mockResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt with context
    const systemPrompt = `You are "My Energy AI", a friendly and knowledgeable energy advisor for Canadian households.

USER CONTEXT:
${context ? `
- Province: ${context.province}
- Home Type: ${context.homeType}
- Square Footage: ${context.squareFootage} sq ft
- Occupants: ${context.occupants}
- Heating: ${context.heatingType}
${context.avgUsage ? `- Average Usage: ${context.avgUsage} kWh/month` : ''}
${context.avgCost ? `- Average Cost: $${context.avgCost}/month` : ''}
` : 'Limited context available'}

GUIDELINES:
- Be warm, encouraging, and supportive
- Provide specific, actionable advice
- Include dollar amounts and percentages when relevant
- Focus on Canadian energy programs and rebates
- Keep responses concise (2-3 paragraphs max)
- Never be judgmental about high usage

Respond to the user's question in a helpful, conversational way.`;

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
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
      'I apologize, but I had trouble generating a response. Please try asking your question again.';

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

    // Return response
    return new Response(
      JSON.stringify({
        response: aiResponse,
        confidence: 0.9,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
