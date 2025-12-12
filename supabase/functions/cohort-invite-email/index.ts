import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
    cohort_id: string;
    emails: string[];
    sender_name?: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { cohort_id, emails, sender_name } = await req.json() as InviteRequest;

        if (!cohort_id || !emails || emails.length === 0) {
            return new Response(JSON.stringify({ error: "Missing cohort_id or emails" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 1. Get Cohort Details
        const supabase = createClient(SUPABASE_URL, ANON_KEY, {
            global: { headers: { Authorization: req.headers.get("Authorization")! } },
        });

        const { data: cohort, error: cohortError } = await supabase
            .from("cohorts")
            .select("name, description")
            .eq("id", cohort_id)
            .single();

        if (cohortError || !cohort) {
            throw new Error("Cohort not found");
        }

        console.log(`Sending invites for cohort: ${cohort.name} to ${emails.length} recipients`);

        // 2. Send Emails (via Resend if key exists, otherwise mock)
        if (RESEND_API_KEY) {
            const results = await Promise.all(emails.map(async (email) => {
                const res = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${RESEND_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: "Canada Energy Academy <onboarding@canadaenergy.app>", // Update specifically if domain verified
                        to: email,
                        subject: `You've been invited to join ${cohort.name}`,
                        html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1>Welcome to Canada Energy Academy</h1>
                <p>Hello,</p>
                <p><strong>${sender_name || "An administrator"}</strong> has invited you to join the cohort: <strong>${cohort.name}</strong>.</p>
                ${cohort.description ? `<p><em>${cohort.description}</em></p>` : ""}
                <p>Click the link below to accept your invitation and start learning:</p>
                <a href="https://canada-energy.netlify.app/whop/experience?cohort=${cohort_id}" style="display: inline-block; background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
                <p>Best regards,<br>Canada Energy Academy Team</p>
              </div>
            `,
                    }),
                });
                return res.ok;
            }));

            const successCount = results.filter(Boolean).length;
            console.log(`Sent ${successCount}/${emails.length} emails via Resend`);
        } else {
            console.log("RESEND_API_KEY not found. Mocking email send.");
            // In dev mode, we just log access
            console.log(`[MOCK EMAIL] To: ${emails.join(", ")}`);
            console.log(`[MOCK EMAIL] Subject: Invitation to ${cohort.name}`);
        }

        // 3. Update status in cohort_members (optional, if we tracked 'email_sent')
        // We haven't added that column yet, so user can just see they are added.

        return new Response(JSON.stringify({ success: true, count: emails.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error sending invites:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
