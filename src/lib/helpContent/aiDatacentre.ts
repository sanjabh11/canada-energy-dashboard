/**
 * Help content: AI Data Centres
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const AI_DATACENTRE_CONTENT: Record<string, HelpContentItem> = {
  // ==================== AI DATA CENTRES ====================

  'ai-datacentre.overview': {
    id: 'ai-datacentre.overview',
    title: 'AI Data Centre Energy Dashboard',
    shortText: 'Track AI data centre power consumption and grid impact',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">AI Data Centres & Energy</h3>
      <p class="mb-4">AI Data Centres are massive computing facilities that train and run artificial intelligence models. They consume enormous amounts of electricity!</p>

      <h4 class="font-semibold mt-4 mb-2">Why AI Uses So Much Power:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>GPUs (Graphics Processing Units)</strong> - Each GPU can use 300-700 watts of power, and data centres have thousands of them</li>
        <li><strong>Cooling Systems</strong> - All that computing generates massive heat, requiring 25-35% of total energy just for cooling</li>
        <li><strong>24/7 Operation</strong> - Unlike offices, data centres never shut down</li>
        <li><strong>Training Large Models</strong> - Training one AI model like GPT-3 uses ~1,300 MWh (enough to power 120 homes for a year)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">What This Dashboard Shows:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Total AI data centre capacity in Alberta and other provinces</li>
        <li>AESO interconnection queue (projects waiting to connect to the grid)</li>
        <li>Phase 1 allocation status (1,200 MW government limit)</li>
        <li>Power Usage Effectiveness (PUE) - efficiency metric</li>
        <li>Grid impact as percentage of peak demand</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Alberta's $100B Strategy:</strong> Alberta is positioning itself as Canada's AI hub with cheap electricity from natural gas and renewables. This dashboard tracks the massive grid expansion needed to support it!</p>
      </div>
    `,
    relatedTopics: ['ai-datacentre.pue', 'ai-datacentre.queue', 'ai-datacentre.phase1'],
  },

  'ai-datacentre.pue': {
    id: 'ai-datacentre.pue',
    title: 'Power Usage Effectiveness (PUE)',
    shortText: 'Efficiency metric for data centres',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">What is PUE?</h3>
      <p class="mb-4"><strong>Power Usage Effectiveness (PUE)</strong> measures how efficiently a data centre uses energy. It's the ratio of total facility power to computing power.</p>

      <h4 class="font-semibold mt-4 mb-2">How PUE Works:</h4>
      <div class="bg-slate-100 p-3 rounded mb-4 font-mono text-sm">
        PUE = Total Facility Power / IT Equipment Power
      </div>

      <h4 class="font-semibold mt-4 mb-2">Understanding PUE Values:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>PUE = 1.0 (Perfect)</strong> - Impossible! Would mean zero overhead for cooling, lighting, etc.</li>
        <li><strong>PUE = 1.2 (Excellent)</strong> - High efficiency. Google/Microsoft hyperscale facilities</li>
        <li><strong>PUE = 1.5 (Good)</strong> - Industry average for modern data centres</li>
        <li><strong>PUE = 2.0 (Poor)</strong> - For every 1W of computing, you waste 1W on overhead</li>
        <li><strong>PUE = 3.0+ (Bad)</strong> - Old facilities, inefficient cooling</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">How to Improve PUE:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Free Air Cooling</strong> - Use cold outdoor air (works great in Canada!)</li>
        <li><strong>Hot Aisle/Cold Aisle</strong> - Smart airflow management</li>
        <li><strong>Liquid Cooling</strong> - Direct cooling for high-density GPU racks</li>
        <li><strong>Waste Heat Recovery</strong> - Use excess heat for nearby buildings</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🌍 Canadian Advantage:</strong> Canada's cold climate is perfect for data centres! Microsoft's Quebec facility achieves PUE 1.12 using 99% hydro power and natural cooling.</p>
      </div>
    `,
    relatedTopics: ['ai-datacentre.overview', 'ai-datacentre.cooling'],
  },

  'ai-datacentre.queue': {
    id: 'ai-datacentre.queue',
    title: 'AESO Interconnection Queue',
    shortText: 'Projects waiting to connect to Alberta grid',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">What is the Interconnection Queue?</h3>
      <p class="mb-4">The <strong>AESO (Alberta Electric System Operator) queue</strong> is a list of all energy projects waiting to connect to Alberta's electrical grid.</p>

      <h4 class="font-semibold mt-4 mb-2">Why Projects Queue:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Grid Capacity Limits</strong> - Can't add infinite load without upgrades</li>
        <li><strong>Study Requirements</strong> - Must analyze impact on grid stability</li>
        <li><strong>Transmission Upgrades</strong> - New lines and substations take years to build</li>
        <li><strong>Phase 1 Limit</strong> - Alberta capped initial approvals at 1,200 MW</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Queue Breakdown:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Total Queue:</strong> 10+ GW requested (massive!)</li>
        <li><strong>AI Data Centres:</strong> 30-40% of total queue capacity</li>
        <li><strong>Renewable Energy:</strong> Wind and solar projects</li>
        <li><strong>Bitcoin Mining:</strong> Also energy-intensive</li>
        <li><strong>Industrial Loads:</strong> Oil sands, manufacturing</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Study Phases:</h4>
      <ol class="list-decimal pl-5 space-y-1 mb-4">
        <li><strong>Scoping Assessment</strong> - Initial feasibility (2-6 months)</li>
        <li><strong>Facility Study</strong> - Detailed impact analysis (6-12 months)</li>
        <li><strong>System Impact Study</strong> - Grid-wide effects (12+ months)</li>
        <li><strong>Approval & Construction</strong> - Build transmission upgrades (2-5 years)</li>
      </ol>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Grid Pressure:</strong> The queue is now over 80% of Alberta's peak demand (12,100 MW). This requires significant grid expansion.</p>
      </div>
    `,
    relatedTopics: ['ai-datacentre.phase1', 'ai-datacentre.overview'],
  },

  'ai-datacentre.phase1': {
    id: 'ai-datacentre.phase1',
    title: 'Phase 1 Allocation (1,200 MW Limit)',
    shortText: 'Government cap on initial data centre approvals',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Why the 1,200 MW Limit?</h3>
      <p class="mb-4">In 2024, Alberta's government imposed a <strong>Phase 1 limit of 1,200 MW</strong> for new large load connections to prevent grid instability while infrastructure catches up.</p>

      <h4 class="font-semibold mt-4 mb-2">The Problem:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Too Much, Too Fast</strong> - Over 10 GW of requests in 2 years (83% of peak demand!)</li>
        <li><strong>Grid Not Ready</strong> - Transmission lines and substations can't handle it</li>
        <li><strong>Reliability Risk</strong> - Adding too much load too quickly could cause blackouts</li>
        <li><strong>Fairness</strong> - Need orderly process instead of first-come-first-served chaos</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Phase 1 Allocation Status:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Total Limit:</strong> 1,200 MW</li>
        <li><strong>Allocated:</strong> ~1,150 MW (96% full)</li>
        <li><strong>Remaining:</strong> ~50 MW</li>
        <li><strong>Status:</strong> Nearly exhausted - new projects wait for Phase 2</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">What Happens After Phase 1?</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Phase 2 Review:</strong> Government will assess grid upgrades needed</li>
        <li><strong>Transmission Build-Out:</strong> 3-5 year construction timeline</li>
        <li><strong>Larger Allocations:</strong> Could approve 2-3 GW in Phase 2</li>
        <li><strong>Cost Recovery:</strong> Proponents may need to fund grid upgrades</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💰 Economic Impact:</strong> Every 100 MW of AI data centre capacity = ~$300M investment and 50-100 permanent jobs. The queue represents $30B+ in potential investment!</p>
      </div>
    `,
    relatedTopics: ['ai-datacentre.queue', 'ai-datacentre.overview'],
  },
};
