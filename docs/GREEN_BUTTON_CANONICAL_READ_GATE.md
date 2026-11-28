# Green Button CMD canonical-read gate

The repository now contains a tested adapter,
`normalizePersistedUtilityIntervalHistory`, for converting persisted
`utility_interval_history` rows into the canonical utility-forecast input
contract.

The browser deliberately does **not** read that table yet. The current
foundation has service-role writes and no trustworthy owner binding on
`utility_connector_accounts`. The read-lockdown migration revokes client
privileges across the connector tables and removes the legacy public account
and sync-run policies. The interval history is therefore a service-only
quarantine; it is not yet customer-readable and cannot prove that a forecast
belongs to the signed-in operator.

The adapter can be wired only after all of the following are implemented and
verified together:

1. Bind a connector account to the authenticated application user at connect
   time. Do not infer ownership from a utility OAuth state, display name, or
   connector id supplied by the browser.
2. Keep public `SELECT` access revoked from connector accounts and sync
   metadata; do not reintroduce client grants before ownership exists.
3. Add owner-scoped RLS to both connector accounts and interval history, with
   `auth.uid()` as the owner predicate.
4. Add an authenticated read endpoint that uses the user JWT and returns only
   the caller's rows and connector metadata.
5. Round-trip a fixture through the endpoint, the adapter, and
   `buildUtilityForecastPackage`; prove that an empty, unauthorized, malformed,
   or stale response remains unknown/staged rather than becoming a live
   forecast source.

Until those gates pass, Green Button CMD remains an explicitly labelled
starter/mock path in the UI. This is intentional: persisted utility history
must not be treated as canonical customer evidence merely because a connector
runtime can write it.
