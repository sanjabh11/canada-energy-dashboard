# Owner sign-off matrix — staging/pilot gates

| # | Gate | Evidence required | Owner | Status |
|---|---|---|---|---|
| 1 | `.env` anon key | new anon key at line 12 | owner | open |
| 2 | MCP PAT | `SUPABASE_ACCESS_TOKEN` + `disabled:false` | owner | open |
| 3 | INC-001 | `qnymbecjgeaoxsfphrti` key revoked + log review | owner | open |
| 4 | Advisor findings | 108 sec + 23 perf dispositions | owner+Codex | open |
| 5 | Withheld rows | packet above completed + steward sign | steward | open |
| 6 | Four tables | decisions confirmed | steward | open |
| 7 | Function deploy | manifest receipts | owner | open |
| 8 | Staging | RLS denial, dedup, rate-limit, retention, logs, restore/rollback — synthetic data | owner | open |
| 9 | Storage | receipt above | owner | open |
| 10 | CASL/privacy | named approval | owner | open |
| 11 | Manual WCAG | keyboard/focus/SR review | owner | open |
| 12 | Deployed perf | Web Vitals receipt | owner | open |
| 13 | Buyer experiments | 11 pre-registered paid runs | business | 0/11 |
