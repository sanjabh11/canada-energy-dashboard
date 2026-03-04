import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { floorToUtcHour } from "../_shared/exportTelemetry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
const EXPORT_BLOCK_ALERT_THRESHOLD = Number(Deno.env.get("EXPORT_BLOCK_ALERT_THRESHOLD") || "3");

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";
const ALERT_FROM_EMAIL = Deno.env.get("ALERT_FROM_EMAIL") || "alerts@ceip.energy";
const ALERT_FROM_NAME = Deno.env.get("ALERT_FROM_NAME") || "CEIP Export Monitor";
const EXPORT_ALERT_EMAIL_TO = Deno.env.get("EXPORT_ALERT_EMAIL_TO") || Deno.env.get("ALERT_TO_EMAIL") || "";

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const xCron = req.headers.get("x-supabase-cron");
  if (xCron === "true") return true;
  if (!authHeader) return false;
  if (authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) return true;
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) return true;
  return false;
}

function getRecipients(): string[] {
  return EXPORT_ALERT_EMAIL_TO
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function sendViaResend(to: string[], subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY || to.length === 0) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${ALERT_FROM_NAME} <${ALERT_FROM_EMAIL}>`,
        to,
        subject,
        html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function sendViaSendgrid(to: string[], subject: string, html: string): Promise<boolean> {
  if (!SENDGRID_API_KEY || to.length === 0) return false;
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: to.map((email) => ({ email })) }],
        from: { email: ALERT_FROM_EMAIL, name: ALERT_FROM_NAME },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function sendAlertEmail(to: string[], subject: string, html: string): Promise<boolean> {
  if (await sendViaResend(to, subject, html)) return true;
  return sendViaSendgrid(to, subject, html);
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server is not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized - cron/service only." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const now = new Date();
  const windowStart = floorToUtcHour(now);
  const windowStartIso = windowStart.toISOString();
  const lastHourIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const { data: existingRun } = await supabase
    .from("export_alert_runs")
    .select("window_start, blocked_count, sent_at")
    .eq("window_start", windowStartIso)
    .maybeSingle();

  if (existingRun) {
    return new Response(JSON.stringify({
      ok: true,
      skipped: true,
      reason: "Alert already sent for current window.",
      windowStart: windowStartIso,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: failedRows, error: failedRowsError } = await supabase
    .from("export_jobs")
    .select("id, status, status_reason, template, request_source, created_at")
    .in("status", ["blocked_stale", "failed"])
    .gte("created_at", lastHourIso)
    .order("created_at", { ascending: false })
    .limit(25);

  if (failedRowsError) {
    return new Response(JSON.stringify({ error: "Failed to query export health." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const blockedCount = (failedRows ?? []).length;
  if (blockedCount < EXPORT_BLOCK_ALERT_THRESHOLD) {
    return new Response(JSON.stringify({
      ok: true,
      alertSent: false,
      blockedCount,
      threshold: EXPORT_BLOCK_ALERT_THRESHOLD,
      windowStart: windowStartIso,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const recipients = getRecipients();
  const examples = (failedRows ?? [])
    .slice(0, 5)
    .map((row) => `<li><strong>${row.id}</strong> (${row.template}, ${row.request_source}) — ${row.status}: ${row.status_reason ?? "n/a"}</li>`)
    .join("");

  const subject = `[CEIP] Export health alert: ${blockedCount} blocked/failed in last 60m`;
  const html = `
    <h2>CEIP Export Health Alert</h2>
    <p><strong>${blockedCount}</strong> export jobs were blocked/failed in the last 60 minutes.</p>
    <p>Threshold: ${EXPORT_BLOCK_ALERT_THRESHOLD}</p>
    <p>Window start: ${windowStartIso}</p>
    <h3>Recent examples</h3>
    <ul>${examples}</ul>
  `;

  const sent = await sendAlertEmail(recipients, subject, html);
  if (!sent) {
    return new Response(JSON.stringify({
      error: "Alert threshold crossed but no email provider configured/successful.",
      blockedCount,
      recipients,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  await supabase.from("export_alert_runs").insert({
    window_start: windowStartIso,
    blocked_count: blockedCount,
    sent_at: new Date().toISOString(),
    channel: "email",
  });

  return new Response(JSON.stringify({
    ok: true,
    alertSent: true,
    blockedCount,
    threshold: EXPORT_BLOCK_ALERT_THRESHOLD,
    recipients,
    windowStart: windowStartIso,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
