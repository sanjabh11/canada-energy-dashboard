/**
 * Help content: Canadian Climate Policy
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const CLIMATE_CONTENT: Record<string, HelpContentItem> = {
  // ==================== CANADIAN CLIMATE POLICY (Phase 4.2) ====================

  'climate.policy.overview': {
    id: 'climate.policy.overview',
    title: 'Canadian Climate Policy Dashboard',
    shortText: 'Track federal climate policy compliance and progress',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Canada's Net-Zero Framework</h3>
      <p class="mb-4">Canada has committed to net-zero emissions by 2050, with interim targets of 40-45% below 2005 levels by 2030. Three major federal policies drive this: carbon pricing, clean fuel regulations, and net-zero accountability tracking.</p>

      <h4 class="font-semibold mt-4 mb-2">Key Federal Climate Policies:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Carbon Pricing:</strong> $80/tonne CO₂e in 2024, rising to $170/tonne by 2030. Applied via federal backstop or provincial equivalent systems.</li>
        <li><strong>Clean Fuel Regulations (CFR):</strong> Reduce lifecycle carbon intensity of fuels by 15 gCO₂e/MJ by 2030 (from 2016 baseline of ~90 gCO₂e/MJ for gasoline).</li>
        <li><strong>Net-Zero Emissions Accountability Act:</strong> Legally binding 5-year milestones, independent progress reports, climate action plans.</li>
        <li><strong>Clean Electricity Regulations:</strong> Phase out unabated fossil fuel generation by 2035 (natural gas without CCS).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2030 Emissions Reduction Plan:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>2005 Baseline:</strong> 730 Mt CO₂e</li>
        <li><strong>2030 Target:</strong> 40-45% reduction = 440 Mt CO₂e (range: 401-438 Mt)</li>
        <li><strong>2022 Actual:</strong> 708 Mt CO₂e (only 3% reduction from 2005)</li>
        <li><strong>Gap to Close:</strong> 268-307 Mt CO₂e reduction needed in 8 years</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Sectoral Breakdown (2022 Emissions):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Oil & Gas:</strong> 189 Mt (27%) - highest sector, methane regulations + carbon pricing key levers</li>
        <li><strong>Transportation:</strong> 185 Mt (26%) - EV mandates (20% by 2026, 100% by 2035) + clean fuel standard</li>
        <li><strong>Buildings:</strong> 87 Mt (12%) - heat pump deployment, energy efficiency retrofits</li>
        <li><strong>Heavy Industry:</strong> 76 Mt (11%) - steel, cement (CCUS investment tax credits)</li>
        <li><strong>Electricity:</strong> 51 Mt (7%) - declining due to coal phase-out (complete by 2030)</li>
        <li><strong>Agriculture:</strong> 73 Mt (10%) - fertilizer emissions, livestock methane</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Reality Check:</strong> Canada's emissions have been flat since 2005 despite multiple climate plans. Achieving 40-45% reduction by 2030 requires substantial policy implementation + $15-20B/year investment.</p>
      </div>
    `,
    relatedTopics: ['climate.carbon-pricing', 'climate.clean-fuel', 'climate.net-zero'],
  },

  'climate.carbon-pricing': {
    id: 'climate.carbon-pricing',
    title: 'Federal Carbon Pricing System',
    shortText: '$80/tonne in 2024, rising to $170/tonne by 2030',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Pan-Canadian Carbon Pricing Framework</h3>
      <p class="mb-4">Federal carbon pricing applies where provinces lack equivalent systems. Two mechanisms: fuel charge (consumers/businesses) and Output-Based Pricing System (large emitters).</p>

      <h4 class="font-semibold mt-4 mb-2">Carbon Price Schedule:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Year</th>
            <th class="border px-2 py-1">Carbon Price ($/tonne CO₂e)</th>
            <th class="border px-2 py-1">Gasoline Impact (¢/litre)</th>
            <th class="border px-2 py-1">Natural Gas Impact (¢/m³)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">2024</td>
            <td class="border px-2 py-1">$80</td>
            <td class="border px-2 py-1">17.6¢</td>
            <td class="border px-2 py-1">15.3¢</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2026</td>
            <td class="border px-2 py-1">$110</td>
            <td class="border px-2 py-1">24.2¢</td>
            <td class="border px-2 py-1">21.0¢</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2030</td>
            <td class="border px-2 py-1 bg-yellow-100">$170</td>
            <td class="border px-2 py-1">37.4¢</td>
            <td class="border px-2 py-1">32.5¢</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Provincial Systems (Equivalency Assessed):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Federal Backstop:</strong> ON, MB, SK, AB (fuel charge), NB, PE, NL, NU, YT, NT</li>
        <li><strong>Provincial Carbon Tax:</strong> BC ($80/tonne, rising to $170 by 2030)</li>
        <li><strong>Cap-and-Trade:</strong> Quebec (linked with California, ~$38 CAD/tonne in 2023 - below federal benchmark, top-up required)</li>
        <li><strong>Hybrid Systems:</strong> Alberta TIER (Technology Innovation and Emissions Reduction) for large emitters</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Output-Based Pricing System (OBPS):</h4>
      <p class="mb-2">For facilities emitting >50,000 tonnes CO₂e/year (power plants, refineries, cement):</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Benchmark:</strong> Sector-specific emissions intensity (e.g., 0.37 tonnes CO₂e/tonne cement)</li>
        <li><strong>Pay if Over:</strong> Facility pays $80/tonne for emissions above benchmark × production</li>
        <li><strong>Earn Credits if Under:</strong> Can sell credits to other facilities or bank for future</li>
        <li><strong>Example:</strong> Cement plant producing 1M tonnes at 0.40 tCO₂e/tonne pays (0.40-0.37) × 1M × $80 = $2.4M</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Revenue Recycling:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Direct Rebates (Households):</strong> 90% of federal fuel charge revenue returned via Climate Action Incentive Payment. Example: Ontario family of 4 receives $976 in 2024.</li>
        <li><strong>Small Business Support:</strong> 10% of revenue funds small business energy efficiency programs</li>
        <li><strong>Provincial Flexibility:</strong> Provinces can design own systems if equivalent stringency (BC uses revenue for transit, clean tech)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Effectiveness and Challenges:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Emissions Reduction:</strong> ECCC estimates carbon pricing will reduce 2030 emissions by 50-60 Mt CO₂e (vs business-as-usual)</li>
        <li><strong>Competitiveness Concerns:</strong> Energy-intensive trade-exposed industries (steel, aluminum) lobby for exemptions/rebates</li>
        <li><strong>Political Volatility:</strong> Opposition parties pledge to repeal carbon tax if elected (2025 federal election risk)</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💰 Economic Impact:</strong> At $170/tonne in 2030, carbon pricing generates $35-40B/year federal revenue. Rebates make 8/10 households net better off (lower-income use less fuel).</p>
      </div>
    `,
    relatedTopics: ['climate.policy.overview', 'climate.clean-fuel'],
  },

  'climate.clean-fuel': {
    id: 'climate.clean-fuel',
    title: 'Clean Fuel Regulations',
    shortText: 'Reduce fuel carbon intensity 15% by 2030',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Lifecycle Carbon Intensity Reduction</h3>
      <p class="mb-4">Clean Fuel Regulations (CFR) require fuel suppliers to reduce lifecycle carbon intensity of gasoline, diesel, and fossil gas sold in Canada. Came into effect July 2023.</p>

      <h4 class="font-semibold mt-4 mb-2">Reduction Targets (from 2016 baseline):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Fuel Type</th>
            <th class="border px-2 py-1">2016 Baseline (gCO₂e/MJ)</th>
            <th class="border px-2 py-1">2030 Target Reduction</th>
            <th class="border px-2 py-1">2030 Target (gCO₂e/MJ)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Gasoline</td>
            <td class="border px-2 py-1">93.67</td>
            <td class="border px-2 py-1">15 gCO₂e/MJ</td>
            <td class="border px-2 py-1 bg-green-100">78.67</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Diesel</td>
            <td class="border px-2 py-1">95.99</td>
            <td class="border px-2 py-1">13 gCO₂e/MJ</td>
            <td class="border px-2 py-1 bg-green-100">82.99</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Fossil Gas (heating/industry)</td>
            <td class="border px-2 py-1">65.07</td>
            <td class="border px-2 py-1">6 gCO₂e/MJ</td>
            <td class="border px-2 py-1 bg-green-100">59.07</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">How Suppliers Comply (Credit System):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Biofuel Blending:</strong> E10 gasoline (10% ethanol), B5 diesel (5% biodiesel). Ethanol ~45% lower CI than gasoline.</li>
        <li><strong>Advanced Biofuels:</strong> Renewable diesel (RD), sustainable aviation fuel (SAF). Can have 70-90% lower CI.</li>
        <li><strong>Electric Vehicle Charging:</strong> Credit for supplying EV charging infrastructure (based on kWh delivered × avoided gasoline emissions)</li>
        <li><strong>Hydrogen Blending:</strong> Renewable/blue hydrogen into natural gas pipeline (small volumes, max 5-10%)</li>
        <li><strong>Carbon Capture:</strong> CCS at refineries reduces production emissions → credit</li>
        <li><strong>Buy Credits:</strong> Purchase excess credits from overperformers or banking from previous years</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Projected Compliance Costs:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Year</th>
            <th class="border px-2 py-1">Gasoline (¢/litre)</th>
            <th class="border px-2 py-1">Diesel (¢/litre)</th>
            <th class="border px-2 py-1">Natural Gas ($/GJ)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">2024-2026</td>
            <td class="border px-2 py-1">6-8¢</td>
            <td class="border px-2 py-1">5-7¢</td>
            <td class="border px-2 py-1">$0.50-0.80</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2027-2030</td>
            <td class="border px-2 py-1">13-17¢</td>
            <td class="border px-2 py-1">11-15¢</td>
            <td class="border px-2 py-1">$1.20-1.50</td>
          </tr>
        </tbody>
      </table>

      <p class="text-sm mb-4"><em>Note: These costs are IN ADDITION to carbon pricing. Combined impact by 2030: ~50¢/litre gasoline.</em></p>

      <h4 class="font-semibold mt-4 mb-2">Emissions Impact:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>2030 Reduction:</strong> 26-28 Mt CO₂e/year (roughly equivalent to removing 6M cars from roads)</li>
        <li><strong>Pathway:</strong> 50% from biofuel blending, 30% from EV adoption, 20% from operational efficiency improvements</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Industry Challenges:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Biofuel Supply Constraints:</strong> Canada imports 60% of ethanol (US). Limited domestic advanced biofuel production.</li>
        <li><strong>Food vs Fuel:</strong> Corn ethanol criticized for land use competition. Shift to cellulosic/waste feedstocks needed.</li>
        <li><strong>Infrastructure Gaps:</strong> Limited renewable diesel refining capacity in Canada. Reliant on US imports (LCFS premium in CA).</li>
        <li><strong>Cross-Border Leakage:</strong> US border states with no clean fuel standard = incentive to import cheaper fuel</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Opportunity:</strong> CFR creates $10-15B market for low-carbon fuels by 2030. Renewable diesel, SAF, renewable natural gas (RNG) from waste sectors positioned for growth.</p>
      </div>
    `,
    relatedTopics: ['climate.carbon-pricing', 'climate.net-zero'],
  },

  'climate.net-zero': {
    id: 'climate.net-zero',
    title: 'Net-Zero Emissions Accountability Act',
    shortText: 'Legally binding 2050 net-zero target with 5-year milestones',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Legislated Climate Accountability</h3>
      <p class="mb-4">Passed in 2021, the Net-Zero Emissions Accountability Act enshrines Canada's 2050 net-zero commitment in law. Requires binding 5-year targets, progress reports, and independent oversight.</p>

      <h4 class="font-semibold mt-4 mb-2">Key Provisions:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>National Targets:</strong> Minister must set emissions targets for 2030, 2035, 2040, 2045 (2030 = 40-45% below 2005 already set)</li>
        <li><strong>Climate Action Plans:</strong> Detailed plans within 9 months of each target, outlining policies and measures</li>
        <li><strong>Progress Reports:</strong> Annual reporting on emissions trajectory, policy implementation</li>
        <li><strong>Independent Advice:</strong> Net-Zero Advisory Body (15 experts) provides non-binding recommendations</li>
        <li><strong>5-Year Assessment:</strong> Commissioner of Environment and Sustainable Development audits progress</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2030 Emissions Reduction Plan (March 2022):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Sector</th>
            <th class="border px-2 py-1">2022 Emissions</th>
            <th class="border px-2 py-1">2030 Target</th>
            <th class="border px-2 py-1">Key Policies</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Oil & Gas</td>
            <td class="border px-2 py-1">189 Mt</td>
            <td class="border px-2 py-1">110-119 Mt</td>
            <td class="border px-2 py-1">Emissions cap, methane regulations</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Transport</td>
            <td class="border px-2 py-1">185 Mt</td>
            <td class="border px-2 py-1">115-120 Mt</td>
            <td class="border px-2 py-1">EV mandates, clean fuel standard</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Buildings</td>
            <td class="border px-2 py-1">87 Mt</td>
            <td class="border px-2 py-1">42-49 Mt</td>
            <td class="border px-2 py-1">Heat pumps, energy retrofits</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Industry</td>
            <td class="border px-2 py-1">76 Mt</td>
            <td class="border px-2 py-1">49-55 Mt</td>
            <td class="border px-2 py-1">CCUS ITCs, performance standards</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Electricity</td>
            <td class="border px-2 py-1">51 Mt</td>
            <td class="border px-2 py-1">5-8 Mt</td>
            <td class="border px-2 py-1">Coal phase-out, CER 2035</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Net-Zero Advisory Body Recommendations (2023):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Oil & Gas Cap:</strong> Implement sector emissions cap by 2025 (100 Mt ceiling recommended)</li>
        <li><strong>Phase Out Fossil Fuel Subsidies:</strong> Eliminate by 2025 (currently $4-5B/year federal support)</li>
        <li><strong>Just Transition Legislation:</strong> Support workers/communities in shift from fossil fuels (Bill C-50 introduced 2023)</li>
        <li><strong>Indigenous Climate Leadership:</strong> $500M fund for Indigenous-led conservation, clean energy projects</li>
        <li><strong>Nature-Based Solutions:</strong> Protect/restore wetlands, forests (30-40 Mt CO₂e annual sequestration potential)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Progress Tracking (2024 Update):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Current Trajectory:</strong> 591 Mt in 2030 (with announced policies) - MISSES 40-45% target by 150+ Mt</li>
        <li><strong>Policy Gap:</strong> Need additional measures worth 150-190 Mt CO₂e reduction</li>
        <li><strong>Implementation Risk:</strong> Many policies announced but not yet implemented (oil & gas cap, clean electricity regs)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">International Comparison:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>UK:</strong> Net-zero by 2050, legally binding carbon budgets (5-year periods). On track to meet 2030 target (68% below 1990).</li>
        <li><strong>EU:</strong> Net-zero by 2050, 55% below 1990 by 2030. Emissions trading system, fit-for-55 package.</li>
        <li><strong>Canada Challenge:</strong> Growing population, cold climate, large geography = higher per-capita emissions baseline</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Accountability Gap:</strong> Act has no enforcement mechanism if targets missed. Political pressure only tool. Some advocate for penalty provisions (e.g., automatic carbon price increase if off track).</p>
      </div>
    `,
    relatedTopics: ['climate.policy.overview', 'climate.carbon-pricing'],
  },
};
