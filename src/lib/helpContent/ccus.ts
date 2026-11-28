/**
 * Help content: CCUS Projects
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const CCUS_CONTENT: Record<string, HelpContentItem> = {
  // ==================== CCUS PROJECTS (Phase 2) ====================

  'ccus.overview': {
    id: 'ccus.overview',
    title: 'CCUS Projects Dashboard',
    shortText: 'Track carbon capture and storage projects',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Carbon Capture, Utilization & Storage</h3>
      <p class="mb-4"><strong>CCUS</strong> captures CO₂ from industrial facilities before it reaches the atmosphere, then stores it underground permanently or uses it for products.</p>

      <h4 class="font-semibold mt-4 mb-2">Why CCUS Matters:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Hard-to-Abate Sectors:</strong> Cement, steel, hydrogen can't easily electrify</li>
        <li><strong>Blue Hydrogen:</strong> Enables clean hydrogen from natural gas</li>
        <li><strong>Existing Assets:</strong> Keeps gas plants/refineries running cleaner</li>
        <li><strong>Negative Emissions:</strong> Direct Air Capture removes past CO₂</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Canada's CCUS Strategy:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Investment Tax Credit:</strong> 50-60% of CCUS project costs</li>
        <li><strong>Pathfinder Initiative:</strong> Alberta CCUS hubs ($16.5B Strathcona)</li>
        <li><strong>2030 Target:</strong> 15 Mt CO₂/year captured</li>
        <li><strong>Key Projects:</strong> Quest (8 Mt stored), Alberta Carbon Trunk Line</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">What This Dashboard Shows:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>CCUS projects by status (operational, planning, construction)</li>
        <li>Capture capacity & CO₂ stored to date</li>
        <li>Cost per tonne trends</li>
        <li>CCUS hubs & shared infrastructure</li>
        <li>Investment & ITC value</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Scale:</strong> Quest project has stored 8 Mt CO₂ since 2015 with 99%+ retention rate. Proven technology!</p>
      </div>
    `,
    relatedTopics: ['ccus.technologies', 'ccus.economics', 'ccus.applications'],
  },

  'ccus.technologies': {
    id: 'ccus.technologies',
    title: 'Carbon Capture Technologies',
    shortText: '4 ways to capture CO₂',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">How We Capture Carbon</h3>

      <h4 class="font-semibold mt-4 mb-2">1. Post-Combustion Capture</h4>
      <p class="mb-2"><strong>Process:</strong> Scrub CO₂ from flue gas AFTER burning fuel</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Technology:</strong> Amine solvents (MEA, MDEA)</li>
        <li><strong>Capture Rate:</strong> 85-95%</li>
        <li><strong>Energy Penalty:</strong> 25-30% (reduce plant efficiency)</li>
        <li><strong>Best For:</strong> Retrofitting existing power plants</li>
        <li><strong>Example:</strong> Boundary Dam (Sask) - 1 Mt/year</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. Pre-Combustion Capture</h4>
      <p class="mb-2"><strong>Process:</strong> Remove carbon BEFORE burning (IGCC, SMR)</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Technology:</strong> Steam methane reforming + H₂ separation</li>
        <li><strong>Capture Rate:</strong> 90-95%</li>
        <li><strong>Energy Penalty:</strong> 15-20% (better than post)</li>
        <li><strong>Best For:</strong> Blue hydrogen production</li>
        <li><strong>Example:</strong> Quest (Shell) - hydrogen from oil sands</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. Oxy-Fuel Combustion</h4>
      <p class="mb-2"><strong>Process:</strong> Burn fuel with pure oxygen (not air)</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Output:</strong> Nearly pure CO₂ stream (easy to capture)</li>
        <li><strong>Capture Rate:</strong> 90-95%</li>
        <li><strong>Challenge:</strong> Oxygen separation is energy-intensive</li>
        <li><strong>Best For:</strong> New-build power/industrial plants</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">4. Direct Air Capture (DAC)</h4>
      <p class="mb-2"><strong>Process:</strong> Suck CO₂ directly from ambient air</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Technology:</strong> Solid sorbents or liquid solvents</li>
        <li><strong>Concentration:</strong> 420 ppm (vs 10-15% in flue gas)</li>
        <li><strong>Cost:</strong> $300-600/tonne (expensive!)</li>
        <li><strong>Benefit:</strong> Can deploy anywhere, removes legacy CO₂</li>
        <li><strong>Example:</strong> Carbon Engineering (Squamish, BC)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Technology Comparison:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Technology</th>
            <th class="border px-2 py-1">Capture Rate</th>
            <th class="border px-2 py-1">Cost ($/ton)</th>
            <th class="border px-2 py-1">Maturity</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Post-Combustion</td>
            <td class="border px-2 py-1">85-95%</td>
            <td class="border px-2 py-1">$60-100</td>
            <td class="border px-2 py-1 bg-green-100">Commercial</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Pre-Combustion</td>
            <td class="border px-2 py-1">90-95%</td>
            <td class="border px-2 py-1">$50-80</td>
            <td class="border px-2 py-1 bg-green-100">Commercial</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Oxy-Fuel</td>
            <td class="border px-2 py-1">90-95%</td>
            <td class="border px-2 py-1">$70-110</td>
            <td class="border px-2 py-1 bg-yellow-100">Pilot</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Direct Air Capture</td>
            <td class="border px-2 py-1">N/A</td>
            <td class="border px-2 py-1">$300-600</td>
            <td class="border px-2 py-1 bg-yellow-100">Emerging</td>
          </tr>
        </tbody>
      </table>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚡ Energy Penalty:</strong> Capturing CO₂ requires significant energy (15-30% of plant output), which is why cheap power (hydro, nuclear) helps economics.</p>
      </div>
    `,
    relatedTopics: ['ccus.overview', 'ccus.economics'],
  },

  'ccus.economics': {
    id: 'ccus.economics',
    title: 'CCUS Economics & Tax Credits',
    shortText: 'Costs, subsidies, and business case',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Making CCUS Economically Viable</h3>

      <h4 class="font-semibold mt-4 mb-2">Current Costs:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Capture:</strong> $50-150/tonne CO₂ (technology-dependent)</li>
        <li><strong>Transport:</strong> $5-20/tonne (pipeline distance)</li>
        <li><strong>Storage:</strong> $10-30/tonne (well injection, monitoring)</li>
        <li><strong>Total:</strong> $65-200/tonne all-in</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Canada Investment Tax Credit (ITC):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Application</th>
            <th class="border px-2 py-1">ITC Rate</th>
            <th class="border px-2 py-1">Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Direct Air Capture</td>
            <td class="border px-2 py-1 bg-green-100">60%</td>
            <td class="border px-2 py-1">$1B project → $600M credit</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Dedicated Geological Storage</td>
            <td class="border px-2 py-1 bg-yellow-100">50%</td>
            <td class="border px-2 py-1">Saline aquifer injection</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Other Applications</td>
            <td class="border px-2 py-1 bg-yellow-100">37.5%</td>
            <td class="border px-2 py-1">EOR, industrial use</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">US 45Q Tax Credit (Comparison):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Geological Storage:</strong> $85/tonne CO₂</li>
        <li><strong>EOR:</strong> $60/tonne CO₂</li>
        <li><strong>DAC:</strong> $180/tonne CO₂</li>
        <li><strong>Duration:</strong> 12 years of credits</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Breakeven Analysis Example:</h4>
      <p class="mb-2"><strong>Blue Hydrogen Facility ($1.5B capex):</strong></p>
      <div class="bg-slate-100 p-3 rounded mb-4 text-sm">
        <p>Capture Cost: $70/tonne × 3 Mt/year = $210M/year</p>
        <p>Revenue from H₂: $5/kg × 1,500 tonnes/day = $2.7B/year</p>
        <p>ITC: 50% × $1.5B = $750M (one-time)</p>
        <p>Payback: 4-6 years with ITC vs 10+ without</p>
      </div>

      <h4 class="font-semibold mt-4 mb-2">Market Drivers:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Carbon Price:</strong> $170/tonne by 2030 makes CCUS competitive</li>
        <li><strong>Clean Fuel Standards:</strong> Low-carbon hydrogen premium</li>
        <li><strong>Corporate ESG:</strong> Companies paying $50-100/tonne for offsets</li>
        <li><strong>Export Markets:</strong> EU/Japan demand low-carbon products</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💰 Strathcona Hub:</strong> $16.5B project with 60% ITC = $10B government support. Enables $50B+ in industrial investment.</p>
      </div>
    `,
    relatedTopics: ['ccus.technologies', 'ccus.applications'],
  },

  'ccus.applications': {
    id: 'ccus.applications',
    title: 'CCUS Applications',
    shortText: 'Where CCUS makes sense',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Industries Using CCUS</h3>

      <h4 class="font-semibold mt-4 mb-2">1. Blue Hydrogen Production (Biggest)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Process:</strong> SMR of natural gas + CCUS → clean H₂</li>
        <li><strong>Capture Rate:</strong> 90-95% (pre-combustion)</li>
        <li><strong>Cost:</strong> $2-3/kg H₂ (vs $1-2 grey, $4-7 green)</li>
        <li><strong>Example:</strong> Air Products $1.3B facility - 3 Mt/year captured</li>
        <li><strong>Market:</strong> $50B+ opportunity in Canada by 2050</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. Cement Production</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Challenge:</strong> Chemical process releases CO₂ (CaCO₃ → CaO + CO₂)</li>
        <li><strong>Emissions:</strong> ~600 kg CO₂/tonne cement (can't avoid)</li>
        <li><strong>CCUS Potential:</strong> 85-90% capture from concentrated stream</li>
        <li><strong>Cost Impact:</strong> +$30-50/tonne cement (+15-20%)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. Steel Production</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Challenge:</strong> Blast furnaces produce 1.8 tonnes CO₂/tonne steel</li>
        <li><strong>Alternatives:</strong> H₂-based DRI (direct reduced iron)</li>
        <li><strong>CCUS Role:</strong> Capture from blast furnace gas (transitional)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">4. Natural Gas Power Plants</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Role:</strong> "Firm" backup for renewables</li>
        <li><strong>Capture:</strong> Post-combustion amine scrubbing</li>
        <li><strong>Cost:</strong> +$40-60/MWh (doubles electricity cost)</li>
        <li><strong>Alternative:</strong> Batteries + green hydrogen by 2035</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">5. Oil Sands (Alberta)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Emissions:</strong> 70-90 kg CO₂/barrel bitumen</li>
        <li><strong>Pathways Partnership:</strong> Industry consortium for CCUS</li>
        <li><strong>Target:</strong> Net-zero oil sands by 2050</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">6. Direct Air Capture (Future)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Purpose:</strong> Negative emissions (remove past CO₂)</li>
        <li><strong>Cost:</strong> $300-600/tonne (needs to drop to $100)</li>
        <li><strong>Scale Needed:</strong> 1-2 Gt/year globally by 2050</li>
        <li><strong>Canadian Advantage:</strong> Cheap hydro power (BC, Quebec)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Priority Ranking:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Application</th>
            <th class="border px-2 py-1">Mt CO₂/yr</th>
            <th class="border px-2 py-1">Economics</th>
            <th class="border px-2 py-1">Priority</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Blue Hydrogen</td>
            <td class="border px-2 py-1">10-15</td>
            <td class="border px-2 py-1 bg-green-100">Good</td>
            <td class="border px-2 py-1">High</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Cement</td>
            <td class="border px-2 py-1">3-5</td>
            <td class="border px-2 py-1 bg-yellow-100">Moderate</td>
            <td class="border px-2 py-1">High</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Oil Sands</td>
            <td class="border px-2 py-1">5-8</td>
            <td class="border px-2 py-1 bg-green-100">Good (ITC)</td>
            <td class="border px-2 py-1">High</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Power Plants</td>
            <td class="border px-2 py-1">2-4</td>
            <td class="border px-2 py-1 bg-red-100">Poor</td>
            <td class="border px-2 py-1">Low (phase out)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Direct Air Capture</td>
            <td class="border px-2 py-1">0.1-0.5</td>
            <td class="border px-2 py-1 bg-red-100">Very Expensive</td>
            <td class="border px-2 py-1">Future</td>
          </tr>
        </tbody>
      </table>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🎯 Strategy:</strong> Focus on blue hydrogen (export market) and hard-to-abate sectors (cement, steel). Phase out fossil power by 2035.</p>
      </div>
    `,
    relatedTopics: ['ccus.technologies', 'ccus.economics', 'ccus.overview'],
  },
};
