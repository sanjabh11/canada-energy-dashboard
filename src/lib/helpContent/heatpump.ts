/**
 * Help content: Heat Pumps
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const HEATPUMP_CONTENT: Record<string, HelpContentItem> = {
  // ==================== HEAT PUMPS (Phase 3) ====================

  'heatpump.overview': {
    id: 'heatpump.overview',
    title: 'Heat Pump Technology Dashboard',
    shortText: 'Electrify home heating with heat pump rebates',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Electrifying Canada's Homes</h3>
      <p class="mb-4">Heat pumps are 3-4× more efficient than furnaces because they move heat instead of burning fuel. Canada targets 5-10 million heat pumps by 2030 to eliminate oil/gas heating.</p>

      <h4 class="font-semibold mt-4 mb-2">How Heat Pumps Work:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Reverse refrigeration cycle (same as AC in summer)</li>
        <li>Extract heat from outdoor air even at -30°C</li>
        <li>Deliver 3-4 units of heat per 1 unit of electricity (COP 3-4)</li>
        <li>Work with existing radiators/baseboard/forced-air</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Why Critical for Net-Zero:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Heating = 60% of residential energy use in Canada</li>
        <li>5.5M homes still use oil/propane (high carbon + cost)</li>
        <li>Heat pumps cut emissions 80-90% vs oil furnace</li>
        <li>Enable demand response (grid flexibility)</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💰 Savings:</strong> Average home saves $500-2,000/year switching from oil to heat pump (NB, NS, PEI).</p>
      </div>
    `,
    relatedTopics: ['heatpump.rebates', 'heatpump.types'],
  },

  'heatpump.rebates': {
    id: 'heatpump.rebates',
    title: 'Heat Pump Rebate Programs',
    shortText: 'Stack federal and provincial rebates up to $18,000',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Maximize Your Rebates</h3>
      <p class="mb-4">Federal and provincial programs can be combined ("stacked") to reduce upfront cost by 40-60%. Low-income households eligible for extra grants.</p>

      <h4 class="font-semibold mt-4 mb-2">Federal Programs:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Program</th>
            <th class="border px-2 py-1">Amount</th>
            <th class="border px-2 py-1">Eligibility</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Canada Greener Homes Grant</td>
            <td class="border px-2 py-1">$5,000</td>
            <td class="border px-2 py-1">Homeowners, requires EnerGuide audit ($600 rebated)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Oil to Heat Pump Affordability (OHPA)</td>
            <td class="border px-2 py-1">$5,000-10,000</td>
            <td class="border px-2 py-1">Atlantic/rural, oil/propane conversion, income-tested</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Canada Greener Homes Loan</td>
            <td class="border px-2 py-1">0% up to $40,000</td>
            <td class="border px-2 py-1">10 years, interest-free financing</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Provincial Top-Ups (Examples):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>BC CleanBC:</strong> $3,000-6,000 (income-tested)</li>
        <li><strong>Quebec Chauffez Vert:</strong> $3,500-8,500 (oil conversion priority)</li>
        <li><strong>Nova Scotia HomeWarming:</strong> $3,500 free installation (low-income)</li>
        <li><strong>Ontario Enbridge:</strong> $4,000-7,000 (natural gas customers)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Maximum Stack Example (NS low-income oil conversion):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Federal OHPA: $10,000</li>
        <li>Federal Greener Homes: $5,000</li>
        <li>NS HomeWarming: $3,500</li>
        <li><strong>Total: $18,500</strong> for $15,000-20,000 system = 90% covered</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>⚡ Tip:</strong> Do EnerGuide audit first ($600 rebate covers cost). Identifies best upgrades and unlocks all federal programs.</p>
      </div>
    `,
    relatedTopics: ['heatpump.overview', 'heatpump.economics'],
  },

  'heatpump.types': {
    id: 'heatpump.types',
    title: 'Heat Pump Types and Efficiency',
    shortText: 'Air-source vs ground-source, cold climate models',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Choosing the Right Heat Pump</h3>

      <h4 class="font-semibold mt-4 mb-2">1. Air-Source Heat Pumps (ASHP)</h4>
      <p class="mb-2"><strong>Most Popular:</strong> 95% of installations</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>How it works:</strong> Extract heat from outdoor air (even at -30°C)</li>
        <li><strong>Cost:</strong> $5,000-15,000 installed (ducted whole-home)</li>
        <li><strong>COP:</strong> 2.5-4.0 at 0°C, 1.5-2.5 at -25°C</li>
        <li><strong>Types:</strong> Ducted (central), ductless mini-splits (multi-zone)</li>
        <li><strong>Best for:</strong> Most Canadian homes, quick install (1-3 days)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. Ground-Source (Geothermal) Heat Pumps (GSHP)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>How it works:</strong> Extract heat from underground (constant 8-12°C)</li>
        <li><strong>Cost:</strong> $20,000-40,000 (drilling + system)</li>
        <li><strong>COP:</strong> 3.5-5.0 year-round (more efficient than ASHP)</li>
        <li><strong>Payback:</strong> 10-20 years vs ASHP (but 25+ year lifespan)</li>
        <li><strong>Best for:</strong> Rural properties with land, new construction</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. Cold Climate Heat Pumps (ccASHP)</h4>
      <p class="mb-2"><strong>Engineered for Canada:</strong> Mitsubishi Hyper-Heat, Carrier Greenspeed, Bosch IDS</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>100% heating capacity maintained at -25°C (vs 50% standard ASHP)</li>
        <li>Vapor injection compressor + larger heat exchanger</li>
        <li>NRCan requires cold climate rating for rebates (HSPF ≥ 9.0)</li>
        <li>Cost premium: $2,000-4,000 vs standard ASHP</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Key Ratings to Understand:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>COP (Coefficient of Performance):</strong> Heat out / electricity in (higher = better)</li>
        <li><strong>HSPF (Heating Seasonal Performance Factor):</strong> Efficiency over full winter (≥9.0 for rebates)</li>
        <li><strong>SEER (Seasonal Energy Efficiency Ratio):</strong> Cooling efficiency (bonus: heat pumps replace AC)</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Sizing:</strong> Oversized = short-cycling = inefficiency. Get Manual J calculation from installer (accounts for insulation, windows, climate).</p>
      </div>
    `,
    relatedTopics: ['heatpump.overview', 'heatpump.economics'],
  },

  'heatpump.economics': {
    id: 'heatpump.economics',
    title: 'Heat Pump Economics and Savings',
    shortText: 'Operating costs, payback periods, total cost of ownership',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Total Cost of Ownership</h3>

      <h4 class="font-semibold mt-4 mb-2">Example: Nova Scotia Oil-to-Heat Pump Conversion</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Cost Item</th>
            <th class="border px-2 py-1">Oil Furnace</th>
            <th class="border px-2 py-1">Cold Climate Heat Pump</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Upfront Cost (after rebates)</td>
            <td class="border px-2 py-1">$4,000 (replacement)</td>
            <td class="border px-2 py-1">$2,000 (after $16K rebates)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Annual Heating Cost (2,500 L oil / 30,000 kWh)</td>
            <td class="border px-2 py-1">$3,500 ($1.40/L)</td>
            <td class="border px-2 py-1">$1,200 (10,000 kWh @ $0.12/kWh)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1 font-semibold">Payback Period</td>
            <td class="border px-2 py-1">-</td>
            <td class="border px-2 py-1 bg-green-100">1 year (saves $2,300/year)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">15-Year Total Cost</td>
            <td class="border px-2 py-1">$56,500</td>
            <td class="border px-2 py-1 bg-green-100">$20,000 (saves $36,500!)</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Operating Cost by Fuel (per kWh thermal output):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Heat Pump (COP 3.0):</strong> $0.04/kWh (electricity $0.12/kWh ÷ 3)</li>
        <li><strong>Natural Gas (90% eff):</strong> $0.06/kWh ($8/GJ)</li>
        <li><strong>Propane (90% eff):</strong> $0.12/kWh ($30/GJ)</li>
        <li><strong>Oil Furnace (80% eff):</strong> $0.14/kWh ($1.40/L)</li>
        <li><strong>Electric Baseboard:</strong> $0.12/kWh (COP 1.0)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">When Payback is Longer:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Natural gas homes:</strong> 10-15 years (smaller savings, but still reduces emissions 30-50%)</li>
        <li><strong>No rebates:</strong> 5-8 years for oil, 15-20 years for gas</li>
        <li><strong>Ontario high electricity rates:</strong> Time-of-use shifts matter (heat at night = lower cost)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Hidden Benefits:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Free AC:</strong> Heat pumps cool in summer (vs $3,000+ separate AC system)</li>
        <li><strong>No tank leaks:</strong> Avoid $5,000-20,000 oil tank removal/cleanup</li>
        <li><strong>Home value:</strong> Heat pump adds $5,000-10,000 to resale (energy efficiency premium)</li>
        <li><strong>Grid services:</strong> Future revenue from demand response ($50-200/year potential)</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 ROI Tip:</strong> Best economics for oil/propane conversions in Atlantic Canada and rural areas. Natural gas homes should wait for better rebates or pair with solar.</p>
      </div>
    `,
    relatedTopics: ['heatpump.rebates', 'heatpump.types'],
  },
};
