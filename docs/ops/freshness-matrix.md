# Freshness Matrix

This matrix captures the intended freshness behavior for the currently implemented ingestion topology.

| Area | Existing Entry Point | Freshness Expectation | Fallback Behavior | Provenance Expectation |
|---|---|---|---|---|
| AESO market/grid | `aeso-ingestion-cron` -> `stream-aeso-grid-data` | 5-minute cadence when live | Use sample/fallback labels if upstream fails | `source`, `last_updated`, `freshness_status`, `is_fallback` |
| Ontario demand/prices | `stream-ontario-demand`, `stream-ontario-prices` | Live-when-available with timestamps from source rows | Explicit sample-data labels | Same shared provenance contract |
| Weather / Open-Meteo observations with ECCC context | `weather-ingestion-cron` | Hourly observations when available | Offline/demo values must be labeled | Same shared provenance contract |
| RAG corpus | `energy-rag-ingest` -> `energy-rag` | Freshness tied to `source_updated_at` and embedding job time | Local seed corpus fallback should be explicit | `source_updated_at`, fallback reason, corpus source IDs |
| Manifest / ops health | `manifest`, `ops-health` | Reflect current system state, not assumed state | Mark unavailable subsystems honestly | Explicit provenance and last-check timestamps |

## Notes
- Freshness should be measured from the newest known source timestamp, not `now()` unless the data is genuinely generated at request time.
- Demo or sample content is acceptable for development and fallback paths only when it is labeled clearly.
- “Real-time” should only be used in user-facing copy when the data path really supports it.

## How to Use This Matrix
- Check it before adding a new endpoint.
- Update it when a new source type or cron wrapper becomes real.
- Use it to decide whether a UI needs a trust badge, stale badge, or demo label.
