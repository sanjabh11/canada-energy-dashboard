# Lessons Log

## 2026-03-03
- Rule: GTM plans must be implemented with explicit source-of-truth objects for pricing and attribution. Avoid duplicating plan prices/messages in route components.
- Rule: For multi-surface funnels (Whop + direct), encode channel-role intent in both docs and analytics contracts to prevent drift between product positioning and measured events.
- Rule: Never call `apply_patch` through `exec_command`; always use the dedicated `apply_patch` tool directly.
- Rule: After JSX edits, re-open the edited section to verify event handlers were applied as attributes and not inserted as text nodes.

## 2026-03-04
- Rule: When QA reports production failures that contradict local code, assume deploy drift first and still harden code paths so failures are self-evident (explicit UI state, forced rewrites, explicit CTA semantics).
- Rule: Never force SPA fallback rewrites (`200!` / `force=true`) without explicit static asset exclusions; it can cause JS/JSON/SW requests to return HTML and blank the app.

## 2026-03-06
- Rule: A monetized API is not sellable if any production endpoint bypasses API-key validation or ignores per-key limits; quota enforcement has to live server-side on the endpoint path, not just in pricing copy or docs.
- Rule: Once a working backend flow exists, remove placeholder monetization UI immediately. Dead “coming soon” gates on billing or API access pages create false negatives during diligence and make the product look unfinished.
