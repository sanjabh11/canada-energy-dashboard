/**
 * Help content: Capacity Market
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const CAPACITY_CONTENT: Record<string, HelpContentItem> = {
  'capacity.overview': {
    id: 'capacity.overview',
    title: 'Capacity Market Dashboard',
    shortText: 'Understanding IESO capacity auctions and grid reliability pricing',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">What is a Capacity Market?</h3>
      <p class="mb-4">A capacity market pays generators to be available when needed, not just for energy produced. Ensures grid reliability by contracting resources 1-3 years ahead. Ontario's IESO runs annual capacity auctions where power plants, storage, and demand response bid to provide guaranteed capacity.</p>

      <h4 class="font-semibold mt-4 mb-2">Why Capacity Markets Exist:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Missing Money Problem:</strong> Energy-only markets (pay generators just for MWh produced) don't compensate peaker plants that run <100 hours/year but are critical for reliability. Capacity payments cover fixed costs.</li>
        <li><strong>Investment Signal:</strong> Capacity contracts (1-3 year duration) provide revenue certainty. Enables developers to finance new plants ($500M gas peaker, $200M battery). Banks require revenue contracts for project loans.</li>
        <li><strong>Resource Adequacy:</strong> Grid operators forecast peak demand 2-3 years ahead (e.g., Ontario 2026 peak = 24,000 MW). Must contract enough capacity to meet peak + 15-20% reserve margin (28,000 MW total).</li>
        <li><strong>Reliability Mandate:</strong> Ontario Energy Board requires IESO to maintain 1-in-10 loss-of-load expectation (LOLE). Means blackouts allowed only 1 day per 10 years. Capacity market is tool to achieve this.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">IESO Capacity Market Timeline:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Event</th>
            <th class="border px-2 py-1">Timing</th>
            <th class="border px-2 py-1">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Demand Forecast</td>
            <td class="border px-2 py-1">18 months before delivery</td>
            <td class="border px-2 py-1">IESO forecasts peak demand for delivery year (e.g., Summer 2026)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Target Capacity Set</td>
            <td class="border px-2 py-1">15 months before delivery</td>
            <td class="border px-2 py-1">Add 15-20% reserve margin. E.g., 24,000 MW peak → 28,000 MW target.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Capacity Auction</td>
            <td class="border px-2 py-1">12 months before delivery</td>
            <td class="border px-2 py-1">Resources bid $/MW-day. IESO accepts lowest bids until target met.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Contract Award</td>
            <td class="border px-2 py-1">11 months before delivery</td>
            <td class="border px-2 py-1">Winners sign 1-year capacity obligation. Must be available or face penalties.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Delivery Period</td>
            <td class="border px-2 py-1">May-Oct (Summer) or Nov-Apr (Winter)</td>
            <td class="border px-2 py-1">Contracted resources must be available. IESO can dispatch at any time.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Settlement</td>
            <td class="border px-2 py-1">During delivery period</td>
            <td class="border px-2 py-1">Monthly payments based on $/MW-day clearing price × contracted capacity.</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Ontario Capacity Market Scale (2024):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Target Capacity:</strong> ~28,000 MW (Summer 2025), ~25,000 MW (Winter 2025-26)</li>
        <li><strong>Recent Clearing Prices:</strong> $5-15/MW-day (2022-2024), down from $50-100/MW-day (2018-2020) due to new supply</li>
        <li><strong>Annual Market Value:</strong> $50-150M/year (depends on clearing price). Much smaller than energy market ($5-7B/year).</li>
        <li><strong>Participating Resources:</strong> ~200 participants (nuclear, hydro, gas, storage, demand response, imports from Quebec/NY)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Real-World Example: Summer 2023 Capacity Auction:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Target Capacity:</strong> 27,500 MW (peak demand 23,000 MW + 4,500 MW reserve = 19.5% margin)</li>
        <li><strong>Cleared Capacity:</strong> 27,800 MW (slightly above target, indicating competitive supply)</li>
        <li><strong>Clearing Price:</strong> $8.50/MW-day ($3,100/MW-year). Low price reflects surplus capacity (Pickering still operating, Bruce refurbs complete).</li>
        <li><strong>Total Cost to Ratepayers:</strong> 27,800 MW × $8.50/MW-day × 365 days = $86M/year ($3.50/MWh if spread over 24,000 GWh annual demand)</li>
        <li><strong>Resource Mix:</strong> 45% gas, 30% hydro, 15% nuclear (capacity de-list bids), 5% storage, 5% demand response</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Price Signal:</strong> Low clearing prices ($5-15/MW-day) indicate surplus capacity. IESO less likely to procure new resources via LT RFPs. High prices ($50+ /MW-day) signal scarcity—trigger for new procurement (happened 2018-2020 before Pickering life extension).</p>
      </div>
    `,
    relatedTopics: ['capacity.auctions', 'capacity.pricing', 'capacity.resources'],
  },

  'capacity.auctions': {
    id: 'capacity.auctions',
    title: 'How IESO Capacity Auctions Work',
    shortText: 'Auction mechanics, bidding strategies, and clearing price determination',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Capacity Auction Mechanics</h3>
      <p class="mb-4">IESO capacity auctions use a descending clock format. Starting at high price (e.g., $100/MW-day), IESO lowers price each round. Resources drop out when price too low. Auction clears when remaining resources equal target capacity.</p>

      <h4 class="font-semibold mt-4 mb-2">Auction Process (Step-by-Step):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Round</th>
            <th class="border px-2 py-1">Price</th>
            <th class="border px-2 py-1">Supply Offered</th>
            <th class="border px-2 py-1">Target</th>
            <th class="border px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">1</td>
            <td class="border px-2 py-1">$100/MW-day</td>
            <td class="border px-2 py-1">35,000 MW</td>
            <td class="border px-2 py-1">28,000 MW</td>
            <td class="border px-2 py-1">Excess supply → lower price</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2</td>
            <td class="border px-2 py-1">$75/MW-day</td>
            <td class="border px-2 py-1">32,000 MW</td>
            <td class="border px-2 py-1">28,000 MW</td>
            <td class="border px-2 py-1">Still excess → lower price</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">3</td>
            <td class="border px-2 py-1">$50/MW-day</td>
            <td class="border px-2 py-1">30,000 MW</td>
            <td class="border px-2 py-1">28,000 MW</td>
            <td class="border px-2 py-1">Getting closer → lower price</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">4</td>
            <td class="border px-2 py-1">$25/MW-day</td>
            <td class="border px-2 py-1">29,000 MW</td>
            <td class="border px-2 py-1">28,000 MW</td>
            <td class="border px-2 py-1">Slight excess → lower price</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">5</td>
            <td class="border px-2 py-1">$10/MW-day</td>
            <td class="border px-2 py-1">28,200 MW</td>
            <td class="border px-2 py-1">28,000 MW</td>
            <td class="border px-2 py-1">AUCTION CLEARS - Clearing price = $10/MW-day</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Uniform Clearing Price:</h4>
      <p class="mb-2">All resources that clear receive the same $/MW-day price (uniform price auction). Example:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Hydro plant bids $3/MW-day</strong> (low cost, just wants to cover admin). Clears at $10/MW-day → earns $10.</li>
        <li><strong>Gas plant bids $9/MW-day</strong> (higher cost, needs to cover fixed O&M). Clears at $10/MW-day → earns $10.</li>
        <li><strong>Battery bids $11/MW-day</strong> (didn't bid low enough). Does NOT clear → earns $0.</li>
      </ul>
      <p class="mb-4">This creates incentive to bid true costs. Resources with costs <$10 all profit equally. Battery with $11 cost is economically excluded (wouldn't recover costs anyway).</p>

      <h4 class="font-semibold mt-4 mb-2">Bid Types:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Capacity Offer:</strong> New resources (e.g., battery, new gas plant) bid to add capacity. Bid = $/MW-day needed to break even on fixed costs.</li>
        <li><strong>Capacity De-List:</strong> Existing resources (e.g., Bruce nuclear) already obligated. Bid to REMOVE capacity from auction (e.g., planned outage). De-list bid = $/MW-day compensation needed to stay available.</li>
        <li><strong>Demand Response Offer:</strong> Industrial/commercial customers bid to reduce load when grid stressed. Bid = $/MW-day needed to compensate for production loss.</li>
        <li><strong>Import Offers:</strong> External resources (Quebec hydro, NY gas) bid to provide capacity via interties. Limited by transmission capacity (1,500 MW Quebec, 1,000 MW NY).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Bidding Strategy (Generator Perspective):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Gas Peaker (20 MW, $15,000/MW fixed costs):</strong> Needs $15,000/MW-year = $41/MW-day to break even. Bids $41/MW-day. If clears, earns capacity revenue. Also earns energy revenue when dispatched (but only 50-100 hours/year).</li>
        <li><strong>Battery (100 MW, $50M capex, 15-year life):</strong> Fixed costs = $3.3M/year = $33,000/MW-year = $90/MW-day. BUT also earns energy arbitrage ($30-50/MW-day). So bids $40-60/MW-day capacity (total revenue $70-110/MW-day covers costs).</li>
        <li><strong>Demand Response (10 MW industrial):</strong> Shutting down for 4 hours costs $100,000 lost production. Over 30 potential events/year = $3M risk. Bids $3M / 10 MW / 365 days = $822/MW-day (high bid, only clears in very tight markets).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Market Power Mitigation:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Must-Offer Requirement:</strong> All existing resources must participate (can't withhold to manipulate price). Exception: planned retirements.</li>
        <li><strong>Offer Cap:</strong> Bids capped at $200/MW-day (Net CONE - Cost of New Entry). Prevents price gouging.</li>
        <li><strong>Three-Pivotal-Supplier Test:</strong> If removing any 3 suppliers causes shortage, those suppliers' bids are subject to price caps (prevents oligopoly pricing).</li>
        <li><strong>OEB Oversight:</strong> Ontario Energy Board audits auction results. Can penalize anti-competitive behavior.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Real-World Example: Winter 2024-25 Auction Anomaly:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Context:</strong> Pickering closure announced for Dec 2024 (removes 3,100 MW). Winter 2024-25 auction held June 2023.</li>
        <li><strong>Expected Outcome:</strong> Scarcity → high clearing price ($50-80/MW-day). Signals need for new capacity.</li>
        <li><strong>Actual Outcome:</strong> Clearing price $12/MW-day (low!). Why?</li>
        <li><strong>Reason 1:</strong> Pickering life extension to 2026 announced 1 week before auction. 3,100 MW unexpected supply.</li>
        <li><strong>Reason 2:</strong> New batteries (500 MW from LT1 RFP) came online earlier than expected.</li>
        <li><strong>Reason 3:</strong> Demand forecast lowered (COVID industrial slowdown persisted).</li>
        <li><strong>Market Impact:</strong> Existing peakers (expected $50+/MW-day) got only $12/MW-day. Some considered retirement. But low price good for ratepayers (saved $400M vs $50/MW-day scenario).</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Transparency:</strong> IESO publishes full auction results (clearing price, resource mix, bid curves). Contrast with Alberta where capacity market cancelled in 2021 due to political concerns. Ontario's transparent process builds market confidence.</p>
      </div>
    `,
    relatedTopics: ['capacity.overview', 'capacity.pricing'],
  },

  'capacity.pricing': {
    id: 'capacity.pricing',
    title: 'Capacity Price Drivers and Analysis',
    shortText: 'What drives clearing prices up or down - supply, demand, policy impacts',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Factors Affecting Capacity Clearing Prices</h3>
      <p class="mb-4">Capacity prices swing from $5/MW-day (surplus) to $100+/MW-day (shortage) based on supply-demand balance. Understanding drivers helps predict future prices and policy impacts.</p>

      <h4 class="font-semibold mt-4 mb-2">Demand-Side Drivers (Higher Demand → Higher Prices):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Peak Load Growth:</strong> Ontario peak demand growing 1-2%/year (electrification of transport, heating, industry). 2020 peak: 22,000 MW. 2030 forecast: 26,000 MW. Need 4,000 MW new capacity → upward price pressure.</li>
        <li><strong>Reserve Margin Requirements:</strong> IESO targets 15-20% reserve margin (cushion above peak). E.g., 24,000 MW peak × 1.18 = 28,320 MW target. If reserve policy tightens to 25%, target jumps to 30,000 MW → need 1,700 MW more capacity → price spike.</li>
        <li><strong>Extreme Weather Risk:</strong> 2022 heatwave pushed Ontario demand to 26,500 MW (new record). IESO responded by increasing summer capacity targets → higher prices in subsequent auctions.</li>
        <li><strong>Electrification Policies:</strong> EV adoption (2035 gas car ban), heat pump rebates, green hydrogen production. All increase electricity demand. IESO forecasts 8,000-12,000 MW demand growth 2025-2035 → sustained high capacity prices likely.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Supply-Side Drivers (More Supply → Lower Prices):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>New Generation/Storage:</strong> LT1 RFP added 2,300 MW (2023-2025). Battery storage + solar projects. Supply surge → clearing prices dropped from $35/MW-day (2022) to $8/MW-day (2024).</li>
        <li><strong>Nuclear Refurbishments Complete:</strong> Bruce Power (6,400 MW) completed Unit 6 refurb (2023). Darlington Unit 2 back online (2024). Added 2,000+ MW firm capacity → downward price pressure.</li>
        <li><strong>Life Extensions:</strong> Pickering (3,100 MW) extended to 2026 (was closing 2024). Surprise supply → Winter 2024-25 price $12/MW-day vs $60+/MW-day expected.</li>
        <li><strong>Demand Response Expansion:</strong> Industrial DR programs grew from 200 MW (2020) to 600 MW (2024). Cheap capacity ($10-30/MW-day vs $50+/MW-day for gas peakers) → pulls clearing price down.</li>
        <li><strong>Import Availability:</strong> Quebec has 5,000 MW surplus hydro (winter). Offers 1,500 MW via Ontario intertie at $20-40/MW-day. Caps Ontario clearing price (arbitrage opportunity).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Policy Impacts:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Gas Phase-Out (2035 target):</strong> Ontario has 8,000 MW gas (30% of capacity). Retirement would create massive shortage. But policy allows gas with CCS (carbon capture). Expect gas plants to bid higher (add CCS costs $50-100/kW) → capacity prices rise $20-40/MW-day by 2030-2035.</li>
        <li><strong>Clean Electricity Standard (Federal):</strong> Prohibits unabated fossil generation by 2035. Applies to all provinces. Forces Ontario to replace/retrofit 8,000 MW gas. Capacity shortfall → prices spike to $80-120/MW-day (2032-2035 auctions) unless massive LT RFP procurement.</li>
        <li><strong>Carbon Pricing:</strong> Federal carbon price $170/tonne by 2030. Gas plant bidding strategy: pass carbon cost into energy market bids (not capacity bids). BUT capacity value drops (less competitive vs renewables + storage) → more retirements → tighter capacity market → higher clearing prices.</li>
        <li><strong>Indigenous Equity Requirements:</strong> LT3 RFP requires 25% Indigenous ownership. Increases project costs (community engagement, revenue sharing). Higher costs → higher capacity bids → clearing prices rise $5-10/MW-day for new resources.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Historical Ontario Capacity Price Trends:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Period</th>
            <th class="border px-2 py-1">Clearing Price</th>
            <th class="border px-2 py-1">Key Drivers</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">2018-2020</td>
            <td class="border px-2 py-1">$50-100/MW-day</td>
            <td class="border px-2 py-1">Tight market. Pickering closure announced (2024). Nuclear refurbs underway. High scarcity premium.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2021-2022</td>
            <td class="border px-2 py-1">$30-50/MW-day</td>
            <td class="border px-2 py-1">COVID demand drop. Refurbs delayed (extra capacity online). LT1 RFP announced (supply signal).</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2023-2024</td>
            <td class="border px-2 py-1">$8-15/MW-day</td>
            <td class="border px-2 py-1">Supply surge. LT1 projects online (2,300 MW). Pickering extended to 2026. Bruce/Darlington refurbs complete.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2025-2027 (forecast)</td>
            <td class="border px-2 py-1">$15-30/MW-day</td>
            <td class="border px-2 py-1">Balanced market. Demand growth offsets new supply. Pickering closure 2026 (3,100 MW) offset by LT2 (1,200 MW).</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2028-2035 (forecast)</td>
            <td class="border px-2 py-1">$40-80/MW-day</td>
            <td class="border px-2 py-1">Scarcity returns. Gas retirements (2035 clean grid target). Electrification demand surge. Major LT RFP procurement needed.</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Ratepayer Impact:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Low Price Scenario ($10/MW-day):</strong> 28,000 MW × $10/MW-day × 365 = $102M/year. Spread over 24,000 GWh demand = $4.25/MWh ($0.00425/kWh). Minimal bill impact.</li>
        <li><strong>High Price Scenario ($80/MW-day):</strong> 28,000 MW × $80/MW-day × 365 = $818M/year. Spread over 24,000 GWh = $34/MWh ($0.034/kWh). Household using 800 kWh/month pays extra $27/month.</li>
        <li><strong>Policy Trade-Off:</strong> Low capacity prices good for ratepayers NOW. But if too low, discourages new investment. Could lead to shortages, blackouts, emergency procurements (very expensive). Optimal price: $30-50/MW-day (covers new entrant costs, not windfall for existing resources).</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ 2030s Price Shock Risk:</strong> If IESO doesn't procure 5,000-8,000 MW new resources by 2030 (via LT3, LT4 RFPs), capacity prices could spike to $100-150/MW-day when gas retirements hit (2033-2035). Would cost ratepayers $1-1.5B/year. Proactive procurement (lock in capacity at $40-60/MW-day) cheaper than emergency auctions.</p>
      </div>
    `,
    relatedTopics: ['capacity.overview', 'capacity.auctions'],
  },

  'capacity.resources': {
    id: 'capacity.resources',
    title: 'Resource Types in Capacity Markets',
    shortText: 'Gas, storage, hydro, nuclear, demand response - characteristics and competition',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Technology Competition in Capacity Markets</h3>
      <p class="mb-4">Ontario's capacity market is technology-neutral. Gas plants, batteries, hydro, nuclear, demand response all compete on price. Each has different cost structure, flexibility, reliability characteristics.</p>

      <h4 class="font-semibold mt-4 mb-2">Resource Type Comparison:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Resource</th>
            <th class="border px-2 py-1">Capacity Bid</th>
            <th class="border px-2 py-1">Reliability</th>
            <th class="border px-2 py-1">Dispatch</th>
            <th class="border px-2 py-1">Ontario Share</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Natural Gas</td>
            <td class="border px-2 py-1">$30-60/MW-day</td>
            <td class="border px-2 py-1">95-99% (very reliable)</td>
            <td class="border px-2 py-1">5-10 min startup, 4+ hour duration</td>
            <td class="border px-2 py-1">~45%</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Hydro</td>
            <td class="border px-2 py-1">$5-20/MW-day</td>
            <td class="border px-2 py-1">95-99% (weather dependent)</td>
            <td class="border px-2 py-1">Instant start, limited by reservoir</td>
            <td class="border px-2 py-1">~30%</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Nuclear</td>
            <td class="border px-2 py-1">$3-10/MW-day</td>
            <td class="border px-2 py-1">90% (scheduled outages)</td>
            <td class="border px-2 py-1">Baseload only (can't ramp)</td>
            <td class="border px-2 py-1">~10%*</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Battery Storage</td>
            <td class="border px-2 py-1">$40-80/MW-day</td>
            <td class="border px-2 py-1">98-99% (very reliable)</td>
            <td class="border px-2 py-1">Instant, 2-4 hour duration</td>
            <td class="border px-2 py-1">~5%</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Demand Response</td>
            <td class="border px-2 py-1">$50-200/MW-day</td>
            <td class="border px-2 py-1">70-90% (depends on customer availability)</td>
            <td class="border px-2 py-1">10-30 min notice, 4+ hour duration</td>
            <td class="border px-2 py-1">~5%</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Imports (Quebec)</td>
            <td class="border px-2 py-1">$20-50/MW-day</td>
            <td class="border px-2 py-1">95% (transmission limits)</td>
            <td class="border px-2 py-1">Instant, limited to 1,500 MW</td>
            <td class="border px-2 py-1">~5%</td>
          </tr>
        </tbody>
      </table>
      <p class="text-xs mb-4">*Nuclear provides ~60% of Ontario's ENERGY but only ~10% of CAPACITY market (most nuclear bid to de-list, not offer additional capacity)</p>

      <h4 class="font-semibold mt-4 mb-2">Natural Gas (Dominant but Declining):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Ontario Fleet:</strong> ~8,000 MW (Portlands Energy Centre, Goreway, Halton Hills, etc.). Mix of combined-cycle (efficient, slow start) and simple-cycle peakers (expensive, fast start).</li>
        <li><strong>Cost Structure:</strong> Fixed O&M $15-30/kW-year, fuel cost $40-80/MWh (variable). Peakers run <100 hours/year → need capacity revenue to survive.</li>
        <li><strong>Capacity Bid Strategy:</strong> Bid fixed costs. E.g., $25,000/MW-year fixed O&M = $68/MW-day capacity bid. Also earn energy revenue when dispatched (but unreliable).</li>
        <li><strong>2035 Challenge:</strong> Federal clean electricity rules ban unabated gas by 2035. Options: (1) Retire (lose 8,000 MW), (2) Add CCS (carbon capture, adds $50-100/kW cost → capacity bids rise to $100-150/MW-day), (3) Convert to hydrogen (expensive, unproven at scale).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Hydroelectric (Low-Cost Anchor):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Ontario Fleet:</strong> ~8,500 MW (OPG: Niagara, Ottawa River, Northern hydro). Existing assets, fully depreciated.</li>
        <li><strong>Cost Structure:</strong> Near-zero variable cost (no fuel). Fixed O&M $5-15/kW-year. Very low capacity bids ($5-20/MW-day).</li>
        <li><strong>Reliability:</strong> 95%+ but weather-dependent. Drought years (e.g., 2023) reduce output 10-20%. IESO derates capacity bids (100 MW physical = 85 MW capacity credit).</li>
        <li><strong>Value Stack:</strong> Hydro earns capacity revenue + energy revenue (dispatched 4,000-6,000 hours/year) + ancillary services (regulation, voltage support). Total revenue: $60-100/MWh.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Nuclear (Baseload Capacity De-List):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Ontario Fleet:</strong> ~12,800 MW (Bruce 6,400 MW, Darlington 3,300 MW, Pickering 3,100 MW until 2026).</li>
        <li><strong>Capacity Market Role:</strong> Nuclear mostly bids to DE-LIST (remove capacity during refurbishments). E.g., Bruce Unit 6 refurb (2020-2023) removed 800 MW from market. Compensated at clearing price ($40/MW-day × 800 MW × 365 × 3 years = $35M).</li>
        <li><strong>Why Not Offer Capacity?</strong> Nuclear runs 24/7 at constant output (can't load-follow). Already contracted via regulated rates. Capacity market irrelevant for revenue (makes $80-100/MWh from energy + regulated payments).</li>
        <li><strong>Future Role:</strong> New SMRs (Small Modular Reactors) may bid as flexible capacity (Darlington SMR 300 MW, 2029). Could offer capacity at $20-40/MW-day (low O&M, zero fuel cost).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Battery Storage (Fastest-Growing Segment):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Ontario Pipeline:</strong> ~3,000 MW in queue (Oneida 250 MW operational, Havelock 320 MW under construction, many more planned).</li>
        <li><strong>Cost Structure:</strong> High capex ($300-400/kWh × 4 hours = $1,200-1,600/kW). Amortized over 15 years = $80-110/kW-year = $220-300/MW-day. BUT also earns energy arbitrage ($30-50/MW-day) + regulation services ($10-15/MW-day). Net capacity bid: $160-235/MW-day... TOO HIGH!</li>
        <li><strong>Why Batteries Clear:</strong> New math with LT RFP contracts. Contract guarantees $150-200/kW-year capacity payment (15-20 years). So battery bids $0-20/MW-day in capacity auction (already has LT contract). Clears easily, displaces gas peakers.</li>
        <li><strong>Market Impact:</strong> 2,000 MW batteries (LT1+LT2) entering market 2024-2026. Clearing prices dropped from $35/MW-day (2022) to $8/MW-day (2024). Gas peakers squeezed (some may retire early).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Demand Response (Niche but Valuable):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Ontario Programs:</strong> ~600 MW (Industrial Accelerator Program, Demand Response Auction, Capacity Based Demand Response).</li>
        <li><strong>How It Works:</strong> Stelco (steel mill, 50 MW) bids to shut down electric arc furnace when grid stressed. Loses $20,000/hour production. Compensated via capacity payment ($200/MW-day × 50 MW × 365 = $3.65M/year) + energy payment when curtailed ($500/MWh × 4 hours × 10 events = $100,000/year). Total: $3.75M covers $3M risk.</li>
        <li><strong>Reliability Challenge:</strong> DR only 70-90% reliable (sometimes customer can't curtail—production deadlines, equipment issues). IESO derates: 100 MW DR = 75 MW capacity credit.</li>
        <li><strong>Growth Potential:</strong> Smart thermostats, EV chargers, industrial flexibility. Could grow to 2,000-3,000 MW by 2030 (5-10% of capacity market). Cheapest resource (no new build, just compensate flexibility).</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Technology Transition:</strong> 2020 capacity mix: 50% gas, 35% hydro, 10% nuclear, 5% other. Projected 2035: 30% storage, 35% hydro, 15% gas (w/ CCS), 10% nuclear (SMRs), 10% DR/imports. Batteries displacing gas peakers due to cost decline + clean grid policies.</p>
      </div>
    `,
    relatedTopics: ['capacity.overview', 'capacity.auctions', 'capacity.pricing'],
  },
};
