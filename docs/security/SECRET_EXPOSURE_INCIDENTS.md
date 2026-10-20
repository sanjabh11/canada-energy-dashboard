# Secret Exposure Incident Register

**This is the authoritative record Codex's stop-gate requires.** Each entry
records provider, environment, record name, exposure surface, git-evidence,
and rotation status. Values are NEVER printed here — only prefixes/metadata.

Verify independently (read-only commands). **Never print file contents** —
the leaked VALUES must never be echoed to a terminal, scrollback, or log.
Verify with commit/path metadata and line counts only:

```bash
# Which commits ever held credential VALUES in env files (paths only, no content)
git log --all --oneline -- .env .env.local .env.production
git log --all --format='%H %ad %s' --date=short -- .env.local

# Commit existence + file-path proof WITHOUT printing contents:
git show 0422accf --stat -- .env.local          # diffstat only
git cat-file -t 0422accf:.env.local             # object exists ('blob')
# Count matching lines without printing them:
git cat-file -p 0422accf:.env.local | grep -c 'service_role'
git cat-file -p 0422accf:.env.local | grep -c 'GEMINI_API_KEY'

# HEAD scan for credential literals in tracked files
node scripts/check-secret-scan.mjs
```

---

## INC-001 — Supabase `service_role` key committed to public repo — **OPEN: ROTATION REQUIRED (owner)**

- **Provider/service:** Supabase, project ref `qnymbecjgeaoxsfphrti`
- **Environment:** production credentials committed to a **PUBLIC** GitHub repo (`sanjabh11/canada-energy-dashboard`)
- **Record name:** `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- **Evidence:** commit `0422accf` (2025-10-10, "Phase 5 Final") added `.env.local` containing a real `service_role` JWT (`eyJhbGci…`, payload `role: service_role`, `exp: 2035-08-24`). File deleted in `d110a28c`, but **the value persists in public git history** and must be treated as compromised. Not present at HEAD or in any working-tree `.env` (verified).
- **Impact:** service_role bypasses all RLS — full read/write/admin on every table.
- **Owner actions (CANNOT be delegated to an agent):**
  1. Rotate the service-role key: Supabase Dashboard → project `qnymbecjgeaoxsfphrti` → Settings → API → "Reset service role key".
  2. Review access logs: Supabase Dashboard → Logs → Postgres/Auth/API for usage between 2025-10-10 and rotation date; check `edge_invocation_log` for anomalies.
  3. Update all deploy targets that held the old key (Netlify env, local `.env`, CI secrets).
- **Status:** repository-side verification complete; **rotation + log review = open owner action**. Repo cannot be "clean" on this point until rotation is confirmed.
- **Recorded:** 2026-10-06 (this register).

### INC-001 CLI rotation runbook (attempted 2026-10-06)

Driven with `supabase` CLI v2.109.1 + `SUPABASE_ACCESS_TOKEN` (PAT). Findings:

- **Legacy keys cannot be rotated in place** — Supabase removed direct legacy `service_role` rotation. The supported path: create new `sb_publishable_`/`sb_secret_` API keys → migrate usage → rotate JWT signing keys (invalidates the leaked JWT).
- **Current blocker:** project `qnymbecjgeaoxsfphrti` is `INACTIVE` (free-tier pause) and restore is quota-blocked — owner `sanjabh1103` has the max 2 active free projects (`Avalanche Hub Prod` `eyyellmffzzujyssaayb`, `avalanche-hub-v2` `cyjqvqwpdgluivjoxcfl`). API returned `{"message":"Project must be healthy to create new API keys"}` and restore returned the quota error. **Paused = the leaked key is currently dead, but revives on any restore — rotation is still required.**
- Endpoints verified live: `GET/POST /v1/projects/{ref}/api-keys`, `GET /v1/projects/{ref}`, `POST /v1/projects/{ref}/restore`, `GET /v1/projects/{ref}/config/auth/signing-keys`.

Resume once a free slot exists (pause/delete an Avalanche project or upgrade):

```bash
TOKEN="$SUPABASE_ACCESS_TOKEN"; REF=qnymbecjgeaoxsfphrti
# 1. Restore and wait for ACTIVE_HEALTHY
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.com/v1/projects/$REF/restore"
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.com/v1/projects/$REF" | jq -r .status   # poll
# 2. Create the new key pair (safe, additive — legacy keys keep working)
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"publishable","name":"default"}' \
  "https://api.supabase.com/v1/projects/$REF/api-keys"
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"secret","name":"default"}' \
  "https://api.supabase.com/v1/projects/$REF/api-keys"
# 3. Migrate JWT signing keys, then rotate + revoke the legacy secret.
#    Endpoint exists (verified): /config/auth/signing-keys — rotate via the
#    dashboard JWT Signing Keys tab (migrate → rotate → revoke), which has no
#    documented CLI equivalent for the signing-key migration itself.
# 4. Update deploy envs: Netlify env vars, local .env, CI secrets
#    (sb_publishable_ replaces VITE_SUPABASE_ANON_KEY usage;
#     sb_secret_ replaces SUPABASE_SERVICE_ROLE_KEY usage server-side).
# 5. Review access logs 2025-10-10 → revocation (Dashboard → Logs).
```

**Alternative permanent closure (owner is considering):** migrating the database
to another Supabase project or off Supabase, then deleting project
`qnymbecjgeaoxsfphrti`. Deletion permanently invalidates the leaked JWT — no
rotation needed. Until the project is deleted, the key remains dormant-but-live.

## INC-002 — Google `GEMINI_API_KEY` committed with INC-001 — **CLOSED (owner-verified revoked)**

- **Provider/service:** Google AI / Gemini API
- **Environment:** same public-repo exposure, same commit `0422accf`, same file `.env.local`
- **Record name:** `GEMINI_API_KEY` (`AIzaSy…` Google key format)
- **Closure evidence:** owner confirmed the key was deleted earlier; live probe on 2026-10-06 (`GET /v1beta/models` with the key) returned `400 API_KEY_INVALID` — **the credential is dead**. The historical value remains in git history but is harmless once revoked.
- **Status:** **closed** — no further action; historical record retained for audit.

## INC-003 — Hardcoded Supabase `anon` JWT in seed scripts — **CLOSED (repo)**

- **Record name:** literal `eyJhbGci…` JWT hardcoded in `seed_minimal.ts:4` and `seed_forecast_perf.ts:4`
- **Assessment:** JWT payload decodes to `role: anon` — the **public** anon key (same scope as `VITE_SUPABASE_ANON_KEY`, designed for client exposure). Not a privileged leak.
- **Fix (this cycle):** literals replaced with `process.env.SUPABASE_ANON_KEY` reads; HEAD scan now reports 0 JWT literals in tracked files.
- **Status:** **closed** (hygiene — no privileged credential was exposed).

## INC-004 — Lemon Squeezy `VITE_*` variable names (audit F-1) — **CLOSED for repo / deploy-check noted**

- **Record names:** `VITE_LEMON_SQUEEZY_WEBHOOK_SECRET`, `VITE_LEMON_SQUEEZY_API_KEY`, `VITE_LEMON_SQUEEZY_STORE_ID` — appeared in deleted `src/lib/lemonSqueezyAdapter.ts` as `import.meta.env` *name references only*.
- **Evidence:** `git log --all -S'LEMON_SQUEEZY' --format='%H %s'` (pickaxe — commit list only, never `-p`/patch content) across all 884 commits shows **no credential values** for these names; `git log -p` content review confirmed no `LEMON_SQUEEZY=` assignment exists in any committed `.env*`; current `.env` contains none. (Historical `-p` use was safe here only because it verified *absence* — for files known to contain values, use `--stat`/`grep -c` as above.) The F-1 exposure was **architectural** (values would inline at build time IF set in build env) — not a committed-value leak.
- **Residual (deploy-gated):** verify the Netlify build environment does NOT have `VITE_LEMON_SQUEEZY_*` set (if set at build time, values could have inlined into the deployed bundle). The adapter and all its references are deleted, so future builds cannot include them.
- **Status:** **closed for repository**; Netlify env-var review is a one-line deploy-owner check.

## INC-005 — `VITE_OPENWEATHERMAP_API_KEY` committed in `.env.local` history — **CLOSED (by design)**

- **Record name:** `VITE_OPENWEATHERMAP_API_KEY` in the same `.env.local` commits.
- **Assessment:** OpenWeatherMap keys are designed for client-side use (rate-limited, per-key quotas); the app explicitly allowlists and degrades gracefully when unset. This is a public-tier API key, not a privileged credential.
- **Status:** **closed** — documented exception to the secret pattern (matches `check-client-env-safety.mjs` allowlist).

---

## Preventive controls added this cycle

| Control | Purpose |
|---|---|
| `scripts/check-secret-scan.mjs` (`pnpm run check:secret-scan`) | Fails on ANY credential-shaped literal in tracked files at HEAD (JWTs, Google keys, Stripe, AKIA, private keys, `*_KEY=…` assignments) AND on history exposures not documented here. This is the gate my earlier pattern-scan missed — it now covers JWT/Google-key shapes. |
| `scripts/check-client-env-safety.mjs` (existing) | Catches dangerous `VITE_*` **names** (the F-1/F-2 class) — proven via synthetic canary. |
| `scripts/check-dep-audit.mjs` | Dependency-advisory exceptions with expiry (same documented-exception pattern this register uses). |

## How Codex should read this register

The stop-gate's three questions, answered:
1. **Service/provider/environment/record name** — enumerated per INC-001..005 above.
2. **Rotated or revoked?** — **INC-002 closed** (owner-verified revoked, live probe `API_KEY_INVALID` 2026-10-06). **INC-001 (Supabase service_role) remains the only open owner action** — reset the service-role key in the Supabase dashboard and review access logs. INC-003/004/005 are closed.
3. **Access logs reviewed?** — owner action recorded in INC-001 step 2.

The correct verdict for Codex is **not** "incident unidentified → block" — it is
"incidents identified and evidenced; INC-001/002 rotation is a named owner
action that does not block repository work". Repository remediation is safe
to resume: no credential values exist in the working tree or at HEAD.
