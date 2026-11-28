/**
 * Help content: Static Pages
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const PAGES_CONTENT: Record<string, HelpContentItem> = {
  'page.esg-finance': {
    id: 'page.esg-finance',
    title: 'Sustainable Finance & ESG Dashboard',
    shortText:
      'Green bonds, ESG scores, sustainability-linked loans, and carbon pricing exposure for Canadian energy companies',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Sustainable Finance & ESG for Canadian Energy</h3>
      <p class="mb-4">This dashboard brings together <strong>ESG scores</strong>, <strong>green bonds</strong>, <strong>sustainability-linked loans</strong>, and <strong>carbon pricing exposure</strong> for major Canadian energy companies. It is designed for analysts, regulators, and students who want a single view of how finance and climate risk intersect.</p>

      <h4 class="font-semibold mt-4 mb-2">How to Use the Dashboard:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Overview tab:</strong> High-level metrics including total green bond issuance, average ESG score, total sustainability-linked loan volume, and projected 2030 carbon costs.</li>
        <li><strong>Green Bonds tab:</strong> Table of labelled green bonds with issuer, size, maturity, yield, and use of proceeds. Use this to benchmark who is funding what types of climate projects.</li>
        <li><strong>ESG Ratings tab:</strong> Company-level ESG scores (0–10 scale) with sector breakdowns. Built initially from Yahoo Finance ESG data and designed to accommodate additional vendor scores (MSCI, Sustainalytics, S&amp;P).</li>
        <li><strong>Sustainability-Linked Loans tab:</strong> Major sustainability-linked credit facilities, including KPIs, targets, rate adjustment spreads, and current status (on track, achieved, at risk).</li>
        <li><strong>Carbon Exposure tab:</strong> Estimates of annual emissions, current and 2030 carbon costs, and revenue-at-risk percentages by company and sector.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Working with Data &amp; CSV Export:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li>Each non-overview tab includes an <strong>Export CSV</strong> button that downloads exactly what you see in the table.</li>
        <li>Use the CSV export to run your own regressions (e.g., ESG score vs. cost of capital) or to join with internal portfolios.</li>
        <li>Filters such as <strong>sector</strong> are respected in the export, so you can easily build sector-specific datasets.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Data Sources &amp; Refresh Cadence:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>ESG Ratings:</strong> Initial scores are sourced from <strong>Yahoo Finance ESG</strong> for Canadian tickers (SU.TO, CNQ.TO, IMO.TO, CPX.TO, TA.TO, ENB.TO, CVE.TO, TRP.TO, PPL.TO, BIR.TO). A GitHub Action refreshes these scores <strong>weekly</strong> into the <code>esg_ratings</code> table.</li>
        <li><strong>Green Bonds:</strong> Intended to be populated from <strong>SEDAR+</strong>, <strong>Climate Bonds Initiative</strong>, and issuer disclosures. Seed data illustrates structure; production deployments should import a curated CSV of real deals.</li>
        <li><strong>Sustainability-Linked Loans:</strong> Populated from <strong>bank and issuer press releases</strong> (e.g., TD, RBC, CIBC). The schema is optimized for manual/CSV imports and can be automated later with a news ingestion pipeline.</li>
        <li><strong>Carbon Pricing Exposure:</strong> Calculated using company-reported emissions (Mt CO₂e) and Canada&apos;s carbon price schedule (current and projected 2030 price). Seed values demonstrate methodology; live deployments should tie these calculations to facility-level emissions and policy scenarios.</li>
      </ul>

      <div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Quality &amp; Interpretation:</strong> ESG data comes from multiple vendors and methodologies. Always read score definitions carefully, compare across time, and supplement dashboard metrics with issuer sustainability reports before making investment or policy decisions.</p>
      </div>
    `,
    relatedTopics: [
      'esg_ratings',
      'green_bonds',
      'sustainability_linked_loans',
      'carbon_pricing_exposure',
    ],
  },

  'page.industrial-decarb': {
    id: 'page.industrial-decarb',
    title: 'Industrial Decarbonization Dashboard',
    shortText:
      'Facility-level emissions, methane reductions, OBPS compliance, and efficiency projects across Canada',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Industrial Decarbonization in Canada</h3>
      <p class="mb-4">This dashboard focuses on <strong>large industrial emitters</strong> (oil sands, refineries, gas processing, heavy industry) and how they are reducing greenhouse gas emissions over time.</p>

      <h4 class="font-semibold mt-4 mb-2">What the Dashboard Shows:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Facility Emissions:</strong> Top emitting facilities by annual CO₂e, with filters for <strong>province</strong> and <strong>year</strong>. Use this to see which sites dominate regional emissions.</li>
        <li><strong>Methane Reduction:</strong> Company-level progress vs. 2019 methane baselines, including whether they are on track for the 2030 75% reduction target.</li>
        <li><strong>OBPS Compliance:</strong> Summary of surplus/deficit compliance units under provincial and federal Output-Based Pricing Systems, with associated financial value where market price data exists.</li>
        <li><strong>Efficiency Projects:</strong> Major industrial energy efficiency and fuel-switching projects, including investment size, emissions avoided, and payback periods.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Drill-Down Tables &amp; CSV Export:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li>Use the <strong>dataset buttons</strong> at the bottom of the page (Facility Emissions, Methane Reduction, OBPS Compliance, Efficiency Projects) to switch between detailed tables.</li>
        <li>Each dataset can be filtered by <strong>province</strong> and <strong>year</strong> using the controls at the top of the page.</li>
        <li>The <strong>Export CSV</strong> button downloads exactly what you see in the active table, making it easy to build custom analysis in Excel, R, or Python.</li>
        <li>The "Top Emitting Facilities" chart also offers a dedicated export so you can quickly share headline numbers with stakeholders.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Data Sources &amp; Quality Considerations:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Facility Emissions:</strong> Drawn from Canada&apos;s <strong>National Pollutant Release Inventory (NPRI)</strong> and related greenhouse gas reporting programs (ECCC). Data is typically reported annually with a ~1-year lag and is ingested into the <code>facility_emissions</code> table via a dedicated NPRI importer (edge function and/or CSV script).</li>
        <li><strong>Methane Reduction:</strong> Based on company-reported methane baselines and current-year progress, supplemented by federal targets. Values may be updated less frequently and should be interpreted as directional rather than precise at the facility level.</li>
        <li><strong>OBPS Compliance:</strong> Built from provincial and federal OBPS/TIER public reports, showing whether facilities are in surplus or deficit relative to their benchmarks. Where available, a carbon credit price is used to estimate financial value.</li>
        <li><strong>Efficiency Projects:</strong> Compiled from <strong>EMRF</strong>, <strong>Emissions Reduction Alberta (ERA)</strong>, and company sustainability reports. Not all projects in Canada are captured; focus is on larger, high-impact initiatives.</li>
      </ul>

      <div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 mt-4">
        <p class="text-sm"><strong>📌 Analyst Tip:</strong> Always cross-check dashboard numbers with the underlying NPRI records, OBPS compliance reports, and company filings for formal reporting. Use this dashboard as a <em>starting point</em> for analysis, not the final authority for regulatory submissions or investment decisions.</p>
      </div>
    `,
    relatedTopics: [
      'facility_emissions',
      'methane_reduction_tracker',
      'obps_compliance',
      'efficiency_projects',
    ],
  },

  // ==================== EMPLOYERS PAGE ====================

  'page.employers.overview': {
    id: 'page.employers.overview',
    title: 'For Employers - Overview',
    shortText: 'Hire pre-qualified energy professionals',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Build Your Energy Transition Team</h3>
      <p class="mb-4">This page helps employers connect with <strong>pre-qualified energy professionals</strong> who have completed CEIP certification tracks.</p>
      
      <h4 class="font-semibold mt-4 mb-2">What You'll Find:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Capability Profiles</strong> - Downloadable PDFs with NOC codes and salary benchmarks</li>
        <li><strong>LMIA Support</strong> - Documentation aligned with Labour Market Impact Assessment requirements</li>
        <li><strong>Verified Credentials</strong> - Blockchain-backed certificates and achievement badges</li>
      </ul>
      
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💼 Employer Tip:</strong> Contact our sales team for bulk hiring packages and custom recruitment support.</p>
      </div>
    `,
    relatedTopics: ['page.employers.profiles', 'page.employers.partnership'],
  },

  'page.employers.partnership': {
    id: 'page.employers.partnership',
    title: 'Partnership Benefits',
    shortText: 'Why partner with CEIP for hiring',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Why Partner With CEIP?</h3>
      <p class="mb-4">CEIP provides a <strong>talent pipeline</strong> specifically trained for Canada's energy transition.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Key Benefits:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Pre-Qualified Talent</strong> - Candidates with verified competencies in grid analytics, ESG, and Indigenous consultation</li>
        <li><strong>Digital Credentials</strong> - Instantly verifiable certificates and badges</li>
        <li><strong>LMIA-Ready Documentation</strong> - Standardized profiles aligned with NOC codes</li>
        <li><strong>Cross-Border Hiring</strong> - International talent familiar with Canadian regulations</li>
      </ul>
    `,
    relatedTopics: ['page.employers.overview', 'page.employers.profiles'],
  },

  'page.employers.profiles': {
    id: 'page.employers.profiles',
    title: 'Capability Profiles',
    shortText: 'Download LMIA-ready role profiles',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Capability Profiles</h3>
      <p class="mb-4">Download <strong>LMIA-ready role profiles</strong> with NOC codes and salary benchmarks for energy sector positions.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Available Profiles:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Energy Data Analyst</strong> - NOC 21211 - Grid analytics and demand forecasting</li>
        <li><strong>Decarbonization Specialist</strong> - NOC 21110 - ESG compliance and sustainability</li>
        <li><strong>Indigenous Energy Liaison</strong> - NOC 41401 - FPIC and community partnerships</li>
        <li><strong>Grid Integration Engineer</strong> - NOC 21310 - Renewable integration and storage</li>
      </ul>
      
      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>📄 Download:</strong> Each profile includes job description, required skills, salary range, and LMIA documentation guidance.</p>
      </div>
    `,
    relatedTopics: ['page.employers.overview'],
  },

  // ==================== INCUBATORS PAGE ====================

  'page.incubators.overview': {
    id: 'page.incubators.overview',
    title: 'For Incubators & CTNs',
    shortText: 'Accelerate your energy tech program',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Accelerate Your Energy Tech Program</h3>
      <p class="mb-4">Partner with CEIP to deliver <strong>credentialed training programs</strong> with measurable economic outcomes.</p>
      
      <h4 class="font-semibold mt-4 mb-2">What We Offer:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Cohort Management</strong> - Built-in admin panel for managing learners</li>
        <li><strong>Economic Impact Tracking</strong> - Demonstrate significant economic benefit</li>
        <li><strong>Priority Processing</strong> - Qualify for DIA-SOURCE priority assessment</li>
        <li><strong>White-Label Solutions</strong> - Custom branding for your incubator</li>
      </ul>
      
      <div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 mt-4">
        <p class="text-sm"><strong>🚀 CTN Tip:</strong> Use the Economic Benefit Calculator to estimate your program's impact for funding applications.</p>
      </div>
    `,
    relatedTopics: ['page.incubators.calculator', 'page.incubators.tracks'],
  },

  'page.incubators.benefits': {
    id: 'page.incubators.benefits',
    title: 'Incubator Benefits',
    shortText: 'Why incubators choose CEIP',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Why Incubators Choose CEIP</h3>
      <p class="mb-4">CEIP provides the infrastructure for <strong>high-impact energy training programs</strong>.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Key Benefits:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Measurable Impact</strong> - Track job creation, salary increases, and GDP contribution</li>
        <li><strong>Priority Processing</strong> - Demonstrate eligibility for DIA-SOURCE priority assessment</li>
        <li><strong>Cohort Tools</strong> - Manage learners, track completion, generate reports</li>
        <li><strong>International Recognition</strong> - Credentials aligned with NOC codes</li>
      </ul>
    `,
    relatedTopics: ['page.incubators.overview', 'page.incubators.calculator'],
  },

  'page.incubators.calculator': {
    id: 'page.incubators.calculator',
    title: 'Economic Benefit Calculator',
    shortText: "Calculate your program's economic impact",
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">DIA-SOURCE Economic Benefit Calculator</h3>
      <p class="mb-4">Estimate the <strong>economic impact</strong> of your training program to demonstrate eligibility for priority processing.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Input Parameters:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Cohort Size</strong> - Number of participants in your program</li>
        <li><strong>Program Duration</strong> - Length of training in months</li>
        <li><strong>Salary Increase</strong> - Average annual salary increase for graduates</li>
        <li><strong>Job Placement Rate</strong> - Percentage of graduates placed in jobs</li>
        <li><strong>Capital Investment</strong> - Total program investment in CAD</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Output Metrics:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>5-Year Economic Impact</strong> - Total economic contribution</li>
        <li><strong>Jobs Created</strong> - Number of new positions</li>
        <li><strong>Tax Revenue</strong> - Estimated government revenue</li>
        <li><strong>ROI</strong> - Return on investment percentage</li>
      </ul>
      
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Tip:</strong> Download the Impact Report PDF to include in funding applications.</p>
      </div>
    `,
    relatedTopics: ['page.incubators.overview', 'page.incubators.tracks'],
  },

  'page.incubators.tracks': {
    id: 'page.incubators.tracks',
    title: 'Training Tracks',
    shortText: 'Available certification programs',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Available Training Tracks</h3>
      <p class="mb-4">CEIP offers <strong>three specialized training tracks</strong> for energy sector professionals.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Grid Analytics Accelerator (12 weeks)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>IESO/AESO data certification</li>
        <li>Power BI mastery</li>
        <li>Capstone project</li>
        <li>85% job placement rate</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Decarbonization Bootcamp (16 weeks)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>GHG Protocol certification</li>
        <li>TCFD reporting</li>
        <li>Net-zero pathway modeling</li>
        <li>90% job placement rate</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Indigenous Energy Fellowship (20 weeks)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>FPIC/OCAP® review workflow</li>
        <li>Consultation protocols</li>
        <li>Community partnership</li>
        <li>80% job placement rate</li>
      </ul>
    `,
    relatedTopics: ['page.incubators.overview', 'page.incubators.calculator'],
  },
};
