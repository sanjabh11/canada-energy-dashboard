export interface UtilityApiDemoAuthorizationRecord {
  id: string;
  operator_user_id: string;
  operator_email: string;
  scenario: string;
  utility: string;
  referral: string | null;
  authorization_uid: string | null;
  meter_uids: string[];
  last_stage: string | null;
  last_status: string | null;
  started_at: string;
  last_polled_at: string | null;
  last_synced_at: string | null;
  revoked_at: string | null;
  last_error: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function findReusableUtilityApiDemoAuthorization(
  supabase: any,
  params: {
    operatorUserId: string;
    scenario: string;
    utility?: string;
  },
): Promise<UtilityApiDemoAuthorizationRecord | null> {
  const utility = params.utility ?? 'DEMO';
  const { data, error } = await supabase
    .from('utilityapi_demo_operator_authorizations')
    .select('*')
    .eq('operator_user_id', params.operatorUserId)
    .eq('scenario', params.scenario)
    .eq('utility', utility)
    .is('revoked_at', null)
    .order('started_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  const rows = Array.isArray(data) ? data as UtilityApiDemoAuthorizationRecord[] : [];
  return rows.find((row) => row.last_stage !== 'revoked' && row.last_stage !== 'errored') ?? null;
}

export async function countUtilityApiDemoStartsForMonth(
  supabase: any,
  params: {
    startedAtGte: string;
    startedAtLt: string;
    utility?: string;
  },
): Promise<number> {
  const utility = params.utility ?? 'DEMO';
  const { count, error } = await supabase
    .from('utilityapi_demo_operator_authorizations')
    .select('id', { head: true, count: 'exact' })
    .eq('utility', utility)
    .gte('started_at', params.startedAtGte)
    .lt('started_at', params.startedAtLt);

  if (error) throw error;
  return count ?? 0;
}

export async function insertUtilityApiDemoAuthorization(
  supabase: any,
  payload: {
    operator_user_id: string;
    operator_email: string;
    scenario: string;
    utility?: string;
    referral?: string | null;
    authorization_uid?: string | null;
    meter_uids?: string[];
    last_stage?: string | null;
    last_status?: string | null;
    last_error?: string | null;
  },
): Promise<UtilityApiDemoAuthorizationRecord> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('utilityapi_demo_operator_authorizations')
    .insert({
      operator_user_id: payload.operator_user_id,
      operator_email: payload.operator_email,
      scenario: payload.scenario,
      utility: payload.utility ?? 'DEMO',
      referral: payload.referral ?? null,
      authorization_uid: payload.authorization_uid ?? null,
      meter_uids: payload.meter_uids ?? [],
      last_stage: payload.last_stage ?? null,
      last_status: payload.last_status ?? null,
      last_error: payload.last_error ?? null,
      started_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as UtilityApiDemoAuthorizationRecord;
}

export async function updateUtilityApiDemoAuthorization(
  supabase: any,
  lookup: {
    id?: string | null;
    authorization_uid?: string | null;
    referral?: string | null;
  },
  patch: Record<string, unknown>,
): Promise<UtilityApiDemoAuthorizationRecord | null> {
  const identifier = lookup.id ? { column: 'id', value: lookup.id } :
    lookup.authorization_uid ? { column: 'authorization_uid', value: lookup.authorization_uid } :
    lookup.referral ? { column: 'referral', value: lookup.referral } :
    null;

  if (!identifier) return null;

  const { data, error } = await supabase
    .from('utilityapi_demo_operator_authorizations')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq(identifier.column, identifier.value)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return (data as UtilityApiDemoAuthorizationRecord | null) ?? null;
}
