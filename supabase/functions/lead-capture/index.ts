import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit, getClientId, logApiUsage } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 2000;

function jsonResponse(req: Request, status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...createCorsHeaders(req),
      ...extraHeaders,
    },
  });
}

serve(async (req: Request) => {
  const corsHeaders = createCorsHeaders(req);
  const rl = applyRateLimit(req, 'lead-capture');
  if (rl.response) return rl.response;

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const startedAt = Date.now();
  const clientId = getClientId(req);
  const apiKey = clientId.startsWith('key:') ? clientId.slice(4) : null;
  const ipAddress = clientId.startsWith('ip:') ? clientId.slice(3) : null;

  try {
    if (req.method !== 'POST') {
      return jsonResponse(req, 405, { error: 'Method not allowed' }, rl.headers);
    }

    if (!supabase) {
      return jsonResponse(req, 503, { error: 'Service configuration missing' }, rl.headers);
    }

    const body = await req.json().catch(() => ({}));

    // Extract and validate required fields
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    // Optional fields
    const company = typeof body?.company === 'string' ? body.company.trim().slice(0, MAX_FIELD_LENGTH) : null;
    const inquiryType = typeof body?.inquiry_type === 'string' ? body.inquiry_type.trim() : 'general';
    const source = typeof body?.source === 'string' ? body.source.trim().slice(0, 500) : null;

    // Validate required fields
    const validationErrors: string[] = [];
    if (!name) validationErrors.push('name is required');
    if (!email) validationErrors.push('email is required');
    else if (!EMAIL_REGEX.test(email)) validationErrors.push('email is not valid');
    if (!subject) validationErrors.push('subject is required');
    if (!message) validationErrors.push('message is required');

    if (validationErrors.length > 0) {
      return jsonResponse(req, 400, { error: 'Validation failed', details: validationErrors }, rl.headers);
    }

    // Insert into contact_leads table
    const { error: insertError } = await supabase
      .from('contact_leads')
      .insert({
        name: name.slice(0, 255),
        email: email.slice(0, 255),
        company: company || null,
        subject: subject.slice(0, 500),
        message: message.slice(0, MAX_FIELD_LENGTH),
        inquiry_type: inquiryType.slice(0, 50),
        source: source || null,
        status: 'new',
      });

    if (insertError) {
      console.error('lead-capture insert error:', insertError);
      await logApiUsage({
        endpoint: 'lead-capture',
        method: req.method,
        statusCode: 500,
        apiKey,
        ipAddress,
        responseTimeMs: Date.now() - startedAt,
        extra: { error: insertError.message },
      });
      return jsonResponse(req, 500, { error: 'Failed to save lead' }, rl.headers);
    }

    await logApiUsage({
      endpoint: 'lead-capture',
      method: req.method,
      statusCode: 200,
      apiKey,
      ipAddress,
      responseTimeMs: Date.now() - startedAt,
      extra: { inquiryType },
    });

    return jsonResponse(req, 200, {
      success: true,
      message: 'Lead captured successfully',
    }, rl.headers);

  } catch (error) {
    await logApiUsage({
      endpoint: 'lead-capture',
      method: req.method,
      statusCode: 500,
      apiKey,
      ipAddress,
      responseTimeMs: Date.now() - startedAt,
      extra: { error: String(error) },
    });
    return jsonResponse(req, 500, { error: 'Internal server error' }, rl.headers);
  }
});
