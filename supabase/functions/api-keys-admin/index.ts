import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handleCorsOptions, createCorsHeaders, withCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ANON_KEY = Deno.env.get("EDGE_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

const serviceClient = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token || !SUPABASE_URL || !ANON_KEY) {
    return null;
  }

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) {
    return null;
  }
  return data.user;
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = createCorsHeaders(req);

  if (!serviceClient || !SUPABASE_URL) {
    return withCors(
      new Response(JSON.stringify({ error: "Supabase not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return withCors(
      new Response(JSON.stringify({ error: "Unauthorized", message: "Missing or invalid session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
      req,
    );
  }

  if (req.method === "GET") {
    try {
      const { data, error } = await serviceClient
        .from("api_keys")
        .select("id, label, created_at, is_active, expires_at, usage_count")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("api-keys-admin GET error", error);
        return withCors(
          new Response(JSON.stringify({
            error: "Failed to load API keys",
            details: (error as any)?.message ?? String(error),
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
          req,
        );
      }

      return withCors(
        new Response(JSON.stringify({ keys: data ?? [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
        req,
      );
    } catch (err) {
      console.error("api-keys-admin GET threw", err);
      return withCors(
        new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
        req,
      );
    }
  }

  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      const rawLabel = typeof body.label === "string" ? body.label.trim() : "";
      const label = rawLabel || "Untitled key";
      const expiresAt = typeof body.expires_at === "string" ? body.expires_at : null;

      const apiKey = generateApiKey();

      const { data, error } = await serviceClient
        .from("api_keys")
        .insert({
          label,
          api_key: apiKey,
          created_by: user.id,
          is_active: true,
          expires_at: expiresAt,
        })
        .select("id, label, created_at, is_active, expires_at, usage_count")
        .single();

      if (error) {
        console.error("api-keys-admin POST error", error);
        return withCors(
          new Response(JSON.stringify({
            error: "Failed to create API key",
            details: (error as any)?.message ?? String(error),
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
          req,
        );
      }

      return withCors(
        new Response(JSON.stringify({ key: data, secret: apiKey }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
        req,
      );
    } catch (err) {
      console.error("api-keys-admin POST threw", err);
      return withCors(
        new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
        req,
      );
    }
  }

  return withCors(
    new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    }),
    req,
  );
});
