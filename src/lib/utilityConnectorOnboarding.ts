export interface OntarioUtilityOnboardingPack {
  utility_name: 'London Hydro' | 'Alectra Utilities';
  registration_url: string;
  terms_url: string;
  login_url: string;
  bridge_base_url: string;
  redirect_uri: string;
  callback_forward_target: string;
  bridge_routes: string[];
  registration_form_categories: string[];
  oauth_espi_scope: string;
  requested_data_categories: string[];
  revocation_mode: 'api' | 'portal_redirect';
  revocation_url: string | null;
  manage_connections_url: string;
  revocation_behavior: string;
  data_retention_answer: string;
  privacy_mapping: string;
  demo_script: string[];
}

function normalizeUrl(raw?: string | null): string {
  return String(raw ?? '').trim().replace(/\/$/, '');
}

export function buildOntarioUtilityOnboardingPacks(params?: {
  publicAppUrl?: string | null;
  utilityConnectorBaseUrl?: string | null;
  supabaseUrl?: string | null;
}): OntarioUtilityOnboardingPack[] {
  const normalizedSupabaseUrl = normalizeUrl(params?.supabaseUrl);
  const normalizedPublicAppUrl = normalizeUrl(params?.publicAppUrl);
  const normalizedUtilityConnectorBaseUrl = normalizeUrl(params?.utilityConnectorBaseUrl);
  const edgeBase = normalizedSupabaseUrl.length > 0
    ? `${normalizedSupabaseUrl}/functions/v1`
    : 'https://<project-ref>.supabase.co/functions/v1';
  const applicationLoginUrl = normalizedPublicAppUrl.length > 0
    ? `${normalizedPublicAppUrl}/utility-demand-forecast`
    : 'https://<set-VITE_PUBLIC_APP_URL>/utility-demand-forecast';
  const bridgeBaseUrl = normalizedUtilityConnectorBaseUrl.length > 0
    ? normalizedUtilityConnectorBaseUrl
    : 'https://<set-VITE_UTILITY_CONNECTOR_BASE_URL>';
  const londonHydroCallbackTarget = `${edgeBase}/utility-connector-green-button?action=callback&utility_name=London%20Hydro`;
  const alectraCallbackTarget = `${edgeBase}/utility-connector-green-button?action=callback&utility_name=Alectra%20Utilities`;
  const bridgeRoutes = ['GET /cmd/callback', 'POST /cmd/token', 'GET /cmd/feed', 'POST /cmd/revoke'];

  return [
    {
      utility_name: 'London Hydro',
      registration_url: 'https://www.londonhydro.com/green-buttonr-third-party-registration-form',
      terms_url: 'https://www.londonhydro.com/greenbutton',
      login_url: applicationLoginUrl,
      bridge_base_url: bridgeBaseUrl,
      redirect_uri: `${bridgeBaseUrl}/cmd/callback?utility_name=London%20Hydro`,
      callback_forward_target: londonHydroCallbackTarget,
      bridge_routes: bridgeRoutes,
      registration_form_categories: ['Usage Information'],
      oauth_espi_scope: 'FB=4_5_15_16',
      requested_data_categories: ['Usage Information'],
      revocation_mode: 'portal_redirect',
      revocation_url: null,
      manage_connections_url: 'https://www.londonhydro.com/accounts-services/online-services/mylondonhydro',
      revocation_behavior: 'Customer revokes sharing inside London Hydro Green Button / MyLondonHydro. CEIP immediately drops live-connected status, guides the customer to the utility portal, and only marks the connector revoked after confirmation.',
      data_retention_answer: 'Retain only normalized interval history, payload fingerprints, and audit metadata required for planning provenance; purge tokens on revocation.',
      privacy_mapping: 'Energy data stays within the utility connector account boundary; no secondary training use and no onward sharing beyond the authorized planning workflow.',
      demo_script: [
        'Open the utility demand route on the canonical app host and show the Ontario onboarding pack with the custom bridge host.',
        'Start the mocked authorization flow and verify the authorize redirect URL contains the expected scope and bridge callback URI.',
        'Complete the mocked callback and show that the bridge callback forwards into the Supabase connector runtime and the connector becomes active with token expiry metadata.',
        'Run a mocked sync and show connector truth labels, inserted interval rows, and forecast provenance.',
        'Request disconnect, follow the portal-managed revocation guidance, and confirm that the connector moves from failed/pending confirmation to revoked with token purge evidence.',
      ],
    },
    {
      utility_name: 'Alectra Utilities',
      registration_url: 'https://alectrautilitiesonboarding.savagedata.com',
      terms_url: 'https://alectrautilities.com/green-button',
      login_url: applicationLoginUrl,
      bridge_base_url: bridgeBaseUrl,
      redirect_uri: `${bridgeBaseUrl}/cmd/callback?utility_name=Alectra%20Utilities`,
      callback_forward_target: alectraCallbackTarget,
      bridge_routes: bridgeRoutes,
      registration_form_categories: ['Usage Information'],
      oauth_espi_scope: 'FB=4_5_15_16',
      requested_data_categories: ['Usage Information'],
      revocation_mode: 'portal_redirect',
      revocation_url: null,
      manage_connections_url: 'https://alectrautilitiesgbportal.savagedata.com',
      revocation_behavior: 'Customer manages active connections in the Alectra Green Button portal. CEIP drops live-connected status on disconnect request and finalizes revocation after portal confirmation or a revoked follow-up sync.',
      data_retention_answer: 'Store encrypted connector tokens in Supabase Edge secrets-backed custody and retain only normalized planning rows plus audit evidence needed for customer-authorized analysis.',
      privacy_mapping: 'Privacy terms map to account-holder consent, explicit revocation support, and limited retention of normalized usage history for the approved utility-planning use case.',
      demo_script: [
        'Show the Alectra third-party onboarding application link plus the CEIP app host and bridge callback URI that would be submitted.',
        'Replay the mocked OAuth start URL and confirm the customer is redirected back to the Green Button bridge callback handler.',
        'Demonstrate token-exchange success and failed/revoked paths using the local runtime harness.',
        'Demonstrate the portal-managed disconnect flow, including manage-connections guidance and final revocation confirmation.',
        'Demonstrate that the route never claims live-connected status when the connector is only mock-backed or stale.',
      ],
    },
  ];
}

export function getOntarioFastFollowNote(): string {
  return 'UtilityAPI-compatible Ontario utilities remain a fast-follow proof path, but London Hydro and Alectra require utility-specific onboarding and should not be treated as generic UtilityAPI integrations. UtilityAPI is a follow-on adapter sprint, not a drop-in env swap for the current Green Button runtime.';
}
