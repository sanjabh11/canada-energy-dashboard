# Dependency Advisory Exceptions

Owner-approved, time-bounded exceptions for advisories that cannot be
resolved with a version bump today. Every entry must have exposure analysis,
mitigation, an accountable owner, and an expiry. Enforced mechanically by
`scripts/check-dep-audit.mjs`, which fails on any advisory not listed here.

> Status key: **ACTIVE** = within expiry. An expired entry fails the audit gate.

---

## EXC-2026-001 — `braces@3.0.3` ReDoS (GHSA-vfj7-8cjw-p6xm) — ACTIVE

- **Advisory:** high severity — stack-exhaustion DoS via deeply nested brace-expansion patterns. `braces <=3.0.3` vulnerable; **no patched release exists** (npm latest is still 3.0.3 as of 2026-10-05).
- **Reachability:** `tailwindcss@3.4.16 → chokidar@3.6.0` and `micromatch@4.0.8` — build-time file globbing only. `braces` is **not bundled** into the client output (verified: no `braces` in `dist/` chunk graph; it runs during Vite/Tailwind build).
- **Exploit precondition:** an attacker must control a glob pattern passed to brace expansion. All glob patterns in this repo's build path are static config authored in-repo (`content` globs in `tailwind.config`, Vite `include`/`watch` paths). There is no user-controlled input path.
- **Mitigation:** build-time only exposure; no runtime reach; patterns are static.
- **Residual risk:** a malicious PR modifying glob patterns could slow the build — mitigated by normal code review, not by this exception.
- **Owner:** sanjayb (repo owner, accountable) — ratified 2026-10-06; engineering maintainer is remediation lead for this workspace.
- **Recorded:** 2026-10-05. **Expires:** 2027-01-05 (90 days) — revisit at every dependency refresh; remove immediately when a patched `braces` ships.
- **Exit criteria:** bump `braces` past the patched floor, or migrate `tailwindcss`/glob consumers to a version that drops `braces`.

---

## How to add an exception

1. Fill every field above — no entry without exposure analysis + expiry.
2. Add the advisory's `module` + `github_advisory_id` to `KNOWN_EXCEPTIONS` in `scripts/check-dep-audit.mjs`.
3. Expired or undocumented advisories fail CI. Never describe an unwaived high finding as a clean pass.
