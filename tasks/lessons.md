# Lessons Log

## 2026-03-03
- Rule: GTM plans must be implemented with explicit source-of-truth objects for pricing and attribution. Avoid duplicating plan prices/messages in route components.
- Rule: For multi-surface funnels (Whop + direct), encode channel-role intent in both docs and analytics contracts to prevent drift between product positioning and measured events.
- Rule: Never call `apply_patch` through `exec_command`; always use the dedicated `apply_patch` tool directly.
- Rule: After JSX edits, re-open the edited section to verify event handlers were applied as attributes and not inserted as text nodes.

## 2026-03-04
- Rule: When QA reports production failures that contradict local code, assume deploy drift first and still harden code paths so failures are self-evident (explicit UI state, forced rewrites, explicit CTA semantics).
- Rule: Never force SPA fallback rewrites (`200!` / `force=true`) without explicit static asset exclusions; it can cause JS/JSON/SW requests to return HTML and blank the app.
- Rule: Before implementing plan-specified paths/endpoints, map them to real repository files/routes first; if names differ, bind changes to existing production paths and close the behavior gap there.
- Rule: For new Supabase tables in edge functions, avoid tight generated DB typings until types are regenerated; keep server helpers pragmatically typed and validate behavior with build/typecheck instead of over-modeling first.

## 2026-03-05
- Rule: DEV-mode convenience bypasses (`import.meta.env.DEV`) can hide critical QA paths; make confidence-force behavior explicitly env-controlled so local QA can verify blocked flows.
