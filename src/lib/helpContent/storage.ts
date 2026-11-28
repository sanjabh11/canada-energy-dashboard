/**
 * Help content: Storage Dispatch
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const STORAGE_CONTENT: Record<string, HelpContentItem> = {
  'storage.dispatch.overview': {
    id: 'storage.dispatch.overview',
    title: 'Storage Dispatch Dashboard',
    shortText: 'Battery storage dispatch optimization for grid services and revenue maximization',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Battery Storage Dispatch Optimization</h3>
      <p class="mb-4">Storage dispatch determines when to charge (absorb energy from grid), discharge (inject energy to grid), or hold (idle). Optimization balances multiple objectives: maximize revenue (arbitrage, regulation, capacity), minimize degradation, support renewable integration, maintain grid reliability.</p>

      <h4 class="font-semibold mt-4 mb-2">Dispatch Decision Framework:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Grid Condition</th>
            <th class="border px-2 py-1">Decision</th>
            <th class="border px-2 py-1">Rationale</th>
            <th class="border px-2 py-1">Typical Revenue</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Low price (<$30/MWh) + Low demand (overnight)</td>
            <td class="border px-2 py-1">CHARGE</td>
            <td class="border px-2 py-1">Buy cheap energy, store for later discharge at peak</td>
            <td class="border px-2 py-1">$0 (negative cost = revenue when discharge)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">High price (>$80/MWh) + High demand (5-7 PM)</td>
            <td class="border px-2 py-1">DISCHARGE</td>
            <td class="border px-2 py-1">Sell energy at peak price, maximize arbitrage spread</td>
            <td class="border px-2 py-1">$80-150/MWh</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Renewable surplus (solar/wind exceeds demand)</td>
            <td class="border px-2 py-1">CHARGE</td>
            <td class="border px-2 py-1">Absorb curtailment, avoid negative pricing</td>
            <td class="border px-2 py-1">$20-40/MWh (curtailment avoided)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Frequency deviation (grid <59.9 or >60.1 Hz)</td>
            <td class="border px-2 py-1">CHARGE or DISCHARGE (fast response)</td>
            <td class="border px-2 py-1">Provide regulation service, stabilize frequency</td>
            <td class="border px-2 py-1">$10-20/MW-hour</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Mid-range price ($40-60/MWh)</td>
            <td class="border px-2 py-1">HOLD</td>
            <td class="border px-2 py-1">Wait for better opportunity, avoid unnecessary cycling</td>
            <td class="border px-2 py-1">$0 (preserve battery life)</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Optimization Objectives (Multi-Objective Function):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Revenue Maximization:</strong> Maximize (discharge price - charge price) × MWh × cycles/day. Example: charge at $20/MWh (2 AM), discharge at $100/MWh (6 PM) = $80/MWh profit × 1 MWh × 365 days = $29,200/year.</li>
        <li><strong>Degradation Minimization:</strong> Each cycle consumes battery life (2-3% capacity loss per 365 cycles). Limit to 1 cycle/day unless revenue >$100/MWh spread justifies faster degradation.</li>
        <li><strong>Renewable Integration:</strong> Charge from solar surplus (11 AM - 3 PM), discharge when renewables offline (6-9 PM). Avoid renewable curtailment worth $20-40/MWh.</li>
        <li><strong>Grid Constraints:</strong> Respect SoC limits (10-90% to preserve battery health), power limits (max charge/discharge rate based on inverter capacity), grid connection capacity.</li>
        <li><strong>Contract Obligations:</strong> If battery has capacity contract, must maintain 20-40% SoC reserve to respond to IESO dispatch signal within 5 minutes.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Real-World Example: Oneida Energy Storage (250 MW / 1,000 MWh)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Location:</strong> Near London, ON (Southwest Ontario, high Bruce nuclear + wind penetration)</li>
        <li><strong>Dispatch Strategy:</strong>
          <ul class="list-disc pl-5 mt-1">
            <li><strong>Overnight (12 AM - 6 AM):</strong> CHARGE at $20-30/MWh. Absorb excess Bruce nuclear (baseload can't ramp down). Charge 750 MWh (75% full).</li>
            <li><strong>Midday (11 AM - 2 PM):</strong> CHARGE (if windy/sunny). Absorb wind/solar surplus. Southwest ON often has 2,000+ MW renewable output, exceeds local demand. Battery prevents curtailment.</li>
            <li><strong>Evening Peak (5-9 PM):</strong> DISCHARGE at $80-120/MWh. GTA demand peak (22,000 MW). Ontario imports from Quebec + discharges all batteries. Release 900 MWh over 4 hours (225 MW average).</li>
            <li><strong>Day-Ahead Reserve:</strong> Hold 250 MWh (25% SoC) for IESO capacity auction dispatch. Contractual obligation to respond within 10 minutes. Earns $150/kW-year capacity payment = $37.5M/year.</li>
          </ul>
        </li>
        <li><strong>Annual Economics:</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>Energy Arbitrage: 365 cycles × 750 MWh × $70 spread = $19.2M/year</li>
            <li>Capacity Payment: $37.5M/year</li>
            <li>Regulation Services: $5M/year (fast frequency response during dispatch events)</li>
            <li>Renewable Curtailment Avoided: $3M/year (absorb 150 GWh/year wind that would be curtailed)</li>
            <li>Total Revenue: $64.7M/year. Capex: $250M (4-hour battery). Payback: 3.9 years. IRR: 22%.</li>
          </ul>
        </li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Future - AI-Optimized Dispatch:</strong> Current dispatch uses rule-based logic ("if price < $30, charge"). Next-gen uses machine learning: predict price spikes 24 hours ahead, optimize SoC trajectory, learn from historical patterns. Early pilots show 10-15% higher revenue vs rules.</p>
      </div>
    `,
    relatedTopics: [
      'storage.dispatch.soc',
      'storage.dispatch.revenue',
      'storage.dispatch.renewable',
    ],
  },

  'storage.dispatch.soc': {
    id: 'storage.dispatch.soc',
    title: 'State of Charge (SoC) Management',
    shortText: 'Managing battery SoC for longevity, reliability, and flexibility',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">SoC Constraints and Cycling Strategies</h3>
      <p class="mb-4">State of Charge (SoC) = % of battery capacity currently stored. E.g., 1,000 MWh battery at 60% SoC holds 600 MWh. SoC management critical for: (1) battery health (avoid over-charge/discharge), (2) grid reliability (maintain reserve), (3) flexibility (space to charge/discharge).</p>

      <h4 class="font-semibold mt-4 mb-2">SoC Operating Bands:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">SoC Range</th>
            <th class="border px-2 py-1">Operational Mode</th>
            <th class="border px-2 py-1">Degradation Risk</th>
            <th class="border px-2 py-1">Use Case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">0-10% (Empty)</td>
            <td class="border px-2 py-1">CHARGE ONLY</td>
            <td class="border px-2 py-1">High (deep discharge damages cells)</td>
            <td class="border px-2 py-1">Emergency reserve. Avoid routinely.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">10-30% (Low Reserve)</td>
            <td class="border px-2 py-1">Prefer CHARGE</td>
            <td class="border px-2 py-1">Medium</td>
            <td class="border px-2 py-1">Maintain capacity auction reserve. Can discharge only for IESO dispatch signal or premium price (>$150/MWh).</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">30-70% (Optimal)</td>
            <td class="border px-2 py-1">CHARGE or DISCHARGE (flexible)</td>
            <td class="border px-2 py-1">Low (sweet spot for battery chemistry)</td>
            <td class="border px-2 py-1">Normal operations. Max revenue opportunity. Full bidirectional flexibility.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">70-90% (High Reserve)</td>
            <td class="border px-2 py-1">Prefer DISCHARGE</td>
            <td class="border px-2 py-1">Medium</td>
            <td class="border px-2 py-1">Ready for evening peak. Discharge capacity available. Avoid overcharge.</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">90-100% (Full)</td>
            <td class="border px-2 py-1">DISCHARGE ONLY</td>
            <td class="border px-2 py-1">High (overcharge damages cells, fire risk)</td>
            <td class="border px-2 py-1">Emergency. Modern BMSavoid >95% SoC.</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Cycling Strategies:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Single Daily Cycle (Most Common):</strong> Charge overnight (low price), discharge evening (high price). Traverse 10% → 85% SoC (75% DoD - Depth of Discharge). Gentle on battery, 4,000-6,000 cycle lifetime (11-16 years). Maximizes arbitrage revenue ($20-50/MWh spread × 1 cycle/day).</li>
        <li><strong>Multiple Cycles (High Revenue Days):</strong> If intraday price volatility >$100/MWh, cycle 2-3 times/day. E.g., charge midday solar surplus ($10/MWh), discharge afternoon ramp ($80/MWh), recharge evening wind ($25/MWh), discharge morning peak ($90/MWh). Higher revenue but 2-3x faster degradation. Use sparingly (50-100 days/year).</li>
        <li><strong>Partial Cycles (Regulation):</strong> Fast charge/discharge within 40-60% SoC band. Respond to grid frequency signals every 4 seconds. Hundreds of micro-cycles/day but shallow (20% DoD). Minimal degradation if stay in optimal SoC band. Earns regulation revenue ($10-20/MW-hour).</li>
        <li><strong>Reserve Hold (Capacity Contract):</strong> Maintain 20-40% SoC as hot reserve for IESO dispatch. Can't use this capacity for arbitrage. Trade-off: lower energy revenue, but earns $150-200/kW-year capacity payment. Net positive ($37.5M vs $19M energy for 250 MW battery).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Degradation Modeling:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Capacity Fade:</strong> Li-ion batteries lose 2-3% capacity/year from cycling (charge/discharge stress). After 3,650 cycles (1/day for 10 years), capacity drops to 70-75% of original. Warranty typically guarantees 80% at end of contract.</li>
        <li><strong>Accelerated Degradation Factors:</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>Deep Discharge: Cycling 0-100% SoC (100% DoD) → 2x faster degradation vs 20-80% (60% DoD)</li>
            <li>High Temperature: Operating at 40°C vs 25°C → 1.5x faster degradation. HVAC critical (adds $500k-1M annual cost for 250 MW battery)</li>
            <li>Fast Charge/Discharge: 1C rate (charge full battery in 1 hour) vs 0.25C (4 hours) → 1.3x faster degradation. Trade-off: speed vs longevity</li>
            <li>Calendar Aging: Even idle batteries age (~1-2%/year). Holding at 50% SoC minimizes calendar aging vs 100% SoC.</li>
          </ul>
        </li>
        <li><strong>Degradation Cost:</strong> 250 MW / 1,000 MWh battery costs $250M. Over 15-year life, $16.7M/year amortization. If cycle 2x/day (vs 1x/day), life drops to 8 years → $31.3M/year. Extra $14.6M/year degradation cost. Only worth it if revenue >$15M/year extra.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">SoC Forecasting and Day-Ahead Planning:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Price Forecast:</strong> Predict IESO HOEP (Hourly Ontario Energy Price) for next 24 hours. Use machine learning (LSTM on historical prices, weather, demand forecast). Accuracy: ±$10/MWh.</li>
        <li><strong>SoC Trajectory Optimization:</strong> Plan SoC path to maximize revenue. E.g., if forecast shows evening spike ($150/MWh at 7 PM), ensure SoC reaches 85% by 5 PM (ready to discharge 750 MWh over 3 hours).</li>
        <li><strong>Example - Day-Ahead Plan (Jan 15, 2025):</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>12 AM: Start at 40% SoC (400 MWh). Price forecast $25/MWh.</li>
            <li>12-6 AM: CHARGE 200 MW × 6 hours = 1,200 MWh. Exceeds capacity! Limit to 450 MWh (reach 85% SoC). Cost: $25/MWh × 450 MWh = $11,250.</li>
            <li>6-11 AM: HOLD at 85%. Price forecast $40-60/MWh (not worth discharge yet).</li>
            <li>11 AM - 2 PM: Wind forecast high (2,500 MW Southwest ON). Price may drop to $10/MWh. But already 85% SoC → can't charge. Miss opportunity. Lesson: start day at 50% SoC for flexibility.</li>
            <li>5-8 PM: DISCHARGE 225 MW × 3 hours = 675 MWh. Price forecast $110/MWh. Revenue: $110 × 675 = $74,250.</li>
            <li>Net Revenue: $74,250 - $11,250 = $63,000/day = $23M/year (just energy arbitrage).</li>
          </ul>
        </li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Black Swan Risk:</strong> Extreme events (polar vortex, heatwave) cause price spikes to $500-1,000/MWh (vs typical $20-100). But battery can discharge only once (4-hour duration). If discharge early ($500/MWh at 4 PM), miss bigger spike ($900/MWh at 6 PM). Trade-off: guaranteed $500 revenue now vs risky $900 later. Optimization under uncertainty.</p>
      </div>
    `,
    relatedTopics: ['storage.dispatch.overview', 'storage.dispatch.revenue'],
  },

  'storage.dispatch.revenue': {
    id: 'storage.dispatch.revenue',
    title: 'Revenue Optimization Strategies',
    shortText: 'Maximizing battery revenue from energy arbitrage, capacity, and ancillary services',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Battery Revenue Stacking</h3>
      <p class="mb-4">Modern batteries earn from multiple revenue streams simultaneously ("stacking"). Typical 100 MW / 400 MWh battery earns: $4M arbitrage + $15M capacity + $3M regulation + $2M renewable firming = $24M/year total. Capex: $100M. Payback: 4.2 years.</p>

      <h4 class="font-semibold mt-4 mb-2">Revenue Streams Breakdown:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Revenue Stream</th>
            <th class="border px-2 py-1">Value (100 MW Battery)</th>
            <th class="border px-2 py-1">% of Total</th>
            <th class="border px-2 py-1">Effort/Risk</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Capacity Auction (IESO)</td>
            <td class="border px-2 py-1">$15M/year ($150/kW-year × 100 MW)</td>
            <td class="border px-2 py-1">~60%</td>
            <td class="border px-2 py-1">Low effort (annual bid), low risk (predictable clearing price)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Energy Arbitrage</td>
            <td class="border px-2 py-1">$4M/year ($60 spread × 0.3 MWh avg × 365 days × 100 MW)</td>
            <td class="border px-2 py-1">~17%</td>
            <td class="border px-2 py-1">Medium effort (daily optimization), medium risk (price volatility)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Regulation Service</td>
            <td class="border px-2 py-1">$3M/year ($15/MW-hour × 50 MW × 4,000 hours/year)</td>
            <td class="border px-2 py-1">~12%</td>
            <td class="border px-2 py-1">Medium effort (real-time dispatch), low risk (stable prices)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Renewable Firming</td>
            <td class="border px-2 py-1">$2M/year (absorb 100 GWh curtailment × $20/MWh avoided)</td>
            <td class="border px-2 py-1">~8%</td>
            <td class="border px-2 py-1">Low effort (opportunistic), low risk (no-regrets value)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Transmission Deferral</td>
            <td class="border px-2 py-1">$500k/year (if located to relieve congestion)</td>
            <td class="border px-2 py-1">~2%</td>
            <td class="border px-2 py-1">Low effort (location-dependent), one-time value</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Optimization Strategies by Market Condition:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Low Volatility Market (Tight Supply/Demand, Stable Prices):</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>Focus on capacity auction (60% of revenue). Bid aggressively (accept lower $/MW-day).</li>
            <li>Energy arbitrage limited ($20-40/MWh spread). 1 cycle/day, gentle on battery.</li>
            <li>Regulation service attractive (stable $15/MW-hour). Dedicate 50% capacity to regulation.</li>
            <li>Example: 2024 Ontario (surplus capacity, Pickering extended). Capacity price $10/MW-day. Energy spread $30/MWh. Battery earns $12M/year (vs $24M in tight market). Some batteries retired early (uneconomic).</li>
          </ul>
        </li>
        <li><strong>High Volatility Market (Tight Capacity, Price Spikes):</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>Energy arbitrage dominates (40% of revenue). Price spreads $100-200/MWh on peak days.</li>
            <li>Cycle 2-3x/day on extreme events (heatwave, polar vortex). Accept faster degradation for $300/MWh spreads.</li>
            <li>Capacity auction clears at $50-80/MW-day (high scarcity premium). But energy revenue so lucrative, some batteries skip capacity market to avoid dispatch obligation (want freedom to optimize arbitrage).</li>
            <li>Example: 2018-2020 Ontario (pre-Pickering extension). Capacity price $80/MW-day. Energy spreads $120/MWh (100+ days/year). Batteries earned $35M/year. Developers rushed to build (LT1 RFP oversubscribed 5:1).</li>
          </ul>
        </li>
        <li><strong>Renewable-Heavy Grid (High Solar/Wind Penetration):</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>Renewable firming becomes primary value (30% of revenue). Charge midday solar surplus, discharge evening ramp.</li>
            <li>Curtailment mitigation: Battery prevents $50-100M/year wind curtailment (Southwest ON). Grid operator willing to pay $20-40/MWh premium for batteries in congested zones.</li>
            <li>Negative pricing risk: If renewables exceed demand, prices go negative (-$50/MWh). Battery gets PAID to charge! Discharge at $80/MWh evening = $130/MWh total spread.</li>
            <li>Example: California 2023. Spring days with 18,000 MW solar (vs 25,000 MW demand). Prices: -$30/MWh at 1 PM, +$200/MWh at 7 PM. Battery spread: $230/MWh. Batteries earned $50M/year (100 MW). Drove battery boom (10,000 MW installed 2020-2024).</li>
          </ul>
        </li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Revenue Stacking Trade-Offs:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Capacity vs Energy:</strong> Capacity contract requires 30% SoC reserve (can't discharge below 30% without penalty). Limits energy arbitrage (only 70% capacity available). But capacity payment guaranteed ($15M/year) vs energy volatile ($2-8M/year). Risk-averse developers choose capacity.</li>
        <li><strong>Regulation vs Arbitrage:</strong> Regulation requires 50% capacity on standby (must respond to AGC signal within 1 second). Can't commit this capacity to day-ahead arbitrage. But regulation pays $3M/year vs arbitrage $2M/year (in low volatility markets). And regulation less degrading (shallow cycles).</li>
        <li><strong>Geographic vs Merchant:</strong> Battery in congested zone (Southwest ON) earns transmission deferral value ($500k-2M/year bonus). But transmission upgrades (2028-2032) eliminate congestion → value disappears. Merchant battery (no location premium) has lower upfront revenue but more durable.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Real-World Optimization Case Study:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Havelock Energy Storage (320 MW / 1,280 MWh):</strong> LT2 RFP winner, under construction near Toronto. Optimized revenue stack:</li>
        <li><strong>Capacity:</strong> $150/kW-year × 250 MW = $37.5M/year (hold 70 MW reserve for IESO dispatch, use 250 MW for capacity bid)</li>
        <li><strong>Energy Arbitrage:</strong> 250 MW × 4 hours/day × 365 days × $70 spread = $25.6M/year</li>
        <li><strong>Regulation:</strong> 70 MW × $15/MW-hour × 5,000 hours/year = $5.3M/year (use reserve capacity for regulation when not dispatched)</li>
        <li><strong>Renewable Firming:</strong> Located near Clarington (high solar penetration). Absorb 200 GWh/year midday solar → $4M/year curtailment value</li>
        <li><strong>Total Revenue:</strong> $72.4M/year. Capex: $320M (4-hour battery, $1,000/kWh). Payback: 4.4 years. IRR: 18%.</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Software is Key:</strong> Leading battery operators (Fluence, Tesla, Powin) have proprietary optimization software. Use ML to predict prices, optimal SoC trajectory, when to bid regulation vs arbitrage. Software advantage worth 10-20% higher revenue ($2-5M/year per 100 MW) vs naive rule-based dispatch. Competitive moat.</p>
      </div>
    `,
    relatedTopics: ['storage.dispatch.overview', 'storage.dispatch.soc'],
  },

  'storage.dispatch.renewable': {
    id: 'storage.dispatch.renewable',
    title: 'Renewable Integration and Curtailment Mitigation',
    shortText:
      'How storage enables higher renewable penetration by absorbing surplus and firming output',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Storage as Renewable Enabler</h3>
      <p class="mb-4">Wind and solar are intermittent: produce when sunny/windy, not when needed. Storage decouples generation from consumption: charge when renewables produce (midday solar, windy nights), discharge when renewables offline (evening peak, calm days). Unlocks 40-60% renewable penetration (vs 20-30% without storage).</p>

      <h4 class="font-semibold mt-4 mb-2">Renewable Curtailment Problem:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>What is Curtailment:</strong> Renewable generators ordered to reduce output when supply exceeds demand + transmission capacity. Wind turbines feather blades, solar inverters ramp down. Wastes free, zero-carbon energy.</li>
        <li><strong>Why Curtailment Happens:</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>Midday solar surplus (12-3 PM). Ontario has 5,000 MW solar. Midday demand only 18,000 MW (vs 24,000 MW evening peak). Plus Bruce nuclear 6,400 MW baseload can't ramp down. Total supply 29,000 MW > demand 18,000 MW. Must curtail 3,000 MW solar/wind.</li>
            <li>Transmission congestion. Southwest ON has 3,500 MW wind/solar but only 2,500 MW transmission to GTA (where demand is). Local overgeneration → curtail 1,000 MW.</li>
            <li>Minimum generation constraints. Ontario needs 12,000 MW hydro + nuclear for grid stability (provide inertia, voltage support). Can't shut down all thermal plants even if renewables exceed demand.</li>
          </ul>
        </li>
        <li><strong>Curtailment Costs:</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>Lost Energy: Ontario curtails 150-250 GWh/year wind/solar (2023). At $30-50/MWh value → $4.5-12.5M/year wasted.</li>
            <li>Ratepayer Cost: Ontario pays wind/solar generators even when curtailed (contract guarantees). Ratepayers pay $135/MWh FIT rate for energy that's dumped. Curtailment = pure waste.</li>
            <li>Renewable Developer Losses: If curtailment >5% of annual production, project revenue drops below projections. Banks may call loans. Projects fail. Chills future renewable investment.</li>
          </ul>
        </li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">How Storage Mitigates Curtailment:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Scenario</th>
            <th class="border px-2 py-1">Without Storage</th>
            <th class="border px-2 py-1">With Storage (500 MW / 2,000 MWh)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Midday Solar Surplus (12-3 PM)</td>
            <td class="border px-2 py-1">Curtail 800 MW solar. Waste 2,400 MWh/day. Cost: $120k/day × 200 days/year = $24M/year.</td>
            <td class="border px-2 py-1">Battery charges 500 MW × 4 hours = 2,000 MWh. Curtailment reduced to 300 MW. Waste only 900 MWh/day. Cost: $9M/year (save $15M).</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Evening Ramp (5-7 PM)</td>
            <td class="border px-2 py-1">Solar offline (sunset). Gas ramps up 3,000 MW. Emissions: 1,500 tonnes CO₂/hour × 2 hours = 3,000 tonnes/day. Carbon cost: $240k/day.</td>
            <td class="border px-2 py-1">Battery discharges 2,000 MWh stored solar. Gas ramp reduced to 1,500 MW. Emissions: 1,500 tonnes/day (half). Carbon cost: $120k/day (save $120k + avoid 1,500 tonnes CO₂).</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Windy Night (12-6 AM)</td>
            <td class="border px-2 py-1">Wind 2,500 MW, demand 13,000 MW, Bruce nuclear 6,400 MW (can't ramp down). Total supply 8,900 MW > demand. Curtail 1,000 MW wind.</td>
            <td class="border px-2 py-1">Battery charges from wind. Absorbs 500 MW × 6 hours = 3,000 MWh. Curtailment reduced to 500 MW. Wind utilization increases 10-15% annually.</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Renewable Firming (Storage + Renewable Co-Location):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Hybrid Project Model:</strong> Solar farm + battery at same site. 200 MW solar + 100 MW / 400 MWh battery. Battery charges from solar midday, discharges evening. Grid sees 100 MW "firm" capacity 14 hours/day (vs 6 hours for solar alone).</li>
        <li><strong>Benefits:</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>Higher Revenue: Capacity auction values firm capacity 2-3x higher than intermittent. Solar alone: $0/kW-year (not firm). Hybrid: $150/kW-year (firm 4-hour duration).</li>
            <li>Grid Integration: Grid operator sees single resource, not separate solar + battery. Easier dispatch, fewer connection studies.</li>
            <li>Cost Savings: Shared interconnection ($5-10M saved on substation, transmission tap). Shared land ($500k-1M saved). Shared O&M (one operations center).</li>
          </ul>
        </li>
        <li><strong>Example - Jarvis Solar + Storage (200 MW Solar + 100 MW / 400 MWh Battery):</strong> LT2 RFP winner. Hybrid business model:
          <ul class="list-disc pl-5 mt-1">
            <li>Solar Revenue: 200 MW × 30% capacity factor × 8,760 hours × $105/MWh (LT2 contract) = $55M/year</li>
            <li>Battery Revenue: $150/kW-year × 100 MW capacity = $15M/year + $5M arbitrage/regulation</li>
            <li>Total: $75M/year. Capex: $500M ($250M solar + $100M battery + $50M interconnection). Payback: 6.7 years.</li>
            <li>Without hybrid: Solar alone $55M revenue, needs separate $60M interconnection (no cost sharing) → $500M capex, $55M revenue → 9.1 year payback. Battery saves 2.4 years.</li>
          </ul>
        </li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Future - Seasonal Storage:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Problem:</strong> Li-ion batteries solve intraday (4-hour) storage. But can't solve seasonal mismatch. Ontario solar: 5x higher output in June vs December. Wind: 2x higher output in winter vs summer. Need storage that shifts June solar to December.</li>
        <li><strong>Emerging Technologies:</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>Hydrogen Storage: Electrolyze water with surplus summer solar → store hydrogen in underground caverns → burn in gas turbines in winter. Round-trip efficiency: 30-40% (vs 90% Li-ion). But duration: months. Capex: $2,000-3,000/kW (vs $1,000 Li-ion).</li>
            <li>Pumped Hydro: Pump water uphill with surplus renewables → release through turbines when needed. Duration: days to weeks. Ontario has limited geography (need 300m elevation change). Best sites: Muskrat Falls (Labrador), Meaford (Georgian Bay). Cost: $1,500-2,500/kW.</li>
            <li>Thermal Storage: Heat sand/concrete to 600°C with surplus renewables → extract heat as electricity via Stirling engine. Duration: weeks. Round-trip efficiency: 50-60%. Pilot projects in development (no commercial deployment yet).</li>
          </ul>
        </li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 2035 Scenario:</strong> Ontario targets 60% renewable penetration (18 GW wind/solar). Without storage: 30-40% curtailment (5,400-7,200 GWh/year waste, $270-360M cost). With 5,000 MW / 20,000 MWh storage: curtailment drops to <10% (1,800 GWh, $90M). Storage investment $5B, but saves $180-270M/year → 19-28 year payback. Plus avoid $3B gas plants (not needed if storage shifts renewables to peak).</p>
      </div>
    `,
    relatedTopics: ['storage.dispatch.overview', 'storage.dispatch.revenue'],
  },
};
