/**
 * Help content: Scenarios & Case Studies
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const SCENARIOS_CONTENT: Record<string, HelpContentItem> = {
  // ==================== IMPACT METRICS ====================

  'impact.metrics.overview': {
    id: 'impact.metrics.overview',
    title: 'Impact Metrics Dashboard',
    shortText: 'Track ESG and sustainability KPIs',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Impact Metrics Dashboard</h3>
      <p class="mb-4">Real-time tracking of <strong>ESG and sustainability KPIs</strong> across all monitored energy projects.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Key Metrics:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Emissions Avoided</strong> - Total GHG emissions prevented through clean energy projects</li>
        <li><strong>Clean Energy Jobs</strong> - Direct and indirect employment in tracked projects</li>
        <li><strong>Indigenous Equity</strong> - Average ownership stake in partnership projects</li>
        <li><strong>Investment Mobilized</strong> - Capital deployed in clean energy infrastructure</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Methodology:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li>Emissions factors from ECCC National Inventory Report 2024</li>
        <li>Jobs data from StatsCan LMIA reports and industry surveys</li>
        <li>Investment data from project filings and public announcements</li>
      </ul>
      
      <div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Export:</strong> Download metrics as CSV for your own analysis and reporting.</p>
      </div>
    `,
    relatedTopics: ['indigenous.case.studies', 'ai.demand.scenario'],
  },

  // ==================== AI DEMAND SCENARIO ====================

  'ai.demand.scenario': {
    id: 'ai.demand.scenario',
    title: 'AI Data Center Demand Scenario',
    shortText: 'Model AI infrastructure grid impacts',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">AI Data Center Demand Scenario</h3>
      <p class="mb-4">Model the impact of <strong>AI data center growth</strong> on Canada's electricity grid.</p>
      
      <h4 class="font-semibold mt-4 mb-2">How to Use:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li>Adjust the <strong>slider</strong> to set projected AI demand (1-100 GW)</li>
        <li>Select a <strong>target year</strong> (2030, 2035, 2040, 2050)</li>
        <li>View <strong>grid stress</strong>, clean power requirements, and investment needs</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Key Outputs:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Clean Firm Power</strong> - 24/7 baseload generation required</li>
        <li><strong>Emissions Risk</strong> - CO₂ if met with gas generation</li>
        <li><strong>Investment Needed</strong> - Capital for clean energy infrastructure</li>
        <li><strong>Jobs Created</strong> - Employment from new energy projects</li>
      </ul>
      
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>📈 Context:</strong> IEA projects global AI data center demand could reach 362 GW by 2035. BC has already paused new data center connections due to grid constraints.</p>
      </div>
    `,
    relatedTopics: ['crisis.scenario.simulator', 'impact.metrics.overview'],
  },

  // ==================== CRISIS SCENARIO SIMULATOR ====================

  'crisis.scenario.simulator': {
    id: 'crisis.scenario.simulator',
    title: 'Crisis Scenario Simulator',
    shortText: 'Model grid resilience under emergencies',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Crisis Scenario Simulator</h3>
      <p class="mb-4">Simulate <strong>grid resilience</strong> under various emergency scenarios.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Available Scenarios:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Major Wildfire</strong> - Transmission damage and evacuations</li>
        <li><strong>Extreme Heat Dome</strong> - Record cooling demand surge</li>
        <li><strong>Polar Vortex</strong> - Heating demand and gas constraints</li>
        <li><strong>Grid Cyberattack</strong> - Control system compromise</li>
        <li><strong>Pipeline Disruption</strong> - Gas supply outage</li>
        <li><strong>Cascading Failure</strong> - Major blackout event</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Simulation Outputs:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Blackout Risk</strong> - Low, Moderate, High, or Critical</li>
        <li><strong>Customers Affected</strong> - Estimated outage impact</li>
        <li><strong>Economic Impact</strong> - Lost load value in $M</li>
        <li><strong>Recovery Time</strong> - Estimated restoration period</li>
      </ul>
      
      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Note:</strong> Simulations are based on historical precedents and grid modeling. Actual outcomes may vary based on specific conditions and response measures.</p>
      </div>
    `,
    relatedTopics: ['ai.demand.scenario', 'impact.metrics.overview'],
  },

  // ==================== INDIGENOUS CASE STUDIES ====================

  'indigenous.case.studies': {
    id: 'indigenous.case.studies',
    title: 'Indigenous Partnership Case Studies',
    shortText: 'Real-world Indigenous energy success stories',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Indigenous Partnership Success Stories</h3>
      <p class="mb-4">Explore <strong>real-world examples</strong> of successful Indigenous energy partnerships across Canada.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Featured Projects:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Cedar LNG</strong> - Haisla Nation's 50% equity stake in LNG facility</li>
        <li><strong>Wataynikaneyap Power</strong> - 24 First Nations connecting 17 communities to grid</li>
        <li><strong>Cowessess Solar</strong> - 100% Indigenous-owned utility-scale solar</li>
        <li><strong>Tu Deh-Kah Geothermal</strong> - Canada's first Indigenous geothermal project</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Key Metrics Tracked:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li>Equity ownership percentage</li>
        <li>Jobs created for community members</li>
        <li>Revenue sharing and community benefits</li>
        <li>Environmental impact (diesel eliminated, emissions avoided)</li>
      </ul>
      
      <div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 mt-4">
        <p class="text-sm"><strong>🤝 Partnership Model:</strong> These projects demonstrate that Indigenous communities can be majority owners and leaders in major energy infrastructure, not just stakeholders.</p>
      </div>
    `,
    relatedTopics: ['impact.metrics.overview', 'page.incubators.overview'],
  },
};
