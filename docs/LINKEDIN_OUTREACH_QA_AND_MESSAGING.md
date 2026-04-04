# LinkedIn Outreach: Manual QA Checklist & Messaging Guide

**Date:** March 9, 2026
**Context:** This checklist ensures the application is in a safe, adversarial-proof state before initiating the manual Comet/LinkedIn outreach motion, and provides the exact messaging templates mapped to the reconciled 2-SKU strategy.

---

## Part 1: Pre-Outreach Manual QA Checklist

Before sending the first LinkedIn message, manually click through and verify the following on the live production URL (`https://canada-energy.netlify.app`):

### ✅ 1. Consultant Proof Stack
- [ ] **Navigate to `/api-docs`:** Verify the Redoc component loads.
- [ ] **Read the API Docs Header:** Confirm it mentions "Consultant Data Pack" and DOES NOT overclaim "real-time" (it should say "depending on source availability").
- [ ] **Check `/forecast-benchmarking`:** Verify the MAE/MAPE/RMSE metrics display correctly and the `DataFreshnessBadge` is visible.
- [ ] **Check `/overview` (Stakeholder Overview):** Ensure the page loads without layout shifts and the links to `/api-docs` and `/forecast-benchmarking` work.

### ✅ 2. Industrial TIER Proof Stack
- [ ] **Navigate to `/roi-calculator`:** Verify the calculator loads and the arbitrary math updates when sliders are moved.
- [ ] **Navigate to `/regulatory-filing`:** Click the export button for "AUC Rule 005" and verify a CSV downloads.
- [ ] **Navigate to `/shadow-billing`:** Verify the RoLR vs Pool cost comparison UI renders.

### ✅ 3. General Site Health & Trust
- [ ] **Data Freshness Badges:** Spot-check 2-3 dashboards (e.g., `/dashboard`) to ensure the freshness badge shows either "Live" or a clearly marked "Cached/Historical" state. No broken data states.
- [ ] **Pricing Page (`/pricing`):** Verify the "Consultant Data Pack" is prominently featured and links to the correct checkout or lead form.
- [ ] **Enterprise Page (`/enterprise`):** Ensure the contact form renders and is clearly separated from Whop-based retail flows.
- [ ] **Top 20 Features (`/Top20.md` or via repo):** Confirm the latest March 9 version is live, foregrounding the Consultant and Industrial packs.

---

## Part 2: LinkedIn Messaging Templates

These templates are designed for manual use alongside Comet research. They are strictly aligned with the agreed adversarial limits (no overclaiming, no fake social proof).

### 🟢 1. The Energy Consultant (Data Pack Focus)
**Target:** Data Analysts, Grid Modelers, Managing Partners at consulting firms.
**Goal:** Drive to `/api-docs` or `/overview`.

**Message 1 (Connection Request):**
> Hi {Name}, I'm building a centralized data layer for Canadian energy compliance and grid modeling. I noticed {Company}'s work on {Recent Project/Topic}. I'd love to connect and share what we're building for consultant workflows.

**Message 2 (Follow-up / Value Drop):**
> Thanks for connecting, {Name}. We just launched a Consultant Data Pack that structures AESO/IESO data alongside forecast benchmarking (MAE/RMSE) and regulatory templates. 
>
> If your team is spending time manually scraping grid data or formatting AUC/OEB filings, I think this could save you hundreds of hours. 
> 
> You can see the API specs here: canada-energy.netlify.app/api-docs 
> Or a high-level overview here: canada-energy.netlify.app/overview
> 
> Open to a brief chat next week?

### 🔵 2. The Industrial Facility (TIER Compliance Focus)
**Target:** Sustainability Managers, Operations Leads, Compliance Officers in Alberta.
**Goal:** Drive to `/roi-calculator` or `/shadow-billing`.

**Message 1 (Connection Request):**
> Hi {Name}, I noticed you're leading operations at {Company}. I'm working on a platform that helps Alberta industrials optimize their TIER compliance and shadow billing. Would be great to connect with another local energy professional.

**Message 2 (Follow-up / Value Drop):**
> Appreciate the connection, {Name}. With the current spread between EPCs and offsets, we built a tool to help facilities model their TIER liability and optimize their compliance strategy.
> 
> We have a free ROI calculator up right now that you can use to benchmark your facility: canada-energy.netlify.app/roi-calculator
> 
> We also handle automated regulatory filing exports. Let me know if you'd be open to seeing a quick demo of how it works.

### 🟣 3. The Utility / REA / Municipal Planner (Asset Health Focus)
**Target:** Asset Managers, Co-op Leads, Municipal Sustainability Officers.
**Goal:** Drive to `/asset-health` or `/regulatory-filing`.

**Message 1 (Connection Request):**
> Hi {Name}, I'm building tools specifically for Canadian utilities and REAs to manage asset health indexing and regulatory filings. I follow {Municipality/Co-op}'s work and would love to connect.

**Message 2 (Follow-up / Value Drop):**
> Hi {Name}, thanks for connecting. We've built a CBRM-lite asset health index tool and automated AUC/OEB export templates specifically for teams that don't need massive enterprise software but still have strict compliance needs.
>
> You can test the asset health scoring here: canada-energy.netlify.app/asset-health
>
> I'd love to get your feedback on it if you have 10 minutes next week.
