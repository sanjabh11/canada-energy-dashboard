# PBI-LLM-Gemini: LLM Orchestration and Chart Explainer (Phase A)

Scope:
- Server-side LLM orchestration via Supabase Edge Function `llm` with endpoints:
  - POST /api/llm/explain-chart
  - POST /api/llm/analytics-insight
  - POST /api/llm/feedback
  - GET  /api/llm/health
- Built-in safety filter (blacklist + Indigenous data safeguards placeholder).
- Retrieval: manifest + small sample rows from WRAPPER_BASE_URL when set; else mock-data fallback.
- Provenance and confidence included in outputs; log all calls.
- UI: "Explain this chart" button per panel with modal result and thumbs feedback.

Acceptance Criteria:
- Health endpoint returns {ok:true} in mock mode (no WRAPPER_BASE_URL).
- explain-chart returns structured JSON with tl_dr, trends[], classroom_activity, provenance[] for a known dataset.
- analytics-insight returns structured JSON with summary, key_findings[], policy_implications[], confidence, sources[].
- Safety test: malicious prompt yields 403 with safe message.
- Client button renders, calls server, displays output and records feedback.
- Secrets remain server-side; no model keys in client.

Notes:
- Phase A focuses on low-risk chart explainer and analytics insight. Future phases will add RAG/vector store, advanced endpoints, and full governance.
