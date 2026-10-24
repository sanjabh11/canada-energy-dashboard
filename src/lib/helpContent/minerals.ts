/**
 * Help content: Critical Minerals
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const MINERALS_CONTENT: Record<string, HelpContentItem> = {
  // ==================== CRITICAL MINERALS (Phase 2) ====================

  'minerals.overview': {
    id: 'minerals.overview',
    title: 'Critical Minerals Supply Chain Dashboard',
    shortText: 'Track minerals essential for clean energy transition',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Foundation of Clean Energy</h3>
      <p class="mb-4">Critical minerals are the raw materials needed for batteries, solar panels, wind turbines, and electric motors. Canada's $6.4B strategy aims to secure supply chains.</p>

      <h4 class="font-semibold mt-4 mb-2">Why Critical?</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Essential for EVs, batteries, renewables</li>
        <li>China controls 70-90% of processing</li>
        <li>Supply risk threatens energy transition</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Canada's Advantage:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>30% Investment Tax Credit for mining/processing</li>
        <li>Significant reserves (top 5 globally for most minerals)</li>
        <li>Clean hydro power = lower carbon footprint</li>
        <li>Proximity to US market</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💰 Opportunity:</strong> Critical minerals market worth $500B/year by 2030. Canada aims for $50B+ share.</p>
      </div>
    `,
    relatedTopics: ['minerals.supply-chain', 'minerals.battery-chemistry'],
  },

  'minerals.supply-chain': {
    id: 'minerals.supply-chain',
    title: '6-Stage Supply Chain',
    shortText: 'From mine to battery manufacturing',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Mining → Refining → Manufacturing</h3>
      <p class="mb-4">Canada dominates Stage 1 (mining) but needs to build Stages 3-5 (refining/processing) where China captures most value.</p>

      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Stage</th>
            <th class="border px-2 py-1">Process</th>
            <th class="border px-2 py-1">Value Add</th>
            <th class="border px-2 py-1">Canada</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">1. Mining</td>
            <td class="border px-2 py-1">Extract ore</td>
            <td class="border px-2 py-1">$20/ton</td>
            <td class="border px-2 py-1 bg-green-100">Strong</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2. Concentration</td>
            <td class="border px-2 py-1">Crush, separate</td>
            <td class="border px-2 py-1">$1,000/ton</td>
            <td class="border px-2 py-1 bg-yellow-100">Moderate</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">3. Refining</td>
            <td class="border px-2 py-1">Chemical purification</td>
            <td class="border px-2 py-1">$25,000/ton</td>
            <td class="border px-2 py-1 bg-red-100">Weak</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">4. Cathode Production</td>
            <td class="border px-2 py-1">Mix into battery powder</td>
            <td class="border px-2 py-1">$55,000/ton</td>
            <td class="border px-2 py-1 bg-red-100">Very Weak</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">5. Cell Manufacturing</td>
            <td class="border px-2 py-1">Assemble batteries</td>
            <td class="border px-2 py-1">$150/kWh</td>
            <td class="border px-2 py-1 bg-yellow-100">Emerging</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">6. Recycling</td>
            <td class="border px-2 py-1">Recover minerals</td>
            <td class="border px-2 py-1">95% recovery</td>
            <td class="border px-2 py-1 bg-yellow-100">Growing</td>
          </tr>
        </tbody>
      </table>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Gap:</strong> Canada exports $20/ton ore, imports $25,000/ton refined material. $6.4B strategy fixes this.</p>
      </div>
    `,
    relatedTopics: ['minerals.overview', 'minerals.battery-chemistry'],
  },

  'minerals.priority-list': {
    id: 'minerals.priority-list',
    title: 'Priority Minerals List',
    shortText: 'Lithium, Nickel, Cobalt, Graphite, Copper, REEs',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The 6 Critical Minerals</h3>

      <h4 class="font-semibold mt-4 mb-2">1. Lithium - Battery Electrolyte</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>8-12 kg per EV battery</li>
        <li>Canada reserves: 930,000 tonnes</li>
        <li>Price: $15K-80K/ton (volatile!)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. Graphite - Battery Anode</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>50-70 kg per EV (most of any mineral)</li>
        <li>China: 70% natural, 100% spherical processing</li>
        <li>Export restrictions risk</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. Nickel - Energy Density</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>5-10 kg per EV (NMC batteries)</li>
        <li>Canada #3 globally (Vale Sudbury)</li>
        <li>Need Class 1 sulfate for batteries</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">4. Cobalt - Stability</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>2-8 kg per EV (decreasing)</li>
        <li>70% from DRC (ethical concerns)</li>
        <li>Canada: byproduct of nickel</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">5. Copper - Wiring/Motors</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>80 kg per EV (vs 20 kg gas car)</li>
        <li>2030: 8 Mt demand vs 6 Mt supply</li>
        <li>Wind turbines: 4-5 tonnes per MW</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">6. Rare Earths - Magnets</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>1-2 kg per EV motor (Nd, Dy, Pr)</li>
        <li>China: 90% processing monopoly</li>
        <li>Canada: Nechalacho (NWT) mine</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Demand:</strong> All minerals will see 4-7× demand growth by 2030 vs 2020.</p>
      </div>
    `,
    relatedTopics: ['minerals.battery-chemistry', 'minerals.supply-chain'],
  },

  'minerals.battery-chemistry': {
    id: 'minerals.battery-chemistry',
    title: 'Battery Chemistry Types',
    shortText: 'LFP vs NMC vs NCA explained',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">3 Main Battery Types</h3>

      <h4 class="font-semibold mt-4 mb-2">1. LFP (Lithium Iron Phosphate)</h4>
      <p class="mb-2"><strong>Recipe:</strong> LiFePO₄</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Pros:</strong> Safe, cheap, no cobalt/nickel</li>
        <li><strong>Cons:</strong> Lower energy density (125 Wh/kg)</li>
        <li><strong>Cost:</strong> $80-100/kWh</li>
        <li><strong>Used In:</strong> Tesla Standard Range, BYD, Chinese EVs</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. NMC (Nickel Manganese Cobalt)</h4>
      <p class="mb-2"><strong>Recipe:</strong> LiNi₀.₈Mn₀.₁Co₀.₁O₂ (NMC 811)</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Pros:</strong> Balanced performance, flexible chemistry</li>
        <li><strong>Cons:</strong> More expensive, cobalt ethical issues</li>
        <li><strong>Energy Density:</strong> 200-250 Wh/kg</li>
        <li><strong>Cost:</strong> $120-150/kWh</li>
        <li><strong>Used In:</strong> GM, VW, BMW, most Western EVs</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. NCA (Nickel Cobalt Aluminum)</h4>
      <p class="mb-2"><strong>Recipe:</strong> LiNi₀.₈Co₀.₁₅Al₀.₀₅O₂</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Pros:</strong> Highest energy density (260 Wh/kg)</li>
        <li><strong>Cons:</strong> Less stable, Tesla-exclusive</li>
        <li><strong>Used In:</strong> Tesla Model S, X (long range)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Future Chemistries:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Sodium-ion:</strong> No lithium, cheaper, lower density (CATL 2024)</li>
        <li><strong>Solid-state:</strong> 400+ Wh/kg, safer, 2027+ commercialization</li>
        <li><strong>Lithium-Sulfur:</strong> 500 Wh/kg theoretical, 2030+</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🔄 Trend:</strong> Tesla switching to LFP for standard models (no cobalt!), reserving NCA for performance.</p>
      </div>
    `,
    relatedTopics: ['minerals.priority-list', 'minerals.supply-chain'],
  },
};
