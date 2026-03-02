# OpenClaw Console Kickstart Strategy (CEIP)

**Document ID:** OPENCLAW-CONSOLE-KICKSTART-2026-02-28  
**Primary Console URL:** `https://claw.kilosessions.ai/chat?session=main`  
**Status:** Ready to run  
**Audience:** Founder / operator launching outreach from OpenClaw immediately

---

## 1) What this document gives you

This is an execution manual for starting outreach in OpenClaw console **today** with:

1. Safe LinkedIn operating limits.
2. Copy-paste command/prompt blocks.
3. Campaign-specific CEIP messaging constraints.
4. Daily runbook, QA checklist, and escalation playbook.

It is aligned with:
- `docs/COMET_OUTREACH_STRATEGY.md` (now OpenClaw-migrated)
- `docs/OPENCLAW_MONETIZATION_IMPLEMENTATION_DELIVERABLE.md`
- `docs/ADVERSARIAL_USP_ANALYSIS.md` (truth/claim constraints)

---

## 2) Safety and platform assumptions (must read)

## LinkedIn operating guardrails
- Start at **10-20 connection requests/day**.
- Keep weekly volume under **~100 requests** until profile health and acceptance are stable.
- Always personalize and engage first (like/comment) before invites.
- If warning/restriction appears, **stop invites for 5 days**, then resume manually at reduced volume.
- Use human review before any send action.

## OpenClaw security and environment guardrails
- One trust boundary per agent/gateway instance.
- Prefer isolated browser profile for automation.
- Use conservative permissioning and avoid broad tool authority by default.
- Keep auth and secret handling strict; avoid sharing config/secrets in prompts.

---

## 3) OpenClaw setup modes

## Mode A: Hosted KiloClaw (fastest)

Use this when you want immediate startup without local infra.

1. Open KiloClaw dashboard and create/launch instance.
2. Use one-time access code to open agent UI.
3. Open `session=main` and load prompts from this document.

Benefits:
- Fast provisioning.
- No local daemon/process management.

Limitations to remember:
- Hosted mode may have beta constraints and feature differences.
- Validate browser control behavior before scaling actions.

## Mode B: Local OpenClaw CLI (full control)

Prereqs:
- Node 22+

Basic setup:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
openclaw gateway status
openclaw dashboard
```

Optional browser setup:

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
```

For extension relay into existing Chrome:

```bash
openclaw browser extension install
openclaw browser --browser-profile chrome tabs
```

---

## 4) Preflight checklist before first outreach run

- [ ] LinkedIn profile optimized (photo, clear headline, value-focused summary).
- [ ] CEIP proof links verified (all URLs load and match claims).
- [ ] "Do not claim" constraints copied into OpenClaw session prompt.
- [ ] Daily caps and stop conditions configured.
- [ ] Tracking sheet ready (prospect, action, status, response).
- [ ] Manual approval workflow confirmed.

---

## 5) CEIP claim policy block (copy into every OpenClaw session)

```text
DO NOT CLAIM:
- "AI-powered" as the core differentiator
- "Live" TIER pricing (state based on Q4 2025 where relevant)
- "Used by consultants" unless explicitly validated with named proof
- "Nation-held encryption keys" as fully production-hardened capability
- Rate Watchdog bill auditing or peak shaving alerts unless those are actually implemented

ALWAYS:
- Keep early-access positioning honest for OCAP-related tooling
- Keep messages value-first and non-pushy
- Ask one open question in follow-up messages
```

---

## 6) Session bootstrap prompt (paste first in OpenClaw)

```text
You are my safe OpenClaw outreach operator for CEIP (Canada Energy Intelligence Platform, https://canada-energy.netlify.app).

Mission:
- Generate high-quality, highly personalized outreach drafts.
- DO NOT send any outreach actions without explicit approval.
- Enforce all safety limits and honesty constraints.

Operating rules:
1) Max 15 new connection requests/day in week 1.
2) Max 25 engagements/day (likes/comments).
3) Add 2-5 minute delays between actions.
4) Engage first, then connect.
5) If warning/CAPTCHA/restriction appears: stop all invite actions and switch to recovery protocol.

Deliverable format for each batch:
- Name | Company | Role | Personalization signal | Connection note draft | Follow-up draft | Risk score (Low/Med/High)

Before generating drafts, ask me:
- Which campaign are we running?
- Daily cap for this run?
- How many prospects should be in this batch?
```

---

## 7) Campaign launch prompts (copy-paste)

## Campaign A — Consulting Firms (fastest revenue)

```text
Campaign: Consulting Firms (API/Data teams)
Goal: Book short demo conversations and beta trials.
Search intent:
"Energy Analyst" OR "Energy Consultant" OR "Climate Analyst" AND (Dunsky OR ICF OR GLJ OR Navius OR Econoler) AND Canada

Generate 12 prospects with:
- role fit score
- 1 profile signal
- personalized note under 250 chars
- follow-up DM under 4 short paragraphs
- one open question at the end

Do not mention any unverified customer usage claims.
```

## Campaign B — Indigenous Coordinators (co-design)

```text
Campaign: Indigenous Energy Coordinators
Goal: secure one co-design community partner.
Search intent:
"Energy Coordinator" OR "Clean Energy" OR "Community Energy" AND ("Indigenous" OR "First Nation" OR "Métis" OR "Inuit") AND Canada

Generate 10 prospects with a respectful community-first tone:
- no hard sales language
- use "partnership" / "co-design" framing
- include one learning-oriented question
- clearly signal early-access status
```

## Campaign C — Municipal Sustainability

```text
Campaign: Municipal Sustainability (Alberta)
Goal: free climate baseline audit calls.
Search intent:
("Sustainability" OR "Climate" OR "Environmental") AND ("Coordinator" OR "Director" OR "Manager") AND (municipality OR county OR city) AND Alberta

Generate 12 prospects and two message variants:
- audit-first variant
- procurement-friendly variant
Keep under 250 chars for connection request.
```

## Campaign D — Industrial TIER

```text
Campaign: Industrial TIER compliance
Goal: identify high-value compliance decision-makers.
Search intent:
("Environmental" OR "Compliance" OR "EHS") AND (Manager OR Director OR Lead) AND (TIER OR emissions OR carbon) AND Alberta

Generate 10 prospects with:
- compliance pain hypothesis
- one quant-style hook
- one verification-safe proof link
```

---

## 8) Daily execution runbook (operator timeline)

## Block 1 — Batch generation (20-30 min)
- Run campaign prompt in OpenClaw.
- Review and edit all drafts manually.
- Reject any message with unverifiable claims.

## Block 2 — Engagement prep (20 min)
- Queue profile-specific engagement (likes/comments).
- Ensure context relevance before any action.

## Block 3 — Controlled send window (30-45 min)
- Send in capped batches.
- Maintain delays.
- Stop at first warning signal.

## Block 4 — Logging + feedback loop (20 min)
- Update tracking sheet with outcomes.
- Feed wins/losses back to OpenClaw for next batch tuning.

---

## 9) Weekly KPI review template

Track:
- Acceptance rate
- Reply rate
- Meeting-book rate
- Warning/restriction count
- Persona-level conversion (which campaign performs best)

Decision rules:
- If acceptance < 30% -> tighten targeting and personalization.
- If reply < 12% -> shorten follow-ups and improve open question quality.
- If warnings > 0 -> reduce volume by 50% and run recovery protocol.

---

## 10) Recovery protocol (if LinkedIn warning occurs)

```text
RECOVERY MODE:
1) Pause all automated invite actions for 5 full days.
2) Continue only low-risk manual activity (view, like, human comments) at low volume.
3) Run 3-day manual invite test (very low volume).
4) Resume OpenClaw sends only if manual invites succeed without warnings.
5) Reduce future caps and increase delays.
```

---

## 11) OpenClaw optimization prompts

## Prompt: A/B analysis

```text
Analyze this week's outreach log.
For each campaign:
- acceptance rate by template
- reply rate by template
- meetings by template
- top personalization angles

Then output:
1) winning template pattern
2) losing pattern to remove
3) revised prompt instructions for next week
```

## Prompt: quality linting

```text
Lint the following draft messages for:
- unverifiable claims
- overselling language
- lack of personalization
- excessive length
- missing open question

Return corrected versions with concise rationale.
```

---

## 12) Artifacts to keep in sync

- `docs/COMET_OUTREACH_STRATEGY.md` (OpenClaw campaign source of truth)
- `docs/OPENCLAW_MONETIZATION_IMPLEMENTATION_DELIVERABLE.md` (phase execution and KPIs)
- Tracking sheet (Google Sheet or Notion)

---

## 13) Day-1 Kickstart checklist (fast start)

- [ ] Open console session `main`.
- [ ] Paste session bootstrap prompt.
- [ ] Run Campaign A prompt for 12 prospects.
- [ ] Manually approve and trim to first 8 sends.
- [ ] Log outcomes.
- [ ] Run weekly KPI review template at end of day.

---

**End of kickstart strategy**
