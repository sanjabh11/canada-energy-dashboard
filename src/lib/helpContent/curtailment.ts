/**
 * Help content: Curtailment
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const CURTAILMENT_CONTENT: Record<string, HelpContentItem> = {
  'curtailment.overview': {
    id: 'curtailment.overview',
    title: 'Curtailment Analytics Dashboard',
    shortText: 'Tracking and analyzing renewable energy curtailment events across Canada',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Understanding Renewable Curtailment</h3>
      <p class="mb-4">Curtailment = grid operator orders renewable generators to reduce output below available capacity. Wind turbines feather blades, solar inverters ramp down power. Wastes free, zero-carbon energy. Occurs when supply exceeds demand + transmission + grid stability constraints.</p>

      <h4 class="font-semibold mt-4 mb-2">Canadian Curtailment Landscape (2023):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Ontario:</strong> 150-250 GWh/year curtailed (2-3% of wind/solar output). Cost: $20-35M/year. Primarily Southwest ON wind (transmission congestion).</li>
        <li><strong>Alberta:</strong> 400-600 GWh/year curtailed (5-7%). Cost: $30-50M/year. Highest in Canada due to high renewable penetration + merchant market.</li>
        <li><strong>Saskatchewan:</strong> 200-300 GWh/year curtailed (8-10% - highest rate!). High wind penetration + inflexible coal baseload.</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Curtailment Paradox:</strong> Ratepayers pay for renewable energy whether used or not (FIT contracts). Curtailment = double cost: pay renewable $135/MWh + pay gas $80/MWh replacement = $215/MWh total vs $135/MWh if stored.</p>
      </div>
    `,
    relatedTopics: ['curtailment.mitigation', 'curtailment.economics'],
  },

  'curtailment.mitigation': {
    id: 'curtailment.mitigation',
    title: 'Curtailment Mitigation Strategies',
    shortText: 'Solutions to reduce curtailment: storage, transmission, flexibility',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Curtailment Reduction Toolkit</h3>
      <p class="mb-4">Portfolio approach: storage (shift surplus to peak), transmission (export surplus), flexible generation (ramp down gas/hydro), demand response (increase load during surplus), advanced forecasting.</p>

      <h4 class="font-semibold mt-4 mb-2">Strategy 1: Co-Located Battery Storage</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Concept:</strong> Build battery at wind/solar farm. Charge from curtailed renewable (marginal cost $0), discharge at peak ($80-120/MWh).</li>
        <li><strong>Real Example - Dufferin Wind + Storage (2024):</strong> 100 MW wind + 30 MW / 120 MWh battery ($30M). Curtailment dropped from 12% to 4% (saved 70 GWh/year). Revenue: $50M/year. Payback: 18 months.</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Optimal Portfolio:</strong> Ontario 2030 strategy: 40% battery (2,000 MW), 30% transmission (Quebec +1,500 MW), 20% hydrogen (500 MW electrolyzer), 10% DLR. Total: $5B. Curtailment reduction: 70%.</p>
      </div>
    `,
    relatedTopics: ['curtailment.overview', 'curtailment.economics'],
  },

  'curtailment.economics': {
    id: 'curtailment.economics',
    title: 'Economic Impact of Curtailment',
    shortText: 'Quantifying curtailment costs: lost revenue, wasted payments, carbon implications',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The True Cost of Curtailment</h3>
      <p class="mb-4">Curtailment costs have 4 layers: (1) Direct payment waste (pay generator even when curtailed), (2) Lost revenue (owner loses energy payment), (3) Replacement energy cost (gas fills gap), (4) Environmental cost (more fossil dispatch). Total: 2-4x direct payment.</p>

      <h4 class="font-semibold mt-4 mb-2">Ontario Example (200 GWh/year curtailed):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Contract Payment:</strong> 200 GWh × $135/MWh (FIT rate) = $27M/year (ratepayers pay)</li>
        <li><strong>Replacement Gas:</strong> 200 GWh × $80/MWh = $16M/year (ratepayers pay)</li>
        <li><strong>Carbon Cost:</strong> 100,000 tonnes CO₂ × $80/tonne = $8M/year (environmental)</li>
        <li><strong>Total Annual Cost:</strong> $50M/year (vs $27M direct payment = 1.9x hidden multiplier)</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Investment Impact:</strong> Curtailment >5% chills renewable investment. LT2 RFP (2023): several bids withdrawn when developers saw 10%+ curtailment in studies. Policy fix needed: curtailment allocation/insurance market.</p>
      </div>
    `,
    relatedTopics: ['curtailment.overview', 'curtailment.mitigation'],
  },

  'curtailment.forecasting': {
    id: 'curtailment.forecasting',
    title: 'Curtailment Forecasting and Analytics',
    shortText: 'Using AI/ML to predict and prevent curtailment events',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Predictive Curtailment Analytics</h3>
      <p class="mb-4">Curtailment forecasting predicts when/where curtailment will occur 1-48 hours ahead. Enables proactive mitigation: pre-charge batteries, schedule flexible loads, increase exports. Can reduce curtailment 10-30% vs reactive-only.</p>

      <h4 class="font-semibold mt-4 mb-2">Ontario IESO ML Model Performance (2023-2024 Pilot):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Model:</strong> XGBoost + LSTM. Trained on 3 years data (2020-2023).</li>
        <li><strong>24-hour ahead:</strong> 85% precision, 78% recall. F1 score: 0.81.</li>
        <li><strong>6-hour ahead:</strong> 92% precision, 89% recall. F1: 0.90 (better at short horizon).</li>
        <li><strong>MW forecast accuracy:</strong> ±150 MW MAE. E.g., predict 800 MW curtailed, actual 650-950 MW.</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Proactive Mitigation Example:</h4>
      <p class="mb-2">Forecast: 1,200 MW solar curtailed tomorrow 2-4 PM (3,600 MWh wasted).</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Mitigation:</strong> 800 MW battery (3,200 MWh) + 200 MW hydrogen (600 MWh) + 500 MW export Quebec (1,500 MWh) = 5,300 MWh available.</li>
        <li><strong>Result:</strong> Absorbed 3,300 MWh. Residual curtailment: 300 MWh (vs 3,600 MWh). <strong>Reduction: 92%!</strong></li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Future - Reinforcement Learning:</strong> Next-gen dispatch uses RL agents trained on millions of curtailment scenarios. Early research (MIT 2024) shows 5-10% better curtailment reduction than rule-based optimization. Deployment 2026-2028.</p>
      </div>
    `,
    relatedTopics: ['curtailment.overview', 'curtailment.mitigation'],
  },
};
