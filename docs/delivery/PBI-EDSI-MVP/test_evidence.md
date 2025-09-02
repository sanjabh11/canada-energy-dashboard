# Test Evidence: PBI-EDSI-MVP

- [ ] Streaming ON passed — time: ___ notes: ___
- [ ] Streaming OFF passed — time: ___ notes: ___
- [ ] Streaming failure → fallback passed — time: ___ notes: ___
- [ ] Cache hydrate passed — time: ___ notes: ___
- [ ] Abort handling passed — time: ___ notes: ___

## Session log — 2025-08-27T10:55:35+05:30

- Build: success (`pnpm run build`).
- Preview: running at `http://localhost:4174` (Vite auto-selected port).
- Fallback assets: `GET /data/ontario_demand_sample.json` returned HTTP 200 (curl HEAD check). Others pending UI verification.
- Next: validate UI shows `Source: Fallback` for all datasets and capture screenshots; then mark "Streaming OFF" as passed.

## Session log — 2025-08-27T11:05:51+05:30

- Rebuild: success (picked up updated .env with streaming=true).
- Supabase Edge checks (Authorization+apikey sent):
  - `manifest-hf-electricity-demand` → 404
  - `manifest/hf/electricity_demand` → 404
  - `manifest/huggingface/electricity_demand` → 404
  - `stream-hf-electricity-demand?limit=1` → 404
  - `stream/hf/electricity_demand?limit=1` → 404
  - `stream/huggingface/electricity_demand?limit=1` → 404
- Interpretation: Edge functions not deployed or route names differ; app should remain in fallback for HF dataset until functions exist.

## Session log — 2025-08-27T12:25:08+05:30

- HF Edge Functions deployed to project `qnymbecjgeaoxsfphrti` via Supabase CLI:
  - `manifest-hf-electricity-demand`
  - `stream-hf-electricity-demand`
- Curl verification (Authorization + apikey headers):
  - Manifest: 200 https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/manifest-hf-electricity-demand
  - Stream: 200 https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/stream-hf-electricity-demand?limit=5&offset=0
- Sample stream JSON (limit=2):
  {"data":[{"region":"hf_demo","metric":"electricity_demand","ts":"2025-08-27T05:59:49.402Z","value":100,"units":"kWh"},{"region":"hf_demo","metric":"electricity_demand","ts":"2025-08-27T06:14:49.402Z","value":101,"units":"kWh"}],"paging":{"limit":2,"offset":0,"next_offset":2}}
- Next: Reload app, verify UI shows `Source: Stream` for HF Electricity Demand, capture screenshot, and mark "Streaming ON" passed.

## Session log — 2025-08-27T12:48:01+05:30

- HF stream response aligned to frontend schema (`rows` + `metadata`, `x-next-cursor` header).
- Curl verification (Authorization + apikey headers):
  - HTTP 200 with `x-next-cursor: 3`
  - Endpoint: https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/stream-hf-electricity-demand?limit=3&offset=0
- Sample body excerpt:
  {"rows":[{"datetime":"2025-08-27T01:21:26.432Z","electricity_demand":970,"temperature":20,"humidity":40,"wind_speed":5,"solar_irradiance":0,"household_id":"hh-000","location":"hf_demo","day_of_week":3,"hour":1,"source":"huggingface","version":"1.0-stub"}],"metadata":{"hasMore":true,"totalEstimate":10000}}
- Action: Refresh UI; HF charts should render (expects `datetime` and `electricity_demand`).
