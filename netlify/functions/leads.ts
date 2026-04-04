/**
 * Netlify Function: Lead Capture and Lifecycle Management
 * 
 * Handles lead intent tracking and lifecycle state transitions.
 * Part of: PBI-OpenClaw-Monetization-Orchestration-T1
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://canada-energy.netlify.app',
  'https://ceip.netlify.app',
];

function resolveOrigin(origin: string | undefined): string {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  return ALLOWED_ORIGINS[0];
}

function corsHeaders(origin: string | undefined) {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(origin),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function getSupabaseConfig(): { supabaseUrl: string; supabaseKey: string } {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SB_SERVICE_ROLE_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Server-side Supabase configuration is missing for lead persistence');
  }

  return { supabaseUrl, supabaseKey };
}

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

interface LeadIntakeSubmissionPayload {
  company_name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  team_size?: string | null;
  industry?: string | null;
  message?: string | null;
  source_route?: string | null;
  channel?: string | null;
  segment?: string | null;
  campaign_id?: string | null;
  metadata?: Record<string, any>;
}

function clamp(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
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
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

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

async function storeLeadIntakeSubmission(payload: LeadIntakeSubmissionPayload): Promise<void> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/rest/v1/lead_intake_submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      company_name: clamp(payload.company_name, 200),
      contact_name: clamp(payload.contact_name, 200),
      email: clamp(payload.email, 320),
      phone: clamp(payload.phone, 64),
      team_size: clamp(payload.team_size, 32),
      industry: clamp(payload.industry, 64),
      message: clamp(payload.message, 4000),
      source_route: clamp(payload.source_route, 128),
      channel: clamp(payload.channel, 32),
      segment: clamp(payload.segment, 64),
      campaign_id: clamp(payload.campaign_id, 128),
      metadata: payload.metadata || {}
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to store lead intake submission: ${response.statusText}`);
  }
}

/**
 * Update lead lifecycle state
 */
async function updateLeadLifecycle(payload: LeadLifecyclePayload): Promise<void> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

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
  const headers = corsHeaders(event.headers.origin);

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

    if (action === 'intake') {
      const submission = body.submission as LeadIntakeSubmissionPayload | undefined;

      if (!submission?.contact_name || !submission?.email || !submission?.source_route || !submission?.segment || !submission?.campaign_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required lead intake fields' })
        };
      }

      await storeLeadIntakeSubmission(submission);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Lead intake stored' })
      };
    }

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
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Lifecycle updates are restricted to internal workflow jobs'
        })
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
