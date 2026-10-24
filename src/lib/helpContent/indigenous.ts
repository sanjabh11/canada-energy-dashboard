/**
 * Help content: Indigenous Economic Dashboard
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const INDIGENOUS_CONTENT: Record<string, HelpContentItem> = {
  // ========================================
  // Indigenous Economic Dashboard Topics
  // ========================================

  'indigenous.overview': {
    id: 'indigenous.overview',
    title: 'Indigenous Economic Impact Dashboard',
    shortText:
      'Tracking Indigenous equity ownership, revenue agreements, and economic benefits from energy projects',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Indigenous Participation in Canadian Energy</h3>
      <p class="mb-4">Indigenous communities are increasingly active partners and owners in Canada's energy sector through equity stakes, revenue-sharing agreements (IBAs), and employment/procurement opportunities. This economic participation supports reconciliation, self-determination, and community development while improving project social license.</p>

      <h4 class="font-semibold mt-4 mb-2">Major Indigenous-Owned Energy Projects (2024):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead class="bg-slate-100">
          <tr>
            <th class="border px-3 py-2 text-left">Project</th>
            <th class="border px-3 py-2 text-left">Community</th>
            <th class="border px-3 py-2 text-left">Ownership</th>
            <th class="border px-3 py-2 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2"><strong>Wataynikaneyap Power</strong> (1,800 km transmission)</td>
            <td class="border px-3 py-2">24 First Nations (ON)</td>
            <td class="border px-3 py-2">51%</td>
            <td class="border px-3 py-2">$1.9B project</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Clearwater River Wind</strong> (74 MW)</td>
            <td class="border px-3 py-2">Métis Settlements (AB)</td>
            <td class="border px-3 py-2">49%</td>
            <td class="border px-3 py-2">$8M/year revenue</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Makwa Solar</strong> (10 MW)</td>
            <td class="border px-3 py-2">Moose Cree First Nation (ON)</td>
            <td class="border px-3 py-2">100%</td>
            <td class="border px-3 py-2">$2.5M/year revenue</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Cowessess Renewable Energy</strong> (solar)</td>
            <td class="border px-3 py-2">Cowessess First Nation (SK)</td>
            <td class="border px-3 py-2">100%</td>
            <td class="border px-3 py-2">$1.2M/year savings</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Why Indigenous Participation Matters:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Economic Self-Determination:</strong> Revenue from energy projects reduces dependency on federal transfers, funds community services</li>
        <li><strong>Reconciliation:</strong> Equity ownership and decision-making power address historical exclusion from resource development</li>
        <li><strong>Social License:</strong> Projects with Indigenous partnership face 60% fewer regulatory delays (NRCAN 2023)</li>
        <li><strong>ESG/Investment:</strong> Major investors (CPP Investments, CDPQ) prioritize projects with Indigenous equity (5-10% higher valuations)</li>
        <li><strong>Federal Funding:</strong> Impact Assessment Act (2019) requires Indigenous consultation; Indigenous co-ownership unlocks additional funding</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Economic Impact:</strong> Indigenous participation in Canadian energy projects generated $3.2B in revenue for communities (2023): $1.1B equity dividends + $1.4B IBA payments + $700M procurement. Supporting 12,000+ direct jobs across 200+ communities (FNPA 2024).</p>
      </div>
    `,
    relatedTopics: ['indigenous.equity', 'indigenous.ibas', 'indigenous.impact'],
  },

  'indigenous.equity': {
    id: 'indigenous.equity',
    title: 'Indigenous Equity Ownership',
    shortText: 'Community ownership stakes in renewable energy and transmission projects',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Equity Ownership Models</h3>
      <p class="mb-4">Indigenous equity ownership gives communities direct financial stake and decision-making authority in energy projects. Ownership ranges from minority stakes (10-25%) to majority control (51-100%), with corresponding dividends, board seats, and governance rights.</p>

      <h4 class="font-semibold mt-4 mb-2">Ownership Structure Types:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead class="bg-slate-100">
          <tr>
            <th class="border px-3 py-2 text-left">Model</th>
            <th class="border px-3 py-2 text-left">Typical Range</th>
            <th class="border px-3 py-2 text-left">Board Seats</th>
            <th class="border px-3 py-2 text-left">Benefits</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2"><strong>Majority Ownership</strong></td>
            <td class="border px-3 py-2">51-100%</td>
            <td class="border px-3 py-2">Majority/Full control</td>
            <td class="border px-3 py-2">Full decision authority, proportional dividends, cultural alignment</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Equal Partnership</strong></td>
            <td class="border px-3 py-2">50%</td>
            <td class="border px-3 py-2">Equal representation</td>
            <td class="border px-3 py-2">Shared decision-making, equal risk/reward, joint governance</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Significant Minority</strong></td>
            <td class="border px-3 py-2">25-49%</td>
            <td class="border px-3 py-2">Proportional seats</td>
            <td class="border px-3 py-2">Veto rights on major decisions, proportional dividends, influence</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Passive Investment</strong></td>
            <td class="border px-3 py-2">5-24%</td>
            <td class="border px-3 py-2">Observer/1 seat</td>
            <td class="border px-3 py-2">Dividends, limited governance, lower capital requirement</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Financing Indigenous Equity:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Federal Loan Guarantees:</strong> Natural Resources Canada Indigenous Community Energy Loan Guarantee Program. Up to $250M per project, 90% loan guarantee, 3.5-5.5% interest rates.</li>
        <li><strong>Indigenous Equity Funds:</strong> Canada Infrastructure Bank Indigenous Infrastructure Initiative. $1B fund for equity co-investment. Recent example: $150M for Wataynikaneyap transmission.</li>
        <li><strong>Revenue-Based Financing:</strong> Developer provides upfront capital, repaid from project cash flow. Avoids community debt burden. Typical terms: 8-12 years, 6-9% IRR.</li>
        <li><strong>Traditional Lending:</strong> Commercial banks increasingly lending to Indigenous energy projects with track record. Rates: prime + 1-3%.</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Case Study - Wataynikaneyap Power:</strong> 24 First Nations own 51% of $1.9B transmission project connecting remote communities. Financed via: $800M Indigenous equity (CIB co-investment) + $900M project debt + $200M developer equity. Expected returns: $40-60M/year dividends to communities over 40-year asset life. Result: Economic self-sufficiency + reliable power for 17,000 people.</p>
      </div>
    `,
    relatedTopics: ['indigenous.overview', 'indigenous.ibas', 'indigenous.impact'],
  },

  'indigenous.ibas': {
    id: 'indigenous.ibas',
    title: 'Impact & Benefit Agreements (IBAs)',
    shortText: 'Revenue-sharing agreements providing payments, jobs, and community investment',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">What are Impact & Benefit Agreements?</h3>
      <p class="mb-4">Impact & Benefit Agreements (IBAs) are contracts between project developers and Indigenous communities on whose traditional territory a project is located. IBAs provide financial compensation, employment/training, procurement preferences, and environmental protections in exchange for community consent and cooperation.</p>

      <h4 class="font-semibold mt-4 mb-2">Typical IBA Components:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Financial Payments:</strong> Annual cash payments tied to revenue/production (typically $100k-5M/year depending on project size). Paid for life of project (15-40 years).</li>
        <li><strong>Employment Targets:</strong> % of workforce from local Indigenous community (often 10-30%). Priority hiring, apprenticeships, on-the-job training.</li>
        <li><strong>Procurement Preferences:</strong> % of contracts awarded to Indigenous-owned businesses (typically 15-40%). Categories: catering, security, transportation, site services.</li>
        <li><strong>Training & Education:</strong> Funding for skills development ($50k-500k/year). Trades training, post-secondary scholarships, leadership programs.</li>
        <li><strong>Environmental Monitoring:</strong> Community-led monitoring of impacts (water quality, wildlife, land use). Independent funding for Traditional Knowledge studies.</li>
        <li><strong>Community Investment:</strong> Infrastructure projects (schools, health centers, cultural facilities). Typically $500k-10M over project life.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Recent IBA Examples (2022-2024):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead class="bg-slate-100">
          <tr>
            <th class="border px-3 py-2 text-left">Project</th>
            <th class="border px-3 py-2 text-left">Community</th>
            <th class="border px-3 py-2 text-left">IBA Value</th>
            <th class="border px-3 py-2 text-left">Key Terms</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2">Ring of Fire Mining (transmission)</td>
            <td class="border px-3 py-2">5 First Nations (ON)</td>
            <td class="border px-3 py-2">$500M over 25 years</td>
            <td class="border px-3 py-2">30% employment target, $150M training fund</td>
          </tr>
          <tr>
            <td class="border px-3 py-2">Travers Solar (465 MW)</td>
            <td class="border px-3 py-2">Piikani Nation (AB)</td>
            <td class="border px-3 py-2">$200M over 35 years</td>
            <td class="border px-3 py-2">20% procurement, cultural site protection</td>
          </tr>
          <tr>
            <td class="border px-3 py-2">Keeyask Hydro (695 MW)</td>
            <td class="border px-3 py-2">4 Cree Nations (MB)</td>
            <td class="border px-3 py-2">$1.2B (equity + IBA)</td>
            <td class="border px-3 py-2">25% ownership + employment/training</td>
          </tr>
        </tbody>
      </table>

      <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Negotiation Tip:</strong> IBA negotiations typically take 12-36 months. Communities increasingly hiring expert advisors (legal, financial, environmental) to ensure fair terms. Industry standard: Developer pays for community advisor costs ($200k-1M). Key leverage point: Free, Prior, and Informed Consent (FPIC) under UNDRIP, now Canadian law via Bill C-15 (2021).</p>
      </div>
    `,
    relatedTopics: ['indigenous.overview', 'indigenous.equity', 'indigenous.impact'],
  },

  'indigenous.impact': {
    id: 'indigenous.impact',
    title: 'Economic Impact & Benefits Measurement',
    shortText: 'Tracking jobs, GDP contribution, procurement, and community development outcomes',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Measuring Economic Impact</h3>
      <p class="mb-4">Economic impact assessment quantifies how Indigenous participation in energy projects benefits communities through direct revenues, employment, procurement spending, tax revenues, and multiplier effects. Metrics inform project evaluation, ESG reporting, and evidence for reconciliation progress.</p>

      <h4 class="font-semibold mt-4 mb-2">Key Impact Metrics:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead class="bg-slate-100">
          <tr>
            <th class="border px-3 py-2 text-left">Metric</th>
            <th class="border px-3 py-2 text-left">Typical Range (per 100 MW project)</th>
            <th class="border px-3 py-2 text-left">Measurement</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2"><strong>Direct Jobs</strong></td>
            <td class="border px-3 py-2">15-40 FTE (operations)</td>
            <td class="border px-3 py-2">Full-time equivalent positions held by Indigenous workers</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Indirect Jobs</strong></td>
            <td class="border px-3 py-2">25-70 FTE (supply chain)</td>
            <td class="border px-3 py-2">Jobs created in supporting industries (maintenance, catering, transport)</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Equity Dividends</strong></td>
            <td class="border px-3 py-2">$2-8M/year (25% ownership)</td>
            <td class="border px-3 py-2">Cash distributions to community based on ownership stake</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>IBA Payments</strong></td>
            <td class="border px-3 py-2">$500k-3M/year</td>
            <td class="border px-3 py-2">Annual revenue-sharing payments per agreement terms</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Procurement Value</strong></td>
            <td class="border px-3 py-2">$1-5M/year</td>
            <td class="border px-3 py-2">Value of contracts awarded to Indigenous-owned businesses</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Training Investment</strong></td>
            <td class="border px-3 py-2">$200k-800k/year</td>
            <td class="border px-3 py-2">Spending on apprenticeships, certifications, scholarships</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Economic Multiplier Effect:</h4>
      <p class="mb-2">For every $1 of direct revenue to Indigenous communities, additional $0.60-$1.20 generated in local economy:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Household Spending:</strong> Employees spend wages on local businesses (grocery, housing, services)</li>
        <li><strong>Business Growth:</strong> Procurement contracts fund Indigenous business expansion, hiring</li>
        <li><strong>Community Investment:</strong> Equity dividends fund infrastructure (housing, recreation, broadband)</li>
        <li><strong>Education Outcomes:</strong> Scholarships increase post-secondary attainment (+8-15% in study communities)</li>
      </ul>

      <div class="bg-orange-50 border-l-4 border-orange-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Example - Moose Cree First Nation:</strong> Post-Makwa Solar (100% owned, 10 MW): Annual revenue $2.5M → Community outcomes (2020-2024): Unemployment 28% → 15%. High school graduation 62% → 78%. New builds: health center, youth center, 40 housing units. Direct project employment: 8 FTE. Indirect: 15 local businesses contracts. Result: Economic self-sufficiency, reduced federal dependency 35%.</p>
      </div>
    `,
    relatedTopics: ['indigenous.overview', 'indigenous.equity', 'indigenous.ibas'],
  },
};
