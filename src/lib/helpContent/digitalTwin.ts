/**
 * Help content: Digital Twin
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const DIGITAL_TWIN_CONTENT: Record<string, HelpContentItem> = {
  // ========================================
  // Digital Twin Dashboard Topics
  // ========================================

  'digitaltwin.overview': {
    id: 'digitaltwin.overview',
    title: 'Digital Twin Energy Ecosystem',
    shortText:
      "Virtual replica of Canada's energy system for real-time simulation and predictive modeling",
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">What is a Digital Twin?</h3>
      <p class="mb-4">A digital twin is a virtual replica of a physical system that mirrors real-world behavior in real-time. For energy systems, it integrates live data from thousands of sensors, weather stations, market signals, and grid operations to create a continuously-updated simulation. Think of it as a "flight simulator" for the entire Canadian energy grid.</p>

      <h4 class="font-semibold mt-4 mb-2">Canadian Digital Twin Applications (2024):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead class="bg-slate-100">
          <tr>
            <th class="border px-3 py-2 text-left">Organization</th>
            <th class="border px-3 py-2 text-left">Scope</th>
            <th class="border px-3 py-2 text-left">Capabilities</th>
            <th class="border px-3 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2"><strong>IESO Digital Twin</strong></td>
            <td class="border px-3 py-2">Ontario grid (30 GW)</td>
            <td class="border px-3 py-2">Day-ahead forecasting, renewable integration, contingency analysis</td>
            <td class="border px-3 py-2"><span class="text-green-600 font-medium">Operational</span></td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>AESO Model</strong></td>
            <td class="border px-3 py-2">Alberta (17 GW)</td>
            <td class="border px-3 py-2">Energy-only market simulation, wind curtailment prediction</td>
            <td class="border px-3 py-2"><span class="text-blue-600 font-medium">Pilot</span></td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Hydro-Québec</strong></td>
            <td class="border px-3 py-2">Québec (37 GW hydro)</td>
            <td class="border px-3 py-2">Reservoir optimization, export market strategy, ice storm resilience</td>
            <td class="border px-3 py-2"><span class="text-green-600 font-medium">Advanced</span></td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>BC Hydro Twin</strong></td>
            <td class="border px-3 py-2">BC (14 GW)</td>
            <td class="border px-3 py-2">Wildfire impact modeling, run-of-river forecasting</td>
            <td class="border px-3 py-2"><span class="text-blue-600 font-medium">Development</span></td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Key Capabilities:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Real-Time Mirroring:</strong> System state updates every 4 seconds from SCADA, 99.5% accuracy</li>
        <li><strong>Predictive Forecasting:</strong> 1-hour to 7-day predictions (±5-12% MAPE)</li>
        <li><strong>What-If Scenarios:</strong> Test policy changes without touching real grid</li>
        <li><strong>Optimization:</strong> AI recommends dispatch decisions to minimize cost/emissions</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Real Impact:</strong> IESO's digital twin predicted June 2022 heatwave peak (26.1 GW actual vs 26.2 GW forecast, 0.4% error), enabling proactive 1,500 MW emergency imports that avoided rolling blackouts.</p>
      </div>
    `,
    relatedTopics: ['digitaltwin.simulation', 'digitaltwin.stress', 'digitaltwin.scenarios'],
  },

  'digitaltwin.simulation': {
    id: 'digitaltwin.simulation',
    title: 'Real-Time System Simulation',
    shortText:
      'Continuous modeling of grid operations with physics-based accuracy and AI forecasting',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">How Digital Twin Simulation Works</h3>
      <p class="mb-4">The digital twin runs two parallel simulations: (1) Real-Time Mirror tracking current grid state with 4-second updates, and (2) Predictive Forecast projecting 1-168 hours ahead using physics models + AI.</p>

      <h4 class="font-semibold mt-4 mb-2">Key Metrics Tracked in Real-Time:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>System Frequency:</strong> Target 60.00 Hz (±0.05 Hz normal). Twin predicts 10 seconds ahead with ±0.01 Hz accuracy</li>
        <li><strong>Reserve Margin:</strong> Minimum thresholds: 700 MW spinning, 1,100 MW 10-min, 1,500 MW 30-min (Ontario)</li>
        <li><strong>Transmission Loading:</strong> Flags lines approaching 95% capacity 15 minutes early</li>
        <li><strong>Renewable Output:</strong> Actual vs. forecast every 5 minutes. 8.2% MAE (Ontario 2023)</li>
        <li><strong>Economic Dispatch:</strong> Current cost vs. optimal. Identifies $45k/hour average savings</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Simulation Speed Modes:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>1x (Real-Time):</strong> Matches actual grid, used for operator training and monitoring</li>
        <li><strong>2x-8x (Fast-Forward):</strong> Simulate 24 hours in 3-12 hours for day-ahead planning</li>
        <li><strong>100x+ (Batch):</strong> Year-long simulations in days for long-term climate analysis</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Accuracy Benchmarks (IESO 2023):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead class="bg-slate-100">
          <tr>
            <th class="border px-3 py-2 text-left">Metric</th>
            <th class="border px-3 py-2 text-left">1-Hour</th>
            <th class="border px-3 py-2 text-left">24-Hour</th>
            <th class="border px-3 py-2 text-left">7-Day</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2">Demand</td>
            <td class="border px-3 py-2">±1.2%</td>
            <td class="border px-3 py-2">±3.1%</td>
            <td class="border px-3 py-2">±5.8%</td>
          </tr>
          <tr>
            <td class="border px-3 py-2">Wind</td>
            <td class="border px-3 py-2">±6.5%</td>
            <td class="border px-3 py-2">±12.1%</td>
            <td class="border px-3 py-2">±18.3%</td>
          </tr>
          <tr>
            <td class="border px-3 py-2">Solar</td>
            <td class="border px-3 py-2">±4.2%</td>
            <td class="border px-3 py-2">±8.7%</td>
            <td class="border px-3 py-2">±14.2%</td>
          </tr>
        </tbody>
      </table>
    `,
    relatedTopics: ['digitaltwin.overview', 'digitaltwin.stress', 'digitaltwin.scenarios'],
  },

  'digitaltwin.stress': {
    id: 'digitaltwin.stress',
    title: 'Stress Testing & Resilience Analysis',
    shortText: 'Simulating extreme events to identify vulnerabilities and test emergency response',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Grid Stress Testing with Digital Twins</h3>
      <p class="mb-4">Stress tests simulate extreme but plausible events that could threaten grid reliability. Unlike real emergencies, digital twin testing is consequence-free, allowing operators to identify vulnerabilities and practice response protocols.</p>

      <h4 class="font-semibold mt-4 mb-2">Common Stress Test Scenarios:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Extreme Cold:</strong> Temperature -35°C, heating demand +40%, wind generation -60%. Example: Jan 2024 Alberta polar vortex (27 GW peak)</li>
        <li><strong>Extreme Heat:</strong> 40°C+, AC demand +35%, thermal plant derating. Example: BC 2021 heat dome (49.6°C Lytton)</li>
        <li><strong>Cyber Attack:</strong> SCADA compromise, false data injection, ransomware. Example: 2023 NERC GridEx VI simulation</li>
        <li><strong>Equipment Failure:</strong> Major transformer failure, cascading outage. Example: 2003 Northeast blackout (50M affected)</li>
        <li><strong>Renewable Intermittency:</strong> Sudden wind drop (3 GW in 15 min). Example: Alberta Feb 2023 (4.2 GW → 380 MW in 3 hours)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Resilience Scoring (0-100):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Load Shed:</strong> MW involuntary curtailment (Target: 0 MW)</li>
        <li><strong>Frequency Deviation:</strong> Max Hz excursion (Acceptable: &lt;0.5 Hz, Critical: &gt;1.0 Hz)</li>
        <li><strong>Voltage Violations:</strong> Buses outside ±5% nominal (Target: 0)</li>
        <li><strong>Recovery Time:</strong> Minutes to normal (Target: &lt;30 min, Acceptable: &lt;2 hours)</li>
        <li><strong>Economic Impact:</strong> Estimated cost $500k-$50M</li>
      </ul>

      <div class="bg-orange-50 border-l-4 border-orange-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Real Example:</strong> Ontario 2023 cyber attack simulation disabled 3,500 MW generation during peak. Result: 59.4 Hz frequency drop, 1,200 MW auto-shed, 2,100 MW emergency imports, 47-min recovery. Resilience Score: 72/100 (identified need for faster import ramps).</p>
      </div>
    `,
    relatedTopics: ['digitaltwin.overview', 'digitaltwin.simulation', 'digitaltwin.scenarios'],
  },

  'digitaltwin.scenarios': {
    id: 'digitaltwin.scenarios',
    title: 'Scenario Analysis & What-If Planning',
    shortText: 'Testing policy changes, infrastructure investments, and future energy pathways',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Strategic Planning with Digital Twins</h3>
      <p class="mb-4">Beyond real-time operations, digital twins enable "what-if" scenario analysis for long-term planning. Test the impact of new policies, infrastructure investments, or technology deployments before committing billions of dollars.</p>

      <h4 class="font-semibold mt-4 mb-2">Common Scenario Use Cases:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead class="bg-slate-100">
          <tr>
            <th class="border px-3 py-2 text-left">Use Case</th>
            <th class="border px-3 py-2 text-left">Question</th>
            <th class="border px-3 py-2 text-left">Decision Impact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-3 py-2"><strong>Renewable Integration</strong></td>
            <td class="border px-3 py-2">Can we add 2 GW wind safely?</td>
            <td class="border px-3 py-2">$2-4B procurement</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Transmission</strong></td>
            <td class="border px-3 py-2">Will 500 kV line reduce congestion 30%?</td>
            <td class="border px-3 py-2">$500M-3B build decision</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Electrification</strong></td>
            <td class="border px-3 py-2">How much will EVs increase peak demand?</td>
            <td class="border px-3 py-2">GW-scale capacity planning</td>
          </tr>
          <tr>
            <td class="border px-3 py-2"><strong>Storage</strong></td>
            <td class="border px-3 py-2">Optimal MW/MWh of batteries?</td>
            <td class="border px-3 py-2">$150-300/kWh procurement</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Scenario Analysis Workflow:</h4>
      <ol class="list-decimal pl-5 space-y-1 mb-4">
        <li>Define baseline (current system state)</li>
        <li>Apply changes (e.g., add 500 MW wind, retire 300 MW coal)</li>
        <li>Run 8,760-hour simulation with Monte Carlo weather</li>
        <li>Compare metrics (cost, emissions, reliability, curtailment)</li>
        <li>Sensitivity analysis (optimistic/pessimistic assumptions)</li>
        <li>Present findings with uncertainty bounds</li>
      </ol>

      <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Case Study:</strong> IESO 2023 analyzed 500 MW / 2,000 MWh battery for GTA. Scenario B (4-hour duration) showed -4.6% dispatch cost, -50% curtailment, $650M capex, 5.5-year payback. Project awarded Dec 2023.</p>
      </div>
    `,
    relatedTopics: ['digitaltwin.overview', 'digitaltwin.simulation', 'digitaltwin.stress'],
  },
};
