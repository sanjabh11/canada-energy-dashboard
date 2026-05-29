# Hermes Atomic Current State

Last verified: `2026-05-04`

## Summary

Atomic Hermes and CLI Hermes were previously reading different homes:

- CLI authoritative home: `~/.hermes`
- Atomic desktop home: `~/Library/Application Support/ai.atomicbot.hermes/hermes`

That split caused real operator drift:

- `hermes cron list` showed `6` active jobs
- Atomic `Dashboard -> CRON` showed `0` jobs
- Atomic status did not surface the same delivery/session state as CLI

This is now repaired locally by making the Atomic Hermes home path resolve to the CLI home.

## Local Repair Implemented

### What changed

- Backed up the old Atomic home:
  - `~/Library/Application Support/ai.atomicbot.hermes/hermes.backup-20260504-200417`
- Replaced the Atomic home path with a symlink:
  - `~/Library/Application Support/ai.atomicbot.hermes/hermes -> ~/.hermes`
- Preserved desktop-only artifacts before the switch:
  - copied `desktop-onboarding-state.json` into `~/.hermes` when missing
  - copied `analytics-state.json` into `~/.hermes` when missing
  - merged Atomic `sessions/` into `~/.hermes/sessions/` with `rsync --ignore-existing`

### Exact command sequence used

```bash
ATOMIC_ROOT="$HOME/Library/Application Support/ai.atomicbot.hermes"
ATOMIC_HOME="$ATOMIC_ROOT/hermes"
CLI_HOME="$HOME/.hermes"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ATOMIC_ROOT/hermes.backup-$TS"

osascript -e 'tell application "Atomic Hermes" to quit' >/dev/null 2>&1 || true
sleep 2
pkill -f 'Atomic Hermes.app/Contents/Resources/python-server/desktop-gateway.py' || true
pkill -f '/Applications/Atomic Hermes.app/Contents/MacOS/Atomic Hermes' || true
sleep 2

mv "$ATOMIC_HOME" "$BACKUP"
mkdir -p "$CLI_HOME/sessions" "$CLI_HOME/skills"
rsync -a --ignore-existing "$BACKUP/sessions/" "$CLI_HOME/sessions/"

if [ -f "$BACKUP/desktop-onboarding-state.json" ] && [ ! -f "$CLI_HOME/desktop-onboarding-state.json" ]; then
  cp "$BACKUP/desktop-onboarding-state.json" "$CLI_HOME/desktop-onboarding-state.json"
fi

if [ -f "$BACKUP/analytics-state.json" ] && [ ! -f "$CLI_HOME/analytics-state.json" ]; then
  cp "$BACKUP/analytics-state.json" "$CLI_HOME/analytics-state.json"
fi

ln -s "$CLI_HOME" "$ATOMIC_HOME"
open -a "Atomic Hermes"
```

## Verified State After Repair

| Check | Result | Proof |
|---|---|---|
| CLI provider state | `gemini` primary, `gemini-2.5-flash` model | `hermes status` |
| CLI gateway | running | `hermes status` |
| CLI cron truth | `6 active, 6 total` | `hermes cron list` |
| Atomic chat | loads and shows shared session history | Atomic desktop app |
| Atomic model pill | `default gemini-2.5-flash · gemini` | Atomic `Chat` |
| Atomic status page | live, gateway running | Atomic dashboard |
| Atomic connected platforms | `Telegram` and `Api_server` visible | Atomic dashboard status |
| Atomic cron page | now shows `Scheduled Jobs (6)` | Atomic dashboard cron |
| Atomic sees CEIP cron sessions | yes | Atomic chat sidebar |
| Shared-home path | symlink in place | `readlink ~/Library/Application\\ Support/ai.atomicbot.hermes/hermes` |

## P1 Version Label Reconciliation

The desktop/dashboard version story is now explicit instead of implying a stale runtime:

| Surface | Before | After |
|---|---|---|
| Atomic window title | `Atomic Hermes v0.1.31` | unchanged |
| Dashboard status card label | `Agent` | `Desktop / Agent` |
| Dashboard status card value | `v0.9.0` | `Desktop 0.1.31 · Agent 0.9.0` |
| `/api/status` payload | `version` only | `version`, `agent_version`, `desktop_app_version`, `version_label` |

### Files patched for P1

- `/Applications/Atomic Hermes.app/Contents/Resources/hermes-agent/hermes_cli/web_server.py`
- `/Applications/Atomic Hermes.app/Contents/Resources/hermes-agent/hermes_cli/web_dist/assets/index-CqypI-we.js`

### Local backups created for P1

- `/Applications/Atomic Hermes.app/Contents/Resources/hermes-agent/hermes_cli/web_server.py.bak.20260504-203333`
- `/Applications/Atomic Hermes.app/Contents/Resources/hermes-agent/hermes_cli/web_dist/assets/index-CqypI-we.js.bak.20260504-203333`

## Atomic-Only Operator Guide

Use Atomic for inspection and operator review. Use CLI when you need exact cron administration commands or scripted recovery.

| Workflow | Click path in Atomic | Safe to do now | Success signal | Notes |
|---|---|---|---|---|
| Quick health check | `Dashboard -> STATUS` | Yes | `AGENT` live, `GATEWAY` running, `Telegram` connected | This is now reading the shared home |
| Cron review | `Dashboard -> CRON` | Yes | `Scheduled Jobs (6)` | This was the main broken surface and is now aligned |
| Session review | `Chat` sidebar | Yes | CEIP cron sessions appear in the list | Shared sessions now surface in Atomic |
| Model/provider spot check | top-left profile/model pill in `Chat` | Yes | `default gemini-2.5-flash · gemini` | Confirms current runtime route |
| Log inspection | `Dashboard -> LOGS` | Yes | fresh log lines render | Still inspection-only; CLI is faster for bulk triage |
| Delivery surface check | `Dashboard -> STATUS` | Yes | `Telegram` listed under connected platforms | This was not trustworthy before the shared-home fix |
| Ad hoc drafting | `Chat -> New chat` | Yes | input box active, responses return | Use manual-review only for outreach |
| Cron editing | prefer CLI | Yes, but CLI remains authoritative | `hermes cron list` and `hermes cron edit ...` | Atomic is now aligned, but CLI remains the precise admin surface |

## Remaining Drift

| Item | Current state | Action |
|---|---|---|
| Desktop app version | `Atomic Hermes v0.1.31` | optional app update later |
| Embedded agent version | still actually `0.9.0` inside the bundled desktop backend | cosmetic ambiguity fixed; actual backend upgrade still separate work |
| Dashboard local port | not stable across restarts | do not rely on an old hardcoded browser tab like `127.0.0.1:53082`; prefer the Atomic app |
| OpenRouter credits | not yet usable at last check | keep Gemini primary until OpenRouter becomes live |
| Gateway ownership | launchd Hermes gateway and desktop-started gateway can race on the same Telegram token | treat as a separate next pass; not changed in P1 |

## Re-Verification Commands

```bash
hermes status
hermes cron list
readlink "$HOME/Library/Application Support/ai.atomicbot.hermes/hermes"
```

If you need to probe the live embedded dashboard URL from the shell after a restart:

```bash
lsof -nP -iTCP -sTCP:LISTEN | rg 'python3|Atomic Hermes'
```

The desktop dashboard HTTP port may change between launches. Prefer opening the Atomic app itself instead of bookmarking a stale localhost port.

## Rollback

If the shared-home setup needs to be undone:

```bash
ATOMIC_ROOT="$HOME/Library/Application Support/ai.atomicbot.hermes"
ATOMIC_HOME="$ATOMIC_ROOT/hermes"
BACKUP="$ATOMIC_ROOT/hermes.backup-20260504-200417"

osascript -e 'tell application "Atomic Hermes" to quit' >/dev/null 2>&1 || true
sleep 2
rm "$ATOMIC_HOME"
mv "$BACKUP" "$ATOMIC_HOME"
open -a "Atomic Hermes"
```

Only run the rollback if the desktop app shows a real regression. The shared-home configuration is the desired state for keeping Atomic and CLI in sync.
