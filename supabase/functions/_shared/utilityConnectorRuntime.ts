export interface UtilityConnectorAccountUpsertPayload {
  connector_kind: string;
  source_kind: string;
  status: string;
  jurisdiction: 'Ontario' | 'Alberta';
  utility_name: string;
  display_name: string;
  account_holder_ref?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UtilityConnectorRunPayload {
  connector_account_id?: string | null;
  run_type: 'auth' | 'sync' | 'revoke' | 'batch_import' | 'telemetry_ingest';
  status: 'success' | 'failure';
  observed_at?: string | null;
  row_count?: number;
  warning_count?: number;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UtilityConnectorTokenUpsertPayload {
  connector_account_id: string;
  token_label: string;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string | null;
  registration_metadata: Record<string, unknown>;
  token_expires_at: string | null;
  updated_at: string;
}

export interface GreenButtonIntervalHistoryRow {
  observed_at: string;
  geography_level: 'system' | 'substation' | 'feeder';
  geography_id: string;
  customer_class: string;
  demand_mw: number;
  quality_flags: string[];
}

export interface RuntimeResponse {
  status: number;
  body: Record<string, unknown>;
}

export interface RuntimeTelemetrySnapshot {
  observed_at: string;
  jurisdiction: 'Ontario' | 'Alberta';
  geography_level: 'system' | 'substation' | 'feeder';
  geography_id: string;
  feeder_id: string | null;
  substation_id: string | null;
  load_mw: number | null;
  voltage_kv: number | null;
  transformer_utilization_pct: number | null;
  outage_state: 'normal' | 'watch' | 'outage' | 'restoration' | null;
  quality_flags: string[];
  source: string;
}

export type GreenButtonRevocationMode = 'api' | 'portal_redirect';

type FetchLike = typeof fetch;

export function authorizeUtilityConnectorHeaders(
  configuredKey: string,
  headers: Pick<Headers, 'get'>,
): string | null {
  if (!configuredKey) return null;

  const candidate = headers.get('x-utility-connector-key')
    ?? headers.get('x-ingest-token')
    ?? headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    ?? '';

  return candidate === configuredKey ? null : 'Missing or invalid utility connector ingest key.';
}

export function buildGreenButtonAuthorizeResponse(params: {
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  connectorId?: string;
  scope?: string;
}): RuntimeResponse {
  const authorizeUrl = String(params.authorizeUrl ?? '').trim();
  const clientId = String(params.clientId ?? '').trim();
  const redirectUri = String(params.redirectUri ?? '').trim();
  const connectorId = String(params.connectorId ?? '').trim();
  const scope = String(params.scope ?? 'FB=4_5_15_16').trim();

  if (!authorizeUrl || !clientId || !redirectUri) {
    return {
      status: 400,
      body: {
        error: 'authorize_url, client_id, and redirect_uri are required for Green Button CMD authorization.',
      },
    };
  }

  const state = connectorId || crypto.randomUUID();
  const authUrl = new URL(authorizeUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);

  return {
    status: 200,
    body: {
      authorize_url: authUrl.toString(),
      connector_id: connectorId || null,
      state,
    },
  };
}

export async function runGreenButtonCallback(params: {
  code: string;
  state?: string;
  connectorId: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  utilityName?: string;
  displayName?: string;
  metadata?: Record<string, unknown>;
  tokenRequestHeaders?: Record<string, string>;
}, deps: {
  fetchImpl?: FetchLike;
  now?: () => Date;
  upsertAccount: (payload: UtilityConnectorAccountUpsertPayload) => Promise<{ id: string } | null | undefined>;
  logRun: (payload: UtilityConnectorRunPayload) => Promise<void>;
  upsertToken: (payload: UtilityConnectorTokenUpsertPayload) => Promise<void>;
  encryptSecret: (plaintext: string) => Promise<string>;
}): Promise<RuntimeResponse> {
  const code = String(params.code ?? '').trim();
  const state = String(params.state ?? '').trim();
  const connectorId = String(params.connectorId ?? '').trim();
  const tokenEndpoint = String(params.tokenEndpoint ?? '').trim();
  const clientId = String(params.clientId ?? '').trim();
  const clientSecret = String(params.clientSecret ?? '').trim();
  const redirectUri = String(params.redirectUri ?? '').trim();
  const utilityName = String(params.utilityName ?? 'Ontario Green Button Utility');
  const displayName = String(params.displayName ?? utilityName);
  const tokenRequestHeaders = params.tokenRequestHeaders ?? {};
  const now = deps.now ?? (() => new Date());

  if (!code || !connectorId) {
    return {
      status: 400,
      body: { error: 'Missing authorization code or connector identifier.' },
    };
  }

  const connectorAccount = await deps.upsertAccount({
    connector_kind: 'ontario_green_button_cmd',
    source_kind: 'green_button_cmd',
    status: 'pending_auth',
    jurisdiction: 'Ontario',
    utility_name: utilityName,
    display_name: displayName,
    account_holder_ref: connectorId,
    metadata: {
      authorize_callback_state: state,
      ...(params.metadata ?? {}),
    },
  });
  const connectorAccountId = String(connectorAccount?.id ?? '');

  if (!tokenEndpoint || !clientId || !clientSecret || !redirectUri) {
    await deps.logRun({
      connector_account_id: connectorAccountId,
      run_type: 'auth',
      status: 'failure',
      error_message: 'Green Button token exchange configuration missing.',
      metadata: { connector_id: connectorId },
    });
    return {
      status: 400,
      body: {
        ok: false,
        connector_account_id: connectorAccountId,
        error: 'Green Button callback received, but token exchange configuration is incomplete.',
      },
    };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const tokenResponse = await fetchImpl(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...tokenRequestHeaders },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const tokenText = await tokenResponse.text();
  const tokenPayload = parseJsonRecord(tokenText);

  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    const failureStatus = deriveGreenButtonFailureStatus(tokenPayload?.error, tokenResponse.status);
    await deps.upsertAccount({
      connector_kind: 'ontario_green_button_cmd',
      source_kind: 'green_button_cmd',
      status: failureStatus,
      jurisdiction: 'Ontario',
      utility_name: utilityName,
      display_name: displayName,
      account_holder_ref: connectorId,
      last_error: readErrorMessage(tokenPayload) ?? 'Token exchange failed.',
      metadata: {
        authorize_callback_state: state,
        ...(params.metadata ?? {}),
        ...(failureStatus === 'revoked' ? { revoked_at: now().toISOString() } : {}),
      },
    });
    await deps.logRun({
      connector_account_id: connectorAccountId,
      run_type: 'auth',
      status: 'failure',
      error_message: readErrorMessage(tokenPayload) ?? 'Token exchange failed.',
      metadata: { connector_id: connectorId },
    });
    return {
      status: 400,
      body: {
        error: 'Green Button token exchange failed.',
        details: tokenPayload ?? { raw_response: tokenText || null },
      },
    };
  }

  const encryptedAccessToken = await deps.encryptSecret(String(tokenPayload.access_token));
  const encryptedRefreshToken = tokenPayload.refresh_token
    ? await deps.encryptSecret(String(tokenPayload.refresh_token))
    : null;
  const expiresAt = tokenPayload.expires_in
    ? new Date(now().getTime() + Number(tokenPayload.expires_in) * 1000).toISOString()
    : null;

  await deps.upsertToken({
    connector_account_id: connectorAccountId,
    token_label: 'default',
    access_token_ciphertext: encryptedAccessToken,
    refresh_token_ciphertext: encryptedRefreshToken,
    registration_metadata: {
      token_type: tokenPayload.token_type ?? 'Bearer',
      scope: tokenPayload.scope ?? null,
    },
    token_expires_at: expiresAt,
    updated_at: now().toISOString(),
  });

  await deps.upsertAccount({
    connector_kind: 'ontario_green_button_cmd',
    source_kind: 'green_button_cmd',
    status: 'active',
    jurisdiction: 'Ontario',
    utility_name: utilityName,
    display_name: displayName,
    account_holder_ref: connectorId,
    last_synced_at: null,
    last_error: null,
    metadata: {
      authorize_callback_state: state,
      ...(params.metadata ?? {}),
      token_expires_at: expiresAt,
      token_scope: tokenPayload.scope ?? null,
    },
  });

  await deps.logRun({
    connector_account_id: connectorAccountId,
    run_type: 'auth',
    status: 'success',
    metadata: { connector_id: connectorId },
  });

  return {
    status: 200,
    body: {
      ok: true,
      connector_account_id: connectorAccountId,
      expires_at: expiresAt,
    },
  };
}

export async function runGreenButtonSync(params: {
  connectorId?: string | null;
  utilityName?: string;
  displayName?: string;
  xmlPayload?: string | null;
  feedUrl?: string | null;
  accessToken?: string | null;
  geographyId?: string | null;
  metadata?: Record<string, unknown>;
  requestHeaders?: Record<string, string>;
}, deps: {
  fetchImpl?: FetchLike;
  now?: () => Date;
  sha256Hex: (input: string) => Promise<string>;
  upsertAccount: (payload: UtilityConnectorAccountUpsertPayload) => Promise<{ id: string } | null | undefined>;
  logRun: (payload: UtilityConnectorRunPayload) => Promise<void>;
  auditPayload: (payload: {
    connectorAccountId: string;
    payloadKind: 'green_button_xml';
    payloadSha256: string;
    rawPayload: string | null;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  insertIntervalHistory: (payload: {
    connectorAccountId: string;
    rows: GreenButtonIntervalHistoryRow[];
  }) => Promise<void>;
  parseGreenButtonXml: (xml: string, geographyId?: string | null) => GreenButtonIntervalHistoryRow[];
}): Promise<RuntimeResponse> {
  const connectorId = String(params.connectorId ?? '').trim();
  const utilityName = String(params.utilityName ?? 'Ontario Green Button Utility');
  const displayName = String(params.displayName ?? utilityName);
  const feedUrl = typeof params.feedUrl === 'string' ? params.feedUrl : null;
  const accessToken = typeof params.accessToken === 'string' ? params.accessToken : null;
  const requestHeaders = params.requestHeaders ?? {};
  const now = deps.now ?? (() => new Date());

  if (!connectorId && !utilityName) {
    return {
      status: 400,
      body: { error: 'connector_account_id or utility_name is required.' },
    };
  }

  const connectorAccount = await deps.upsertAccount({
    connector_kind: 'ontario_green_button_cmd',
    source_kind: 'green_button_cmd',
    status: 'active',
    jurisdiction: 'Ontario',
    utility_name: utilityName,
    display_name: displayName,
    account_holder_ref: connectorId || null,
    metadata: params.metadata ?? {},
  });
  const connectorAccountId = String(connectorAccount?.id ?? '');

  let xml = typeof params.xmlPayload === 'string' ? params.xmlPayload : null;
  if (!xml && feedUrl) {
    if (!accessToken) {
      return {
        status: 400,
        body: { error: 'access_token is required when fetching a remote Green Button feed.' },
      };
    }
    const fetchImpl = deps.fetchImpl ?? fetch;
    const response = await fetchImpl(feedUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, ...requestHeaders },
    });
    xml = await response.text();
    if (!response.ok) {
      const failureStatus = response.status === 401 || response.status === 403 ? 'revoked' : 'failed';
      await deps.upsertAccount({
        connector_kind: 'ontario_green_button_cmd',
        source_kind: 'green_button_cmd',
        status: failureStatus,
        jurisdiction: 'Ontario',
        utility_name: utilityName,
        display_name: displayName,
        account_holder_ref: connectorId || null,
        last_error: `Green Button feed fetch failed: ${response.status}`,
        metadata: {
          ...(params.metadata ?? {}),
          ...(failureStatus === 'revoked' ? { revoked_at: now().toISOString() } : {}),
        },
      });
      await deps.logRun({
        connector_account_id: connectorAccountId,
        run_type: 'sync',
        status: 'failure',
        error_message: `Green Button feed fetch failed: ${response.status}`,
      });
      return {
        status: 400,
        body: { error: `Green Button feed fetch failed: ${response.status}` },
      };
    }
  }

  if (!xml) {
    return {
      status: 400,
      body: { error: 'xml_payload or feed_url is required.' },
    };
  }

  const intervalRows = deps.parseGreenButtonXml(xml, params.geographyId ?? null);
  if (intervalRows.length === 0) {
    return {
      status: 400,
      body: { error: 'No interval readings found in the supplied Green Button XML payload.' },
    };
  }

  const payloadFingerprint = await deps.sha256Hex(xml);
  await deps.auditPayload({
    connectorAccountId,
    payloadKind: 'green_button_xml',
    payloadSha256: payloadFingerprint,
    rawPayload: null,
    metadata: {
      reading_count: intervalRows.length,
    },
  });
  await deps.insertIntervalHistory({
    connectorAccountId,
    rows: intervalRows,
  });

  await deps.upsertAccount({
    connector_kind: 'ontario_green_button_cmd',
    source_kind: 'green_button_cmd',
    status: 'active',
    jurisdiction: 'Ontario',
    utility_name: utilityName,
    display_name: displayName,
    account_holder_ref: connectorId || null,
    last_synced_at: intervalRows.at(-1)?.observed_at ?? now().toISOString(),
    last_error: null,
    metadata: params.metadata ?? {},
  });
  await deps.logRun({
    connector_account_id: connectorAccountId,
    run_type: 'sync',
    status: 'success',
    observed_at: intervalRows.at(-1)?.observed_at ?? null,
    row_count: intervalRows.length,
    warning_count: intervalRows.filter((row) => row.quality_flags.length > 0).length,
  });

  return {
    status: 200,
    body: {
      ok: true,
      connector_account_id: connectorAccountId,
      inserted_rows: intervalRows.length,
    },
  };
}

export async function runGreenButtonRevoke(params: {
  connectorId?: string | null;
  utilityName?: string;
  displayName?: string;
  revocationMode: GreenButtonRevocationMode;
  revokeUrl?: string | null;
  manageConnectionsUrl?: string | null;
  accessToken?: string | null;
  actor?: string | null;
  confirmRevoked?: boolean;
  metadata?: Record<string, unknown>;
  requestHeaders?: Record<string, string>;
}, deps: {
  fetchImpl?: FetchLike;
  now?: () => Date;
  upsertAccount: (payload: UtilityConnectorAccountUpsertPayload) => Promise<{ id: string } | null | undefined>;
  logRun: (payload: UtilityConnectorRunPayload) => Promise<void>;
  deleteTokens: (payload: { connectorAccountId: string }) => Promise<void>;
  resolveAccessToken?: () => Promise<string | null>;
}): Promise<RuntimeResponse> {
  const connectorId = String(params.connectorId ?? '').trim();
  const utilityName = String(params.utilityName ?? 'Ontario Green Button Utility').trim();
  const displayName = String(params.displayName ?? utilityName).trim();
  const revocationMode = params.revocationMode;
  const revokeUrl = nullableString(params.revokeUrl);
  const manageConnectionsUrl = nullableString(params.manageConnectionsUrl);
  const actor = nullableString(params.actor) ?? 'ceip';
  const confirmRevoked = Boolean(params.confirmRevoked);
  const requestHeaders = params.requestHeaders ?? {};
  const now = deps.now ?? (() => new Date());
  const requestedAt = now().toISOString();

  if (revocationMode !== 'api' && revocationMode !== 'portal_redirect') {
    return {
      status: 400,
      body: { error: 'revocation_mode must be api or portal_redirect.' },
    };
  }

  const connectorAccount = await deps.upsertAccount({
    connector_kind: 'ontario_green_button_cmd',
    source_kind: 'green_button_cmd',
    status: 'active',
    jurisdiction: 'Ontario',
    utility_name: utilityName,
    display_name: displayName,
    account_holder_ref: connectorId || null,
    metadata: params.metadata ?? {},
  });
  const connectorAccountId = String(connectorAccount?.id ?? '');

  if (revocationMode === 'portal_redirect') {
    if (!manageConnectionsUrl) {
      return {
        status: 400,
        body: { error: 'manage_connections_url is required for portal-managed revocation.' },
      };
    }

    if (!confirmRevoked) {
      const message = 'Disconnect requested. Complete revocation in the utility portal, then confirm disconnection.';
      await deps.upsertAccount({
        connector_kind: 'ontario_green_button_cmd',
        source_kind: 'green_button_cmd',
        status: 'failed',
        jurisdiction: 'Ontario',
        utility_name: utilityName,
        display_name: displayName,
        account_holder_ref: connectorId || null,
        last_error: message,
        metadata: {
          ...(params.metadata ?? {}),
          revocation_mode: revocationMode,
          manage_connections_url: manageConnectionsUrl,
          revocation_requested_at: requestedAt,
          awaiting_revocation_confirmation: true,
          remote_status: 'portal_redirect_required',
          token_material_purged: false,
          revoked_by: actor,
        },
      });
      await deps.logRun({
        connector_account_id: connectorAccountId,
        run_type: 'revoke',
        status: 'failure',
        error_message: message,
        metadata: {
          revocation_mode: revocationMode,
          manage_connections_url: manageConnectionsUrl,
          actor,
        },
      });
      return {
        status: 202,
        body: {
          ok: false,
          awaiting_confirmation: true,
          connector_account_id: connectorAccountId,
          manage_connections_url: manageConnectionsUrl,
        },
      };
    }

    const completedAt = now().toISOString();
    await deps.deleteTokens({ connectorAccountId });
    await deps.upsertAccount({
      connector_kind: 'ontario_green_button_cmd',
      source_kind: 'green_button_cmd',
      status: 'revoked',
      jurisdiction: 'Ontario',
      utility_name: utilityName,
      display_name: displayName,
      account_holder_ref: connectorId || null,
      last_error: null,
      metadata: {
        ...(params.metadata ?? {}),
        revocation_mode: revocationMode,
        manage_connections_url: manageConnectionsUrl,
        revocation_requested_at: requestedAt,
        revocation_completed_at: completedAt,
        revoked_at: completedAt,
        awaiting_revocation_confirmation: false,
        remote_status: 'confirmed_via_portal',
        token_material_purged: true,
        revoked_by: actor,
      },
    });
    await deps.logRun({
      connector_account_id: connectorAccountId,
      run_type: 'revoke',
      status: 'success',
      metadata: {
        revocation_mode: revocationMode,
        manage_connections_url: manageConnectionsUrl,
        actor,
      },
    });
    return {
      status: 200,
      body: {
        ok: true,
        connector_account_id: connectorAccountId,
        revoked: true,
        revocation_mode: revocationMode,
      },
    };
  }

  if (!revokeUrl) {
    return {
      status: 400,
      body: { error: 'revoke_url is required for API revocation.' },
    };
  }

  const accessToken = nullableString(params.accessToken) ?? await deps.resolveAccessToken?.() ?? null;
  if (!accessToken) {
    return {
      status: 400,
      body: { error: 'No access token is available for API revocation.' },
    };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl(revokeUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...requestHeaders,
    },
  });

  if (!response.ok) {
    const message = `Green Button revoke failed: ${response.status}`;
    await deps.upsertAccount({
      connector_kind: 'ontario_green_button_cmd',
      source_kind: 'green_button_cmd',
      status: 'failed',
      jurisdiction: 'Ontario',
      utility_name: utilityName,
      display_name: displayName,
      account_holder_ref: connectorId || null,
      last_error: message,
      metadata: {
        ...(params.metadata ?? {}),
        revocation_mode: revocationMode,
        revocation_url: revokeUrl,
        revocation_requested_at: requestedAt,
        remote_status: `http_${response.status}`,
        token_material_purged: false,
        revoked_by: actor,
      },
    });
    await deps.logRun({
      connector_account_id: connectorAccountId,
      run_type: 'revoke',
      status: 'failure',
      error_message: message,
      metadata: {
        revocation_mode: revocationMode,
        revocation_url: revokeUrl,
        actor,
      },
    });
    return {
      status: 400,
      body: {
        error: message,
        connector_account_id: connectorAccountId,
      },
    };
  }

  const completedAt = now().toISOString();
  await deps.deleteTokens({ connectorAccountId });
  await deps.upsertAccount({
    connector_kind: 'ontario_green_button_cmd',
    source_kind: 'green_button_cmd',
    status: 'revoked',
    jurisdiction: 'Ontario',
    utility_name: utilityName,
    display_name: displayName,
    account_holder_ref: connectorId || null,
    last_error: null,
    metadata: {
      ...(params.metadata ?? {}),
      revocation_mode: revocationMode,
      revocation_url: revokeUrl,
      revocation_requested_at: requestedAt,
      revocation_completed_at: completedAt,
      revoked_at: completedAt,
      remote_status: `http_${response.status}`,
      token_material_purged: true,
      revoked_by: actor,
    },
  });
  await deps.logRun({
    connector_account_id: connectorAccountId,
    run_type: 'revoke',
    status: 'success',
    metadata: {
      revocation_mode: revocationMode,
      revocation_url: revokeUrl,
      actor,
    },
  });
  return {
    status: 200,
    body: {
      ok: true,
      connector_account_id: connectorAccountId,
      revoked: true,
      revocation_mode: revocationMode,
    },
  };
}

export function validateTelemetryPayload(input: unknown): { snapshot: RuntimeTelemetrySnapshot | null; errors: string[] } {
  const source = input as Record<string, unknown> | null;
  const observedAt = toIsoTimestamp(source?.observed_at);
  const jurisdiction = normalizeJurisdiction(source?.jurisdiction);
  const geographyLevel = normalizeGeographyLevel(source?.geography_level);
  const geographyId = String(source?.geography_id ?? '').trim();
  const qualityFlags = normalizeQualityFlags(source?.quality_flags);

  const errors: string[] = [];
  if (!observedAt) errors.push('Invalid observed_at timestamp.');
  if (!jurisdiction) errors.push('Jurisdiction must be Ontario or Alberta.');
  if (!geographyLevel) errors.push('geography_level must be system, substation, or feeder.');
  if (!geographyId) errors.push('geography_id is required.');
  if (qualityFlags === null) errors.push('quality_flags must be an array of strings.');

  if (errors.length > 0) {
    return {
      snapshot: null,
      errors,
    };
  }

  return {
    snapshot: {
      observed_at: observedAt!,
      jurisdiction: jurisdiction!,
      geography_level: geographyLevel!,
      geography_id: geographyId,
      feeder_id: nullableString(source?.feeder_id),
      substation_id: nullableString(source?.substation_id),
      load_mw: nullableNumber(source?.load_mw),
      voltage_kv: nullableNumber(source?.voltage_kv),
      transformer_utilization_pct: nullableNumber(source?.transformer_utilization_pct),
      outage_state: normalizeOutageState(source?.outage_state),
      quality_flags: qualityFlags!,
      source: String(source?.source ?? 'Telemetry gateway'),
    },
    errors: [],
  };
}

export async function runTelemetryIngest(params: {
  body: unknown;
  dryRun?: boolean;
  utilityName?: string;
  displayName?: string;
  accountHolderRef?: string | null;
  metadata?: Record<string, unknown>;
}, deps: {
  sha256Hex: (input: string) => Promise<string>;
  upsertAccount: (payload: UtilityConnectorAccountUpsertPayload) => Promise<{ id: string } | null | undefined>;
  auditPayload: (payload: {
    connectorAccountId: string;
    payloadKind: 'telemetry_json';
    payloadSha256: string;
    rawPayload: string | null;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  insertTelemetrySnapshot: (payload: {
    connectorAccountId: string;
    snapshot: RuntimeTelemetrySnapshot;
  }) => Promise<void>;
  logRun: (payload: UtilityConnectorRunPayload) => Promise<void>;
}): Promise<RuntimeResponse> {
  const parsed = validateTelemetryPayload(params.body);
  if (!parsed.snapshot) {
    return {
      status: 400,
      body: { error: 'Invalid telemetry payload.', details: parsed.errors },
    };
  }

  if (params.dryRun) {
    return {
      status: 200,
      body: {
        ok: true,
        dry_run: true,
        observed_at: parsed.snapshot.observed_at,
        geography_id: parsed.snapshot.geography_id,
        jurisdiction: parsed.snapshot.jurisdiction,
        geography_level: parsed.snapshot.geography_level,
      },
    };
  }

  const utilityName = String(params.utilityName ?? 'Telemetry gateway').trim();
  const displayName = String(params.displayName ?? `${utilityName} HTTP gateway`).trim();
  const connectorAccount = await deps.upsertAccount({
    connector_kind: 'telemetry_gateway_http',
    source_kind: 'telemetry_gateway',
    status: 'active',
    jurisdiction: parsed.snapshot.jurisdiction,
    utility_name: utilityName,
    display_name: displayName,
    account_holder_ref: params.accountHolderRef ?? null,
    last_synced_at: parsed.snapshot.observed_at,
    metadata: params.metadata ?? {},
  });
  const connectorAccountId = String(connectorAccount?.id ?? '');

  const payloadFingerprint = await deps.sha256Hex(JSON.stringify(parsed.snapshot));
  await deps.auditPayload({
    connectorAccountId,
    payloadKind: 'telemetry_json',
    payloadSha256: payloadFingerprint,
    rawPayload: null,
    metadata: {
      geography_id: parsed.snapshot.geography_id,
    },
  });
  await deps.insertTelemetrySnapshot({
    connectorAccountId,
    snapshot: parsed.snapshot,
  });
  await deps.logRun({
    connector_account_id: connectorAccountId,
    run_type: 'telemetry_ingest',
    status: 'success',
    observed_at: parsed.snapshot.observed_at,
    row_count: 1,
    warning_count: parsed.snapshot.quality_flags.length,
    metadata: {
      geography_id: parsed.snapshot.geography_id,
      source: parsed.snapshot.source,
    },
  });

  return {
    status: 200,
    body: {
      ok: true,
      connector_account_id: connectorAccountId,
      observed_at: parsed.snapshot.observed_at,
    },
  };
}

function parseJsonRecord(input: string): Record<string, any> | null {
  if (!input) return null;
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : null;
  } catch {
    return null;
  }
}

function deriveGreenButtonFailureStatus(errorCode: unknown, httpStatus: number): 'revoked' | 'failed' {
  const normalized = String(errorCode ?? '').toLowerCase();
  if (
    httpStatus === 401
    || httpStatus === 403
    || normalized.includes('access_denied')
    || normalized.includes('invalid_token')
    || normalized.includes('revoked')
  ) {
    return 'revoked';
  }
  return 'failed';
}

function readErrorMessage(payload: Record<string, any> | null): string | null {
  const message = payload?.error_description ?? payload?.error ?? null;
  return message ? String(message) : null;
}

function normalizeJurisdiction(value: unknown): 'Ontario' | 'Alberta' | null {
  return value === 'Ontario' || value === 'Alberta' ? value : null;
}

function normalizeGeographyLevel(value: unknown): 'system' | 'substation' | 'feeder' | null {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'system' || normalized === 'substation' || normalized === 'feeder') {
    return normalized;
  }
  return null;
}

function normalizeOutageState(value: unknown): 'normal' | 'watch' | 'outage' | 'restoration' | null {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'normal' || normalized === 'watch' || normalized === 'outage' || normalized === 'restoration') {
    return normalized;
  }
  return null;
}

function normalizeQualityFlags(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  return value.map((entry) => String(entry));
}

function toIsoTimestamp(value: unknown): string | null {
  const parsed = new Date(String(value ?? ''));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableString(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}
