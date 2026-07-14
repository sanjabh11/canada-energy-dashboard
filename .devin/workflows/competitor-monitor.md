---
description: Weekly competitor monitoring loop that checks competitor pages for changes and updates the competitive intelligence matrix
---

# Competitor Monitor — Weekly Competitive Intelligence Loop

This workflow runs weekly to monitor competitor pages for changes, update the
competitive intelligence matrix, and alert on material shifts.

## When to Use

- Weekly automated competitor monitoring (GitHub Actions)
- Before product launches or pricing changes
- When tracking competitive positioning shifts

## Prerequisites

- `fable5-with-outreach` skill installed
- `.fable5/STATE.md` exists with competitor baseline
- Competitive intelligence matrix from prior audit

## Loop Definition

**What to accomplish:** Check top 3+ competitors for material changes in
positioning, pricing, features, or messaging.

**How to verify:** Manual review of diffs against last week's snapshot.

**What to do with what was learned:** Update competitive intelligence matrix
in STATE.md. Alert user if material change detected.

**When to stop:** All competitors checked OR no material changes found.

## Execution Steps

1. **Read STATE.md** — Get competitor list and last week's snapshot.

2. **For each competitor:**
   a. Fetch their homepage, pricing page, and product page
   b. Diff against last week's snapshot (stored in `.fable5/competitor-snapshots/`)
   c. Categorize changes: positioning, pricing, features, messaging, team
   d. Save new snapshot

3. **If material change detected:**
   - Send checkpoint message to user: "[COMPETITOR ALERT] {competitor} changed
     {what}. Impact: {assessment}. Recommended action: {suggestion}."
   - Update STATE.md with new competitive fact
   - Flag for inclusion in next full outreach audit

4. **If no changes:** Update STATE.md last session pointer:
   ```
   - Last competitor check: {date}, no material changes across {N} competitors
   ```

5. **Write log entry** — Append to `.fable5/outreach-audit-log.jsonl`:
   ```json
   {
     "step_id": "COMP-{date}",
     "type": "competitor-monitor",
     "competitors_checked": 3,
     "material_changes": 0,
     "snapshots_updated": 3
   }
   ```

## Competitor Snapshot Storage

Store weekly snapshots in `.fable5/competitor-snapshots/`:
```
.fable5/competitor-snapshots/
  {competitor-name}/
    {YYYY-MM-DD}-homepage.html
    {YYYY-MM-DD}-pricing.html
    {YYYY-MM-DD}-product.html
```

## Model Routing

| Role | Model | When |
|---|---|---|
| Page fetcher | Sonnet 4.6 | Fetch and parse competitor pages |
| Diff analyzer | Haiku 4.5 | Compare snapshots, categorize changes |
| Impact assessor | Fable 5 | Assess material impact of changes |
| Alert writer | Opus 4.8 | Draft user alert for material changes |
