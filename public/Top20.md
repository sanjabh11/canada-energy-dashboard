Top 20 relevant points about this app / website
Learning‑focused energy intelligence platform
A full Canada Energy Intelligence Platform (CEIP) combining real‑time grid data, policy/ESG analytics, and educational UX so communities can learn, simulate, and decide around Canadian energy transitions.
Production‑grade dashboard suite (20+ modules)
Multiple React dashboards: AI data centres, hydrogen economy, critical minerals, SMR deployment, grid interconnection queues, capacity markets, EV charging, VPP/DER aggregation, heat pumps, CCUS, carbon emissions, ESG finance, industrial decarbonization, and climate policy/compliance.
Real‑time grid and market data integration
Live and historical integrations for IESO/AESO demand, prices, storage dispatch, and weather—plus cron jobs for continuous ingestion—so communities can track market conditions and backtest strategies.
High‑quality, mostly real data (95%+ static, strong time‑series)
Backed by seeded and imported data from ECCC, IESO, AESO, NPRI, CER, issuer disclosures, ESG providers (MSCI/Sustainalytics/Yahoo Finance), and government programs, with SQL fix scripts to eliminate nearly all mock data.
ESG & sustainable finance analytics layer
ESG Finance and Industrial Decarbonization dashboards track green bonds, sustainability‑linked loans, ESG scores, carbon pricing exposure, methane reduction, OBPS compliance, and industrial efficiency projects.
Regulatory intelligence & climate policy module
Hardened v2 APIs and dashboards for CER compliance, provincial GHG emissions, carbon targets, climate policies, and interconnection queues, giving communities a structured view of regulatory risk and opportunity.
AI / LLM‑powered analytics (5x effectiveness roadmap)
A dedicated LLM enhancement plan (RAG, pgvector, multi‑model ensemble, caching, evals) plus prompt templates to turn the dashboard into an AI analyst that explains trends, surfaces opportunities, and answers policy/market questions.
Indigenous Energy Sovereignty dashboard
A specialized module for Indigenous energy projects: tracking territories, consultations, FPIC workflows, Traditional Ecological Knowledge (TEK), and projects mapped onto territories with visual charts and maps.
Deep Indigenous project intake form (OCAP® + UNDRIP aware)
A multi‑step 
IndigenousProjectForm
 that captures project basics, technology, capacity, timelines, financials, revenue‑sharing, impact metrics, partners, FPIC/UNDRIP compliance, and OCAP® data‑sovereignty controls (visibility, data owner, consent).
Governance‑first approach to Indigenous data
The Indigenous module is explicitly wired around governance, FPIC, and OCAP®: placeholder data only by default, governance warnings in‑UI, consent documentation fields, and visibility modes (public, network‑only, private).
Local project registry + map for Indigenous communities
Projects are stored via a local registry (with export) and visualized as territories and points on a map, summarizing consultation status, TEK categories, and project details—useful for communities, advisors, and funders.
Cohort admin system for structured learning programs
A 
CohortAdminPage
 lets an “edubiz” owner create cohorts, invite learners by email, track membership and completion status, and run credentialed learning programs on top of the energy dashboards (ideal for courses, accelerators, or training communities).
API‑first architecture with secure v2 Edge Functions
Supabase Edge Functions expose key datasets (AI data centres, hydrogen, minerals, regulatory data, ESG, industrial decarb, Indigenous registries) through v2 APIs with API keys, telemetry, and RLS policies—ready for integrations or white‑label tooling.
OWASP‑aligned security posture
Input validation helpers, strict CORS allowlists, no hardcoded secrets, safe error handling, and RLS on tables; security audits confirm no leaked keys and proper parameter validation across edge functions.
Telemetry and rate‑limiting scaffold for commercial use
An api_usage table and helper logic to log endpoint, status, IP, and filters—designed so per‑key and per‑IP rate limits and usage‑based billing can be enforced later for paying communities or app customers.
Real storage dispatch & renewable optimization engine
A storage optimization module tracks battery SoC, dispatch events, curtailment reduction, and revenue impacts, with evidence of MWh, SoC trajectories, and ROI—highly relevant to trading, DER, and VPP communities.
Comprehensive documentation & QA discipline
20k+ words of implementation docs, gap analysis, QA checklists, security audits, LLM plans, and strategic notes, plus a manual QA pass (no console errors, filters working, dashboards stable) and a clear deployment pipeline (Netlify + Supabase).
Modular, extensible React + Supabase tech stack
Modern React front‑end (Vite, Tailwind‑style classes, Recharts), Supabase Postgres + Edge Functions backend, and clear project structure, making it straightforward to spin off niche dashboards or Whop‑specific variants.
Production‑ready deployment story
The app is already wired for production (Netlify deploy, Supabase environment, SQL fix scripts, environment‑based CORS, build + preview commands), so turning it into a Whop‑hosted SaaS front‑end is largely packaging and integration work.
Clear pathway to monetizable niches on Whop
The existing feature set aligns with multiple high‑value communities: ESG/finance groups (green bonds, carbon risk), energy/AI infrastructure communities (data centres, grid queues), Indigenous energy networks (project registry + FPIC tooling), and education/cohort‑driven communities (cohort admin + learning dashboards).