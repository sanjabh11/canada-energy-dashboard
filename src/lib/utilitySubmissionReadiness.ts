import {
  buildOntarioUtilityOnboardingPacks,
  type OntarioUtilityOnboardingPack,
} from './utilityConnectorOnboarding';

export interface UtilitySubmissionFieldMapping {
  label: string;
  value: string;
  source: 'repo_backed' | 'owner_supplied';
  note?: string;
}

export interface UtilitySubmissionPacket {
  utility_name: 'London Hydro' | 'Alectra Utilities';
  slug: 'london-hydro' | 'alectra-utilities';
  phase: 'primary' | 'reserve';
  target_outcome: string;
  submission_status: 'ready' | 'do_not_submit_yet';
  status_reason: string;
  supported_claims: string[];
  blocked_claims: string[];
  owner_supplied_items: string[];
  field_mappings: UtilitySubmissionFieldMapping[];
  evidence_bundle: string[];
}

export interface SubmissionGateItem {
  label: string;
  owner: 'repo' | 'operator';
  status: 'ready' | 'misconfigured' | 'operator_supplied';
  evidence: string;
  blocking: boolean;
}

export interface SubmissionReadinessTrack {
  label: 'Staging internet readiness' | 'Production submission readiness';
  status: 'ready' | 'in_progress' | 'blocked';
  summary: string;
  blockers: string[];
}

export interface OntarioSubmissionSprintBundle {
  packets: UtilitySubmissionPacket[];
  submission_gate: SubmissionGateItem[];
  readiness_tracks: SubmissionReadinessTrack[];
  demo_evidence_pack: string[];
  claim_guardrails: string[];
  canonical_app_url: string;
  utility_connector_base_url: string;
  current_origin: string | null;
  utility_security_statement_url: string;
  privacy_policy_url: string;
  terms_of_service_url: string;
  warnings: string[];
  has_blocking_repo_misconfiguration: boolean;
}

function normalizeBaseUrl(baseUrl?: string | null, fallback?: string): string {
  const normalized = String(baseUrl ?? '').trim().replace(/\/$/, '');
  if (normalized.length > 0) {
    return normalized;
  }

  return String(fallback ?? 'https://<set-VITE_PUBLIC_APP_URL>').replace(/\/$/, '');
}

function normalizeOptionalUrl(baseUrl?: string | null): string {
  return String(baseUrl ?? '').trim().replace(/\/$/, '');
}

function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function isLocalHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  } catch {
    return false;
  }
}

function isSharedDefaultHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith('.netlify.app')
      || hostname.endsWith('.supabase.co')
      || hostname.endsWith('.vercel.app')
      || hostname.endsWith('.pages.dev');
  } catch {
    return false;
  }
}

function isStagingHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes('staging');
  } catch {
    return false;
  }
}

function hasConfiguredSupabaseUrl(supabaseUrl?: string | null): boolean {
  return normalizeOptionalUrl(supabaseUrl).length > 0;
}

function buildFieldMappings(
  pack: OntarioUtilityOnboardingPack,
  utilitySecurityUrl: string,
  privacyUrl: string,
  termsUrl: string,
): UtilitySubmissionFieldMapping[] {
  return [
    {
      label: 'Application / portal login page URL',
      value: pack.login_url,
      source: 'repo_backed',
    },
    {
      label: 'OAuth redirect URL',
      value: pack.redirect_uri,
      source: 'repo_backed',
    },
    {
      label: 'Connectivity bridge callback forwarding target',
      value: pack.callback_forward_target,
      source: 'repo_backed',
      note: 'Internal evidence only. This is not submitted as a customer-facing marketplace field.',
    },
    {
      label: 'Requested data-sharing categories',
      value: pack.registration_form_categories.join(', '),
      source: 'repo_backed',
      note: 'Default to Usage Information only unless the utility review explicitly requires more.',
    },
    {
      label: 'Revocation behavior summary',
      value: pack.revocation_behavior,
      source: 'repo_backed',
    },
    {
      label: 'Privacy policy URL',
      value: privacyUrl,
      source: 'repo_backed',
    },
    {
      label: 'Terms of service URL',
      value: termsUrl,
      source: 'repo_backed',
    },
    {
      label: 'Utility security statement URL',
      value: utilitySecurityUrl,
      source: 'repo_backed',
    },
    {
      label: 'Testing-environment note',
      value: 'Green Button Alliance sandbox is unavailable; CEIP uses a local runtime validation pack, signer-backed bridge provenance, and utility-specific testing coordination.',
      source: 'repo_backed',
    },
    {
      label: 'Legal company name',
      value: 'Owner-supplied',
      source: 'owner_supplied',
      note: 'Must match the incorporated legal entity that will sign the utility agreement and appear on future certificate orders.',
    },
    {
      label: 'Application name / provider display name',
      value: 'Owner-supplied',
      source: 'owner_supplied',
      note: 'Use the same name in the registration form, demo script, and legal documents.',
    },
    {
      label: 'Application description / marketplace copy',
      value: 'Owner-supplied',
      source: 'owner_supplied',
      note: 'Keep the customer-facing description consistent with the forecasting workflow and approved claims only.',
    },
    {
      label: 'Application logo or icon file',
      value: 'Owner-supplied',
      source: 'owner_supplied',
      note: 'Provide the exact asset required by the London Hydro or Alectra registration workflow.',
    },
    {
      label: 'Signer with authority to bind the company',
      value: 'Owner-supplied',
      source: 'owner_supplied',
    },
    {
      label: 'Business contact pack',
      value: 'Owner-supplied',
      source: 'owner_supplied',
      note: 'Finalize the business email, phone number, and address that will be reused for utility onboarding and certificate validation.',
    },
    {
      label: 'Terms acceptance prerequisites',
      value: 'Owner-supplied',
      source: 'owner_supplied',
      note: 'Confirm the legal entity, signer, public policy links, and custom-domain surfaces are final before accepting utility terms.',
    },
  ];
}

function buildPacket(
  pack: OntarioUtilityOnboardingPack,
  utilitySecurityUrl: string,
  privacyUrl: string,
  termsUrl: string,
  blockingReasons: string[],
): UtilitySubmissionPacket {
  const sharedSupportedClaims = [
    'Customer-authorized utility demand forecasting workflow is live at the stated login URL.',
    'Green Button callback, sync, disconnect, and token-purge paths are runtime-validated locally.',
    'The application requests Usage Information only by default for the utility forecasting workflow.',
    'The route stops showing a connector as live as soon as disconnect or revocation is initiated.',
  ];

  const sharedBlockedClaims = [
    'Ontario-wide certification or blanket approval across all LDCs.',
    'Official Green Button Alliance sandbox certification for this application.',
    'Formal SOC 2, NERC, or other third-party compliance certification unless separately completed.',
    'Universal live interoperability with every Ontario utility.',
  ];

  if (pack.utility_name === 'London Hydro') {
    return {
      utility_name: 'London Hydro',
      slug: 'london-hydro',
      phase: 'primary',
      target_outcome: 'Hold London Hydro submission until the custom bridge host, signer-backed provenance path, supported CA path, and certificate plan are ready, then use the bridge-backed packet for URL review and the live authorization-plus-revocation demo.',
      submission_status: blockingReasons.length > 0 ? 'do_not_submit_yet' : 'ready',
      status_reason: blockingReasons.length > 0
        ? blockingReasons.join(' ')
        : 'Repo-backed requirements are aligned; operator-supplied legal and brand fields can now be filled for submission.',
      supported_claims: [
        ...sharedSupportedClaims,
        'The runtime demo is explicitly aligned to London Hydro’s published authorization-and-revocation review process.',
      ],
      blocked_claims: sharedBlockedClaims,
      owner_supplied_items: [
        'Ontario corporation formed and legal company name locked',
        'Business email, phone, address, and application provider name',
        'Application logo / icon file',
        'Authorized signer confirmation',
        'Final customer-facing application description for the London Hydro marketplace',
        'Parent domain registered to the final name / brand',
        'Bridge VPS provisioned with a stable public IPv4 address',
        'London Hydro supported Certificate Authority list requested / confirmed',
        'Certificate issuance path chosen from the supported CA list',
        'Outbound TLS mode confirmed as server_tls or mtls_upstream',
      ],
      field_mappings: buildFieldMappings(pack, utilitySecurityUrl, privacyUrl, termsUrl),
      evidence_bundle: [
        'Local browser demo script: authorize -> sync -> disconnect -> revoke confirmed',
        'Runtime validation runbook covering mocked callback, sync, and revoke paths',
        'Latest build and revocation test output archive',
        'Public privacy policy, terms of service, and utility security statement links',
        'Connectivity bridge contract: GET /cmd/callback, POST /cmd/token, GET /cmd/feed, POST /cmd/revoke',
        'Connectivity evidence layers: callback reachability, signer-verified bridge contract, and TLS evidence',
      ],
    };
  }

  return {
    utility_name: 'Alectra Utilities',
    slug: 'alectra-utilities',
    phase: 'reserve',
    target_outcome: 'Keep the Alectra reserve packet prepared in parallel, but do not move it ahead of the London Hydro signer-backed review cycle.',
    submission_status: blockingReasons.length > 0 ? 'do_not_submit_yet' : 'ready',
    status_reason: blockingReasons.length > 0
      ? blockingReasons.join(' ')
      : 'Reserve packet is technically aligned; keep it secondary unless the operator explicitly starts a parallel legal/compliance track.',
    supported_claims: [
      ...sharedSupportedClaims,
      'The CEIP disconnect flow supports portal-managed revocation patterns that match Alectra’s customer manage-connections model.',
    ],
    blocked_claims: sharedBlockedClaims,
    owner_supplied_items: [
      'Ontario corporation formed and legal company name locked',
      'Business email, phone, address, and application provider name',
      'Application logo / icon file',
      'Authorized signer confirmation',
      'Alectra-facing legal / privacy representation sign-off',
    ],
    field_mappings: buildFieldMappings(pack, utilitySecurityUrl, privacyUrl, termsUrl),
    evidence_bundle: [
      'Alectra-specific registration/onboarding URL mapping',
      'Portal-managed disconnect demo steps and token-purge evidence',
      'Public privacy policy, terms of service, and utility security statement links',
      'Runtime validation runbook for mocked callback, sync, and revoked follow-up states',
    ],
  };
}

export function buildOntarioSubmissionSprintBundle(params: {
  canonicalAppUrl?: string | null;
  bridgeBaseUrl?: string | null;
  currentOrigin?: string | null;
  supabaseUrl?: string | null;
}): OntarioSubmissionSprintBundle {
  const canonicalAppUrl = normalizeOptionalUrl(params.canonicalAppUrl);
  const bridgeBaseUrl = normalizeOptionalUrl(params.bridgeBaseUrl);
  const currentOrigin = normalizeOptionalUrl(params.currentOrigin) || null;
  const hasCanonicalAppUrl = canonicalAppUrl.length > 0;
  const hasBridgeBaseUrl = bridgeBaseUrl.length > 0;
  const canonicalIsHttps = hasCanonicalAppUrl && isHttpsUrl(canonicalAppUrl);
  const bridgeIsHttps = hasBridgeBaseUrl && isHttpsUrl(bridgeBaseUrl);
  const canonicalIsLocal = hasCanonicalAppUrl && isLocalHost(canonicalAppUrl);
  const bridgeIsLocal = hasBridgeBaseUrl && isLocalHost(bridgeBaseUrl);
  const canonicalIsSharedDefault = hasCanonicalAppUrl && isSharedDefaultHost(canonicalAppUrl);
  const bridgeIsSharedDefault = hasBridgeBaseUrl && isSharedDefaultHost(bridgeBaseUrl);
  const canonicalLooksStaging = hasCanonicalAppUrl && isStagingHost(canonicalAppUrl);
  const bridgeLooksStaging = hasBridgeBaseUrl && isStagingHost(bridgeBaseUrl);
  const currentOriginMatchesCanonical = currentOrigin !== null && canonicalAppUrl.length > 0
    ? currentOrigin === canonicalAppUrl
    : false;
  const appBaseUrl = hasCanonicalAppUrl
    ? normalizeBaseUrl(canonicalAppUrl)
    : 'https://<set-VITE_PUBLIC_APP_URL>';
  const connectorBaseUrl = hasBridgeBaseUrl
    ? normalizeBaseUrl(bridgeBaseUrl)
    : 'https://<set-VITE_UTILITY_CONNECTOR_BASE_URL>';
  const hasSupabaseUrl = hasConfiguredSupabaseUrl(params.supabaseUrl);
  const utilitySecurityStatementUrl = `${appBaseUrl}/utility-security`;
  const privacyPolicyUrl = `${appBaseUrl}/privacy`;
  const termsOfServiceUrl = `${appBaseUrl}/terms`;
  const onboardingPacks = buildOntarioUtilityOnboardingPacks({
    publicAppUrl: canonicalAppUrl,
    utilityConnectorBaseUrl: bridgeBaseUrl,
    supabaseUrl: params.supabaseUrl,
  });
  const warnings: string[] = [];

  if (!hasCanonicalAppUrl) {
    warnings.push('Canonical production URL is not configured. Set VITE_PUBLIC_APP_URL before generating external submission packets.');
  } else {
    if (!canonicalIsHttps) {
      warnings.push('Canonical production URL must use HTTPS before London Hydro submission.');
    }
    if (canonicalIsLocal) {
      warnings.push('Canonical production URL cannot point to localhost or another local-only host.');
    }
    if (canonicalIsSharedDefault) {
      warnings.push('Canonical production URL cannot use a shared default host such as *.netlify.app or *.supabase.co for London Hydro submission.');
    }
    if (currentOrigin !== null && !currentOriginMatchesCanonical) {
      warnings.push(`Current origin ${currentOrigin} does not match the canonical production URL ${canonicalAppUrl}. Do not submit packets from this environment.`);
    }
  }

  if (!hasBridgeBaseUrl) {
    warnings.push('Utility connector bridge URL is not configured. Set VITE_UTILITY_CONNECTOR_BASE_URL before generating the London Hydro callback surface.');
  } else {
    if (!bridgeIsHttps) {
      warnings.push('Utility connector bridge URL must use HTTPS before London Hydro submission.');
    }
    if (bridgeIsLocal) {
      warnings.push('Utility connector bridge URL cannot point to localhost or another local-only host.');
    }
    if (bridgeIsSharedDefault) {
      warnings.push('Utility connector bridge URL cannot use a shared default host such as *.netlify.app or *.supabase.co.');
    }
  }

  if (canonicalLooksStaging || bridgeLooksStaging) {
    warnings.push('Configured hosts appear to be burner staging hosts. Keep this deployment on the staging fast path and do not generate the London Hydro production packet from it.');
  }

  if (!hasSupabaseUrl) {
    warnings.push('Supabase project URL is missing. The signer-backed callback forwarding target cannot be treated as production-ready until VITE_SUPABASE_URL is configured.');
  }

  const blockingReasons = warnings.length > 0
    ? warnings
    : ['Operator-supplied entity formation, signer, custom domain, and submission copy must still be completed before external submission.'];

  const submissionGate: SubmissionGateItem[] = [
    {
      label: 'Custom frontend host configured and live',
      owner: 'repo',
      status: hasCanonicalAppUrl && canonicalIsHttps && !canonicalIsLocal && !canonicalIsSharedDefault ? 'ready' : 'misconfigured',
      evidence: hasCanonicalAppUrl
        ? `${appBaseUrl}/utility-demand-forecast`
        : 'Set VITE_PUBLIC_APP_URL to the canonical deployed frontend host.',
      blocking: !(hasCanonicalAppUrl && canonicalIsHttps && !canonicalIsLocal && !canonicalIsSharedDefault),
    },
    {
      label: 'Current browser origin matches configured app URL',
      owner: 'repo',
      status: currentOrigin !== null && currentOriginMatchesCanonical ? 'ready' : 'misconfigured',
      evidence: currentOrigin !== null
        ? `Current origin ${currentOrigin}${hasCanonicalAppUrl ? ` vs canonical ${canonicalAppUrl || '<unset>'}` : ' with no canonical URL configured'}`
        : 'Current origin unavailable outside the browser runtime.',
      blocking: !(currentOrigin !== null && currentOriginMatchesCanonical),
    },
    {
      label: 'Custom Green Button bridge host configured and live',
      owner: 'repo',
      status: hasBridgeBaseUrl && bridgeIsHttps && !bridgeIsLocal && !bridgeIsSharedDefault ? 'ready' : 'misconfigured',
      evidence: hasBridgeBaseUrl
        ? connectorBaseUrl
        : 'Set VITE_UTILITY_CONNECTOR_BASE_URL to the custom HTTPS bridge host.',
      blocking: !(hasBridgeBaseUrl && bridgeIsHttps && !bridgeIsLocal && !bridgeIsSharedDefault),
    },
    {
      label: 'Configured hosts are canonical production submission hosts',
      owner: 'repo',
      status: hasCanonicalAppUrl && hasBridgeBaseUrl && !canonicalLooksStaging && !bridgeLooksStaging ? 'ready' : 'misconfigured',
      evidence: hasCanonicalAppUrl && hasBridgeBaseUrl
        ? `${canonicalAppUrl || '<unset>'} | ${bridgeBaseUrl || '<unset>'}`
        : 'Set both VITE_PUBLIC_APP_URL and VITE_UTILITY_CONNECTOR_BASE_URL before checking whether this deployment is staging-only or production-grade.',
      blocking: !(hasCanonicalAppUrl && hasBridgeBaseUrl && !canonicalLooksStaging && !bridgeLooksStaging),
    },
    {
      label: 'Bridge callback URI is fixed on the custom host',
      owner: 'repo',
      status: hasBridgeBaseUrl && bridgeIsHttps && !bridgeIsLocal && !bridgeIsSharedDefault ? 'ready' : 'misconfigured',
      evidence: onboardingPacks[0]?.redirect_uri ?? 'Missing callback URI',
      blocking: !(hasBridgeBaseUrl && bridgeIsHttps && !bridgeIsLocal && !bridgeIsSharedDefault),
    },
    {
      label: 'Supabase callback forward target is configured for the bridge',
      owner: 'repo',
      status: hasSupabaseUrl ? 'ready' : 'misconfigured',
      evidence: onboardingPacks[0]?.callback_forward_target ?? 'Missing callback forward target',
      blocking: !hasSupabaseUrl,
    },
    {
      label: 'Signer-backed provenance is required for London Hydro bridge mode',
      owner: 'repo',
      status: hasBridgeBaseUrl && hasSupabaseUrl ? 'ready' : 'misconfigured',
      evidence: hasBridgeBaseUrl && hasSupabaseUrl
        ? 'Callback and token/feed/revoke routes are expected to use signed bridge provenance instead of a raw shared-secret boundary.'
        : 'Configure the bridge host and Supabase callback target before relying on signer-backed provenance.',
      blocking: !(hasBridgeBaseUrl && hasSupabaseUrl),
    },
    {
      label: 'Public privacy policy',
      owner: 'repo',
      status: hasCanonicalAppUrl && canonicalIsHttps && !canonicalIsLocal && !canonicalIsSharedDefault ? 'ready' : 'misconfigured',
      evidence: privacyPolicyUrl,
      blocking: !(hasCanonicalAppUrl && canonicalIsHttps && !canonicalIsLocal && !canonicalIsSharedDefault),
    },
    {
      label: 'Public terms of service',
      owner: 'repo',
      status: hasCanonicalAppUrl && canonicalIsHttps && !canonicalIsLocal && !canonicalIsSharedDefault ? 'ready' : 'misconfigured',
      evidence: termsOfServiceUrl,
      blocking: !(hasCanonicalAppUrl && canonicalIsHttps && !canonicalIsLocal && !canonicalIsSharedDefault),
    },
    {
      label: 'Public utility security statement',
      owner: 'repo',
      status: hasCanonicalAppUrl && canonicalIsHttps && !canonicalIsLocal && !canonicalIsSharedDefault ? 'ready' : 'misconfigured',
      evidence: utilitySecurityStatementUrl,
      blocking: !(hasCanonicalAppUrl && canonicalIsHttps && !canonicalIsLocal && !canonicalIsSharedDefault),
    },
    {
      label: 'Usage Information-only data request',
      owner: 'repo',
      status: onboardingPacks.every((pack) => pack.requested_data_categories.length === 1 && pack.requested_data_categories[0] === 'Usage Information')
        ? 'ready'
        : 'misconfigured',
      evidence: onboardingPacks.map((pack) => `${pack.utility_name}: ${pack.requested_data_categories.join(', ')}`).join(' | '),
      blocking: !onboardingPacks.every((pack) => pack.requested_data_categories.length === 1 && pack.requested_data_categories[0] === 'Usage Information'),
    },
    {
      label: 'Authorization + revocation demo rehearsed locally',
      owner: 'repo',
      status: 'ready',
      evidence: 'Covered by the runtime validation harness and browser proof pass.',
      blocking: false,
    },
    {
      label: 'Burner staging domain registered and routed',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner should register a disposable staging domain now and point app-staging.<burner-domain> to Netlify plus gb-staging.<burner-domain> to the VPS bridge.',
      blocking: true,
    },
    {
      label: 'Staging app host live on Netlify',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner should deploy the burner staging frontend host before relying on public browser-demo rehearsal outside localhost.',
      blocking: true,
    },
    {
      label: 'Staging bridge host live on the VPS with a DV certificate',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner should stand up the burner staging bridge with a disposable DV certificate such as Let’s Encrypt before corporate-domain cutover.',
      blocking: true,
    },
    {
      label: 'Staging Layer A callback reachability evidence exists',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner should prove GET /cmd/callback reaches the Supabase callback path on the burner staging bridge host.',
      blocking: true,
    },
    {
      label: 'Staging Layer B private bridge contract evidence exists',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner should prove signed token/feed/revoke bridge routes work against mock upstreams on the burner staging bridge host.',
      blocking: true,
    },
    {
      label: 'Ontario corporation formed and legal company name locked',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must complete Ontario incorporation and use the same legal company name across the packet, domain registration, and public legal surfaces.',
      blocking: true,
    },
    {
      label: 'Authorized signer and business contact pack finalized',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must finalize signer name/title plus verifiable business email, phone number, and address for certificate validation and utility agreements.',
      blocking: true,
    },
    {
      label: 'Parent domain registered to the final name / brand',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must register the canonical corporate domain before final packet generation and bind app.<domain> to Netlify and gb.<domain> to the VPS.',
      blocking: true,
    },
    {
      label: 'Bridge VPS provisioned with a stable public IPv4 address',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must provision the bridge VPS and reserve a stable public IPv4 address for gb.<domain> before collecting connectivity evidence.',
      blocking: true,
    },
    {
      label: 'London Hydro supported CA list requested',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must request the supported Certificate Authority list and connectivity-test instructions from gb@londonhydro.com.',
      blocking: true,
    },
    {
      label: 'Certificate issuance path chosen from the supported CA list',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must confirm the certificate chain that will be installed on the London Hydro bridge host after the supported CA list is received.',
      blocking: true,
    },
    {
      label: 'Outbound TLS mode confirmed (server_tls or mtls_upstream)',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must archive London Hydro guidance confirming whether upstream token/feed/revoke uses ordinary server-auth TLS or outbound client-certificate presentation.',
      blocking: true,
    },
    {
      label: 'Public callback reachability evidence exists',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must prove GET /cmd/callback on the custom bridge host reaches the Supabase callback forward target over standard HTTPS.',
      blocking: true,
    },
    {
      label: 'Private bridge contract evidence exists',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must prove POST /cmd/token, GET /cmd/feed, and POST /cmd/revoke verify signed bridge provenance and forward correctly against mock upstreams first.',
      blocking: true,
    },
    {
      label: 'Utility-facing TLS evidence exists',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must capture openssl s_client evidence for gb.<domain> and, if mtls_upstream is required, a separate outbound mTLS dry run against a mock upstream.',
      blocking: true,
    },
    {
      label: 'Legal company identity and signer authority',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must provide the final legal entity name and signer for submission.',
      blocking: true,
    },
    {
      label: 'Application logo / icon file for registration',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner-supplied asset required by the London Hydro and Alectra onboarding forms.',
      blocking: true,
    },
    {
      label: 'Final application description / marketplace copy',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must supply the final submission description so the packet matches the legal entity and approved product positioning.',
      blocking: true,
    },
    {
      label: 'Demo video recorded on the production hosts',
      owner: 'operator',
      status: 'operator_supplied',
      evidence: 'Owner must record the authorize -> sync -> disconnect -> revoked demo on the final app and bridge hosts.',
      blocking: true,
    },
  ];

  const hasBlockingRepoMisconfiguration = submissionGate.some((item) => item.owner === 'repo' && item.blocking);
  const stagingReady = hasCanonicalAppUrl
    && hasBridgeBaseUrl
    && canonicalIsHttps
    && bridgeIsHttps
    && !canonicalIsLocal
    && !bridgeIsLocal
    && !canonicalIsSharedDefault
    && !bridgeIsSharedDefault
    && currentOrigin !== null
    && currentOriginMatchesCanonical
    && hasSupabaseUrl;
  const stagingTrackDetected = canonicalLooksStaging || bridgeLooksStaging;
  const stagingTrackStatus: SubmissionReadinessTrack['status'] = stagingTrackDetected
    ? (stagingReady ? 'ready' : 'in_progress')
    : 'blocked';
  const readinessTracks: SubmissionReadinessTrack[] = [
    {
      label: 'Staging internet readiness',
      status: stagingTrackStatus,
      summary: stagingTrackDetected
        ? (stagingReady
          ? 'Burner staging hosts are configured on the public internet. Use this deployment for Caddy/signer rehearsal, callback checks, and optional UtilityAPI-backed demos only.'
          : 'Burner staging hosts are being wired in, but the public app host, bridge host, current-origin match, or Supabase callback target is still incomplete.')
        : 'Burner staging hosts are not configured yet. Register the disposable staging domain and deploy app-staging plus gb-staging before leaving localhost-only validation.',
      blockers: stagingTrackDetected
        ? (stagingReady ? [
          'Attach Layer A callback reachability evidence on the burner staging bridge host.',
          'Attach Layer B signer-verified contract evidence on the burner staging bridge host.',
          'Keep UtilityAPI on a follow-on adapter sprint until provider-specific token, sync, and revoke handling is implemented.',
          'Keep the burner staging domain out of London Hydro packet-facing surfaces and production legal pages.',
        ] : [
          'Finish configuring the burner staging app and bridge hosts with HTTPS and a matching browser origin.',
          'Set VITE_PUBLIC_APP_URL, VITE_UTILITY_CONNECTOR_BASE_URL, and VITE_SUPABASE_URL on the staging deployment.',
        ])
        : [
          'Register a disposable staging domain under the individual owner.',
          'Deploy app-staging.<burner-domain> on Netlify and gb-staging.<burner-domain> on the VPS bridge.',
        ],
    },
    {
      label: 'Production submission readiness',
      status: 'blocked',
      summary: 'London Hydro submission remains blocked until the Ontario corporation, canonical corporate domain, supported-CA certificate path, and Layer A/B/C evidence exist on the final hosts.',
      blockers: [
        'Do not generate the London Hydro packet from burner staging hosts.',
        'Wait for Ontario incorporation, signer authority, and the canonical corporate domain.',
        'Archive London Hydro CA guidance, choose the supported certificate path, and confirm server_tls vs mtls_upstream in writing.',
      ],
    },
  ];

  return {
    packets: onboardingPacks.map((pack) =>
      buildPacket(pack, utilitySecurityStatementUrl, privacyPolicyUrl, termsOfServiceUrl, blockingReasons),
    ),
    submission_gate: submissionGate,
    readiness_tracks: readinessTracks,
    demo_evidence_pack: [
      'Record a browser demo of the Ontario Green Button starter path showing authorize -> sync -> disconnect -> revoke confirmed.',
      'Capture screenshots of the visible Disconnect Utility control and the final revoked state with token-purge evidence.',
      'Archive build output and revocation-path test results with timestamps before submission.',
      'Keep the runtime validation runbook ready to share during utility technical review.',
      'Keep the burner staging domain isolated to staging rehearsals until the corporation owns the canonical production domain.',
      'Archive the incorporation record, legal company name, and signer details that will appear on the utility agreement and certificate order.',
      'Explain that GBA sandbox certification is unavailable and that utility-specific testing coordination is required.',
      'Use the operator evidence scripts to capture staging Layer A/B transcripts before attempting any provider-specific rehearsal.',
      'Attach Layer A callback reachability evidence from the custom bridge host.',
      'Attach Layer B signer-verified bridge contract evidence for token, feed, and revoke.',
      'Attach Layer C TLS evidence from openssl s_client and, if required, a mock upstream mTLS dry run.',
      'Keep the Caddy plus signer bridge contract ready to show the callback, token, feed, and revoke paths on the custom bridge host.',
    ],
    claim_guardrails: [
      'Use only claims supported by repo behavior and official utility documentation.',
      'Position London Hydro approval as operational credibility, not Ontario-wide certification.',
      'Request Usage Information only unless the utility review explicitly requires broader categories.',
      'Do not claim formal SOC 2, NERC, or other certification unless separately completed.',
      'Do not treat the signer-backed bridge as evidence of NERC CIP applicability or certification on its own.',
      'Do not use UtilityAPI as proof of London Hydro or Alectra compatibility.',
      'Do not treat UtilityAPI as a drop-in env swap for the current Green Button runtime.',
      'Do not let burner staging hosts, localhost hosts, or shared default hosts leak into production packet-facing surfaces.',
    ],
    canonical_app_url: canonicalAppUrl,
    utility_connector_base_url: bridgeBaseUrl,
    current_origin: currentOrigin,
    utility_security_statement_url: utilitySecurityStatementUrl,
    privacy_policy_url: privacyPolicyUrl,
    terms_of_service_url: termsOfServiceUrl,
    warnings,
    has_blocking_repo_misconfiguration: hasBlockingRepoMisconfiguration,
  };
}

export function renderSubmissionPacketMarkdown(packet: UtilitySubmissionPacket): string {
  const fields = packet.field_mappings
    .map((field) => `- **${field.label}:** ${field.value}${field.note ? `\n  Note: ${field.note}` : ''}`)
    .join('\n');
  const supportedClaims = packet.supported_claims.map((claim) => `- ${claim}`).join('\n');
  const blockedClaims = packet.blocked_claims.map((claim) => `- ${claim}`).join('\n');
  const ownerItems = packet.owner_supplied_items.map((item) => `- ${item}`).join('\n');
  const evidence = packet.evidence_bundle.map((item) => `- ${item}`).join('\n');

  return `# ${packet.utility_name} Submission Packet

**Phase:** ${packet.phase}

## Target Outcome
${packet.target_outcome}

## Registration Field Mapping
${fields}

## Supported Claims
${supportedClaims}

## Claims To Avoid
${blockedClaims}

## Owner-Supplied Items
${ownerItems}

## Evidence Bundle
${evidence}
`;
}

export function renderDemoEvidenceMarkdown(bundle: OntarioSubmissionSprintBundle): string {
  const readinessTracks = bundle.readiness_tracks
    .map((track) => `- **${track.label} (${track.status.replace(/_/g, ' ')})**: ${track.summary}${track.blockers.length > 0 ? `\n  Blockers: ${track.blockers.join(' | ')}` : ''}`)
    .join('\n');
  const checklist = bundle.submission_gate
    .map((item) => `- [${item.status === 'ready' ? 'x' : ' '}] ${item.label} (${item.owner}/${item.status}) — ${item.evidence}`)
    .join('\n');
  const artifacts = bundle.demo_evidence_pack.map((item) => `- ${item}`).join('\n');
  const guardrails = bundle.claim_guardrails.map((item) => `- ${item}`).join('\n');
  const warnings = bundle.warnings.length > 0
    ? `\n## Blocking Warnings\n${bundle.warnings.map((warning) => `- ${warning}`).join('\n')}\n`
    : '';

  return `# Ontario Green Button Demo Evidence Pack

## Readiness Tracks
${readinessTracks}

## Submission Gate
${checklist}
${warnings}

## Demo Artifacts
${artifacts}

## Claim Guardrails
${guardrails}
`;
}
