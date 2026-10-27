/**
 * Help content: EV Charging Infrastructure
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const EV_INFRASTRUCTURE_CONTENT: Record<string, HelpContentItem> = {
  // ==================== EV CHARGING INFRASTRUCTURE ====================

  'ev-infrastructure.overview': {
    id: 'ev-infrastructure.overview',
    title: 'EV Charging Infrastructure Dashboard',
    shortText: 'Track electric vehicle charging network across Canada',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Building Canada's EV Charging Network</h3>
      <p class="mb-4">As Canada transitions to electric vehicles, we need a robust charging network to make EVs practical for everyone. This dashboard tracks our progress!</p>

      <h4 class="font-semibold mt-4 mb-2">Federal EV Mandates:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>2026 Target:</strong> 20% of new vehicle sales must be EVs</li>
        <li><strong>2030 Target:</strong> 60% of new vehicle sales must be EVs</li>
        <li><strong>2035 Target:</strong> 100% of new vehicle sales must be zero-emission</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Why Infrastructure Matters:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Range Anxiety:</strong> Drivers need confidence they can charge anywhere</li>
        <li><strong>Equity:</strong> Not everyone has a home garage - need public charging</li>
        <li><strong>Grid Planning:</strong> Charging hubs require significant power upgrades</li>
        <li><strong>Economic Growth:</strong> Charging networks create jobs, enable EV adoption</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">What This Dashboard Shows:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Total charging stations and capacity across Canada</li>
        <li>Network comparison (ChargePoint, FLO, Tesla, Petro-Canada, etc.)</li>
        <li>Charger type distribution (Level 2, DC Fast, Superchargers)</li>
        <li>EV market share vs federal targets</li>
        <li>V2G capability tracking (future grid support)</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Canada's Progress:</strong> As of 2024, Canada has 20,000+ public charging stations with 50,000+ individual charging ports. The government is investing $680M to add 50,000 more chargers by 2027!</p>
      </div>
    `,
    relatedTopics: [
      'ev-infrastructure.networks',
      'ev-infrastructure.adoption',
      'ev-charging-levels',
    ],
  },

  'ev-infrastructure.v2g': {
    id: 'ev-infrastructure.v2g',
    title: 'Vehicle-to-Grid (V2G) Technology',
    shortText: 'EVs supporting the grid during peak demand',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Your Car as a Grid Battery</h3>
      <p class="mb-4"><strong>Vehicle-to-Grid (V2G)</strong> allows electric vehicles to send power BACK to the grid during peak demand, turning millions of EV batteries into a giant energy storage system!</p>

      <h4 class="font-semibold mt-4 mb-2">How V2G Works:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Bidirectional Charger:</strong> Can charge the EV OR discharge to the grid</li>
        <li><strong>Smart Control:</strong> Grid operator sends signals when power is needed</li>
        <li><strong>Owner Control:</strong> You set minimum battery level (e.g., always keep 50%)</li>
        <li><strong>Compensation:</strong> Get paid for providing grid services!</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Economics & Potential:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Revenue:</strong> Earn $500-1,500/year providing grid services</li>
        <li><strong>Battery Impact:</strong> Minimal - 1-3% capacity loss over 10 years</li>
        <li><strong>Grid Value:</strong> 1 million EVs = 50,000 MW of flexible capacity</li>
        <li><strong>Cost Avoidance:</strong> Avoid building peaker plants ($1M/MW)</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🌍 Real Pilot:</strong> In California, 100 Nissan Leafs in a V2G pilot earned $5,000 each per year while helping the grid avoid blackouts during peak demand!</p>
      </div>
    `,
    relatedTopics: ['ev-charging-levels', 'grid-stability', 'energy-storage'],
  },

  'ev-infrastructure.networks': {
    id: 'ev-infrastructure.networks',
    title: 'EV Charging Networks in Canada',
    shortText: 'Major charging networks and how they compare',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Who's Building Canada's Charging Network?</h3>
      <p class="mb-4">Multiple companies and networks are building charging stations across Canada.</p>

      <h4 class="font-semibold mt-4 mb-2">Major Networks:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>ChargePoint:</strong> 4,000+ locations, mostly Level 2</li>
        <li><strong>FLO:</strong> 3,000+ stations, strong in Quebec</li>
        <li><strong>Tesla Supercharger:</strong> 200+ sites, opening to all EVs</li>
        <li><strong>Petro-Canada:</strong> 60+ coast-to-coast DC Fast stations</li>
        <li><strong>Electrify Canada:</strong> 100+ ultra-fast (350 kW) sites</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Pro Tip:</strong> Download apps for multiple networks before road trips! Each network has different coverage.</p>
      </div>
    `,
    relatedTopics: ['ev-infrastructure.overview', 'ev-charging-levels'],
  },

  'ev-infrastructure.adoption': {
    id: 'ev-infrastructure.adoption',
    title: 'EV Adoption & Federal Mandates',
    shortText: 'Canada path to 100% EV sales by 2035',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Canada's Electric Vehicle Transition</h3>
      <p class="mb-4">Canada has set aggressive targets to phase out gas-powered vehicles.</p>

      <h4 class="font-semibold mt-4 mb-2">Current Progress (2024):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>National Average:</strong> 13.9% EV market share</li>
        <li><strong>Quebec:</strong> 22% (EXCEEDS 2026 target!)</li>
        <li><strong>British Columbia:</strong> 19% (nearly at target)</li>
        <li><strong>Alberta:</strong> 4% (significant gap)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">What Needs to Happen:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Need 200,000+ public chargers by 2030 (vs 20,000 today)</li>
        <li>Grid upgrades: 5-10 GW additional capacity</li>
        <li>Price parity: Battery costs must drop 30-40%</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Reality Check:</strong> Reaching 100% by 2035 requires tripling current adoption rates.</p>
      </div>
    `,
    relatedTopics: ['ev-infrastructure.overview', 'ev-infrastructure.networks'],
  },
};
