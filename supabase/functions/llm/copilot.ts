/**
 * LLM Copilot Handler - Tool Calling Endpoint
 * 
 * Handles POST /copilot requests for multi-source AI queries.
 * Uses the orchestrator to manage tool selection and execution.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit, getClientId, logApiUsage } from "../_shared/rateLimit.ts";
import { orchestrateWithTools } from "./tools/orchestrator.ts";

interface CopilotRequest {
  query: string;
  conversationId?: string;
  stream?: boolean;
}

interface CopilotResponse {
  answer: string;
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
  iterations: number;
  success: boolean;
  error?: string;
  meta: {
    totalExecutionTimeMs: number;
    conversationId: string;
  };
}

// Validate request body
function validateRequest(body: unknown): body is CopilotRequest {
  if (typeof body !== 'object' || body === null) return false;
  const req = body as Record<string, unknown>;
  return typeof req.query === 'string' && req.query.length > 0 && req.query.length <= 1000;
}

// Main handler
async function handleCopilotRequest(
  req: Request,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<Response> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Parse request body
    const body = await req.json();
    
    if (!validateRequest(body)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: query must be 1-1000 characters' }),
        { 
          status: 400, 
          headers: { 
            ...createCorsHeaders(req),
            'Content-Type': 'application/json'
          } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Execute orchestration with tools
    const result = await orchestrateWithTools(
      body.query,
      supabase,
      {
        maxIterations: 5,
        timeoutMs: 30000,
        maxToolCallsPerQuery: 8,
      },
      body.stream ? (update) => {
        // Streaming updates would be sent via Server-Sent Events
        // For now, we just log progress
        console.log(`[Copilot ${requestId}] ${update.type}: ${update.message || update.toolName || ''}`);
      } : undefined
    );

    const totalExecutionTimeMs = Date.now() - startTime;

    // Build response
    const response: CopilotResponse = {
      answer: result.answer,
      toolCalls: result.toolCalls,
      iterations: result.iterations,
      success: result.success,
      error: result.error,
      meta: {
        totalExecutionTimeMs,
        conversationId: body.conversationId || requestId,
      },
    };

    // Log API usage
    await logApiUsage({
      endpoint: 'llm/copilot',
      method: req.method,
      statusCode: result.success ? 200 : 500,
      ipAddress: getClientId(req),
      responseTimeMs: totalExecutionTimeMs,
      extra: {
        requestId,
        conversationId: body.conversationId || requestId,
        iterations: result.iterations,
        toolCalls: result.toolCalls.length,
      },
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...createCorsHeaders(req),
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        } 
      }
    );

  } catch (error) {
    console.error(`[Copilot ${requestId}] Error:`, error);

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      { 
        status: 500, 
        headers: { 
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        } 
      }
    );
  }
}

// Main serve function
serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCorsOptions(req);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        } 
      }
    );
  }

  // Apply rate limiting (20 requests per minute for expensive LLM operations)
  const rateLimitResult = applyRateLimit(req, 'llm');
  if (rateLimitResult.response) {
    return rateLimitResult.response;
  }

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { 
        status: 500, 
        headers: { 
          ...createCorsHeaders(req),
          'Content-Type': 'application/json'
        } 
      }
    );
  }

  return await handleCopilotRequest(req, supabaseUrl, supabaseServiceKey);
});
