/**
 * Help content: Small Modular Reactors
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const SMR_CONTENT: Record<string, HelpContentItem> = {
  // ==================== SMALL MODULAR REACTORS (Phase 3) ====================

  'smr.overview': {
    id: 'smr.overview',
    title: 'Small Modular Reactor Technology',
    shortText: 'Next-generation nuclear for clean baseload power',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Canada's Nuclear Future</h3>
      <p class="mb-4">SMRs are factory-built reactors (10-300 MW) vs traditional large reactors (1,000+ MW). OPG's Darlington SMR will be first grid-scale Gen IV reactor in North America (2029 target).</p>

      <h4 class="font-semibold mt-4 mb-2">Why SMRs vs Large Reactors:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Factory Construction:</strong> 80% built in factory = quality control, 3-4 year build vs 10+ years</li>
        <li><strong>Lower Capital Risk:</strong> $500M-1B per unit vs $10B+ for large reactor</li>
        <li><strong>Flexible Siting:</strong> Can replace coal plants, serve remote mines, produce hydrogen</li>
        <li><strong>Passive Safety:</strong> Gen IV designs shut down without power/operator (gravity, natural circulation)</li>
        <li><strong>Load Following:</strong> Can ramp up/down to complement renewables (vs baseload-only large reactors)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Canada's SMR Advantage:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>70 years nuclear expertise (CANDU reactors)</li>
        <li>Experienced regulator (CNSC) with SMR-specific licensing</li>
        <li>Domestic uranium supply (Cameco - 2nd largest globally)</li>
        <li>Federal SMR Action Plan: $1.2B+ funding committed</li>
        <li>3 vendors in CNSC Vendor Design Review (GE Hitachi, Westinghouse, X-energy)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Use Cases in Canada:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Grid Baseload:</strong> Replace retiring coal/gas (OPG Darlington 300 MW)</li>
        <li><strong>Remote Mines:</strong> Replace diesel (NWT diamond mines = $0.50/kWh diesel cost)</li>
        <li><strong>Industrial Heat:</strong> Oil sands SAGD, cement kilns (400-800°C process heat)</li>
        <li><strong>Hydrogen Production:</strong> High-temp electrolysis or thermochemical (pink hydrogen)</li>
      </ul>

      <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mt-4">
        <p class="text-sm"><strong>🇨🇦 Milestone:</strong> OPG received construction license for BWRX-300 (April 2025). First concrete 2026, commercial operation 2029.</p>
      </div>
    `,
    relatedTopics: ['smr.projects', 'smr.regulatory'],
  },

  'smr.projects': {
    id: 'smr.projects',
    title: 'Canadian SMR Projects',
    shortText: 'OPG Darlington 2029, SaskPower, Chalk River',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Pipeline of SMR Deployments</h3>

      <h4 class="font-semibold mt-4 mb-2">1. OPG Darlington (Ontario) - CONSTRUCTION LICENSE ISSUED</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Reactor:</strong> GE Hitachi BWRX-300 (300 MW)</li>
        <li><strong>Cost:</strong> $5-7B for first unit (learning curve, expect $3-4B for 2nd)</li>
        <li><strong>Timeline:</strong> First concrete 2026, grid connection 2029</li>
        <li><strong>Significance:</strong> First Gen IV reactor in North America, demonstration for global export</li>
        <li><strong>Unique Features:</strong> Passive safety (72 hours no operator/power), 10% higher efficiency than Gen III</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. SaskPower (Saskatchewan) - FEASIBILITY STUDY</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Target:</strong> 2030s, site TBD (Estevan coal replacement option)</li>
        <li><strong>Reactor Options:</strong> BWRX-300 (GE Hitachi) or Xe-100 (X-energy)</li>
        <li><strong>Context:</strong> Saskatchewan 40% coal (highest in Canada), needs baseload replacement</li>
        <li><strong>Challenge:</strong> Public support (polling 55% favor, 30% oppose)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. Canadian Nuclear Laboratories - Chalk River (Ontario)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Project:</strong> Micro-reactor demonstration (1-15 MW)</li>
        <li><strong>Vendors Competing:</strong> Westinghouse eVinci, X-energy Xe-Mobile, USNC MMR</li>
        <li><strong>Purpose:</strong> Off-grid applications, remote communities, industrial sites</li>
        <li><strong>Timeline:</strong> Vendor selection 2024-2025, operation 2028-2030</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">4. New Brunswick Point Lepreau (NB Power)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Plan:</strong> ARC-100 (100 MW sodium fast reactor) or BWRX-300</li>
        <li><strong>Status:</strong> Pre-feasibility, MOU with ARC Clean Energy</li>
        <li><strong>Timing:</strong> 2030s (after Point Lepreau CANDU refurbishment)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">5. Alberta Industrial SMRs (Proposed)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Application:</strong> Oil sands SAGD steam generation (replace natural gas boilers)</li>
        <li><strong>Interest:</strong> Capital Power, Suncor exploring feasibility</li>
        <li><strong>Emissions Impact:</strong> Could eliminate 30-40 Mt CO₂/year (10% of Canada's emissions!)</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>📈 Export Potential:</strong> If OPG Darlington succeeds, GE Hitachi projects 30+ BWRX-300 sales globally by 2035 (Poland, Estonia, Finland interest).</p>
      </div>
    `,
    relatedTopics: ['smr.overview', 'smr.regulatory'],
  },

  'smr.regulatory': {
    id: 'smr.regulatory',
    title: 'CNSC Licensing Process',
    shortText: '4-stage approval: VDR, Site Prep, Construction, Operating',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Nuclear Regulatory Framework</h3>
      <p class="mb-4">Canadian Nuclear Safety Commission (CNSC) oversees all nuclear activities. SMRs follow 4-stage licensing process designed for Gen IV safety features.</p>

      <h4 class="font-semibold mt-4 mb-2">Stage 1: Vendor Design Review (VDR)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Purpose:</strong> Pre-licensing technical assessment (optional but recommended)</li>
        <li><strong>Duration:</strong> 3-4 years, 3 phases (~$10-15M vendor cost)</li>
        <li><strong>Status:</strong> GE Hitachi BWRX-300 ✓ completed (2021), X-energy Xe-100 in Phase 3, Westinghouse eVinci in Phase 2</li>
        <li><strong>Output:</strong> CNSC technical report identifying areas needing further work</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Stage 2: Site Preparation License</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Requirements:</strong> Environmental impact statement, Indigenous consultation, site geotechnical studies</li>
        <li><strong>Duration:</strong> 1-2 years review</li>
        <li><strong>OPG Darlington:</strong> Issued 2023, allowed grading, excavation (no nuclear components)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Stage 3: Construction License</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Key Documents:</strong> Final Safety Analysis Report (FSAR), Quality Assurance Program, Detailed Design</li>
        <li><strong>CNSC Review:</strong> 18-24 months (parallel with site prep work)</li>
        <li><strong>OPG Darlington:</strong> Issued April 2025 (first Gen IV construction license globally!)</li>
        <li><strong>Permits:</strong> Nuclear component installation, reactor assembly, fuel loading prep</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Stage 4: Operating License</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Requirements:</strong> Successful commissioning tests, operator training, emergency response plans</li>
        <li><strong>Duration:</strong> Typically 10-20 years (renewable), then relicensing process</li>
        <li><strong>Ongoing:</strong> CNSC inspections, annual compliance reports, public hearings every 5 years</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Key Regulatory Innovations for SMRs:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Passive Safety Credit:</strong> Reduced emergency planning zone (3 km vs 10 km for large reactors)</li>
        <li><strong>Factory QA:</strong> Accepts factory quality control for modular components (vs all on-site inspection)</li>
        <li><strong>Risk-Informed:</strong> Focuses on high-risk areas, streamlines low-risk items (faster than old prescriptive rules)</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>⚖️ Public Participation:</strong> CNSC mandates public hearings for each license stage. Indigenous communities have formal intervention rights. Documents public on CNSC registry.</p>
      </div>
    `,
    relatedTopics: ['smr.projects', 'smr.economics'],
  },

  'smr.economics': {
    id: 'smr.economics',
    title: 'SMR Economics and Funding',
    shortText: 'CAPEX costs, federal support, hydrogen cogeneration revenue',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Cost and Investment Analysis</h3>

      <h4 class="font-semibold mt-4 mb-2">CAPEX Comparison ($/kW):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Technology</th>
            <th class="border px-2 py-1">CAPEX ($/kW)</th>
            <th class="border px-2 py-1">Capacity Factor</th>
            <th class="border px-2 py-1">LCOE ($/MWh)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">SMR (BWRX-300) - FOAK</td>
            <td class="border px-2 py-1">$15,000-20,000</td>
            <td class="border px-2 py-1">95%</td>
            <td class="border px-2 py-1">$120-150</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">SMR (BWRX-300) - NOAK (5th+)</td>
            <td class="border px-2 py-1 bg-green-100">$8,000-10,000</td>
            <td class="border px-2 py-1">95%</td>
            <td class="border px-2 py-1 bg-green-100">$70-90</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Large Nuclear (Gen III)</td>
            <td class="border px-2 py-1">$8,000-12,000</td>
            <td class="border px-2 py-1">90%</td>
            <td class="border px-2 py-1">$80-100</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Wind (Onshore)</td>
            <td class="border px-2 py-1">$2,000-3,000</td>
            <td class="border px-2 py-1">35%</td>
            <td class="border px-2 py-1">$40-60 + storage</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Natural Gas (CCGT)</td>
            <td class="border px-2 py-1">$1,200-1,800</td>
            <td class="border px-2 py-1">50-60%</td>
            <td class="border px-2 py-1">$60-80 + carbon tax</td>
          </tr>
        </tbody>
      </table>

      <p class="text-sm mb-4"><em>FOAK = First Of A Kind, NOAK = Nth Of A Kind. Learning curve critical for SMR economics.</em></p>

      <h4 class="font-semibold mt-4 mb-2">Federal Funding Programs:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Strategic Innovation Fund (SIF):</strong> $600M committed to OPG Darlington (cost-share with Ontario)</li>
        <li><strong>Clean Energy Fund:</strong> $300M for SMR development (CNL, vendor design reviews)</li>
        <li><strong>Investment Tax Credit (ITC):</strong> 30% for clean electricity (SMRs eligible as of 2024)</li>
        <li><strong>Export Development Canada:</strong> $1B financing facility for SMR exports (Poland, Estonia)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Revenue Stacking Opportunities:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Baseload Electricity:</strong> $80-120/MWh (Ontario IESO contracts, Alberta market)</li>
        <li><strong>Capacity Payments:</strong> $40-80/kW-year (availability payments for grid reliability)</li>
        <li><strong>Hydrogen Cogeneration:</strong> Use 10-20% thermal output for electrolysis ($2-4/kg pink H₂)</li>
        <li><strong>Industrial Steam:</strong> Replace natural gas boilers (oil sands = $200-300M/year savings potential)</li>
        <li><strong>District Heating:</strong> Cogeneration for municipalities (waste heat utilization)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">OPG Darlington Business Case:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Total Cost:</strong> $5.6B (FOAK, includes regulatory, engineering, construction)</li>
        <li><strong>Federal/Provincial Support:</strong> ~$1.5B grants + 30% ITC = $3.2B effective support</li>
        <li><strong>Net Cost to OPG:</strong> ~$2.4B for 300 MW = $8,000/kW (competitive with large nuclear)</li>
        <li><strong>Learning Curve:</strong> 2nd unit expected $3-4B (50% cost reduction, NOAK status)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Key Economic Challenges:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>FOAK Risk:</strong> First unit expensive (learning curve penalty $2-3B)</li>
        <li><strong>Long Build:</strong> 6-8 years (vs 2-3 years wind/solar) = financing costs</li>
        <li><strong>Public Acceptance:</strong> Local opposition can delay projects (see SaskPower polling)</li>
        <li><strong>Waste Management:</strong> Used fuel costs $5-10/MWh (federal long-term repository needed)</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Break-Even:</strong> SMRs need carbon price $80-120/tonne OR 5+ unit fleet to compete with gas. With 30% ITC + provincial support, OPG Darlington is economic.</p>
      </div>
    `,
    relatedTopics: ['smr.projects', 'smr.overview'],
  },
};
