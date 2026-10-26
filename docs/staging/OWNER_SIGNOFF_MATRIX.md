# Owner sign-off matrix — staging/pilot gates

| # | Gate | Evidence required | Owner | Status |
|---|---|---|---|---|
| 1 | `.env` anon key | new anon key at line 12 | owner | open |
| 2 | MCP access | Displayed project-scoped read-only token revoked; CLI OAuth read-only MCP lists `qktgjpbifknqjpvrgkrj`; in-chat account refresh still pending | owner | partial — connector refresh open |
| 3 | INC-001 | Leak-site project deletion/outside-account invalidation recorded in the authoritative incident register; never restore the leak-site project | owner | closed at incident-register layer; replacement staging remains gated |
| 4 | Replacement-project advisor findings | Read-only 2026-10-26 snapshot: security 2 ERROR classes (23 security-definer views, 1 public table without RLS), 4 WARN classes, 1 INFO class; performance 3 WARN classes, 2 INFO classes; every finding still needs a named disposition | owner+Codex | open |
| 5 | Withheld rows | packet above completed + steward sign | steward | open |
| 6 | Four tables | decisions confirmed | steward | open |
| 7 | Function deploy | manifest receipts for the three-function pilot allowlist; reconcile five currently active functions and keep non-pilot functions disabled or explicitly classified | owner | open |
| 8 | Staging | RLS denial, dedup, rate-limit, retention, logs, restore/rollback — synthetic data | owner | open |
| 9 | Storage | receipt above; replacement project currently has no buckets/objects | owner | open |
| 10 | CASL/privacy | named approval | owner | open |
| 11 | Manual WCAG | keyboard/focus/SR review | owner | open |
| 12 | Deployed perf | Web Vitals receipt | owner | open |
| 13 | Buyer experiments | 11 pre-registered paid runs | business | 0/11 |

**Read-only replacement-project snapshot (2026-10-26):** project
`qktgjpbifknqjpvrgkrj`; CLI OAuth MCP URL
`https://qktgjpbifknqjpvrgkrj.supabase.co`; 123 applied migrations, 230 public
tables, five active Edge Functions (`lead-capture`, `whop-verify-access`,
`whop-webhook`, `calibration-cron`, `storage-dispatch-scheduler`), zero Storage
objects, and no Free-plan scheduled-backup entitlement observed. These are
inventory observations only. They do not prove RLS behavior, function
authentication, retention, logging, backup/restore, rollback, owner approval,
or pilot readiness.
