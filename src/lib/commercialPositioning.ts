export type BuyerSegment =
  'Utility' | 'Industrial' | 'Security' | 'Indigenous/Community' | 'Municipal/Public Sector';

export interface CommercialWedge {
  id: string;
  rank: number;
  title: string;
  /**
   * Current sellability-confidence rating from the active strategy audit.
   * Keep this conservative until buyer evidence passes the 95% pilot gate.
   */
  score: number;
  href: string;
  proofHref: string;
  proofLabel: string;
  primaryBuyer: string;
  buyerSegment: BuyerSegment;
  pain: string;
  outcome: string;
  whyNow: string;
  timelineToValue: string;
  pilotScope: string;
  currentState: string;
}

export interface SupportSurface {
  id: string;
  title: string;
  href: string;
  role: string;
}

export interface SegmentNarrative {
  id: BuyerSegment;
  headline: string;
  summary: string;
  priorities: string[];
}

export const buyerSegments: BuyerSegment[] = [
  'Utility',
  'Industrial',
  'Security',
  'Indigenous/Community',
  'Municipal/Public Sector',
];

const activeCommercialWedges: CommercialWedge[] = [
  {
    id: 'utility-demand-forecast',
    rank: 1,
    title: 'Utility Demand Forecasting Lane',
    score: 4.5,
    href: '/utility-demand-forecast',
    proofHref: '/forecast-benchmarking',
    proofLabel: 'Benchmark and provenance appendix for every planning pack',
    primaryBuyer: 'Utilities, REAs, planning consultants, large-load advisors',
    buyerSegment: 'Utility',
    pain: 'Utilities need scenario-ready forecasts that tie electrification, large loads, DER offsets, and regulatory narratives into one planning package.',
    outcome:
      'Turns prediction into a board/regulator-ready planning artifact instead of a generic AI claim.',
    whyNow:
      'Ontario and Alberta planners are dealing with electrification, data-centre load growth, and more scrutiny around planning assumptions.',
    timelineToValue:
      '2 to 4 weeks for a pilot forecast pack with scenario assumptions and export outputs.',
    pilotScope:
      'One utility service territory or public-system sample, one scenario model, one planning memo and export pack.',
    currentState:
      'Implemented route and proof pack; now front-door product with public-sample manifest and benchmark/provenance exports.',
  },
  {
    id: 'regulatory-filing',
    rank: 3,
    title: 'OEB/AUC Regulatory Filing Packs',
    score: 4.3,
    href: '/regulatory-filing',
    proofHref: '/utility-demand-forecast',
    proofLabel:
      'Forecast rows, asset rows, reliability notes, and assumptions feeding filing review',
    primaryBuyer: 'Utilities, REAs, small LDCs, planning consultants',
    buyerSegment: 'Utility',
    pain: 'Distribution utilities still spend manual time converting forecasts, asset evidence, and reliability narratives into regulator-ready formats.',
    outcome:
      'Cuts filing prep time and turns utility planning data into exportable schedules buyers recognize instantly.',
    whyNow:
      'OEB Chapter 5 and AUC Rule 005 continue to require structured evidence, repeatable schedules, and defensible capex narratives.',
    timelineToValue: '2 to 4 weeks for a pilot with one filing package or one sample schedule set.',
    pilotScope:
      'One jurisdiction, one reviewer checklist, one export pack, one internal reviewer workflow.',
    currentState:
      'Implemented route and proof helpers; needs continued sample-pack polish but belongs in the critical utility spine.',
  },
  {
    id: 'forecast-benchmarking',
    rank: 2,
    title: 'Forecast Benchmarking and Provenance Layer',
    score: 4.6,
    href: '/forecast-benchmarking',
    proofHref: '/utility-demand-forecast',
    proofLabel: 'MAE, MAPE, RMSE, persistence, seasonal-naive, source, and fallback labels',
    primaryBuyer: 'Forecast reviewers, utility consultants, regulatory analysts',
    buyerSegment: 'Utility',
    pain: 'Forecast buyers need defensible evidence before trusting scenario outputs in planning, filings, or board material.',
    outcome:
      'Makes every forecast claim inspectable through baselines, source labels, warnings, and assumption packs.',
    whyNow:
      'Generic AI claims are easy to discount; buyers need proof that a forecast is better than persistence and clearly sourced.',
    timelineToValue: 'Same day once a forecast pack exists.',
    pilotScope: 'One backtest appendix attached to every utility planning export.',
    currentState: 'Implemented metrics and route; now enforced in utility planning exports.',
  },
  {
    id: 'ga-ici-5cp',
    rank: 4,
    title: 'Ontario GA/ICI 5CP Decision-Support Pack',
    score: 4.2,
    href: '/ga-ici-5cp',
    proofHref: '/forecast-benchmarking',
    proofLabel:
      'IESO Peak Tracker source notes, top-five watchlist, historical backtest, and settlement-boundary caveats',
    primaryBuyer: 'Ontario Class A industrials, energy managers, and peak-response advisors',
    buyerSegment: 'Utility',
    pain: 'ICI participants need to understand candidate coincident-peak exposure without treating a dashboard as an operational curtailment instruction.',
    outcome:
      'Turns Ontario-specific peak risk into a decision-support artifact with IESO source boundaries and no savings guarantee.',
    whyNow:
      'Global Adjustment exposure is high-stakes and Ontario-specific, while broad utility tools rarely package 5CP evidence for smaller buyers.',
    timelineToValue: '1 to 2 weeks with redacted interval load and IESO peak-source notes.',
    pilotScope:
      'One base-period load extract, one candidate top-five watchlist, one peak-demand-factor estimate, and one reviewer boundary memo.',
    currentState:
      'Implemented route, IESO Peak Tracker ingestion, historical watchlist backtest, retained-extract helper, and no-savings/no-settlement guardrails.',
  },
  {
    id: 'byo-csv-proof',
    rank: 5,
    title: 'Privacy-Preserving BYO-CSV Proof Generator',
    score: 4.1,
    href: '/byo-csv-proof',
    proofHref: '/pilot-readiness',
    proofLabel:
      'Local CSV schema/completeness screen, direct-identifier guard, formula-risk screen, linkage warnings, and hashable retained extract',
    primaryBuyer: 'Utility privacy, security, procurement, and planning reviewers',
    buyerSegment: 'Security',
    pain: 'Prospects hesitate to share utility files before they can prove what the artifact will retain and what stays outside the repo.',
    outcome:
      'Creates a local-first redacted evidence extract that can move a pilot forward without retaining raw cell values.',
    whyNow:
      'Data-sharing scrutiny is the main adoption blocker for utility proof packs; local-only redacted extracts reduce the first-pilot friction.',
    timelineToValue: 'Same day for a redacted sample or local reviewer-approved CSV.',
    pilotScope:
      'One CSV schema/completeness proof, direct-identifier and formula-risk report, linkage-warning note, and SHA-256 evidence handle.',
    currentState:
      'Implemented route, browser-local CSV handling, retained-extract helper, direct-identifier blocking, spreadsheet formula-risk blocking, and quasi-identifier warnings.',
  },
  {
    id: 'asset-health',
    rank: 8,
    title: 'Asset Health Executive Capex Pack',
    score: 4.1,
    href: '/asset-health',
    proofHref: '/regulatory-filing',
    proofLabel: 'Asset evidence can feed filing and capex justification workflows',
    primaryBuyer: 'Utilities, REAs, municipal utilities, engineering advisors',
    buyerSegment: 'Utility',
    pain: 'Smaller utilities need defensible condition scoring before they can justify replacements, deferments, and reliability investments.',
    outcome: 'Provides a no-SCADA starting point for condition-based capital prioritization.',
    whyNow:
      'Aging infrastructure and reliability-target scrutiny create pressure to justify spend with more than anecdotal engineering notes.',
    timelineToValue: '2 to 3 weeks with a CSV upload, sample fleet review, and exportable results.',
    pilotScope: 'One fleet subset, one scoring model, one replacement-priority discussion.',
    currentState:
      'Implemented CBRM-lite proof pack with executive export and prioritized replacement CSV; predictive-maintenance claims remain out of scope.',
  },
  {
    id: 'tier-compliance',
    rank: 6,
    title: 'TIER Compliance Savings Pack',
    score: 4,
    href: '/roi-calculator',
    proofHref: '/credit-banking',
    proofLabel: 'Credit market visibility and savings context',
    primaryBuyer: 'Alberta industrial emitters, EPCs, compliance advisors',
    buyerSegment: 'Industrial',
    pain: 'Facilities need to choose the cheapest compliance pathway across fund contributions, market credits, offsets, and direct investment.',
    outcome:
      'Moves carbon compliance from spreadsheet guesswork to a source-dated CFO decision memo.',
    whyNow:
      'Alberta TIER remains a recurring annual budget event with visible cash consequences and volatile credit assumptions.',
    timelineToValue:
      '1 to 2 weeks for a paid pilot with facility inputs and executive review output.',
    pilotScope: 'One facility, one compliance year, one board-ready savings memo.',
    currentState:
      'Implemented and commercially legible; now includes a pricing freshness gate, direct-investment sensitivity, and credit-banking workflow link.',
  },
  {
    id: 'tier-credit-banking',
    rank: 7,
    title: 'TIER Credit Banking Audit Pack',
    score: 3.9,
    href: '/credit-banking',
    proofHref: '/roi-calculator',
    proofLabel:
      'Ledger allocation, expiry-risk register, pricing provenance, and no-broker guardrails',
    primaryBuyer: 'Alberta industrial emitters, CFOs, compliance leads, EPCs',
    buyerSegment: 'Industrial',
    pain: 'Facilities with credits need to know what expires, what covers current liability, and what still needs market purchase approval.',
    outcome:
      'Turns credit holdings into an audit-ready allocation pack without implying broker execution or registry certification.',
    whyNow:
      'TIER credit decisions are cash-sensitive and require evidence before finance approves purchases or direct-investment alternatives.',
    timelineToValue: '1 to 2 weeks with a ledger upload and one compliance-year liability file.',
    pilotScope:
      'One credit ledger, one liability year, one allocation schedule, one expiry-risk memo.',
    currentState:
      'Implemented support route with allocation schedule and expiry-risk outputs; now promoted as the paired industrial pack behind the TIER CFO memo.',
  },
  {
    id: 'utility-security',
    rank: 9,
    title: 'Utility Security Procurement Pack',
    score: 4,
    href: '/utility-security',
    proofHref: '/utility-demand-forecast',
    proofLabel:
      'Control matrix, questionnaire, evidence index, deployed-evidence split, and owner-supplied boundaries',
    primaryBuyer: 'Utility security, privacy, procurement, and integration reviewers',
    buyerSegment: 'Utility',
    pain: 'Utility buyers need a structured diligence attachment before they can share load history or approve a pilot.',
    outcome:
      'Reduces procurement friction with repo-backed design evidence, deployed evidence requirements, data-handling labels, and questionnaire exports.',
    whyNow:
      'Cyber, privacy, and connector-readiness scrutiny can block even small forecast pilots without a clear review pack.',
    timelineToValue: 'Same week as a planning-pack pilot.',
    pilotScope:
      'One utility security questionnaire plus evidence matrix attached to the planning export.',
    currentState:
      'Implemented structured pack; expanded to split repo-backed design, deployed evidence, and owner-supplied security boundaries.',
  },
  {
    id: 'shadow-billing',
    rank: 10,
    title: 'Shadow Billing Invoice Proof Pack',
    score: 3.8,
    href: '/shadow-billing',
    proofHref: '/roi-calculator',
    proofLabel: 'Savings memo, field map, rider exclusions, and audit trail for bill comparison',
    primaryBuyer: 'Municipal/public-sector energy managers, commercial operators, consultants',
    buyerSegment: 'Municipal/Public Sector',
    pain: 'Teams need to verify invoice accuracy, rate selection, and switching outcomes without manual bill-by-bill review.',
    outcome:
      'Turns billing review into a measurable savings delta with energy-supply-only caveats and field-level audit notes.',
    whyNow:
      'Price scrutiny and procurement pressure keep utility-bill errors and tariff mismatches visible.',
    timelineToValue: '2 to 4 weeks with uploaded bills or one realistic invoice-comparison pack.',
    pilotScope:
      'One site portfolio, monthly delta CSV, field map, audit notes, and savings caveats.',
    currentState:
      'Implemented proof route with uploaded-bill mode, monthly delta CSV, audit notes, field map, and energy-supply-only boundary.',
  },
];

export const topCommercialWedges: CommercialWedge[] = [...activeCommercialWedges].sort(
  (left, right) => left.rank - right.rank,
);

export const reserveWedges: CommercialWedge[] = [
  {
    id: 'large-load-readiness',
    rank: 11,
    title: 'Large-Load/Data-Centre Readiness Overlay',
    score: 3.2,
    href: '/ai-datacentres',
    proofHref: '/utility-demand-forecast',
    proofLabel: 'Planning overlay tied to forecast scenario assumptions and grid constraints',
    primaryBuyer: 'Utilities, data-centre advisors, interconnection consultants',
    buyerSegment: 'Utility',
    pain: 'Large-load requests create planning pressure long before detailed engineering approval is available.',
    outcome:
      'Adds a readiness summary, assumptions checklist, and constraint narrative to the utility planning conversation.',
    whyNow:
      'AI/data-centre demand pressure is rising, but the product should remain an overlay until assumptions are engineering-grade.',
    timelineToValue: '2 to 4 weeks as an add-on to a utility forecast pack.',
    pilotScope: 'One proposed load, one service territory, one assumptions and constraint summary.',
    currentState:
      'Incubation proof exists with BYOP/storage sensitivity and no-approval guardrails; keep it as a planning overlay, not a lead product.',
  },
  {
    id: 'consultant-api-data-pack',
    rank: 12,
    title: 'Consultant/API Canadian Energy Data Pack',
    score: 3.1,
    href: '/api-docs',
    proofHref: '/dashboard',
    proofLabel: 'Freshness matrix, endpoints, and CSV/notebook-ready data surfaces',
    primaryBuyer: 'Energy consultants, analysts, integrators, enterprise IT reviewers',
    buyerSegment: 'Utility',
    pain: 'Consultants need reliable Canadian energy data extracts without rebuilding every dashboard or scrape from scratch.',
    outcome:
      'Packages API and CSV access as a practical analyst workflow instead of a broad developer platform claim.',
    whyNow:
      'Canadian utility, carbon, and market research work still depends on repeatable source freshness and exportable datasets.',
    timelineToValue: '1 to 3 weeks with a scoped endpoint and export bundle.',
    pilotScope: 'Five to ten endpoints, freshness matrix, sample CSV export, and notebook starter.',
    currentState:
      'Open API route exists; keep it as a technical follow-on until a buyer workflow demands endpoint freshness work.',
  },
  {
    id: 'indigenous-reporting',
    rank: 13,
    title: 'Indigenous Funder and AICEI Reporting Pack',
    score: 3,
    href: '/funder-reporting',
    proofHref: '/aicei',
    proofLabel: 'Program-specific reporting proof for Alberta Indigenous clean-energy grants',
    primaryBuyer:
      'Indigenous community energy teams, economic development offices, program coordinators',
    buyerSegment: 'Indigenous/Community',
    pain: 'Clean-energy project teams still assemble quarterly progress, outcomes, and spending reports manually across grants and partners.',
    outcome:
      'Converts grant-reporting pain into a repeatable reporting workspace with visible governance markers, milestones, metrics, and exports.',
    whyNow:
      'Wah-ila-toos, CERRC, and AICEI style programs have live reporting expectations and recurring milestone pressure.',
    timelineToValue: '2 to 4 weeks with one project portfolio and one funder template set.',
    pilotScope:
      'One community project book, owner-supplied governance markers, one reporting cadence, one export workflow.',
    currentState:
      'Implemented but held in reserve for this ICP until a live partner dataset and community review exist.',
  },
  {
    id: 'utilityapi-sandbox',
    rank: 14,
    title: 'UtilityAPI / Green Button Sandbox',
    score: 2,
    href: '/utilityapi-demo',
    proofHref: '/utility-security',
    proofLabel: 'Connector truth and security boundary review',
    primaryBuyer: 'Utility solution engineers, innovation teams, consultants',
    buyerSegment: 'Utility',
    pain: 'Teams need a safe parser and consent-flow demo before investing in production connector work.',
    outcome: 'Supports the utility planning pack without implying production utility approval.',
    whyNow:
      'Green Button and UtilityAPI-style workflows are useful, but production approval requires OAuth, audit, revocation, and deployment evidence.',
    timelineToValue: 'Use as a same-day sandbox demo only.',
    pilotScope: 'One parser demo and one bounded connector-readiness note.',
    currentState:
      'Support surface only until real approval, OAuth, audit logs, revocation, and deployment evidence exist.',
  },
  {
    id: 'retailer-hedging',
    rank: 15,
    title: 'Retailer Hedging and Rate Watchdog Tools',
    score: 2,
    href: '/hedging',
    proofHref: '/rate-watchdog',
    proofLabel: 'Retail price and hedging follow-up proof',
    primaryBuyer: 'Retailers, commercial energy advisors, SME operators',
    buyerSegment: 'Municipal/Public Sector',
    pain: 'Rate and hedging tools can start conversations, but they are less central to the utility proof-pack USP.',
    outcome: 'Useful follow-on proof for price-sensitive buyers.',
    whyNow:
      'Alberta retail price reform creates a narrow opportunity, but the front door should stay utility/planning focused.',
    timelineToValue: 'Follow-on after utility or billing proof.',
    pilotScope: 'One rate or hedging comparison.',
    currentState: 'Implemented but de-emphasized as off-USP for the utility forecast website.',
  },
  {
    id: 'broad-dashboard',
    rank: 16,
    title: 'Broad Grid and Market Dashboard',
    score: 2,
    href: '/dashboard',
    proofHref: '/api-docs',
    proofLabel: 'Data freshness and integration follow-up proof',
    primaryBuyer: 'General energy analysts and enterprise stakeholders',
    buyerSegment: 'Utility',
    pain: 'Broad dashboards are useful for orientation but rarely create a paid pilot by themselves.',
    outcome: 'Keeps a proof library available behind the sellable workflows.',
    whyNow:
      'The market is already crowded with generic dashboards; CEIP should lead with proof packs instead.',
    timelineToValue: 'Use after a buyer chooses a primary workflow.',
    pilotScope: 'One supporting data-view walkthrough.',
    currentState: 'Implemented but intentionally degraded as the commercial front door.',
  },
];

export const supportSurfaces: SupportSurface[] = [
  {
    id: 'benchmarking',
    title: 'Forecast Benchmarking',
    href: '/forecast-benchmarking',
    role: 'Proof layer for model quality and defensibility',
  },
  {
    id: 'utility-security',
    title: 'Utility Security Procurement Pack',
    href: '/utility-security',
    role: 'Trust layer for procurement and utility reviews',
  },
  {
    id: 'ga-ici-5cp',
    title: 'Ontario GA/ICI 5CP',
    href: '/ga-ici-5cp',
    role: 'Ontario-specific peak-risk decision-support wedge',
  },
  {
    id: 'byo-csv-proof',
    title: 'BYO-CSV Proof',
    href: '/byo-csv-proof',
    role: 'Local-first privacy proof before buyer data sharing',
  },
  {
    id: 'utilityapi-sandbox',
    title: 'UtilityAPI / Green Button Sandbox',
    href: '/utilityapi-demo',
    role: 'Sandbox-only connector proof until production approval evidence exists',
  },
];

export const segmentNarratives: SegmentNarrative[] = [
  {
    id: 'Utility',
    headline: 'Sell planning and compliance before selling AI.',
    summary:
      'Utilities buy defensible planning outputs, regulatory evidence, and asset justification. Prediction matters only when it changes a filing, capex case, or reliability decision.',
    priorities: [
      'Utility demand forecast planning packs',
      'OEB/AUC regulatory filing packs',
      'Benchmark and provenance appendix',
      'Asset health capex pack',
      'Security procurement pack',
    ],
  },
  {
    id: 'Industrial',
    headline: 'Lead with avoided cash, not dashboards.',
    summary:
      'Industrial buyers in Alberta fund tools that reduce TIER cost exposure, improve credit decisions, and create a CFO-readable savings path.',
    priorities: [
      'TIER CFO memo and savings pack',
      'Source-dated credit assumptions',
      'Direct-investment uncertainty review',
    ],
  },
  {
    id: 'Security',
    headline: 'Data sharing needs proof before access.',
    summary:
      'Security and privacy reviewers need redacted, inspectable artifacts that separate local proof from production connector or certification claims.',
    priorities: [
      'BYO-CSV privacy proof',
      'Utility security procurement pack',
      'Hash-verified retained evidence extracts',
    ],
  },
  {
    id: 'Indigenous/Community',
    headline: 'Reporting burden is the fastest path to trust.',
    summary:
      'Community energy teams do not need another generic platform. They need funder-ready reporting, milestone tracking, and outcome proof that respects project governance.',
    priorities: [
      'Funder reporting pack',
      'AICEI quarterly reporting pack',
      'Owner-supplied governance markers',
    ],
  },
  {
    id: 'Municipal/Public Sector',
    headline: 'Procurement moves when the workflow is concrete.',
    summary:
      'Public-sector buyers are likelier to fund billing review, asset prioritization, and reporting workflows than open-ended analytics subscriptions.',
    priorities: [
      'Shadow billing invoice proof',
      'Asset-health review',
      'Audit trail and savings caveats',
    ],
  },
];

// ── Buyer-language aliases for SEO/search metadata ──────────────────────────
// Maps internal route names to buyer-searchable phrases. These are used by
// SEOHead keywords and SolutionsNavigatorPage search labels. They do NOT
// replace proof-boundary language — they expand discoverability.
export interface BuyerAlias {
  route: string;
  aliases: string[];
}

export const buyerLanguageAliases: BuyerAlias[] = [
  {
    route: '/utility-demand-forecast',
    aliases: [
      'Utility demand forecast planning software',
      'Load forecasting tool',
      'Electrification impact planning pack',
    ],
  },
  {
    route: '/forecast-benchmarking',
    aliases: [
      'Forecast benchmark report',
      'Model accuracy comparison tool',
      'Planning forecast validation pack',
    ],
  },
  {
    route: '/regulatory-filing',
    aliases: [
      'OEB/AUC filing preparation pack',
      'Regulatory evidence binder',
      'Distribution system plan appendix',
    ],
  },
  {
    route: '/ga-ici-5cp',
    aliases: [
      'Ontario GA/ICI 5CP decision-support tool',
      'Global adjustment cost predictor',
      'Class A industrial peak forecasting',
    ],
  },
  {
    route: '/roi-calculator',
    aliases: [
      'Alberta TIER compliance planning memo',
      'TIER credit cost calculator',
      'Carbon compliance ROI tool',
    ],
  },
  {
    route: '/utility-security',
    aliases: [
      'Utility security procurement evidence pack',
      'Data sharing trust review pack',
      'Privacy-first procurement proof',
    ],
  },
];

// ── Cross-sell / bundle map ──────────────────────────────────────────────────
// Defines natural product spines that connect proof packs into bundles.
// Used by SolutionsNavigatorPage to show related workflows.
export interface BundleSpine {
  id: string;
  label: string;
  buyerSegment: BuyerSegment;
  routes: string[];
  description: string;
}

export const bundleSpines: BundleSpine[] = [
  {
    id: 'utility-spine',
    label: 'Utility Planning Spine',
    buyerSegment: 'Utility',
    routes: [
      '/utility-demand-forecast',
      '/forecast-benchmarking',
      '/regulatory-filing',
      '/utility-security',
    ],
    description:
      'Forecast → Benchmark → Filing → Security: the full utility planning-to-filing workflow.',
  },
  {
    id: 'industrial-spine',
    label: 'Industrial Compliance Spine',
    buyerSegment: 'Industrial',
    routes: ['/roi-calculator', '/credit-banking', '/ga-ici-5cp'],
    description:
      'TIER ROI → Credit Banking → GA/ICI 5CP (where applicable): the industrial cost-optimization workflow.',
  },
  {
    id: 'municipal-spine',
    label: 'Municipal Climate Spine',
    buyerSegment: 'Municipal/Public Sector',
    routes: ['/municipal', '/asset-health', '/shadow-billing'],
    description:
      'Asset Health → Shadow Billing → Board/Regulatory Memo: the municipal reporting workflow.',
  },
  {
    id: 'consultant-spine',
    label: 'Consultant Evidence Spine',
    buyerSegment: 'Utility',
    routes: ['/forecast-benchmarking', '/api-docs', '/pilot-readiness'],
    description:
      'Benchmark → Export/API → Client-Ready Evidence Packs: the consultant deliverable workflow.',
  },
];

// ── Indigenous co-design pathway ─────────────────────────────────────────────
// Trust-sensitive pilot lane with explicit boundary: NOT OCAP-compliant.
// Co-design language only — no sovereignty or compliance claims.
export interface CoDesignPathway {
  id: string;
  label: string;
  status: 'seeking-partners' | 'pilot' | 'active';
  boundary: string;
  description: string;
  route: string;
  capabilities: string[];
  notClaims: string[];
}

export const indigenousCoDesignPathway: CoDesignPathway = {
  id: 'indigenous-codesign',
  label: 'Indigenous Energy Co-Design Pathway',
  status: 'seeking-partners',
  boundary: 'NOT OCAP-compliant. Co-design and research-partner language only.',
  description:
    'A trust-sensitive pilot lane for First Nations, Métis, and Inuit energy teams seeking funder-ready reporting and energy planning tools. We are seeking community co-design partners — not claiming compliance, sovereignty, or certification.',
  route: '/funder-reporting',
  capabilities: [
    'Funder reporting pack with aggregate impact cards',
    'Community benchmarking with deterministic data',
    'Project milestone tracking for energy initiatives',
    'AICEI quarterly reporting template (early access)',
  ],
  notClaims: [
    'NOT OCAP-compliant — certification requires community partnership',
    'NOT Indigenous data sovereignty certified',
    'NOT a replacement for community-owned data governance',
    'NOT claiming First Nations, Métis, or Inuit endorsement',
  ],
};

// ── Pricing synchronization ──────────────────────────────────────────────────
// pricingCatalog.ts is the single source of truth for all plan prices.
// Active docs must reference it, not hardcode pricing prose.
export const PRICING_SOURCE_OF_TRUTH = {
  catalogFile: 'src/lib/pricingCatalog.ts',
  exportName: 'CEIP_PRICING',
  rule: 'All pricing references in docs, README, and UI must derive from CEIP_PRICING. Hardcoded pricing prose is a drift risk.',
  plans: [
    { code: 'free', price: 0, interval: 'forever', label: 'Free' },
    { code: 'consumer_watchdog', price: 9, interval: 'month', label: 'Consumer Watchdog' },
    { code: 'professional', price: 149, interval: 'month', label: 'Professional' },
    { code: 'industrial_tier', price: 1500, interval: 'month', label: 'Industrial TIER' },
    { code: 'municipal', price: 5900, interval: 'month', label: 'Municipal' },
    {
      code: 'sovereign',
      price: 2500,
      interval: 'month',
      label: 'Sovereign (Indigenous co-design)',
    },
  ],
} as const;

// ── Bounded AI language ──────────────────────────────────────────────────────
// Defines what AI claims are allowed and what is explicitly disallowed.
// "AI-assisted" is permitted when tied to a specific implemented route.
// "AI-powered superiority" is disallowed.
export interface BoundedAiLanguage {
  allowedPhrases: string[];
  disallowedPhrases: string[];
  rule: string;
  routesWithAiAssist: string[];
}

export const boundedAiLanguage: BoundedAiLanguage = {
  rule: 'AI-assisted language is permitted only when tied to a specific implemented route with guardrails. AI-powered superiority, AI-driven optimization, or AI superiority claims are disallowed.',
  allowedPhrases: [
    'AI-assisted evidence pack assembly (route: /export-pipeline)',
    'LLM-assisted regulatory drafting helper (route: /regulatory-filing, bounded by claim-boundary checker)',
    'AI-assisted data quality flags (route: /data-connectors, deterministic checks with LLM summary)',
  ],
  disallowedPhrases: [
    'AI-powered forecasting platform',
    'AI-powered superiority',
    'AI-driven optimization',
    'AI superiority',
    'GPU forecasting',
    'Enterprise AI/GPU superiority',
  ],
  routesWithAiAssist: ['/export-pipeline', '/regulatory-filing', '/data-connectors'],
};
