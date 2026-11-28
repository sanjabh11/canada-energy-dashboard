/**
 * Help content: Grid Optimization
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const GRID_CONTENT: Record<string, HelpContentItem> = {
  // ==================== GRID OPTIMIZATION (Phase 4.1) ====================

  'grid.optimization.overview': {
    id: 'grid.optimization.overview',
    title: 'Grid Optimization Dashboard',
    shortText: 'Real-time grid balancing and stability monitoring',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Balancing Supply and Demand in Real-Time</h3>
      <p class="mb-4">Grid operators (like IESO in Ontario) must balance electricity supply and demand every second while maintaining 60 Hz frequency and stable voltage. This dashboard tracks grid health and optimization recommendations.</p>

      <h4 class="font-semibold mt-4 mb-2">Key Metrics Monitored:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Frequency (Hz):</strong> Must stay 59.9-60.1 Hz (±0.1 Hz tolerance). Deviations indicate supply-demand imbalance</li>
        <li><strong>Voltage (kV):</strong> Transmission voltage stability (230 kV, 500 kV lines). Low voltage = equipment damage risk</li>
        <li><strong>Congestion Index:</strong> 0-1 scale measuring transmission line overload. >0.7 = high congestion, curtailment needed</li>
        <li><strong>Reserve Margin:</strong> Spare capacity available (target: 15-20%). <10% = emergency conditions</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Why Grid Optimization Matters:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Reliability:</strong> Prevents blackouts from overloads or frequency deviations</li>
        <li><strong>Cost Savings:</strong> Optimized dispatch saves $50-100M/year (IESO estimate)</li>
        <li><strong>Renewable Integration:</strong> Manages variability of wind/solar (ramping, curtailment)</li>
        <li><strong>Emergency Response:</strong> Automated load shedding if frequency drops below 59.5 Hz</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Ontario IESO Grid Control:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Control Room:</strong> 24/7 monitoring at Mississauga headquarters</li>
        <li><strong>5-Minute Dispatch:</strong> Updates generation every 5 minutes based on forecasts</li>
        <li><strong>Automatic Generation Control (AGC):</strong> Real-time adjustments to maintain 60 Hz</li>
        <li><strong>Operating Reserve:</strong> 10-minute (1,000 MW) and 30-minute (1,500 MW) reserves</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>⚡ Real-Time Challenge:</strong> On hot summer days, Ontario demand peaks at 24,000 MW. IESO must coordinate 200+ generators to match this exactly while keeping frequency stable.</p>
      </div>
    `,
    relatedTopics: ['grid.demand-response', 'grid.congestion'],
  },

  'grid.demand-response': {
    id: 'grid.demand-response',
    title: 'Demand Response Programs',
    shortText: 'Reduce demand instead of adding supply during peak hours',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Flexibility from the Demand Side</h3>
      <p class="mb-4">Demand response (DR) pays consumers to reduce electricity use during peak hours or emergencies. Cheaper than building new power plants ($50/kW vs $1,500/kW for gas peaker).</p>

      <h4 class="font-semibold mt-4 mb-2">IESO Demand Response Programs:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Program</th>
            <th class="border px-2 py-1">Capacity</th>
            <th class="border px-2 py-1">Payment</th>
            <th class="border px-2 py-1">Use Case</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Capacity Auction DR</td>
            <td class="border px-2 py-1">~500 MW</td>
            <td class="border px-2 py-1">$100-200/kW-year</td>
            <td class="border px-2 py-1">Summer/winter peak reliability</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Emergency DR</td>
            <td class="border px-2 py-1">1,000 MW</td>
            <td class="border px-2 py-1">$200-400/MWh</td>
            <td class="border px-2 py-1">Grid emergencies (frequency <59.7 Hz)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Industrial Conservation Initiative</td>
            <td class="border px-2 py-1">2,500 MW</td>
            <td class="border px-2 py-1">Capacity charge credit</td>
            <td class="border px-2 py-1">Large industrial load shifting (>5 MW)</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Who Participates:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Industrial:</strong> Mines, steel mills, auto plants (can reduce 10-50 MW each). Example: Stelco Hamilton reduces furnaces during peak.</li>
        <li><strong>Commercial:</strong> Data centers, grocery stores (HVAC setback, lighting dim). Example: Loblaws reduces freezer temp 2°C for 2 hours.</li>
        <li><strong>Residential (Pilot):</strong> Smart thermostats (Ecobee, Nest) pre-cool homes before peak, raise temp 2°C during peak. Save $50-100/year.</li>
        <li><strong>Aggregators:</strong> Companies like EnerNOC, Voltus bundle small loads into large DR resources (100+ MW portfolios).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Technology Enablers:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Smart Meters:</strong> Ontario has 5M+ smart meters enabling time-of-use pricing and DR signals</li>
        <li><strong>IoT Controls:</strong> Automated response to grid signals (no human intervention needed)</li>
        <li><strong>Battery Storage:</strong> Virtual power plants (VPPs) discharge during peak = demand reduction</li>
        <li><strong>EV Charging Management:</strong> Delay charging from 5-9 PM to midnight-6 AM (time-of-use savings)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Economic Impact:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>System Savings:</strong> 1,000 MW DR avoids $1.5B gas peaker plant construction</li>
        <li><strong>Market Suppression:</strong> DR lowers wholesale prices during peak (reducing price spikes from $200 to $100/MWh)</li>
        <li><strong>Participant Revenue:</strong> Large industrial facility can earn $500K-2M/year from DR programs</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Success Story:</strong> July 2023 heatwave, Ontario demand hit 23,800 MW. DR programs reduced load by 1,200 MW (equivalent to a large gas plant), preventing emergency alerts.</p>
      </div>
    `,
    relatedTopics: ['grid.optimization.overview', 'grid.frequency-voltage'],
  },

  'grid.congestion': {
    id: 'grid.congestion',
    title: 'Transmission Congestion Management',
    shortText: 'Managing bottlenecks in the transmission network',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Transmission Bottlenecks and Solutions</h3>
      <p class="mb-4">Congestion occurs when cheap power (e.g., northern hydro) cannot flow to demand centers (e.g., Toronto) due to transmission line limits. Results in curtailment (wasted renewables) and higher costs (local expensive gas generation).</p>

      <h4 class="font-semibold mt-4 mb-2">Ontario's Major Congestion Zones:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>North-to-South Interface:</strong> 5,000 MW limit from northern hydro/nuclear to southern demand. Frequently congested during high hydro output.</li>
        <li><strong>Bruce-to-GTA:</strong> Nuclear generation (6,400 MW Bruce) must flow east on 500 kV lines. Congestion when Bruce at full output + low GTA demand.</li>
        <li><strong>Southwest Ontario Wind:</strong> 2,000+ MW wind capacity but only 1,500 MW export capacity. Curtailment common on windy, low-demand days.</li>
        <li><strong>Ottawa Valley:</strong> Radial transmission (no loop) = reliability issues + congestion. $1B+ Ottawa River transmission project proposed.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Congestion Management Tools:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Tool</th>
            <th class="border px-2 py-1">How It Works</th>
            <th class="border px-2 py-1">Cost/Impact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Curtailment</td>
            <td class="border px-2 py-1">Reduce wind/solar output to stay within line limits</td>
            <td class="border px-2 py-1">Wasted energy: 2-5% of renewable output in Ontario</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Re-Dispatch</td>
            <td class="border px-2 py-1">Turn down cheap generator, turn up expensive local generator</td>
            <td class="border px-2 py-1">$50-200M/year in extra costs (Ontario)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Transmission Upgrades</td>
            <td class="border px-2 py-1">Build new lines or uprate existing (e.g., 230 kV → 500 kV)</td>
            <td class="border px-2 py-1">$1-3M/km, 5-10 years to build</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Battery Storage</td>
            <td class="border px-2 py-1">Store excess power during congestion, discharge locally when needed</td>
            <td class="border px-2 py-1">$300-500/kWh CAPEX, but avoids $1B+ transmission</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Real-World Examples:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Southwest Ontario Wind Curtailment:</strong> In 2022, 150 GWh wind curtailed (enough for 15,000 homes annually). IESO paid generators $20M not to produce.</li>
        <li><strong>Bruce Power Congestion:</strong> Summer 2023 outage of one 500 kV line forced Bruce to reduce output by 1,000 MW (lost revenue: $2M/day).</li>
        <li><strong>Storage Solution - Oneida Energy Storage:</strong> 250 MW / 1,000 MWh battery near London, ON. Stores excess Bruce nuclear, discharges during GTA peak. Reduces congestion costs $30M/year.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Locational Marginal Pricing (LMP):</h4>
      <p class="mb-2">Alternative to current Ontario pricing (single zone). LMP prices electricity differently by location:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Congested Zone:</strong> Higher prices reflect scarcity (e.g., $120/MWh in GTA during congestion)</li>
        <li><strong>Surplus Zone:</strong> Lower prices reflect excess supply (e.g., $40/MWh in northern Ontario with excess hydro)</li>
        <li><strong>Price Signal:</strong> Incentivizes load (data centers, industry) to locate near cheap power, not in congested zones</li>
        <li><strong>Used by:</strong> Alberta, PJM (US), ERCOT (Texas). Ontario considering for 2026+ market redesign</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Challenge:</strong> Ontario needs $25-30B transmission investment by 2035 to integrate 18 GW renewable procurement. But new lines take 10+ years due to permitting, Indigenous consultation, landowner negotiations.</p>
      </div>
    `,
    relatedTopics: ['grid.optimization.overview', 'grid.demand-response'],
  },

  'grid.frequency-voltage': {
    id: 'grid.frequency-voltage',
    title: 'Frequency and Voltage Control',
    shortText: 'Maintaining 60 Hz frequency and stable voltage for grid reliability',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Grid Stability Fundamentals</h3>
      <p class="mb-4">Frequency and voltage are the two critical parameters grid operators must control every second. Deviations cause equipment damage, blackouts, and cascading failures.</p>

      <h4 class="font-semibold mt-4 mb-2">Frequency Control (60 Hz ± 0.1 Hz):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Frequency</th>
            <th class="border px-2 py-1">Cause</th>
            <th class="border px-2 py-1">Grid Response</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">60.1-60.2 Hz (High)</td>
            <td class="border px-2 py-1">Generation > Demand</td>
            <td class="border px-2 py-1">Reduce generation (AGC signal to plants)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">59.8-59.9 Hz (Low)</td>
            <td class="border px-2 py-1">Demand > Generation</td>
            <td class="border px-2 py-1">Increase generation or shed non-critical load</td>
          </tr>
          <tr>
            <td class="border px-2 py-1 bg-yellow-100">59.5-59.7 Hz</td>
            <td class="border px-2 py-1">Major generator trip</td>
            <td class="border px-2 py-1">Emergency reserves activated (10-min response)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1 bg-red-100"><59.5 Hz</td>
            <td class="border px-2 py-1">Severe imbalance</td>
            <td class="border px-2 py-1">Automatic load shedding (blackout zones to save system)</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Three Levels of Frequency Response:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Primary (Inertial Response - 0-5 sec):</strong> Synchronous generators (nuclear, hydro, gas) naturally slow down when load increases, releasing kinetic energy. Wind/solar have NO inertia (inverter-based).</li>
        <li><strong>Secondary (AGC - 5 sec to 10 min):</strong> Automatic Generation Control adjusts gas turbines, hydro output to restore 60 Hz. IESO uses AGC on ~50 generators.</li>
        <li><strong>Tertiary (Manual Dispatch - 10+ min):</strong> Operators start additional units or call DR programs to restore reserves.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Voltage Control (Maintaining kV Ranges):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Transmission Voltage:</strong> 230 kV, 500 kV lines must stay within ±5% (e.g., 500 kV line: 475-525 kV tolerance)</li>
        <li><strong>Tools:</strong> Capacitor banks (boost voltage), reactors (reduce voltage), transformer tap changers, generator excitation control</li>
        <li><strong>Low Voltage Risk:</strong> Equipment damage, voltage collapse (cascading blackout like 2003 Northeast blackout)</li>
        <li><strong>High Voltage Risk:</strong> Insulation breakdown, transformer overheating</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Renewable Integration Challenges:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Low Inertia:</strong> Ontario currently 30% renewables. At 50%+ renewables, loss of synchronous generator inertia = faster frequency drops.</li>
        <li><strong>Solution 1 - Synthetic Inertia:</strong> Program wind/solar inverters to mimic inertia response (fast frequency support from batteries/wind).</li>
        <li><strong>Solution 2 - Grid-Forming Inverters:</strong> Next-gen technology allows batteries to create voltage/frequency independently (no synchronous generator needed).</li>
        <li><strong>Solution 3 - Synchronous Condensers:</strong> Spinning machines (no fuel) that provide inertia. AESO (Alberta) installing 4 units for wind integration.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Case Study: 2003 Northeast Blackout:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Root Cause:</strong> Ohio transmission line sagged into tree → tripped → cascading voltage collapse</li>
        <li><strong>Impact:</strong> 50M people, 8 US states + Ontario, $6B economic loss</li>
        <li><strong>Lessons:</strong> Led to mandatory NERC reliability standards, improved voltage monitoring, tree-trimming requirements</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>🔧 Operator Action:</strong> If Bruce Power (6,400 MW) suddenly trips offline, frequency drops from 60.0 to 59.6 Hz in 3 seconds. AGC must dispatch 6,400 MW reserves within 10 minutes or blackouts begin.</p>
      </div>
    `,
    relatedTopics: ['grid.optimization.overview', 'grid.congestion'],
  },
};
