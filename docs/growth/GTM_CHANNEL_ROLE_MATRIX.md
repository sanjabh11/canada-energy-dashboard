# CEIP GTM Channel-Role Matrix (Hybrid Motion)

## Purpose
Prevent channel drift by assigning a single role to each acquisition channel.

## Canonical Matrix
| Channel | Role | Primary CTA | Success KPI |
|---|---|---|---|
| Whop | Wedge + trials + discovery | Start trial / mini-suite | Trial activation rate |
| Direct (site + outbound) | Consultancy/municipal/industrial closes | Book consult/demo | Qualified meetings + pilot-to-paid |
| Partner | Referral acceleration | Intro request | Partner-sourced opportunities |

## Non-Goals
- Do not force enterprise buyers through Whop checkout UX.
- Do not run mixed pricing narratives on the same page.

## Route Intents (Implemented)
- `/whop/discover` => `whop_wedge_discovery`
- `/watchdog` => `whop_wedge_trial`
- `/pricing` => `direct_offer_selection`
- `/enterprise` => `direct_consult_demo`
