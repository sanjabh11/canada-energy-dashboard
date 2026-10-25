# Pilot Function Inventory (audit-9, P2)

Target `qktgjpbifknqjpvrgkrj`: **0 of 110 functions deployed.** Deploy is
owner/secret-gated (`WHOP_CEIP_*`, service_role). The client route calls
`lead-capture` (not `intake`).

## Classification

| Function | Status |
|---|---|
| `aeso-ingestion-cron` | scheduled — gated by `CRON_LIVE_AESO_INGESTION_CRON` until deployed |
| `alert-export-health` | non-pilot (staged classification) |
| `api-keys-admin` | non-pilot (staged classification) |
| `api-v2-aeso-queue` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-ai-datacentres` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-analytics-national-overview` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-analytics-provincial-metrics` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-analytics-trends` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-capacity-market` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-carbon-emissions` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-ccus` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-ccus-projects` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-cer-compliance` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-climate-policy` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-cross-border-trade` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-curtailment-reduction` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-esg-finance` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-ev-charging` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-forecast-performance` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-grid-optimization-recommendations` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-grid-regions` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-grid-stability-metrics` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-grid-status` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-heat-pump-programs` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-hydrogen-hub` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-ieso-queue` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-indigenous-consultations` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-indigenous-projects` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-indigenous-reporting` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-indigenous-tek` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-indigenous-territories` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-industrial-decarb` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-innovation-market-opportunities` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-innovation-technology-readiness` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-investment-portfolio-optimization` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-investment-project-analysis` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-minerals-supply` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-minerals-supply-chain` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-npri-importer` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-renewable-forecast` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-resilience-adaptation-plan` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-resilience-assets` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-resilience-hazards` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-resilience-vulnerability-map` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-scenarios` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-security-incidents` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-security-metrics` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-security-mitigation-strategies` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-security-threat-models` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-smr` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-storage-dispatch` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-transmission-infrastructure` | api-v2 surface — non-pilot (staged classification) |
| `api-v2-vpp-platforms` | api-v2 surface — non-pilot (staged classification) |
| `calibration-cron` | non-pilot (staged classification) |
| `cohort-invite-email` | non-pilot (staged classification) |
| `create-export-job` | non-pilot (staged classification) |
| `data-purge-cron` | scheduled — gated by `CRON_LIVE_DATA_PURGE_CRON` until deployed |
| `digital-twin` | non-pilot (staged classification) |
| `energy-rag` | non-pilot (staged classification) |
| `energy-rag-ingest` | non-pilot (staged classification) |
| `export-job-status` | non-pilot (staged classification) |
| `fix-innovations` | non-pilot (staged classification) |
| `grid-risk` | non-pilot (staged classification) |
| `groundsource-miner` | scheduled — gated by `CRON_LIVE_GROUNDSOURCE_MINER` until deployed |
| `help` | non-pilot (staged classification) |
| `help-simple` | non-pilot (staged classification) |
| `historical` | non-pilot (staged classification) |
| `household-advisor` | non-pilot (staged classification) |
| `ingest-gas-basis-series` | scheduled — gated by `CRON_LIVE_INGEST_GAS_BASIS_SERIES` until deployed |
| `ingest-market-spike-series` | scheduled — gated by `CRON_LIVE_INGEST_MARKET_SPIKE_SERIES` until deployed |
| `ingest-retailer-rate-offers` | scheduled — gated by `CRON_LIVE_INGEST_RETAILER_RATE_OFFERS` until deployed |
| `ingest-tier-market-rates` | scheduled — gated by `CRON_LIVE_INGEST_TIER_MARKET_RATES` until deployed |
| `lead-capture` | pilot-required — public intake |
| `legal` | non-pilot (staged classification) |
| `llm` | non-pilot (staged classification) |
| `llm-health-probe` | non-pilot (staged classification) |
| `llm-lite` | non-pilot (staged classification) |
| `manifest` | non-pilot (staged classification) |
| `manifest-hf-electricity-demand` | non-pilot (staged classification) |
| `manifest-ontario-demand` | non-pilot (staged classification) |
| `manifest-ontario-prices` | non-pilot (staged classification) |
| `manifest-provincial-generation` | non-pilot (staged classification) |
| `ml-forecast` | non-pilot (staged classification) |
| `model-monitor` | non-pilot (staged classification) |
| `nl2sql` | non-pilot (staged classification) |
| `opportunity-detector` | non-pilot (staged classification) |
| `ops-health` | non-pilot (staged classification) |
| `ops-heartbeat` | scheduled — gated by `CRON_LIVE_OPS_HEARTBEAT` until deployed |
| `process-export-jobs` | non-pilot (staged classification) |
| `rate-alert-email` | non-pilot (staged classification) |
| `rate-watchdog` | non-pilot (staged classification) |
| `storage-dispatch-engine` | scheduled — gated by `CRON_LIVE_STORAGE_DISPATCH_ENGINE` until deployed |
| `storage-dispatch-scheduler` | non-pilot (staged classification) |
| `storage-metrics-calculator` | non-pilot (staged classification) |
| `stream-aeso-grid-data` | non-pilot (staged classification) |
| `stream-hf-electricity-demand` | non-pilot (staged classification) |
| `stream-ontario-demand` | scheduled — gated by `CRON_LIVE_STREAM_ONTARIO_DEMAND` until deployed |
| `stream-ontario-prices` | scheduled — gated by `CRON_LIVE_STREAM_ONTARIO_PRICES` until deployed |
| `stream-provincial-generation` | non-pilot (staged classification) |
| `stripe-create-checkout-session` | non-pilot (staged classification) |
| `stripe-webhook` | non-pilot (staged classification) |
| `tier-simulator` | non-pilot (staged classification) |
| `utility-connector-batch-sync` | non-pilot (staged classification) |
| `utility-connector-green-button` | non-pilot (staged classification) |
| `utility-connector-telemetry-ingest` | non-pilot (staged classification) |
| `utilityapi-demo` | non-pilot (staged classification) |
| `walkthroughs` | non-pilot (staged classification) |
| `weather-ingestion-cron` | scheduled — gated by `CRON_LIVE_WEATHER_INGESTION_CRON` until deployed |
| `whop-verify-access` | pilot — existing-customer entitlement (owner config) |
| `whop-webhook` | pilot — billing lifecycle (owner config) |

## Rules

- Pilot allowlist: `lead-capture`, `whop-verify-access`, `whop-webhook` only.
- Scheduled functions deploy + enable only after the owner sets their
  per-function repo var `CRON_LIVE_<FUNC>=true` (2026-10-25: the global
  `SUPABASE_CRONS_LIVE` switch was removed; unset vars fail closed).
- Acquisition functions stay disabled; existing-customer paths only.
