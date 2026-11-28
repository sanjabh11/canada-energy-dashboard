# Storage receipt template — 2 files (ZIP payloads, not DB rows)

DB backups do not cover Storage objects — these upload separately.

| Field | Value |
|---|---|
| File 1 name/bytes/sha256 | |
| File 2 name/bytes/sha256 | |
| Source (ZIP path) | |
| Target bucket/key | |
| Upload timestamp + actor | |
| Readback hash (matches upload) | |
| Bucket RLS/public setting | |

Rule: upload only after bucket policy is confirmed non-public for any
data-bearing object, or intentionally public for reference data.
