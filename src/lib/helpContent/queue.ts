/**
 * Help content: Interconnection Queue
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const QUEUE_CONTENT: Record<string, HelpContentItem> = {
  'queue.overview': {
    id: 'queue.overview',
    title: 'Grid Interconnection Queue Dashboard',
    shortText: "Tracking Ontario's renewable energy and battery storage project pipeline",
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Ontario's Clean Energy Project Pipeline</h3>
      <p class="mb-4">The IESO interconnection queue tracks all proposed generation and storage projects seeking to connect to Ontario's grid. Currently contains ~8-10 GW of projects, including ~3 GW battery storage and ~5 GW renewables.</p>

      <h4 class="font-semibold mt-4 mb-2">Why the Interconnection Queue Matters:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Climate Targets:</strong> Ontario needs 18 GW new clean energy by 2035 to phase out gas, achieve net-zero electricity</li>
        <li><strong>Supply Security:</strong> Peak demand growing 1-2% annually. Nuclear refurbishments (Bruce, Pickering closure 2024-26) create supply gap</li>
        <li><strong>Economic Signal:</strong> $10-15B investment pipeline in renewables + storage. Indicates investor confidence in Ontario clean energy market</li>
        <li><strong>Grid Integration:</strong> Queue reveals challenges (e.g., 60% projects in Southwest Ontario where grid already congested)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Key Pipeline Statistics (2024):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Technology</th>
            <th class="border px-2 py-1">Queue Capacity</th>
            <th class="border px-2 py-1">% of Total</th>
            <th class="border px-2 py-1">Key Players</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Battery Storage</td>
            <td class="border px-2 py-1">~3,000 MW</td>
            <td class="border px-2 py-1">35%</td>
            <td class="border px-2 py-1">Hecate, NRStor, LS Power</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Solar</td>
            <td class="border px-2 py-1">~2,500 MW</td>
            <td class="border px-2 py-1">30%</td>
            <td class="border px-2 py-1">Boralex, Northland, BayWa r.e.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Wind</td>
            <td class="border px-2 py-1">~2,000 MW</td>
            <td class="border px-2 py-1">25%</td>
            <td class="border px-2 py-1">NextEra, Pattern, Renewable Energy Systems</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Natural Gas</td>
            <td class="border px-2 py-1">~800 MW</td>
            <td class="border px-2 py-1">10%</td>
            <td class="border px-2 py-1">Ontario Power Generation, Capital Power</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Real-World Context:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Oneida Energy Storage (2023):</strong> 250 MW / 1,000 MWh battery approved via LT1 RFP. Located near London, ON. $500M capital cost. Helps absorb Bruce nuclear excess overnight, discharge during GTA peak demand.</li>
        <li><strong>Jarvis Solar + Storage (2024):</strong> 200 MW solar + 100 MW / 400 MWh battery in Haldimand County. LT2 contract winner. Demonstrates co-location trend (solar charges battery midday, both discharge at peak).</li>
        <li><strong>Queue Attrition:</strong> ~50% projects drop out during System Impact Assessment (SIA) phase when they see $20-50M+ transmission upgrade costs. Speculative projects filter out.</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Insight:</strong> Queue size (8-10 GW) is 2-3x actual procurement target (~3 GW over next 5 years). This "oversupply" is healthy—competitive pressure drives down bid prices in RFPs. LT1 RFP saw average bids 30% below IESO cost estimates.</p>
      </div>
    `,
    relatedTopics: ['queue.battery-storage', 'queue.procurement', 'queue.process'],
  },

  'queue.battery-storage': {
    id: 'queue.battery-storage',
    title: 'Battery Storage Pipeline',
    shortText: "Ontario's ~3 GW battery storage pipeline for grid flexibility",
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Why Battery Storage is Surging</h3>
      <p class="mb-4">Battery storage went from ~50 MW operational in 2020 to ~3,000 MW in the interconnection queue by 2024. Driven by falling costs (70% since 2015), renewable integration needs, and lucrative IESO capacity/energy arbitrage opportunities.</p>

      <h4 class="font-semibold mt-4 mb-2">Battery Storage Economics in Ontario:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Revenue Stream</th>
            <th class="border px-2 py-1">Value</th>
            <th class="border px-2 py-1">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Capacity Payment</td>
            <td class="border px-2 py-1">$150-200/kW-year</td>
            <td class="border px-2 py-1">IESO pays for availability (LT RFP contracts)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Energy Arbitrage</td>
            <td class="border px-2 py-1">$30-50/MWh spread</td>
            <td class="border px-2 py-1">Charge at $20/MWh (night), discharge at $80/MWh (peak). 1 cycle/day.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Regulation Service</td>
            <td class="border px-2 py-1">$10-15/MW-hour</td>
            <td class="border px-2 py-1">Fast frequency response (batteries respond in <1 second vs 5+ min for gas)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Congestion Relief</td>
            <td class="border px-2 py-1">$20-40/MWh</td>
            <td class="border px-2 py-1">Located in congested zones (Southwest ON), discharge locally to avoid transmission costs</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Battery Technology Landscape:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Lithium-Ion (95% of pipeline):</strong> 4-hour duration. Capex $300-400/kWh. Dominant for daily cycling. Suppliers: Tesla, LG Energy Solution, CATL.</li>
        <li><strong>Long-Duration (5% of pipeline):</strong> 8-12 hour duration. Flow batteries (vanadium), compressed air. Capex $500-700/kWh. For multi-day storage, seasonal shifting.</li>
        <li><strong>Degradation:</strong> Li-ion loses 2-3% capacity/year. After 10 years (3,650 cycles), capacity drops to 70-75% of original. Warranty guarantees 80% at end of contract (15-20 years).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Top Battery Storage Projects in Queue:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Oneida Energy Storage (Operational 2023):</strong> 250 MW / 1,000 MWh (4-hour). Built by NRStor. Located near London, ON. LT1 contract. Stores Bruce nuclear excess overnight, discharges at GTA peak. Reduces curtailment $30M/year.</li>
        <li><strong>Havelock Energy Storage (Under Construction):</strong> 320 MW / 1,280 MWh. LT2 contract. East of Toronto, relieves Clarington-area congestion. In-service 2026. Developer: Hecate Energy.</li>
        <li><strong>Hanover Energy Storage (Proposed):</strong> 500 MW / 2,000 MWh. Largest in queue. Located in Bruce County (near 6,400 MW Bruce nuclear). Merchant project (no RFP contract). Risk: must compete in real-time market without capacity guarantee.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Use Cases for Ontario Grid:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Renewable Firming:</strong> Solar + storage (charge midday when solar peaks, discharge 5-9 PM peak). Turns intermittent resource into dispatchable capacity.</li>
        <li><strong>Nuclear Load-Following:</strong> Bruce Power operates 24/7 at constant output (can't ramp). Battery absorbs excess overnight (when demand is 12,000 MW vs 22,000 MW peak), returns energy during peak.</li>
        <li><strong>Transmission Deferral:</strong> Instead of building $500M transmission line from Bruce to GTA, place $200M battery in GTA. Charges overnight (off-peak), discharges locally during peak. Defers line 5-10 years.</li>
        <li><strong>Peaker Replacement:</strong> Replaces gas peakers (5-10% annual capacity factor, high O&M costs). Battery has zero fuel cost, zero emissions, faster ramp rate.</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Opportunity:</strong> IESO projects 2,500-3,500 MW battery storage needed by 2035 to integrate 18 GW renewables + support gas phase-out. Current pipeline (~3,000 MW) aligns with upper end. Expect LT3, LT4 RFPs to contract 1,000-1,500 MW additional storage by 2027.</p>
      </div>
    `,
    relatedTopics: ['queue.overview', 'queue.procurement'],
  },

  'queue.procurement': {
    id: 'queue.procurement',
    title: 'IESO Procurement Programs (LT RFPs)',
    shortText: 'Long-Term RFP programs contracting renewable energy and storage',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Ontario's Competitive Procurement Framework</h3>
      <p class="mb-4">IESO runs Long-Term (LT) Request for Proposals (RFPs) to procure clean energy competitively. Replaced Feed-in Tariff (FIT) program (2009-2016), which overpaid for renewables ($135/MWh vs market $30/MWh). LT RFPs achieve 30-40% lower costs.</p>

      <h4 class="font-semibold mt-4 mb-2">LT RFP Program Summary:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Program</th>
            <th class="border px-2 py-1">Target</th>
            <th class="border px-2 py-1">Awarded</th>
            <th class="border px-2 py-1">Status</th>
            <th class="border px-2 py-1">Avg Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">LT1 RFP (2021)</td>
            <td class="border px-2 py-1">2,500 MW</td>
            <td class="border px-2 py-1">2,300 MW</td>
            <td class="border px-2 py-1">Awarded 2023</td>
            <td class="border px-2 py-1">$92/MWh</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">LT2 RFP (2023)</td>
            <td class="border px-2 py-1">1,500 MW</td>
            <td class="border px-2 py-1">1,200 MW</td>
            <td class="border px-2 py-1">Awarded 2024</td>
            <td class="border px-2 py-1">$105/MWh</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">LT3 RFP (2025)</td>
            <td class="border px-2 py-1">3,000 MW</td>
            <td class="border px-2 py-1">TBD</td>
            <td class="border px-2 py-1">In Progress</td>
            <td class="border px-2 py-1">TBD</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">LT4 RFP (2026)</td>
            <td class="border px-2 py-1">2,000 MW</td>
            <td class="border px-2 py-1">TBD</td>
            <td class="border px-2 py-1">Planned</td>
            <td class="border px-2 py-1">TBD</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">How LT RFPs Work:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Competitive Bidding:</strong> Developers bid $/MWh price for 15-20 year contracts. Lowest-cost bids win (subject to deliverability, location constraints).</li>
        <li><strong>Technology-Agnostic:</strong> Solar, wind, hydro, storage, biomass all compete on price. No carve-outs (unlike FIT which set separate prices per technology).</li>
        <li><strong>Capacity Payment:</strong> Winning projects receive fixed $/kW-year capacity payment (e.g., $150/kW-year) + energy payment when dispatched.</li>
        <li><strong>Transmission Costs:</strong> Developer pays for connection upgrades (e.g., $20-50M for new substation, line reinforcement). Bids must account for these costs.</li>
        <li><strong>Economic Connection Test (ECT):</strong> IESO calculates net benefit to ratepayers. Project must pass ECT to be eligible (prevents overpriced projects).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">LT1 RFP Results (2023):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>2,300 MW awarded:</strong> 1,300 MW battery storage, 700 MW solar, 300 MW wind</li>
        <li><strong>Average price $92/MWh:</strong> 30% below IESO estimate ($130/MWh). Competitive pressure drove down bids.</li>
        <li><strong>Geographic concentration:</strong> 60% in Southwest Ontario (near Bruce nuclear, renewable resource rich). Raised transmission congestion concerns.</li>
        <li><strong>Community benefits:</strong> Required projects to engage municipalities, Indigenous communities. 10 projects include equity partnerships with local First Nations.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">LT3 RFP (2025-2026) - What's Different:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Larger Volume:</strong> 3,000 MW target (vs 1,500 MW in LT2). Reflects urgency of 2035 clean electricity deadline.</li>
        <li><strong>Long-Duration Storage Carve-Out:</strong> 500 MW reserved for 8+ hour batteries (flow batteries, compressed air). Addresses multi-day storage gap.</li>
        <li><strong>Northern Ontario Incentive:</strong> Projects north of Sudbury receive 10% price adder (e.g., $100/MWh bid treated as $90/MWh for evaluation). Encourages geographic diversity.</li>
        <li><strong>Indigenous Ownership:</strong> Minimum 25% Indigenous equity required for all projects. Builds on LT1 lessons, ensures economic reconciliation.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Comparison to Feed-in Tariff (FIT) Era:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Metric</th>
            <th class="border px-2 py-1">FIT (2009-2016)</th>
            <th class="border px-2 py-1">LT RFPs (2021+)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Solar Price</td>
            <td class="border px-2 py-1">$400-800/MWh (rooftop)</td>
            <td class="border px-2 py-1">$80-120/MWh</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Wind Price</td>
            <td class="border px-2 py-1">$135/MWh</td>
            <td class="border px-2 py-1">$90-110/MWh</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Process</td>
            <td class="border px-2 py-1">First-come, first-served</td>
            <td class="border px-2 py-1">Competitive auction</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Ratepayer Cost</td>
            <td class="border px-2 py-1">$1.5B/year (2017)</td>
            <td class="border px-2 py-1">$400-600M/year projected</td>
          </tr>
        </tbody>
      </table>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Challenge:</strong> LT RFPs require 3-5 years from bid award to commercial operation (permits, financing, construction). But Ontario needs capacity NOW due to Pickering closure (3,100 MW lost by Dec 2024). IESO may need to contract expensive short-term gas to bridge gap.</p>
      </div>
    `,
    relatedTopics: ['queue.overview', 'queue.battery-storage', 'queue.process'],
  },

  'queue.process': {
    id: 'queue.process',
    title: 'Interconnection Process and Timeline',
    shortText: "Steps, timelines, and costs to connect a project to Ontario's grid",
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">IESO Interconnection Process</h3>
      <p class="mb-4">Connecting a generation or storage project to Ontario's grid is a multi-year, multi-million-dollar process. Requires engineering studies, regulatory approvals, transmission upgrades, and Indigenous consultation. Timeline: 3-7 years from application to energization.</p>

      <h4 class="font-semibold mt-4 mb-2">Interconnection Process Stages:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Stage</th>
            <th class="border px-2 py-1">Duration</th>
            <th class="border px-2 py-1">Cost</th>
            <th class="border px-2 py-1">Key Activities</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">1. Interconnection Request</td>
            <td class="border px-2 py-1">1 month</td>
            <td class="border px-2 py-1">$10,000 deposit</td>
            <td class="border px-2 py-1">Submit application to IESO with project details (location, size, technology)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2. System Impact Assessment (SIA)</td>
            <td class="border px-2 py-1">6-12 months</td>
            <td class="border px-2 py-1">$50,000-$300,000</td>
            <td class="border px-2 py-1">IESO studies grid impacts, identifies required upgrades (new lines, transformers)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">3. Customer Impact Assessment (CIA)</td>
            <td class="border px-2 py-1">3-6 months</td>
            <td class="border px-2 py-1">$100,000-$500,000</td>
            <td class="border px-2 py-1">Detailed cost estimate for upgrades. Developer decides: proceed or withdraw.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">4. Connection Agreement</td>
            <td class="border px-2 py-1">2-4 months</td>
            <td class="border px-2 py-1">Legal fees</td>
            <td class="border px-2 py-1">Negotiate contract with IESO/transmitter (Hydro One). Lock in upgrade costs.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">5. Permits & Approvals</td>
            <td class="border px-2 py-1">12-18 months</td>
            <td class="border px-2 py-1">$500,000-$2M</td>
            <td class="border px-2 py-1">Environmental (federal Impact Assessment), municipal (zoning), OEB (rate approval)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">6. Construction</td>
            <td class="border px-2 py-1">12-24 months</td>
            <td class="border px-2 py-1">$20M-$100M+</td>
            <td class="border px-2 py-1">Build project + transmission upgrades. Both must finish before energization.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">7. Commissioning</td>
            <td class="border px-2 py-1">2-4 months</td>
            <td class="border px-2 py-1">Testing costs</td>
            <td class="border px-2 py-1">Test equipment, synchronize to grid, IESO dispatch integration</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Transmission Upgrade Costs (Real Examples):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Small Solar (10 MW, rural connection):</strong> $2-5M. Upgrade local distribution line, add recloser, protection relay.</li>
        <li><strong>Medium Wind (100 MW, existing 115 kV line nearby):</strong> $15-25M. New 5 km transmission tap, voltage regulation equipment, substation expansion.</li>
        <li><strong>Large Battery (300 MW, congested Southwest ON):</strong> $40-80M. Reinforce 230 kV corridor (new conductor, tower upgrades), transformer replacement, protection scheme redesign.</li>
        <li><strong>Remote Hydro (50 MW, Northern ON, no grid nearby):</strong> $100-200M. Build 50+ km new 115 kV line through wilderness. Environmental assessment, Indigenous consultation add 2-3 years.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Queue Position and Timing:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>First-Come, First-Served:</strong> Queue position determines transmission upgrade allocation. Earlier projects get priority for available capacity.</li>
        <li><strong>Cluster Studies:</strong> IESO now groups projects in same area (e.g., 10 projects in Southwest ON) into single study. Share upgrade costs proportionally. Speeds up process, reduces individual project risk.</li>
        <li><strong>Drop-Out Cascade:</strong> If Project #1 in cluster drops out, upgrade costs redistribute to remaining projects. Can make marginal projects uneconomic. E.g., 5 projects share $50M upgrade ($10M each). If 2 drop out, remaining 3 now pay $16.7M each.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Indigenous Consultation Requirements:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Duty to Consult:</strong> Federal/provincial governments must consult Indigenous communities if project impacts Treaty rights (hunting, fishing, land use). Developer must demonstrate consultation occurred before permits issued.</li>
        <li><strong>Impact Benefit Agreements (IBAs):</strong> Developer negotiates with affected First Nations. Typical: annual payments ($50,000-$500,000/year), employment guarantees (10-20% of construction workforce), equity participation (5-25% ownership stake).</li>
        <li><strong>Timeline Impact:</strong> Adds 6-18 months to permitting. But projects with strong Indigenous partnerships get smoother approvals. Many LT RFP winners included 25%+ Indigenous equity from start.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Real-World Example: Jarvis Solar + Storage (200 MW Solar + 100 MW Battery):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Location:</strong> Haldimand County, ON (Southwest region, near existing 230 kV line)</li>
        <li><strong>Interconnection Timeline:</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>2021: Interconnection request submitted</li>
            <li>2022: SIA complete - $35M transmission upgrades required (reinforce 230 kV line, new transformer)</li>
            <li>2023: LT2 RFP contract awarded at $105/MWh</li>
            <li>2024: Permits approved (federal Impact Assessment, Haldimand County zoning)</li>
            <li>2025-2026: Construction (18 months)</li>
            <li>Late 2026: Commercial operation date (COD)</li>
          </ul>
        </li>
        <li><strong>Total Development Cost:</strong> $650M ($500M project + $35M transmission + $50M interconnection studies/permits + $65M financing costs)</li>
        <li><strong>Indigenous Partnership:</strong> Six Nations of the Grand River owns 25% equity ($162M investment). IBA includes annual payments, hiring preference for construction.</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Developer Strategy:</strong> Experienced developers submit multiple interconnection requests (e.g., 10 sites across Ontario). During SIA/CIA phase (18 months), winnow down to 2-3 lowest-cost sites. Drop other requests. Costs $1-2M total to de-risk portfolio, but increases RFP win probability 3-5x.</p>
      </div>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Bottleneck:</strong> IESO SIA capacity is ~30-40 projects/year. Current queue has 80+ active projects. Backlog is 18-24 months. IESO hiring additional engineers, but limited pool of qualified transmission planners. Some developers wait 2+ years just for SIA to start.</p>
      </div>
    `,
    relatedTopics: ['queue.overview', 'queue.procurement'],
  },
};
