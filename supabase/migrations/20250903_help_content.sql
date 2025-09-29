-- Help Content System Migration
-- Creates educational help content database for contextual learning features
-- This migration is idempotent and can be run multiple times safely

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- help_content table - stores educational content for contextual help
CREATE TABLE IF NOT EXISTS public.help_content (
  id TEXT PRIMARY KEY,              -- e.g. "tab.dashboard", "tab.provinces"
  short_text TEXT NOT NULL,         -- < 160 chars used for tooltip
  body_md TEXT NOT NULL,            -- markdown for expanded content
  discipline_tags TEXT[],           -- search tags ['policy','grid','indigenous']
  related_sources JSONB,            -- provenance links [{name:string, url:string}]
  last_updated timestamptz DEFAULT now(),
  author TEXT
);

-- help_feedback table - stores user feedback for content improvement
CREATE TABLE IF NOT EXISTS public.help_feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  help_id text NOT NULL,            -- references help_content.id
  user_id text,                     -- optional user identifier
  rating smallint,                  -- 1-5 stars feedback
  comment text,                     -- optional text feedback
  ts timestamptz DEFAULT now()
);

-- indexes for performance and search
CREATE INDEX IF NOT EXISTS idx_help_content_tags ON public.help_content USING gin (discipline_tags);
CREATE INDEX IF NOT EXISTS idx_help_content_last_updated ON public.help_content (last_updated);
CREATE INDEX IF NOT EXISTS idx_help_feedback_help_id ON public.help_feedback (help_id);
CREATE INDEX IF NOT EXISTS idx_help_feedback_ts ON public.help_feedback (ts);

-- Seed content for all navigation tabs with comprehensive educational content
INSERT INTO public.help_content (id, short_text, body_md, discipline_tags, related_sources, author)
VALUES
('tab.home',
 'Intro to the portal: mission, live streams, and how to start exploring.',
 $$## Home — What is this site?
This portal provides real-time and historical views of Canada's energy systems to help citizens, students and local planners understand energy supply, demand, prices and climate interactions.

**How to use the Home page**
- See live system health, total records, and quick access panels.
- Click a panel to jump to the detailed Dashboard or Province page.

**Classroom prompts**
1. Pick one metric shown and explain why it matters for energy policy.
2. Identify three data sources used on this site and explain their roles.
3. Create a short summary (3 sentences) you could share with a neighbour about what 'net-zero' means and how this dashboard helps.

**Provenance**
- Aggregated from IESO, AESO, ECCC, and curated historical datasets (Kaggle/HF).$$,
 ARRAY['overview','home','introduction'],
 '[{"name":"IESO","url":"https://www.ieso.ca"},{"name":"ECCC","url":"https://weather.gc.ca/"}]',
 'CEIP Team'
),
('tab.dashboard',
 'Live metrics: demand, generation mix, prices, and weather correlations. Hover charts for details.',
 $$## Dashboard — Live system view
The Dashboard provides a near real-time snapshot across multiple panels:
- **Ontario Hourly Demand**: current demand in MW over time.
- **Provincial Generation Mix**: share and absolute generation per fuel.
- **Alberta Supply & Demand**: supply, demand and pool price.
- **Weather Correlation**: temperature or wind correlations vs demand.

**How to read charts**
- Time series: hover to see exact timestamp and value; zoom if available.
- Stacked bars (generation mix): height = total generation; color = source share.
- Dual-axis charts: check axis labels carefully (left = MW, right = price $/MWh).

**Classroom prompts**
1. When did the last large drop in demand occur? What weather or calendar event might explain it?
2. Identify a time where renewable share rose sharply. What could cause that?
3. Compare price volatility to renewables: is there a correlation?

**Activity**
Export a 24-hour snapshot (use the export button) and plot demand vs temperature in a simple spreadsheet. Add a 1-sentence interpretation.

**Provenance**
IESO (Ontario), AESO (Alberta), ECCC (weather), Kaggle (historical backfill).$$,
 ARRAY['dashboard','overview','metrics','real-time'],
 '[{"name":"IESO Market Data","url":"https://www.ieso.ca"},{"name":"AESO","url":"https://www.aeso.ca"}]',
 'CEIP Team'
),
('tab.provinces',
 'Explore province-specific streams: dispatch, generation, demand and local notes.',
 $$## Provinces — provincial dashboards
Each province has a dedicated page showing live and historical data: generation mix, local demand, prices, and notable infrastructure.

**How to use Province pages**
- Select a province from the list to view local details.
- Read the "Notes" section for local policy context (e.g., nuclear plants in ON, hydro in QC).

**Classroom prompts**
1. Compare two provinces' energy mixes and propose one factor explaining differences.
2. Find a province with high hydro share and discuss seasonality impacts.
3. Identify local energy infrastructure (e.g., transmission bottleneck) from the notes.

**Activity**
Pick your province and prepare a 3-bullet summary: main generation sources, peak hours, climate impacts.

**Provenance**
Provincial operators (IESO, AESO, Hydro-Quebec), statistical agencies, Kaggle (provincial histories).$$,
 ARRAY['province','regional','governance','local-energy'],
 '[{"name":"Hydro-Quebec","url":"https://www.hydroquebec.com"},{"name":"IESO","url":"https://www.ieso.ca"}]',
 'CEIP Team'
),
('tab.trends',
 'Historical and predictive trend analysis — long-term patterns and forecasting hints.',
 $$## Trends — long-term patterns
Trends compares historical snapshots to reveal long-term changes: renewable uptake, price trends, and demand changes.

**Reading trends**
- Use smoothing windows (7-day, 30-day) to view seasonal changes.
- Look for structural shifts (e.g., rising renewables after policy changes).

**Student prompts**
1. Find a structural change in the 10-year generation trend and explain possible causes.
2. Estimate renewable growth rate over the last 5 years.
3. Discuss how electrification (e.g., EVs) may change future demand shapes.

**Activity**
Choose one metric and create a 5-year chart comparing the first and last year averages. Write a short interpretation.

**Provenance**
Kaggle historical datasets, Statistics Canada, and public operator time series.$$,
 ARRAY['trends','historical','forecasting','analysis'],
 '[{"name":"Statistics Canada","url":"https://www.statcan.gc.ca"},{"name":"Kaggle","url":"https://www.kaggle.com"}]',
 'CEIP Team'
),
('tab.investment',
 'Investment module: evaluate projects, NPV/IRR, risk & portfolio views for energy investments.',
 $$## Investment — analyzing projects
This module helps simulate simple investment analytics (NPV, IRR, sensitivity) for energy projects and portfolios.

**How to read the cards**
- Each project shows projected cash flows and a stability/ESG score.
- Portfolio view aggregates NPV/IRR and diversification metrics.

**Student prompts**
1. What happens to a project's NPV if discount rate increases by 2%? Recompute and interpret.
2. Why is diversification important for energy portfolios?

**Activity**
Open an Investment card, change the discount rate and observe NPV/IRR changes. Report how risk tolerance shifts investment ranking.

**Provenance**
Publicly available cost/forecast inputs, simulated cash-flow models (educational).$$,
 ARRAY['finance','investment','risk','economics'],
 '[{"name":"Public cost sources","url":"#"}]',
 'CEIP Team'
),
('tab.resilience',
 'Infrastructure resilience and climate scenarios — vulnerabilities and adaptation options.',
 $$## Resilience — climate risk to energy systems
Resilience shows the vulnerability of energy systems (transmission, generation) to extreme weather and climate scenarios.

**How to read**
- Map overlays indicate at-risk substations and expected climate stress.
- Scenario toggles (RCPs) show projected impacts.

**Student prompts**
1. Identify one high-risk transmission corridor and suggest a resilience measure.
2. Explain how floods or heatwaves impact generation and distribution.

**Activity**
Run a scenario comparing a 'moderate' vs 'extreme' climate projection for your region and list 3 recommended adaptation actions.

**Provenance**
ECCC climate projections, provincial infrastructure datasets.$$,
 ARRAY['resilience','climate','adaptation','infrastructure'],
 '[{"name":"ECCC","url":"https://www.canada.ca/en/environment-climate-change.html"}]',
 'CEIP Team'
),
('tab.innovation',
 'Innovation topics: tech readiness, commercialization pathways and funding opportunities.',
 $$## Innovation — where to find new solutions
This page highlights technologies approaching commercialization, time-to-market, and possible funding pathways.

**How to read**
- TRL/TRL-like scores indicate maturity.
- Funding match suggests public programs or grants.

**Student prompts**
1. Choose an innovation and list the 3 biggest obstacles to adoption.
2. How might policy accelerate or block this innovation?

**Activity**
Pick an innovation and draft a 3-point commercialization checklist.

**Provenance**
National labs, NRC, public research repositories.$$,
 ARRAY['innovation','technology','research','commercialization'],
 '[{"name":"NRC","url":"https://nrc.canada.ca"}]',
 'CEIP Team'
),
('tab.indigenous',
 'Indigenous engagement & energy equity — principles, projects and consultation guidance.',
 $$## Indigenous — rights, projects and partnership
This section summarizes Indigenous-led energy projects, consultation status, and equity approaches. It is curated with a focus on respect and sovereignty.

**How to read**
- Each project includes FPIC (Free, Prior, Informed Consent) status, community points of contact, and benefit-sharing notes.
- Respect protocols are summarized (not legal advice).

**Student prompts**
1. What is FPIC and why does it matter for infrastructure projects?
2. Identify a successful community-led energy project and list its success factors.

**Activity**
Summarize in 3 bullets how meaningful engagement changes project outcomes.

**Provenance**
Community resources, Indigenous organizations, public consultation records.

**Caveat**
If content touches sensitive Indigenous data, route to community authorship / approval before releasing.$$,
 ARRAY['indigenous','community','equity','fpic','reconciliation'],
 '[{"name":"Assembly of First Nations","url":"https://www.afn.ca/"}]',
 'CEIP Team'
),
('tab.stakeholders',
 'Who the main stakeholders are (federal, provincial, Indigenous, community, industry) and their roles.',
 $$## Stakeholders — roles and responsibilities
A quick guide to the different stakeholders that shape energy decisions: federal departments, provincial regulators, utilities, Indigenous nations, local governments, and NGOs.

**How to read**
- Each stakeholder card explains scope, decision power, and typical inputs/requests.

**Student prompts**
1. Identify which stakeholder would approve a transmission upgrade in your province.
2. How can communities influence energy policy?

**Activity**
Map the stakeholders for a small project in your area and highlight decision points.$$,
 ARRAY['stakeholder','policy','governance','participation'],
 '[{"name":"NRCan","url":"https://www.nrcan.gc.ca/"}]',
 'CEIP Team'
),
('tab.gridops',
 'Grid operations: balancing, reserves, market dispatch, and system reliability indicators.',
 $$## Grid Ops — balancing and dispatch
Grid Ops page explains system balancing, reserves, congestion and how markets dispatch supply.

**How to read**
- Frequency, reserve margin and ramp rates are key metrics.
- Market dispatch shows order of merit (lowest cost first).

**Student prompts**
1. What is ''reserve margin'' and why does it matter for reliability?
2. How does market dispatch impact which plants run?

**Activity**
Find a period of tight reserves and examine price impacts.$$,
 ARRAY['gridops','operations','reliability','market-dispatch'],
 '[{"name":"IESO","url":"https://www.ieso.ca/"}]',
 'CEIP Team'
),
('tab.security',
 'Cyber and physical security implications for energy systems and typical protective measures.',
 $$## Security — cyber and physical
An overview of system security for energy networks: attacks, common vulnerabilities, and mitigation.

**How to read**
- Alerts show known incidents and status.
- Protective measures: segmentation, monitoring, incident response.

**Student prompts**
1. Why is operational technology (OT) security different from IT security?
2. List three basic controls that would reduce operational risk.

**Activity**
Write a short incident response checklist for local grid ops.$$,
 ARRAY['security','cyber','operational-technology','critical-infrastructure'],
 '[{"name":"CSE","url":"https://cyber.gc.ca/"}]',
 'CEIP Team'
),
('module.indigenous.overview',
 'Overview of Indigenous sovereignty dashboard, data sources, and stewardship protocols.',
 $$## Indigenous Overview — sovereignty-first analytics
This dashboard amplifies Indigenous-led energy initiatives while upholding nation-to-nation governance.

**Key concepts**
- FPIC status, consultation stages, and benefit-sharing are highlighted for every project.
- Data shown here is illustrative and must be replaced with community-approved sources before production use.

**Using this view**
- Review the governance banner before sharing insights.
- Use the metrics cards to gauge consultation progress and identify follow-up actions.

**Protocol reminder**
Always validate outputs with Indigenous partners prior to distribution.$$,
 ARRAY['indigenous','sovereignty','governance'],
 '[{"name":"Assembly of First Nations","url":"https://www.afn.ca/"}]',
 'Indigenous Governance Working Group'
),
('module.indigenous.governance',
 'Guidance on FPIC, data sovereignty, and safe handling of Indigenous energy information.',
 $$## Indigenous Governance Protocols
- Confirm Free, Prior, and Informed Consent (FPIC) with communities before operational use.
- Follow Indigenous data sovereignty frameworks (OCAP®, CARE principles) for storage, sharing, and archival.
- Route any new data ingestion through community-approved agreements and ensure opt-in consent tracking.

**Escalation**
Contact the Indigenous governance team before enabling real data streams or exporting sensitive insights.$$,
 ARRAY['indigenous','protocols','fpic'],
 '[{"name":"First Nations Information Governance Centre","url":"https://fnigc.ca"}]',
 'Indigenous Governance Working Group'
),
('metric.indigenous.total_territories',
 'Explains how total territory count is derived and how to interpret gaps.',
 $$### Total Territories Metric
Shows the number of territories represented in the current dataset (approved plus placeholder records).

- **What it means**: each entry represents a distinct territory with consultation tracking enabled.
- **When it spikes**: new partnerships or data imports.
- **Validation**: confirm territories align with community-approved boundaries before publishing.$$,
 ARRAY['indigenous','metrics','territories'],
 '[{"name":"NRCan Indigenous Mapping","url":"https://maps-cartes.services.gc.ca/"}]',
 'CEIP Team'
),
('metric.indigenous.ongoing_consultations',
 'Tracks consultations currently active for Indigenous territories.',
 $$### Ongoing Consultations
Counts territories whose consultation status is marked as ongoing.

- Use this to coordinate engagement cadence.
- Pair with FPIC workflow details to ensure obligations are met.
- Investigate anomalies (e.g., prolonged "ongoing") with community liaisons.$$,
 ARRAY['indigenous','consultation','engagement'],
 '[{"name":"Impact Assessment Agency","url":"https://www.canada.ca/en/impact-assessment-agency.html"}]',
 'CEIP Team'
),
('metric.indigenous.completed_consultations',
 'Highlights communities where consultation commitments are fulfilled.',
 $$### Completed Consultations
Represents territories that reported completion of consultation commitments.

- Ensure completion is confirmed by community sign-off.
- Use to document success stories and share best practices.$$,
 ARRAY['indigenous','consultation','success'],
 '[{"name":"Crown-Indigenous Relations","url":"https://www.rcaanc-cirnac.gc.ca/"}]',
 'CEIP Team'
),
('metric.indigenous.completion_rate',
 'Percentage of territories with completed consultations.',
 $$### Completion Rate
Calculated as completed territories divided by total tracked territories.

- Use to monitor progress toward consultation objectives.
- Highlight gaps where additional support is required.$$,
 ARRAY['indigenous','metrics','progress'],
 '[{"name":"Indigenous Services Canada","url":"https://www.sac-isc.gc.ca/"}]',
 'CEIP Team'
),
('chart.indigenous.consultation_status',
 'Explains pie chart segmentation for consultation stages.',
 $$### Consultation Status Chart
- **Green**: completed
- **Gold**: ongoing
- **Red**: pending
- **Gray**: not yet started

Use this visual to brief leadership on where to focus facilitation efforts.$$,
 ARRAY['indigenous','visualization','consultation'],
 '[{"name":"CEIP Consultation Playbook","url":"#"}]',
 'CEIP Team'
),
('chart.indigenous.tek_categories',
 'Breaks down Traditional Ecological Knowledge (TEK) entries by category.',
 $$### Traditional Ecological Knowledge Categories
Shows the volume of TEK entries grouped by cultural, environmental, spiritual, and economic themes.

Ensure TEK handling complies with cultural protocols and community consent.$$,
 ARRAY['indigenous','tek','knowledge'],
 '[{"name":"First Peoples Cultural Council","url":"https://fpcc.ca"}]',
 'CEIP Team'
),
('module.indigenous.map',
 'Guides use of the territory map and highlights sovereignty safeguards.',
 $$## Territory Map Guidance
- Hover territories to view consultation details.
- Map points indicate active engagements or workshops.
- Confirm coordinates with communities prior to sharing publicly.

**Privacy note**
Only display community-approved geographic data.$$,
 ARRAY['indigenous','map','territory'],
 '[{"name":"Native Land Digital","url":"https://native-land.ca"}]',
 'Indigenous Governance Working Group'
),
('module.stakeholder.overview',
 'Orientation for the stakeholder coordination workspace.',
 $$## Stakeholder Coordination Overview
Use this dashboard to orchestrate consultations, manage meetings, and analyse cross-stakeholder sentiment.

- Metric cards summarise participation and tone.
- Charts surface engagement trends and priority issues.
- Real-time collaboration panel keeps teams aligned.$$,
 ARRAY['stakeholder','coordination','engagement'],
 '[{"name":"Impact Assessment Agency","url":"https://www.canada.ca/en/impact-assessment-agency.html"}]',
 'Stakeholder Engagement Team'
),
('module.stakeholder.protocols',
 'Best practices for multi-stakeholder engagement governance.',
 $$## Stakeholder Engagement Protocols
- Respect confidentiality agreements and consent preferences.
- Record meetings, notes, and follow-ups transparently.
- Coordinate with Indigenous and provincial leads before sharing decisions.

Refer to agency-specific engagement frameworks when planning outreach.$$,
 ARRAY['stakeholder','protocols','governance'],
 '[{"name":"Canadian Environmental Assessment Agency","url":"https://www.canada.ca/en/environmental-assessment-agency.html"}]',
 'Stakeholder Engagement Team'
),
('metric.stakeholder.total',
 'Definition of the total stakeholders metric and data hygiene tips.',
 $$### Total Stakeholders
Counts unique stakeholder profiles with active records.

- Keep contacts up to date via the stakeholder admin interface.
- Archive inactive stakeholders to maintain clarity.$$,
 ARRAY['stakeholder','metrics','directory'],
 '[{"name":"Stakeholder Registry","url":"#"}]',
 'CEIP Team'
),
('metric.stakeholder.upcoming_meetings',
 'Explains how upcoming meetings are tracked and displayed.',
 $$### Upcoming Meetings
Shows the number of scheduled meetings with a future start time.
- Use the meeting drawer to confirm agendas and participants.
- Cross-check with consultation plans to avoid overlaps.$$,
 ARRAY['stakeholder','meetings','coordination'],
 '[{"name":"Consultation Planner","url":"#"}]',
 'CEIP Team'
),
('metric.stakeholder.average_sentiment',
 'Interpreting the sentiment metric derived from feedback and messages.',
 $$### Average Sentiment
Aggregates analysed feedback sentiment on a -1 to 1 scale (displayed as a percentage).

- Watch for downward trends signalling engagement risks.
- Combine with feedback categories to prioritise responses.$$,
 ARRAY['stakeholder','sentiment','analytics'],
 '[{"name":"Sentiment Analysis Guide","url":"#"}]',
 'CEIP Team'
),
('metric.stakeholder.feedback_entries',
 'Counts feedback submissions logged within the selected window.',
 $$### Feedback Entries
Total number of feedback records analysed in the current view.
- Encourage stakeholders to submit follow-up notes.
- Tag feedback for quicker triage.$$,
 ARRAY['stakeholder','feedback','analytics'],
 '[{"name":"Engagement Feedback Toolkit","url":"#"}]',
 'CEIP Team'
),
('chart.stakeholder.sentiment_trend',
 'How to read the seven-day sentiment trend chart.',
 $$### Sentiment Trend Chart
Displays average sentiment per day over the past week.
- Purple line indicates overall tone; hover to see daily details.
- Low counts may reduce confidence; collect more feedback for accuracy.$$,
 ARRAY['stakeholder','sentiment','visualization'],
 '[{"name":"Consultation Analytics","url":"#"}]',
 'CEIP Team'
),
('chart.stakeholder.feedback_categories',
 'Explains the bar chart grouping feedback themes.',
 $$### Feedback Categories Chart
Shows frequency of tagged feedback categories.
- Identify recurring themes to plan follow-up actions.
- Use alongside sentiment data for context.$$,
 ARRAY['stakeholder','feedback','visualization'],
 '[{"name":"Engagement Analytics","url":"#"}]',
 'CEIP Team'
)
ON CONFLICT (id) DO UPDATE
  SET short_text = EXCLUDED.short_text,
      body_md = EXCLUDED.body_md,
      discipline_tags = EXCLUDED.discipline_tags,
      related_sources = EXCLUDED.related_sources,
      last_updated = now(),
      author = EXCLUDED.author;

COMMIT;