export interface LeadIntakeSubmission {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  team_size?: string;
  industry?: string;
  message?: string;
  source_route: string;
  channel: 'direct' | 'whop' | 'partner';
  segment: string;
  campaign_id: string;
  metadata?: Record<string, unknown>;
}

function clamp(value: string | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export async function persistLeadIntake(submission: LeadIntakeSubmission): Promise<{
  ok: boolean;
  error?: string;
}> {
  const payload = {
    company_name: clamp(submission.company_name, 200),
    contact_name: clamp(submission.contact_name, 200),
    email: clamp(submission.email, 320),
    phone: clamp(submission.phone, 64),
    team_size: clamp(submission.team_size, 32),
    industry: clamp(submission.industry, 64),
    message: clamp(submission.message, 4000),
    source_route: clamp(submission.source_route, 128),
    channel: submission.channel,
    segment: clamp(submission.segment, 64),
    campaign_id: clamp(submission.campaign_id, 128),
    metadata: submission.metadata ?? {},
  };

  if (!payload.contact_name || !payload.email || !payload.source_route || !payload.segment || !payload.campaign_id) {
    return {
      ok: false,
      error: 'invalid_submission',
    };
  }

  try {
    const response = await fetch('/api/leads/intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'intake',
        submission: payload,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return {
        ok: false,
        error: body?.message || body?.error || `lead_capture_failed_${response.status}`,
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}
