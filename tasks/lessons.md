# Lessons Log

## 2026-03-03
- Rule: GTM plans must be implemented with explicit source-of-truth objects for pricing and attribution. Avoid duplicating plan prices/messages in route components.
- Rule: For multi-surface funnels (Whop + direct), encode channel-role intent in both docs and analytics contracts to prevent drift between product positioning and measured events.
- Rule: Never call `apply_patch` through `exec_command`; always use the dedicated `apply_patch` tool directly.
- Rule: After JSX edits, re-open the edited section to verify event handlers were applied as attributes and not inserted as text nodes.
