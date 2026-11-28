/**
 * Help content: Carbon Emissions
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const CARBON_CONTENT: Record<string, HelpContentItem> = {
  // ==================== CARBON EMISSIONS (ADDITIONAL) ====================

  'carbon.grid-intensity': {
    id: 'carbon.grid-intensity',
    title: 'Grid Carbon Intensity (gCO2/kWh)',
    shortText: 'How much pollution per unit of electricity',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Measuring How "Dirty" or "Clean" Your Electricity Is</h3>
      <p class="mb-4"><strong>Grid Carbon Intensity</strong> measures how much CO₂ is emitted to generate 1 kWh of electricity (gCO2/kWh).</p>

      <h4 class="font-semibold mt-4 mb-2">Canadian Provincial Comparison:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Quebec:</strong> 30 gCO2/kWh (95% hydro) ✅</li>
        <li><strong>Ontario:</strong> 40 gCO2/kWh (nuclear + hydro) ✅</li>
        <li><strong>Alberta:</strong> 600 gCO2/kWh (gas + coal) ❌</li>
        <li><strong>Saskatchewan:</strong> 650 gCO2/kWh (coal + gas) ❌</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Why It Matters:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>EVs are 20× cleaner in Quebec than Alberta</li>
        <li>Heat pumps save more in clean provinces</li>
        <li>Intensity varies hour-by-hour (lower at night)</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Impact:</strong> Lowering Canada's average from 130 → 30 gCO2/kWh = Removing 40 million cars!</p>
      </div>
    `,
    relatedTopics: ['carbon-emissions', 'energy-mix'],
  },

  'carbon.lifecycle-emissions': {
    id: 'carbon.lifecycle-emissions',
    title: 'Lifecycle vs Direct Emissions',
    shortText: 'Full picture including manufacturing',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Full Carbon Footprint</h3>
      <p class="mb-4">Lifecycle emissions count EVERYTHING: mining, manufacturing, operation, and decommissioning.</p>

      <h4 class="font-semibold mt-4 mb-2">Comparison:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Coal:</strong> 950 gCO2/kWh lifecycle</li>
        <li><strong>Natural Gas:</strong> 490 gCO2/kWh lifecycle</li>
        <li><strong>Solar:</strong> 45 gCO2/kWh (silicon purification)</li>
        <li><strong>Wind:</strong> 11 gCO2/kWh (steel/concrete)</li>
        <li><strong>Nuclear:</strong> 12 gCO2/kWh (uranium mining)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Key Insight:</h4>
      <p class="mb-4">Even including manufacturing, renewables are still 80-95% cleaner than fossil fuels! Solar pays back its carbon in 1-3 years, then generates clean power for 25-30 years.</p>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🔄 Future:</strong> Recycling wind blades and solar panels can cut lifecycle emissions another 20-40%!</p>
      </div>
    `,
    relatedTopics: ['carbon-emissions', 'renewable-energy'],
  },

  'carbon.avoided-emissions': {
    id: 'carbon.avoided-emissions',
    title: 'Avoided Emissions from Clean Energy',
    shortText: 'How much pollution renewables prevent',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Pollution That Didn't Happen</h3>
      <p class="mb-4"><strong>Avoided emissions</strong> measure how much CO₂ we DIDN'T release because we used clean energy instead of fossil fuels.</p>

      <h4 class="font-semibold mt-4 mb-2">How It's Calculated:</h4>
      <div class="bg-slate-100 p-3 rounded mb-4 font-mono text-sm">
        Avoided = Clean Energy (kWh) × Grid Emission Factor (gCO2/kWh)
      </div>

      <h4 class="font-semibold mt-4 mb-2">Canada's Avoided Emissions (2023):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Hydro:</strong> 380 TWh → 228 Mt CO₂ avoided</li>
        <li><strong>Nuclear:</strong> 90 TWh → 54 Mt avoided</li>
        <li><strong>Wind:</strong> 40 TWh → 24 Mt avoided</li>
        <li><strong>Total:</strong> 309 Mt avoided = 65M cars off road!</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Compounding:</strong> Every TWh of clean energy avoids emissions EVERY YEAR for 30-80 years!</p>
      </div>
    `,
    relatedTopics: ['carbon-emissions', 'renewable-energy'],
  },

  'carbon.net-zero': {
    id: 'carbon.net-zero',
    title: 'Net-Zero by 2050',
    shortText: 'Canada plan to eliminate emissions',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Canada's Climate Promise</h3>
      <p class="mb-4"><strong>Net-Zero by 2050</strong> means Canada will produce no more GHG emissions than it removes from the atmosphere.</p>

      <h4 class="font-semibold mt-4 mb-2">2030 Interim Targets (40-45% below 2005):</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Electricity:</strong> 90% zero-emission generation</li>
        <li><strong>Transport:</strong> 60% EV sales</li>
        <li><strong>Buildings:</strong> 50% heat pump adoption</li>
        <li><strong>Industry:</strong> CCUS in cement, steel, hydrogen</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2050 Net-Zero:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>100% clean electricity (renewables + nuclear)</li>
        <li>98% electric transport, 2% green hydrogen</li>
        <li>95% heat pumps in buildings</li>
        <li>50+ Mt/year negative emissions (DAC + forests)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Investment Required:</h4>
      <p class="mb-4"><strong>$125-140 billion/year</strong> through 2050 ($3.8 trillion total)</p>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🌍 Global:</strong> 130+ countries representing 88% of emissions have committed to net-zero by 2050-2070!</p>
      </div>
    `,
    relatedTopics: ['carbon-emissions', 'renewable-energy'],
  },
};
