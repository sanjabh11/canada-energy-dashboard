# Uptime Monitor Manifest

This document makes the Phase 0 uptime contract repo-verifiable.

Authoritative source:
- `src/lib/opsMonitoring.ts`

Expected monitor set:
1. Homepage
2. Lead Capture API
3. Health Endpoint
4. TIER Calculator
5. Municipal Page

Verification rule:
- `/status` must render the same five monitors listed in `src/lib/opsMonitoring.ts`.
- UptimeRobot should be configured against these exact endpoints until a stronger internal monitor registry exists.
