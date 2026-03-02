/**
 * Netlify Function: Lead Capture and Lifecycle Management
 * 
 * Handles lead intent tracking and lifecycle state transitions.
 * Part of: PBI-OpenClaw-Monetization-Orchestration-T1
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface LeadIntentPayload {
  email?: string;
  userId?: string;
  intentType: string;
  intentData?: Record<string, any>;
  tier?: string;
  persona?: string;
  source?: string;
}

interface LeadLifecyclePayload {
  email: string;
  userId?: string;
  newState: string;
  tierInterest?: string;
  persona?: string;
  metadata?: Record<string, any>;
}

/**
 * Determine lifecycle state based on intent type
 */
function determineLifecycleState(intentType: string, currentState?: string): string {
  const stateMap: Record<string, string> = {
    'pricing_view': 'visitor',
    'pricing_cta_click': 'engaged',
    'email_captured': 'captured',
    'checkout_initiated': 'checkout_initiated',
    'checkout_abandoned': 'checkout_abandoned',
    'checkout_complete': 'converted',
    'municipal_inquiry': 'engaged',
    'indigenous_inquiry': 'engaged',
    'industrial_inquiry': 'engaged',
    'upgrade_prompt_clicked': 'engaged'
  };

  return stateMap[intentType] || currentState || 'anonymous';
}

/**
 * Store lead intent in Supabase
 */
async function storeLeadIntent(payload: LeadIntentPayload): Promise<void> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Leads] Supabase not configured, skipping database storage');
    return;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/lead_intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      user_id: payload.userId || null,
      email: payload.email || null,
      intent_type: payload.intentType,
      intent_data: payload.intentData || {},
      tier: payload.tier || null,
      persona: payload.persona || null,
      source: payload.source || null
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to store lead intent: ${response.statusText}`);
  }
}

/**
 * Update lead lifecycle state
 */
async function updateLeadLifecycle(payload: LeadLifecyclePayload): Promise<void> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Leads] Supabase not configured, skipping lifecycle update');
    return;
  }

  // First, try to get existing lifecycle record
  const getResponse = await fetch(
    `${supabaseUrl}/rest/v1/lead_lifecycle?email=eq.${encodeURIComponent(payload.email)}&select=*`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  );

  const existing = await getResponse.json();
  const existingRecord = Array.isArray(existing) && existing.length > 0 ? existing[0] : null;

  if (existingRecord) {
    // Update existing record
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/lead_lifecycle?email=eq.${encodeURIComponent(payload.email)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id: payload.userId || existingRecord.user_id,
          previous_state: existingRecord.current_state,
          current_state: payload.newState,
          tier_interest: payload.tierInterest || existingRecord.tier_interest,
          persona: payload.persona || existingRecord.persona,
          last_intent_at: new Date().toISOString(),
          state_changed_at: new Date().toISOString(),
          metadata: { ...existingRecord.metadata, ...payload.metadata }
        })
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to update lead lifecycle: ${updateResponse.statusText}`);
    }
  } else {
    // Create new record
    const createResponse = await fetch(`${supabaseUrl}/rest/v1/lead_lifecycle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: payload.userId || null,
        email: payload.email,
        current_state: payload.newState,
        previous_state: 'anonymous',
        tier_interest: payload.tierInterest || null,
        persona: payload.persona || null,
        last_intent_at: new Date().toISOString(),
        metadata: payload.metadata || {}
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create lead lifecycle: ${createResponse.statusText}`);
    }
  }
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'capture';

    if (action === 'intent') {
      // Track lead intent
      const intentPayload: LeadIntentPayload = {
        email: body.email,
        userId: body.userId,
        intentType: body.intentType,
        intentData: body.intentData,
        tier: body.tier,
        persona: body.persona,
        source: body.source
      };

      await storeLeadIntent(intentPayload);

      // Update lifecycle state if email is present
      if (intentPayload.email) {
        const newState = determineLifecycleState(intentPayload.intentType);
        await updateLeadLifecycle({
          email: intentPayload.email,
          userId: intentPayload.userId,
          newState,
          tierInterest: intentPayload.tier,
          persona: intentPayload.persona,
          metadata: { last_intent_type: intentPayload.intentType }
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Intent tracked' })
      };
    }

    if (action === 'lifecycle') {
      // Update lifecycle state
      const lifecyclePayload: LeadLifecyclePayload = {
        email: body.email,
        userId: body.userId,
        newState: body.newState,
        tierInterest: body.tierInterest,
        persona: body.persona,
        metadata: body.metadata
      };

      if (!lifecyclePayload.email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email is required for lifecycle updates' })
        };
      }

      await updateLeadLifecycle(lifecyclePayload);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Lifecycle updated' })
      };
    }

    // Legacy email capture endpoint
    if (action === 'capture') {
      const email = body.email;
      const planId = body.planId;

      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Email is required' })
        };
      }

      // Track as email captured intent
      await storeLeadIntent({
        email,
        intentType: 'email_captured',
        intentData: { plan_id: planId },
        source: body.source || 'email_capture_modal'
      });

      // Update lifecycle to captured state
      await updateLeadLifecycle({
        email,
        newState: 'captured',
        tierInterest: planId,
        metadata: { captured_at: new Date().toISOString() }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Email captured' })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Unknown action' })
    };

  } catch (error) {
    console.error('[Leads] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
