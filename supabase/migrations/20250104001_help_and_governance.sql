-- Migration for help_text and governance_requests tables
-- Run this in Supabase SQL editor

-- Help text table for educational content
create table if not exists public.help_text (
  key text primary key,
  title text not null,
  short text,
  long text,
  last_updated timestamptz default now()
);

alter table public.help_text enable row level security;

-- Allow read access to help_text
create policy help_text_read_policy on public.help_text
  for select using (true);

-- Governance requests for Indigenous consent flow
create table if not exists public.governance_requests (
  id uuid default gen_random_uuid() primary key,
  user_id text,
  panel_id text,
  dataset_path text,
  prompt text,
  status text default 'open',
  created_at timestamptz default now()
);

alter table public.governance_requests enable row level security;

-- Allow service role to insert governance requests
create policy governance_requests_insert_policy on public.governance_requests
  for insert to service_role
  with check (true);

-- Allow service role to read governance requests
create policy governance_requests_read_policy on public.governance_requests
  for select to service_role
  using (true);

-- Seed help_text with comprehensive educational content
insert into public.help_text (key, title, short, long) values
('dashboard.overview', 'Dashboard Overview', 'Real-time energy dashboard with key metrics and trends.',
 '<p>This dashboard displays live Ontario electricity demand, provincial generation mix, Alberta market prices, and weather correlations. All data is updated in real-time to provide current insights into Canada''s energy landscape.</p><p><strong>Educational Focus:</strong> Use the question marks (?) on any card for detailed explanations and classroom activities.</p><p><strong>Classroom Activity:</strong> Have students track demand patterns over 24 hours and discuss what factors might cause peaks and valleys.</p>'),

('provinces.streaming', 'Real-time Streaming Architecture', 'Live data streams from Canadian energy providers.',
 '<p>This section showcases Canada''s real-time energy data streaming architecture. Multiple provincial utilities provide live data streams that are aggregated and visualized here.</p><p><strong>Technical Details:</strong> Uses Server-Sent Events (SSE) for real-time updates, with resilient failover mechanisms.</p><p><strong>Classroom Activity:</strong> Students can observe how data flows from provincial sources to this dashboard, discussing the importance of real-time monitoring for grid stability.</p>'),

('trends.analysis', 'Trend Analysis & Forecasting', 'Advanced analytics for energy market trends.',
 '<p>This section provides predictive analytics and trend identification across Canadian energy data. Uses statistical methods to identify patterns and forecast future energy needs.</p><p><strong>Methods Used:</strong> Moving averages, seasonal decomposition, peak detection algorithms.</p><p><strong>Classroom Activity:</strong> Students analyze historical trends and create their own forecasts using spreadsheet tools, comparing their predictions with actual data.</p>'),

('investment.financial', 'Investment Analysis & NPV', 'Financial evaluation of energy projects.',
 '<p>Investment cards show financial metrics including Net Present Value (NPV), Internal Rate of Return (IRR), and payback periods for energy infrastructure projects.</p><p><strong>Key Metrics:</strong> NPV measures profitability, IRR shows return rate, considering time value of money.</p><p><strong>Classroom Activity:</strong> Students calculate NPV for a hypothetical solar farm project, learning about discount rates and long-term investment evaluation.</p>'),

('resilience.climate', 'Climate Resilience & Adaptation', 'Infrastructure resilience to climate impacts.',
 '<p>This map shows vulnerability scores and adaptation strategies for energy infrastructure against climate change impacts like extreme weather and sea level rise.</p><p><strong>Resilience Metrics:</strong> Exposure to hazards, adaptive capacity, vulnerability indices.</p><p><strong>Classroom Activity:</strong> Students research local climate risks and propose adaptation strategies for energy infrastructure in their community.</p>'),

('innovation.search', 'Innovation & Technology Readiness', 'TRL assessment and funding opportunities.',
 '<p>Innovation search helps identify technologies at different Technology Readiness Levels (TRL) and their funding match potential.</p><p><strong>TRL Scale:</strong> 1-3 (basic research), 4-6 (prototyping), 7-9 (commercial deployment).</p><p><strong>Classroom Activity:</strong> Students evaluate a new energy technology''s TRL and create a commercialization roadmap.</p>'),

('indigenous.consent', 'Indigenous Data Sovereignty', 'FPIC principles and community consent.',
 '<p>This section respects Indigenous data sovereignty and Free, Prior, and Informed Consent (FPIC) principles. Access to Indigenous-related datasets requires community governance approval.</p><p><strong>Key Principles:</strong> Community-led decision making, benefit sharing, cultural preservation.</p><p><strong>Classroom Activity:</strong> Students research Indigenous energy initiatives and discuss the importance of community consent in resource development.</p>'),

('stakeholders.engagement', 'Stakeholder Engagement', 'Community and regulatory stakeholder mapping.',
 '<p>Stakeholder dashboard shows key players in energy decision-making including utilities, regulators, community groups, and Indigenous nations.</p><p><strong>Engagement Strategies:</strong> Regular consultations, information sharing, collaborative planning.</p><p><strong>Classroom Activity:</strong> Students create stakeholder engagement plans for a local energy project, identifying communication strategies for different groups.</p>'),

('gridops.monitoring', 'Grid Operations & Stability', 'Real-time grid monitoring and control.',
 '<p>Grid operations monitor frequency, voltage, reserves, and other stability metrics to ensure reliable electricity supply.</p><p><strong>Key Metrics:</strong> System frequency (target 60 Hz), operating reserves, contingency planning.</p><p><strong>Classroom Activity:</strong> Students simulate grid balancing by adjusting supply to match demand changes, learning about the physics of power system stability.</p>'),

('security.privacy', 'Data Security & Privacy', 'Privacy protection and secure data handling.',
 '<p>This section explains how energy data is collected, stored, and protected according to privacy regulations and security best practices.</p><p><strong>Privacy Measures:</strong> Data minimization, encryption, access controls, user consent.</p><p><strong>Classroom Activity:</strong> Students design a privacy policy for an energy data platform, considering user rights and data protection requirements.</p>'),

('data.provenance', 'Data Provenance & Quality', 'Source verification and data lineage.',
 '<p>Data provenance tracks the origin, processing history, and quality metrics of energy datasets used in this portal.</p><p><strong>Quality Checks:</strong> Completeness, accuracy, timeliness, consistency validation.</p><p><strong>Classroom Activity:</strong> Students trace the journey of electricity demand data from IESO to this dashboard, identifying potential quality issues at each step.</p>'),

('api.programmatic', 'API Access & Documentation', 'Programmatic data access for developers.',
 '<p>API explorer provides documentation and examples for accessing energy data programmatically through REST endpoints and streaming APIs.</p><p><strong>Access Methods:</strong> REST APIs, Server-Sent Events, authentication, rate limiting.</p><p><strong>Classroom Activity:</strong> Students write simple scripts to fetch energy data and create basic visualizations, learning about API integration.</p>'),

('export.citation', 'Data Export & Citation', 'Proper citation and data usage guidelines.',
 '<p>Export functionality allows downloading datasets with proper citation information and usage licenses.</p><p><strong>Citation Format:</strong> APA/MLA styles with dataset metadata and access timestamps.</p><p><strong>Classroom Activity:</strong> Students create properly cited reports using exported energy data, practicing academic writing standards.</p>')
on conflict (key) do update set
  title = excluded.title,
  short = excluded.short,
  long = excluded.long,
  last_updated = now();