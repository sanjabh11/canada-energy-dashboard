/**
 * Help content: Virtual Power Plants
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const VPP_CONTENT: Record<string, HelpContentItem> = {
  'vpp.overview': {
    id: 'vpp.overview',
    title: 'Virtual Power Plant (VPP) Dashboard',
    shortText: 'Aggregating distributed energy resources for grid flexibility and demand response',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">What is a Virtual Power Plant?</h3>
      <p class="mb-4">A VPP aggregates thousands of small distributed energy resources (DERs) - batteries, EVs, smart thermostats, solar panels - and coordinates them as a single, dispatchable unit. Grid operator sees 50 MW VPP, not 10,000 individual devices.</p>

      <h4 class="font-semibold mt-4 mb-2">Why VPPs Matter:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Grid Flexibility:</strong> Replaces gas peakers ($500M, 10-year build) with aggregated DERs (software platform, 6-month deployment). 500 MW VPP equivalent to new peaker plant.</li>
        <li><strong>Customer Value:</strong> Homeowners earn $50-200/year (battery, smart thermostat). Businesses earn $5,000-50,000/year (EV fleets, HVAC control). Passive revenue for grid services.</li>
        <li><strong>Renewable Integration:</strong> VPPs charge from solar surplus (midday), discharge at peak (6-9 PM). Shifts 500 MWh/day, avoids curtailment, reduces gas dispatch.</li>
        <li><strong>Market Access:</strong> Individual 10 kW battery can't bid into IESO markets (minimum 1 MW). VPP aggregates 100 batteries → 1 MW → market participation.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Canadian VPP Landscape (2024):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">VPP Platform</th>
            <th class="border px-2 py-1">Operator</th>
            <th class="border px-2 py-1">Capacity</th>
            <th class="border px-2 py-1">Assets</th>
            <th class="border px-2 py-1">Region</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">IESO Peak Perks</td>
            <td class="border px-2 py-1">IESO</td>
            <td class="border px-2 py-1">~150 MW</td>
            <td class="border px-2 py-1">50,000 smart thermostats</td>
            <td class="border px-2 py-1">Ontario</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Blatchford VPP</td>
            <td class="border px-2 py-1">Epcor/Siemens</td>
            <td class="border px-2 py-1">~30 MW</td>
            <td class="border px-2 py-1">2,500 homes (solar+storage)</td>
            <td class="border px-2 py-1">Alberta</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Solartility</td>
            <td class="border px-2 py-1">SolarShare/OPG</td>
            <td class="border px-2 py-1">~20 MW</td>
            <td class="border px-2 py-1">300 commercial batteries</td>
            <td class="border px-2 py-1">Ontario</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">EV FleetSync</td>
            <td class="border px-2 py-1">FLO/Hydro-Québec</td>
            <td class="border px-2 py-1">~25 MW</td>
            <td class="border px-2 py-1">5,000 EVs (V2G enabled)</td>
            <td class="border px-2 py-1">Quebec</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">PowerStream VPP</td>
            <td class="border px-2 py-1">Alectra</td>
            <td class="border px-2 py-1">~40 MW</td>
            <td class="border px-2 py-1">1,200 C&I customers</td>
            <td class="border px-2 py-1">Ontario</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">VPP Value Streams:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Capacity Payments:</strong> $100-200/kW-year (IESO capacity auction). 1 MW VPP earns $100k-200k/year just for availability.</li>
        <li><strong>Energy Arbitrage:</strong> Charge at $20/MWh (overnight), discharge at $100/MWh (peak). 1 cycle/day = $80/MWh × 1 MW × 365 days = $29k/year.</li>
        <li><strong>Frequency Regulation:</strong> $10-20/MW-hour. Fast-response DERs (batteries, EVs) earn premium. 1 MW regulation = $88k-175k/year (24/7 availability).</li>
        <li><strong>Demand Charge Reduction:</strong> Commercial customers pay $15-25/kW demand charge. VPP shaves peak → saves $15,000-25,000/year per MW.</li>
        <li><strong>Renewable Firming:</strong> Solar farm + VPP battery. Charge midday (solar surplus), discharge at peak. Turns intermittent solar into dispatchable capacity → higher revenue.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Real-World Example: IESO Peak Perks Program</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Launch:</strong> 2022 pilot, scaled to 50,000 participants by 2024</li>
        <li><strong>Technology:</strong> Ecobee/Nest smart thermostats. Pre-cool homes 2°C before peak event (4-7 PM). Reduce AC load during peak.</li>
        <li><strong>Performance:</strong> Average 3 kW reduction per home × 50,000 = 150 MW. Equivalent to small gas peaker ($150M to build).</li>
        <li><strong>Customer Compensation:</strong> $50/year participation + $25/event. Average 10 events/summer = $300/year. No upfront cost (IESO subsidizes thermostat).</li>
        <li><strong>Grid Impact:</strong> Summer 2023 heatwave: IESO called 5 Peak Perks events. Reduced peak demand 750 MWh over 15 hours. Avoided emergency gas dispatch ($200/MWh vs $100/MWh). Saved $75,000.</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 VPP Growth Potential:</strong> Canada has 15M households, 2M EVs (by 2030), 500k commercial batteries (by 2035). If 20% participate in VPPs → 3,000 MW+ aggregated capacity. Equivalent to 6 Bruce nuclear units. VPPs could provide 10-15% of Canada's grid flexibility by 2035.</p>
      </div>
    `,
    relatedTopics: ['vpp.aggregation', 'vpp.dispatch', 'vpp.compensation'],
  },

  'vpp.aggregation': {
    id: 'vpp.aggregation',
    title: 'DER Aggregation and Fleet Management',
    shortText: 'How VPPs coordinate thousands of distributed assets as a single resource',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Aggregation Challenge</h3>
      <p class="mb-4">Coordinating 10,000 batteries/EVs/thermostats requires: (1) Real-time telemetry (state of charge, availability), (2) Optimization algorithms (which assets to dispatch when), (3) Customer opt-out handling (can't dispatch if customer needs their EV), (4) Grid code compliance (frequency response <1 second).</p>

      <h4 class="font-semibold mt-4 mb-2">VPP Technology Stack:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Layer</th>
            <th class="border px-2 py-1">Function</th>
            <th class="border px-2 py-1">Technology</th>
            <th class="border px-2 py-1">Latency</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">1. Asset Control</td>
            <td class="border px-2 py-1">Device-level control (charge/discharge battery)</td>
            <td class="border px-2 py-1">IoT gateway, Modbus/DNP3, Wi-Fi</td>
            <td class="border px-2 py-1">1-5 seconds</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2. Fleet Aggregation</td>
            <td class="border px-2 py-1">Combine 1,000s of assets into single resource</td>
            <td class="border px-2 py-1">Cloud platform (AWS/Azure), DERMS software</td>
            <td class="border px-2 py-1">5-15 seconds</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">3. Market Interface</td>
            <td class="border px-2 py-1">Bid into IESO markets, receive dispatch signals</td>
            <td class="border px-2 py-1">IESO API integration, OpenADR protocol</td>
            <td class="border px-2 py-1">1-5 minutes</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">4. Forecasting</td>
            <td class="border px-2 py-1">Predict availability (EV plug-in times, solar output)</td>
            <td class="border px-2 py-1">Machine learning (LSTM, XGBoost)</td>
            <td class="border px-2 py-1">15-60 minutes</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">5. Settlement</td>
            <td class="border px-2 py-1">Calculate participant payments, grid operator charges</td>
            <td class="border px-2 py-1">Blockchain/ledger, metering data</td>
            <td class="border px-2 py-1">Daily/monthly</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Asset Type Characteristics:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Residential Batteries (Tesla Powerwall, LG Chem):</strong> 10-15 kWh capacity, 5 kW power. High availability (80%+, always home). Slow response (5-15 sec Wi-Fi latency). Low per-unit value ($50-100/year) but massive scale (500k+ in Canada by 2030).</li>
        <li><strong>EVs (V2G - Vehicle-to-Grid):</strong> 50-100 kWh capacity, 10-20 kW bidirectional charger. Medium availability (40-60%, depends on driving schedule). Forecast challenge (when is EV plugged in?). High customer sensitivity (range anxiety—can't discharge if owner needs EV tomorrow).</li>
        <li><strong>Smart Thermostats (Ecobee, Nest):</strong> 2-5 kW reduction per unit (AC cycling). Very high availability (90%+). Customer comfort constraints (can't raise temp >26°C). Low hardware cost ($150-300), high participation (millions of units).</li>
        <li><strong>Commercial Batteries (C&I customers):</strong> 100-500 kWh, 50-250 kW. High availability (90%+). Fast response (<1 sec). High per-unit value ($10k-50k/year). Sophisticated customers (demand lawyers, revenue-sharing agreements).</li>
        <li><strong>Solar Inverters (Grid-Interactive PV):</strong> 5-500 kW per site. Can curtail output (ramp down solar when grid has surplus). No energy storage, just modulation. Rarely dispatched (solar already zero marginal cost).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Optimization Algorithm (Simplified):</h4>
      <p class="mb-2">VPP receives IESO dispatch signal: "Provide 10 MW from 6-7 PM tomorrow." Optimizer solves:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Step 1 - Forecast Availability:</strong> Which batteries/EVs will be available 6-7 PM? Model predicts: 500 batteries (5 MW), 200 EVs (3 MW), 10,000 thermostats (15 MW). Total: 23 MW available (exceeds 10 MW target).</li>
        <li><strong>Step 2 - Cost Ranking:</strong> Rank by dispatch cost. Batteries $0/MWh (already paid capacity fee). EVs $20/MWh (wear & tear on battery, customer compensation). Thermostats $30/MWh (customer discomfort). Select cheapest 10 MW: all batteries (5 MW) + 125 EVs (2.5 MW) + 5,000 thermostats (2.5 MW).</li>
        <li><strong>Step 3 - Customer Opt-Out:</strong> Send pre-dispatch notification 24 hours ahead. "Your battery will discharge 6-7 PM tomorrow. Opt-out if needed." 10% opt-out → rerun optimizer with 90% fleet.</li>
        <li><strong>Step 4 - Real-Time Dispatch:</strong> At 6 PM, send control signals to selected assets. Monitor aggregate output every 5 seconds. If actual < target (e.g., 9.2 MW vs 10 MW), dispatch additional assets from reserve pool.</li>
        <li><strong>Step 5 - Settlement:</strong> Measure actual energy delivered (9.8 MWh over 1 hour). IESO pays VPP $100/MWh × 9.8 MWh = $980. VPP distributes to participants: batteries $200, EVs $150, thermostats $50 (based on contribution).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Reliability & Underperformance Penalties:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>IESO Performance Requirement:</strong> Must deliver 90%+ of committed capacity. E.g., bid 10 MW, must deliver 9+ MW. Below 90% → financial penalty ($50/MWh shortfall).</li>
        <li><strong>VPP Strategy - Oversubscription:</strong> Contract 12 MW fleet to deliver 10 MW dispatch (20% buffer). Accounts for: customer opt-outs (10%), communication failures (5%), forecast errors (5%). Ensures 90%+ delivery rate.</li>
        <li><strong>Example Failure:</strong> Winter 2023, Blatchford VPP dispatched 30 MW. Internet outage in Edmonton (Rogers network down 2 hours). Lost control of 5,000 assets. Actual delivery: 18 MW (60% performance). Penalty: 12 MW shortfall × $50/MWh × 2 hours = $1,200. Lesson: redundant communication (cellular + satellite backup).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Regulatory Challenges:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Retail vs Wholesale:</strong> Some provinces restrict aggregators. E.g., Alberta allows VPPs (competitive market). BC restricts (BC Hydro monopoly). Ontario allows (IESO facilitates).</li>
        <li><strong>Metering Requirements:</strong> IESO requires interval meters (5-minute data) for all VPP participants. Residential meters often hourly → need smart meter upgrade ($200-500/home). Who pays? Debate ongoing.</li>
        <li><strong>Customer Data Privacy:</strong> VPP sees real-time energy use → can infer when you're home, EV charged, etc. Privacy concerns. Ontario requires explicit consent + data anonymization.</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Future - AI-Optimized VPPs:</strong> Current VPPs use simple ranking (cheapest first). Next-gen VPPs use reinforcement learning: train AI on 1,000s of dispatch events, learn optimal asset selection, predict customer opt-outs, maximize revenue. Early trials show 15-20% higher revenue vs rule-based systems.</p>
      </div>
    `,
    relatedTopics: ['vpp.overview', 'vpp.dispatch'],
  },

  'vpp.dispatch': {
    id: 'vpp.dispatch',
    title: 'VPP Dispatch Events and Performance',
    shortText: 'How VPPs respond to grid signals and deliver committed capacity',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">VPP Dispatch Lifecycle</h3>
      <p class="mb-4">Grid operator (IESO) needs 50 MW reduction for 2 hours (4-6 PM, peak demand spike). VPP receives dispatch signal, activates assets, measures performance, settles payments. Entire cycle: 24 hours notice → 2 hour event → 7 day settlement.</p>

      <h4 class="font-semibold mt-4 mb-2">Dispatch Event Types:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Event Type</th>
            <th class="border px-2 py-1">Notice Period</th>
            <th class="border px-2 py-1">Duration</th>
            <th class="border px-2 py-1">Payment</th>
            <th class="border px-2 py-1">Use Case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Day-Ahead Dispatch</td>
            <td class="border px-2 py-1">24 hours</td>
            <td class="border px-2 py-1">1-4 hours</td>
            <td class="border px-2 py-1">$100-200/MWh</td>
            <td class="border px-2 py-1">Forecasted peak demand, planned generator outage</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Real-Time Dispatch</td>
            <td class="border px-2 py-1">5-60 minutes</td>
            <td class="border px-2 py-1">15 min - 2 hours</td>
            <td class="border px-2 py-1">$150-300/MWh</td>
            <td class="border px-2 py-1">Unexpected generator trip, sudden demand spike</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Frequency Regulation</td>
            <td class="border px-2 py-1">Continuous (AGC signal)</td>
            <td class="border px-2 py-1">Milliseconds to seconds</td>
            <td class="border px-2 py-1">$10-20/MW-hour</td>
            <td class="border px-2 py-1">Balance generation/load every second (maintain 60 Hz)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Emergency DR</td>
            <td class="border px-2 py-1">10-30 minutes</td>
            <td class="border px-2 py-1">2-4 hours (max)</td>
            <td class="border px-2 py-1">$500-1000/MWh</td>
            <td class="border px-2 py-1">Grid emergency, avoid rotating blackouts</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Peak Shaving (Scheduled)</td>
            <td class="border px-2 py-1">7 days</td>
            <td class="border px-2 py-1">Daily, 2-4 hours</td>
            <td class="border px-2 py-1">$50-100/MWh</td>
            <td class="border px-2 py-1">Summer AC load reduction, winter heating reduction</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Performance Metrics:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Dispatch Accuracy:</strong> Actual MW delivered vs committed MW. Target: 90-110% (within ±10%). Overdelivery OK (earns extra revenue). Underdelivery penalized ($50-100/MWh shortfall).</li>
        <li><strong>Response Time:</strong> Time from dispatch signal to 90% of committed MW. Fast response (<5 min) earns premium. Slow response (>15 min) may be rejected for real-time markets.</li>
        <li><strong>Reliability:</strong> % of dispatch events successfully completed. Target: 95%+. Failures due to: communication loss, asset unavailability, customer opt-outs exceeding buffer.</li>
        <li><strong>Baseline Accuracy:</strong> VPP paid for load REDUCTION vs baseline. Baseline = average load on similar non-event days. Gaming risk: inflate baseline (run more load on non-event days) to exaggerate reduction. IESO uses regression models to detect gaming.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Real-World Event: Summer 2023 Ontario Heatwave</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Context:</strong> July 18-20, 2023. 3-day heatwave, temperatures 35-38°C. Peak demand forecast: 26,500 MW (record high). Available generation: 26,000 MW (Pickering Unit 7 unplanned outage, 500 MW loss). Shortfall: 500 MW.</li>
        <li><strong>IESO Action:</strong> Day-ahead dispatch (July 17, 4 PM) to 5 VPP platforms. Request: 300 MW reduction, 4-7 PM daily (July 18-20). Payment: $200/MWh (premium pricing due to emergency).</li>
        <li><strong>VPP Response:</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>Peak Perks (smart thermostats): Committed 120 MW, delivered 115 MW (96% performance). Pre-cooled 50,000 homes to 21°C before event, then disabled AC 4-7 PM (indoor temp rose to 24-26°C, within comfort range).</li>
            <li>PowerStream VPP (C&I batteries): Committed 100 MW, delivered 105 MW (105% performance). Discharged 1,200 commercial batteries. No customer opt-outs (contractual obligation).</li>
            <li>Solartility (solar+storage): Committed 50 MW, delivered 42 MW (84% performance—PENALTY). Shortfall due to: (1) Lower solar output than forecast (wildfire smoke reduced irradiance 20%), (2) 10 sites opted out (facility operations couldn't tolerate load reduction).</li>
            <li>EV FleetSync (V2G): Committed 30 MW, delivered 35 MW (117% performance). Discharged 5,000 EVs. High performance due to: fleet operators (delivery trucks, taxis) willing to delay charging for premium payment.</li>
          </ul>
        </li>
        <li><strong>Outcome:</strong> Total VPP delivery: 297 MW (vs 300 MW target, 99% accuracy). Combined with 200 MW import from Quebec → avoided rolling blackouts. Cost: $200/MWh × 297 MW × 9 hours (3 days) = $534,600. Alternative: emergency gas peakers at $500/MWh → would cost $1.3M. VPPs saved $800k.</li>
        <li><strong>Penalty:</strong> Solartility penalized for 8 MW shortfall (50 MW committed - 42 MW delivered). Penalty: 8 MW × $50/MWh × 9 hours = $3,600 (deducted from revenue).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Customer Experience During Dispatch:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Notification:</strong> SMS/email 24 hours before event (day-ahead). "Peak Perks event tomorrow 4-7 PM. Your AC will pre-cool, then cycle off during peak. Opt-out by 6 PM today if needed. Earn $25."</li>
        <li><strong>Pre-Event:</strong> 2-3 PM: Smart thermostat pre-cools home from 22°C to 19°C (store cold in building thermal mass). Customer notices nothing (AC running normally).</li>
        <li><strong>During Event:</strong> 4-7 PM: AC disabled or cycles 50% duty cycle (on 15 min, off 15 min). Indoor temp rises 22°C → 25°C. Most customers tolerate (saved $25, plus altruism—helping grid avoid blackouts).</li>
        <li><strong>Post-Event:</strong> 7 PM: Normal AC operation resumes. Home cools back to 22°C within 30-60 minutes. Customer receives payment confirmation: "$25 credited to account. Thank you for supporting the grid!"</li>
        <li><strong>Opt-Out Rate:</strong> Typical 5-15%. Higher during extreme heat (35°C+, customers prioritize comfort). VPP accounts for opt-outs via oversubscription (contract 140 MW to deliver 120 MW).</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Dispatch Fatigue:</strong> VPPs can't dispatch same assets every day—customers will opt-out. Rule of thumb: max 20-30 events/year per asset. High-frequency dispatch (daily) requires deep asset pool (10x oversubscription). Balance: revenue maximization vs customer satisfaction.</p>
      </div>
    `,
    relatedTopics: ['vpp.overview', 'vpp.aggregation', 'vpp.compensation'],
  },

  'vpp.compensation': {
    id: 'vpp.compensation',
    title: 'VPP Revenue Models and Customer Compensation',
    shortText: 'How VPPs earn revenue and distribute payments to participants',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">VPP Business Models</h3>
      <p class="mb-4">VPPs earn revenue from grid services (capacity, energy, regulation), then distribute to participants (asset owners) minus platform fee. Typical split: 60-80% to participants, 20-40% to VPP operator (covers software, operations, risk).</p>

      <h4 class="font-semibold mt-4 mb-2">Revenue Streams (VPP Operator Perspective):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Revenue Source</th>
            <th class="border px-2 py-1">Payment Structure</th>
            <th class="border px-2 py-1">Value (per MW)</th>
            <th class="border px-2 py-1">Volatility</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Capacity Auction</td>
            <td class="border px-2 py-1">$/MW-day (annual contract)</td>
            <td class="border px-2 py-1">$10-50/MW-day = $3,650-18,250/MW-year</td>
            <td class="border px-2 py-1">Low (predictable annual contract)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Energy Dispatch</td>
            <td class="border px-2 py-1">$/MWh delivered</td>
            <td class="border px-2 py-1">$100-200/MWh × 100 hours/year = $10k-20k/MW-year</td>
            <td class="border px-2 py-1">Medium (depends on dispatch frequency)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Regulation Service</td>
            <td class="border px-2 py-1">$/MW-hour (24/7 availability)</td>
            <td class="border px-2 py-1">$10-20/MW-hour × 8,760 hours = $87k-175k/MW-year</td>
            <td class="border px-2 py-1">Low (stable market prices)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Demand Charge Reduction (C&I)</td>
            <td class="border px-2 py-1">% of customer savings</td>
            <td class="border px-2 py-1">$15-25/kW-year × 1,000 kW = $15k-25k/MW-year</td>
            <td class="border px-2 py-1">Low (based on utility rate schedule)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Time-of-Use Arbitrage</td>
            <td class="border px-2 py-1">$/MWh spread (charge off-peak, discharge peak)</td>
            <td class="border px-2 py-1">$50-80/MWh × 1 cycle/day × 365 = $18k-29k/MW-year</td>
            <td class="border px-2 py-1">Medium (depends on price spread)</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Total Revenue Potential:</h4>
      <p class="mb-2">1 MW VPP (mix of batteries, EVs, thermostats) can earn:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Capacity:</strong> $10,000/year (low end, surplus market) to $50,000/year (tight market)</li>
        <li><strong>Energy:</strong> $15,000/year (20 dispatch events × $100/MWh × 1 MW × 4 hours)</li>
        <li><strong>Regulation:</strong> $100,000/year (if dedicated to fast frequency response)</li>
        <li><strong>Demand Charge:</strong> $20,000/year (for C&I customers)</li>
        <li><strong>Total:</strong> $45,000-$185,000 per MW per year (depends on market participation strategy)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Customer Compensation (Participant Perspective):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Residential Battery (10 kW, 13 kWh):</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>VPP Revenue: 0.01 MW × $50,000/MW-year = $500/year (total VPP earnings from this battery)</li>
            <li>Revenue Share: 70% to participant = $350/year</li>
            <li>Payout: $30/month direct deposit or bill credit</li>
            <li>Effort: Zero (fully automated, set-and-forget)</li>
          </ul>
        </li>
        <li><strong>Smart Thermostat (3 kW peak reduction):</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>VPP Revenue: 0.003 MW × $15,000/MW-year = $45/year (capacity + energy from 20 events)</li>
            <li>Revenue Share: 60% to participant = $27/year</li>
            <li>Bonus: $50 upfront (VPP subsidizes thermostat purchase)</li>
            <li>Total First Year: $77. Subsequent years: $27/year.</li>
          </ul>
        </li>
        <li><strong>Commercial Battery (200 kW, 400 kWh):</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>VPP Revenue: 0.2 MW × $100,000/MW-year = $20,000/year</li>
            <li>Revenue Share: 50% to participant = $10,000/year (lower % due to higher VPP operational complexity)</li>
            <li>Additional Value: Demand charge savings $5,000/year (self-benefit, not from VPP)</li>
            <li>Total: $15,000/year. Payback on $100k battery: 6-7 years (vs 10+ years without VPP).</li>
          </ul>
        </li>
        <li><strong>EV (15 kW bidirectional charger, V2G):</strong>
          <ul class="list-disc pl-5 mt-1">
            <li>VPP Revenue: 0.015 MW × $60,000/MW-year = $900/year</li>
            <li>Revenue Share: 80% to participant = $720/year (high % because customer bears battery degradation risk)</li>
            <li>Battery Degradation: ~1% extra degradation/year from V2G cycling. Cost: $200/year (replace battery 1 year earlier).</li>
            <li>Net Benefit: $720 - $200 = $520/year.</li>
          </ul>
        </li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Platform Fee Models:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Revenue Share (Most Common):</strong> VPP takes 20-40% of all revenues. Simple, aligns incentives (VPP earns more when participants earn more). Example: IESO Peak Perks takes 30%.</li>
        <li><strong>Subscription Fee:</strong> Flat $/month per asset. Predictable for VPP operator, but customer dislikes paying upfront. Rare in residential, common in C&I (e.g., $50/month per battery).</li>
        <li><strong>Hybrid:</strong> Small monthly fee ($5-10/month) + revenue share (15-25%). Covers VPP base costs, aligns upside. Example: Solartility charges $10/month + 20% revenue share.</li>
        <li><strong>Performance Fee:</strong> VPP takes fee only if performance targets met (e.g., 25% fee if >95% dispatch accuracy, 35% fee if <95%). Penalizes VPP for poor optimization. Complex but fairest.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Tax Implications (Canada):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>VPP Payments are Taxable Income:</strong> CRA treats VPP revenue as business income (if significant, >$10k/year) or other income (if small). Must report on tax return.</li>
        <li><strong>Residential Exception:</strong> VPP payments <$500/year often unreported (CRA de minimis threshold). But technically taxable.</li>
        <li><strong>Commercial:</strong> VPP revenue is business income. Offset by depreciation on battery (CCA Class 43.2, 50% declining balance). Effectively tax-neutral in early years.</li>
        <li><strong>HST/GST:</strong> VPP operators must charge HST on platform fees (13-15% depending on province). Participant receives HST credit if registered.</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 ROI Comparison:</strong> Residential battery without VPP: 15-20 year payback (solar self-consumption + backup only). With VPP: 8-12 year payback (add $300-500/year VPP revenue). Commercial battery without VPP: 10-15 years. With VPP: 5-8 years. VPP participation cuts payback time by ~40-50%.</p>
      </div>
    `,
    relatedTopics: ['vpp.overview', 'vpp.dispatch'],
  },
};
