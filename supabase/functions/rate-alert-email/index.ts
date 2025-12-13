/**
 * Rate Alert Email Sender
 * 
 * Sends email alerts to subscribers when Alberta RRO rates exceed thresholds.
 * Uses SendGrid or Resend for email delivery.
 * 
 * Endpoint: /functions/v1/rate-alert-email
 * 
 * Features:
 * - Threshold-based alerts
 * - Daily digest option
 * - Unsubscribe handling
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handleCorsOptions, withCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Email provider configuration
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("ALERT_FROM_EMAIL") || "alerts@ceip.energy";
const FROM_NAME = Deno.env.get("ALERT_FROM_NAME") || "CEIP Rate Watchdog";

interface AlertSubscription {
  id: string;
  email: string;
  threshold_cents: number;
  alert_type: 'immediate' | 'daily_digest';
  is_active: boolean;
  created_at: string;
  last_alerted_at: string | null;
}

interface RateAlert {
  email: string;
  threshold: number;
  currentRate: number;
  forecastRate?: number;
  alertType: 'threshold_exceeded' | 'price_spike' | 'daily_digest';
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn("SendGrid API key not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [
          { type: "text/plain", value: textContent },
          { type: "text/html", value: htmlContent },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("SendGrid error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("SendGrid send error:", error);
    return false;
  }
}

/**
 * Send email via Resend
 */
async function sendViaResend(
  to: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("Resend API key not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Resend error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Resend send error:", error);
    return false;
  }
}

/**
 * Send email using available provider
 */
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<boolean> {
  // Try Resend first (better developer experience)
  if (RESEND_API_KEY) {
    return await sendViaResend(to, subject, htmlContent);
  }

  // Fall back to SendGrid
  if (SENDGRID_API_KEY) {
    return await sendViaSendGrid(to, subject, htmlContent, textContent);
  }

  console.error("No email provider configured. Set SENDGRID_API_KEY or RESEND_API_KEY.");
  return false;
}

/**
 * Generate alert email HTML
 */
function generateAlertEmailHtml(alert: RateAlert): string {
  const savingsPercent = Math.round(((alert.currentRate - 10.79) / alert.currentRate) * 100);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alberta RRO Rate Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%); padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 24px;">⚡ Rate Alert</h1>
      <p style="margin: 8px 0 0; color: #bfdbfe; font-size: 14px;">Alberta Rate Watchdog by CEIP</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 24px;">
      <div style="background-color: #dc2626; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 8px; color: white; font-size: 18px;">🚨 RRO Rate Exceeded Your Threshold</h2>
        <p style="margin: 0; color: #fecaca;">
          Current rate: <strong>${alert.currentRate}¢/kWh</strong> (your threshold: ${alert.threshold}¢/kWh)
        </p>
      </div>
      
      ${alert.forecastRate ? `
      <div style="background-color: #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px; color: #94a3b8; font-size: 14px;">Forecast for Next Month</h3>
        <p style="margin: 0; color: ${alert.forecastRate > alert.currentRate ? '#f87171' : '#4ade80'}; font-size: 20px; font-weight: bold;">
          ${alert.forecastRate}¢/kWh ${alert.forecastRate > alert.currentRate ? '↑' : '↓'}
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #065f46; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px; color: #a7f3d0; font-size: 14px;">💡 Recommendation</h3>
        <p style="margin: 0; color: #d1fae5;">
          Switch to a fixed rate and save up to <strong>${savingsPercent}%</strong> on your electricity bill.
          Best current fixed rate: <strong>10.29¢/kWh</strong> from ATCOenergy.
        </p>
      </div>
      
      <a href="https://ceip.energy/rate-alerts" style="display: block; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%); color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; margin-bottom: 20px;">
        Compare All Retailers →
      </a>
      
      <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
        You received this alert because you subscribed to CEIP Rate Watchdog.
        <a href="https://ceip.energy/rate-alerts?unsubscribe=${encodeURIComponent(alert.email)}" style="color: #94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text version
 */
function generateAlertEmailText(alert: RateAlert): string {
  return `
CEIP Rate Watchdog - Alberta RRO Rate Alert

🚨 RRO Rate Exceeded Your Threshold

Current rate: ${alert.currentRate}¢/kWh (your threshold: ${alert.threshold}¢/kWh)

${alert.forecastRate ? `Forecast for next month: ${alert.forecastRate}¢/kWh` : ''}

💡 Recommendation:
Switch to a fixed rate and save on your electricity bill.
Best current fixed rate: 10.29¢/kWh from ATCOenergy.

Compare all retailers: https://ceip.energy/rate-alerts

---
You received this alert because you subscribed to CEIP Rate Watchdog.
Unsubscribe: https://ceip.energy/rate-alerts?unsubscribe=${encodeURIComponent(alert.email)}
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return withCors(
      new Response(JSON.stringify({ error: "Supabase not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
      req
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Handle different endpoints
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "check";

  try {
    switch (action) {
      case "subscribe": {
        // Subscribe to alerts
        if (req.method !== "POST") {
          return withCors(
            new Response(JSON.stringify({ error: "Method not allowed" }), {
              status: 405,
              headers: { "Content-Type": "application/json" },
            }),
            req
          );
        }

        const body = await req.json();
        const { email, threshold = 15, alertType = "immediate" } = body;

        if (!email || !email.includes("@")) {
          return withCors(
            new Response(JSON.stringify({ error: "Valid email required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }),
            req
          );
        }

        const { data, error } = await supabase
          .from("rate_alert_subscriptions")
          .upsert({
            email,
            threshold_cents: threshold,
            alert_type: alertType,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "email",
          })
          .select()
          .single();

        if (error) {
          console.error("Subscribe error:", error);
          return withCors(
            new Response(JSON.stringify({ error: "Failed to subscribe" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }),
            req
          );
        }

        return withCors(
          new Response(JSON.stringify({ success: true, subscription: data }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
          req
        );
      }

      case "unsubscribe": {
        const email = url.searchParams.get("email");
        if (!email) {
          return withCors(
            new Response(JSON.stringify({ error: "Email required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }),
            req
          );
        }

        const { error } = await supabase
          .from("rate_alert_subscriptions")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("email", email);

        if (error) {
          console.error("Unsubscribe error:", error);
        }

        return withCors(
          new Response(JSON.stringify({ success: true, message: "Unsubscribed" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
          req
        );
      }

      case "send-alerts": {
        // Trigger alert sending (called by cron or manually)
        const body = await req.json().catch(() => ({}));
        const currentRate = body.currentRate || 16.82;
        const forecastRate = body.forecastRate || 18.45;

        // Get all active subscriptions where threshold is exceeded
        const { data: subscriptions, error } = await supabase
          .from("rate_alert_subscriptions")
          .select("*")
          .eq("is_active", true)
          .lte("threshold_cents", currentRate);

        if (error) {
          console.error("Fetch subscriptions error:", error);
          return withCors(
            new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }),
            req
          );
        }

        let sentCount = 0;
        let failedCount = 0;

        for (const sub of subscriptions || []) {
          // Check if we already alerted today
          if (sub.last_alerted_at) {
            const lastAlerted = new Date(sub.last_alerted_at);
            const now = new Date();
            const hoursSinceLastAlert = (now.getTime() - lastAlerted.getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceLastAlert < 24) {
              continue; // Skip, already alerted within 24 hours
            }
          }

          const alert: RateAlert = {
            email: sub.email,
            threshold: sub.threshold_cents,
            currentRate,
            forecastRate,
            alertType: "threshold_exceeded",
          };

          const htmlContent = generateAlertEmailHtml(alert);
          const textContent = generateAlertEmailText(alert);
          const subject = `⚡ Alberta RRO Rate Alert: ${currentRate}¢/kWh exceeds your ${sub.threshold_cents}¢ threshold`;

          const sent = await sendEmail(sub.email, subject, htmlContent, textContent);

          if (sent) {
            sentCount++;
            // Update last alerted timestamp
            await supabase
              .from("rate_alert_subscriptions")
              .update({ last_alerted_at: new Date().toISOString() })
              .eq("id", sub.id);
          } else {
            failedCount++;
          }
        }

        return withCors(
          new Response(JSON.stringify({ 
            success: true, 
            sent: sentCount, 
            failed: failedCount,
            totalSubscribers: subscriptions?.length || 0
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
          req
        );
      }

      case "check":
      default: {
        // Health check
        return withCors(
          new Response(JSON.stringify({ 
            status: "ok",
            emailProvider: RESEND_API_KEY ? "resend" : SENDGRID_API_KEY ? "sendgrid" : "none",
            configured: !!(RESEND_API_KEY || SENDGRID_API_KEY)
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
          req
        );
      }
    }
  } catch (error) {
    console.error("Rate alert email error:", error);
    return withCors(
      new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
      req
    );
  }
});
