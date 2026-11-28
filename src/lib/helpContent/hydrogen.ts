/**
 * Help content: Hydrogen Economy
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const HYDROGEN_CONTENT: Record<string, HelpContentItem> = {
  // ==================== HYDROGEN ECONOMY ====================

  'hydrogen.overview': {
    id: 'hydrogen.overview',
    title: 'Hydrogen Economy Hub Dashboard',
    shortText: 'Track Canada hydrogen production, pricing, and infrastructure',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Hydrogen Economy</h3>
      <p class="mb-4">Hydrogen (H₂) is emerging as a clean fuel for heavy transportation, industry, and power generation. Canada is investing $300M to become a global hydrogen leader!</p>

      <h4 class="font-semibold mt-4 mb-2">The 3 Colors of Hydrogen:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>💚 Green Hydrogen</strong> - Made using renewable electricity (wind, solar, hydro) to split water. Zero emissions!</li>
        <li><strong>🔵 Blue Hydrogen</strong> - Made from natural gas with Carbon Capture and Storage (CCS). Low emissions (~85-95% captured)</li>
        <li><strong>⚫ Grey Hydrogen</strong> - Made from natural gas without CCS. High emissions (not sustainable)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Why Hydrogen Matters:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Hard-to-Decarbonize Sectors</strong> - Steel, cement, ammonia production can't easily use batteries</li>
        <li><strong>Heavy Transport</strong> - Fuel cell trucks, trains, ships need long range and fast refueling</li>
        <li><strong>Energy Storage</strong> - Store excess renewable energy as hydrogen for later</li>
        <li><strong>Heating</strong> - Can blend into natural gas pipelines for cleaner heating</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">What This Dashboard Shows:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Edmonton vs Calgary hydrogen hubs (capacity, projects, investment)</li>
        <li>Hydrogen production facilities and methods</li>
        <li>Pricing trends ($/kg) and diesel equivalency</li>
        <li>Refueling infrastructure rollout</li>
        <li>Demand forecasts for transportation, industry, power</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Alberta Advantage:</strong> Alberta has cheap natural gas for blue hydrogen + strong wind/solar potential for green hydrogen. The province aims to produce 2.5 million tonnes/year by 2030!</p>
      </div>
    `,
    relatedTopics: ['hydrogen.colors', 'hydrogen.production', 'hydrogen.pricing'],
  },

  'hydrogen.colors': {
    id: 'hydrogen.colors',
    title: 'Hydrogen Color Classification',
    shortText: 'Green vs Blue vs Grey hydrogen explained',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Hydrogen Rainbow</h3>
      <p class="mb-4">Not all hydrogen is created equal! The "color" system helps us understand how clean the production process is.</p>

      <h4 class="font-semibold mt-4 mb-2">💚 Green Hydrogen (Cleanest)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>How It's Made:</strong> Electrolysis (electricity splits water into H₂ + O₂)</li>
        <li><strong>Power Source:</strong> 100% renewable (wind, solar, hydro)</li>
        <li><strong>Emissions:</strong> ZERO (only byproduct is oxygen!)</li>
        <li><strong>Cost:</strong> $4-7/kg (expensive now, but dropping fast)</li>
        <li><strong>Example:</strong> Quebec hydro-powered electrolyzer facilities</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">🔵 Blue Hydrogen (Low Emission)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>How It's Made:</strong> Steam Methane Reforming (SMR) of natural gas</li>
        <li><strong>Carbon Capture:</strong> 85-95% of CO₂ captured and stored underground</li>
        <li><strong>Emissions:</strong> Low (~1-2 kg CO₂/kg H₂ vs 10 kg without CCS)</li>
        <li><strong>Cost:</strong> $2-3/kg (cheaper than green, for now)</li>
        <li><strong>Example:</strong> Air Products' Alberta facility (1,500 tonnes/day)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">⚫ Grey Hydrogen (High Emission)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>How It's Made:</strong> SMR without carbon capture</li>
        <li><strong>Emissions:</strong> High (~10 kg CO₂/kg H₂)</li>
        <li><strong>Cost:</strong> $1-2/kg (cheapest, but dirty)</li>
        <li><strong>Status:</strong> 95% of today's hydrogen, but being phased out</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Other Colors (Bonus):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Pink:</strong> Electrolysis powered by nuclear</li>
        <li><strong>Turquoise:</strong> Methane pyrolysis (produces solid carbon, not CO₂)</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🎯 The Goal:</strong> Transition from grey → blue → green by 2050. Canada aims for 30% green hydrogen by 2030!</p>
      </div>
    `,
    relatedTopics: ['hydrogen.production', 'hydrogen.overview'],
  },

  'hydrogen.production': {
    id: 'hydrogen.production',
    title: 'Hydrogen Production Methods',
    shortText: 'How hydrogen is produced at scale',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Making Hydrogen</h3>
      <p class="mb-4">There are two main ways to produce hydrogen at industrial scale: electrolysis (splitting water) and steam methane reforming (converting natural gas).</p>

      <h4 class="font-semibold mt-4 mb-2">1. Electrolysis (Green Hydrogen)</h4>
      <p class="mb-2">Using electricity to split water molecules:</p>
      <div class="bg-slate-100 p-3 rounded mb-3 font-mono text-sm">
        2H₂O + electricity → 2H₂ + O₂
      </div>
      <p class="mb-2"><strong>Types of Electrolyzers:</strong></p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Alkaline (AEL):</strong> Mature tech, 60-70% efficient, $500-1,000/kW</li>
        <li><strong>PEM (Proton Exchange Membrane):</strong> Faster response, 65-75% efficient, $1,000-1,500/kW</li>
        <li><strong>SOEC (Solid Oxide):</strong> High-temp, 80-85% efficient (future tech)</li>
      </ul>
      <p class="mb-4"><strong>Energy Required:</strong> 50-55 kWh per kg of H₂ (enough to power 5 homes for a day)</p>

      <h4 class="font-semibold mt-4 mb-2">2. Steam Methane Reforming (Blue/Grey Hydrogen)</h4>
      <p class="mb-2">Reacting natural gas with high-temperature steam:</p>
      <div class="bg-slate-100 p-3 rounded mb-3 font-mono text-sm">
        CH₄ + 2H₂O → 4H₂ + CO₂
      </div>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Process:</strong> Heat natural gas to 700-1,000°C with steam</li>
        <li><strong>Efficiency:</strong> 70-80% (lower than electrolysis, but cheaper)</li>
        <li><strong>CO₂ Byproduct:</strong> ~10 kg CO₂ per kg H₂ (must be captured for "blue" hydrogen)</li>
        <li><strong>Cost:</strong> $1-3/kg depending on gas price and CCS</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Production Economics:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Method</th>
            <th class="border px-2 py-1">Cost ($/kg)</th>
            <th class="border px-2 py-1">CO₂ Emissions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Grey SMR</td>
            <td class="border px-2 py-1">$1-2</td>
            <td class="border px-2 py-1">10 kg CO₂/kg H₂</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Blue SMR+CCS</td>
            <td class="border px-2 py-1">$2-3</td>
            <td class="border px-2 py-1">1-2 kg CO₂/kg H₂</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Green Electrolysis</td>
            <td class="border px-2 py-1">$4-7</td>
            <td class="border px-2 py-1">0 kg CO₂/kg H₂</td>
          </tr>
        </tbody>
      </table>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚡ Fun Fact:</strong> One kilogram of hydrogen contains about the same energy as 3 litres of diesel, but only weighs 1kg vs 2.6kg for the diesel!</p>
      </div>
    `,
    relatedTopics: ['hydrogen.colors', 'hydrogen.pricing', 'hydrogen.overview'],
  },

  'hydrogen.pricing': {
    id: 'hydrogen.pricing',
    title: 'Hydrogen Pricing & Economics',
    shortText: 'Understanding hydrogen costs and diesel equivalency',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">How Much Does Hydrogen Cost?</h3>
      <p class="mb-4">Hydrogen pricing is evolving rapidly as production scales up and technology improves. Prices are typically measured in $/kg (dollars per kilogram).</p>

      <h4 class="font-semibold mt-4 mb-2">Current Pricing (2024-2025):</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Grey H₂:</strong> $1-2/kg (natural gas price-dependent)</li>
        <li><strong>Blue H₂:</strong> $2-3/kg (grey + CCS cost)</li>
        <li><strong>Green H₂:</strong> $4-7/kg (dropping 8-10% annually)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Diesel Equivalency:</h4>
      <p class="mb-2">To compare hydrogen with diesel fuel:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>1 kg H₂ ≈ 3 litres diesel</strong> (energy content)</li>
        <li><strong>At $5/kg H₂:</strong> Equivalent to $1.67/litre diesel</li>
        <li><strong>At $3/kg H₂:</strong> Equivalent to $1.00/litre diesel</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">What Affects Hydrogen Price?</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Production Method:</strong> Green costs 2-3× more than grey (for now)</li>
        <li><strong>Electricity Costs:</strong> Green H₂ needs ~55 kWh/kg → cheap power = cheap hydrogen</li>
        <li><strong>Natural Gas Prices:</strong> Affects grey/blue hydrogen costs</li>
        <li><strong>Carbon Pricing:</strong> $170/tonne carbon tax adds ~$1/kg to grey H₂</li>
        <li><strong>Scale:</strong> Gigawatt-scale production → 30-40% cost reduction</li>
        <li><strong>Technology Learning:</strong> Electrolyzer costs dropping 10-15%/year</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Price Forecasts:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>2025:</strong> Green H₂ at $4-6/kg</li>
        <li><strong>2030:</strong> Green H₂ reaches parity with blue at $2-3/kg</li>
        <li><strong>2050:</strong> Green H₂ below $1.50/kg (competitive with fossil fuels)</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💰 Investment Opportunity:</strong> Canada's Hydrogen Strategy aims for $50B in economic activity by 2050. Early movers in production, infrastructure, and fuel cells could capture massive value!</p>
      </div>
    `,
    relatedTopics: ['hydrogen.production', 'hydrogen.overview'],
  },
};
