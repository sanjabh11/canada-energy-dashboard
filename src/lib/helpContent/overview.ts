/**
 * Help content: Platform Overview, Charts & Core Pages
 *
 * Split from src/lib/helpContent.ts (F-11 / CODE-4 god-object refactor).
 * Entries are verbatim slices of the original HELP_CONTENT_DATABASE.
 */
import type { HelpContentItem } from './types';

export const OVERVIEW_CONTENT: Record<string, HelpContentItem> = {
  // ==================== DASHBOARD OVERVIEW ====================

  'dashboard.overview': {
    id: 'dashboard.overview',
    title: 'Real-Time Energy Dashboard',
    shortText: 'Live monitoring of Canadian energy systems',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">What is the Real-Time Dashboard?</h3>
      <p class="mb-4">This dashboard shows you <strong>live energy data</strong> from across Canada. Think of it like a "weather map" but for electricity!</p>
      
      <h4 class="font-semibold mt-4 mb-2">What You'll See:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Ontario Demand</strong> - How much electricity Ontario is using right now (measured in Megawatts)</li>
        <li><strong>Generation Mix</strong> - Where our electricity comes from (nuclear, hydro, wind, solar, etc.)</li>
        <li><strong>Prices</strong> - How much electricity costs in different provinces</li>
        <li><strong>Weather Impact</strong> - How temperature affects energy use</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Why This Matters:</h4>
      <p class="mb-4">Understanding real-time energy helps us:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Plan when to use electricity (cheaper during off-peak times)</li>
        <li>See how renewable energy is growing</li>
        <li>Understand energy security and reliability</li>
      </ul>
      
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Student Tip:</strong> The dashboard updates every 30 seconds. Watch how demand changes throughout the day - it's highest during business hours!</p>
      </div>
    `,
    relatedTopics: ['chart.ontario_demand', 'chart.provincial_generation'],
  },

  // ==================== CHARTS ====================

  'chart.ontario_demand': {
    id: 'chart.ontario_demand',
    title: 'Ontario Hourly Demand',
    shortText: 'Real-time electricity demand in Ontario',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Understanding Ontario's Electricity Demand</h3>
      <p class="mb-4"><strong>Demand</strong> means how much electricity people in Ontario are using right now.</p>
      
      <h4 class="font-semibold mt-4 mb-2">What the Chart Shows:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Y-Axis (Vertical)</strong> - Amount of power in <strong>Megawatts (MW)</strong>
          <br/><span class="text-sm text-slate-600">1 MW can power about 400-900 homes</span>
        </li>
        <li><strong>X-Axis (Horizontal)</strong> - Time of day</li>
        <li><strong>Line</strong> - Shows how demand changes minute by minute</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Typical Patterns:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Morning Peak (7-9 AM):</strong> People wake up, turn on lights, make breakfast</li>
        <li><strong>Afternoon Peak (4-7 PM):</strong> Everyone returns home, cooks dinner</li>
        <li><strong>Overnight Low (2-5 AM):</strong> Most people sleeping, minimal usage</li>
      </ul>
      
      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🌍 Climate Connection:</strong> On hot summer days, demand spikes because of air conditioning. On cold winter mornings, it spikes because of heating!</p>
      </div>
    `,
    relatedTopics: ['dashboard.overview', 'chart.weather_correlation'],
  },

  'chart.provincial_generation': {
    id: 'chart.provincial_generation',
    title: 'Provincial Generation Mix',
    shortText: 'How provinces generate their electricity',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Where Does Our Electricity Come From?</h3>
      <p class="mb-4">This chart shows the <strong>energy sources</strong> used to generate electricity across Canadian provinces over the past 30 days.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Energy Sources Explained:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>☢️ Nuclear</strong> - Uses uranium atoms to create heat → steam → electricity
          <br/><span class="text-sm text-slate-600">Clean (no emissions), reliable, generates large amounts</span>
        </li>
        <li><strong>💧 Hydro (Water)</strong> - Uses falling water to spin turbines
          <br/><span class="text-sm text-slate-600">Renewable, clean, works best in provinces with rivers/dams</span>
        </li>
        <li><strong>🔥 Natural Gas</strong> - Burns gas to create electricity
          <br/><span class="text-sm text-slate-600">Flexible, can ramp up/down quickly, produces some emissions</span>
        </li>
        <li><strong>💨 Wind</strong> - Wind spins turbine blades
          <br/><span class="text-sm text-slate-600">Renewable, clean, but only works when windy</span>
        </li>
        <li><strong>☀️ Solar</strong> - Sunlight converted directly to electricity
          <br/><span class="text-sm text-slate-600">Renewable, clean, but only works during daytime</span>
        </li>
      </ul>
      
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Reading the Chart:</strong> Longer bars = more energy generated from that source. Ontario uses mostly nuclear and hydro. Quebec uses almost all hydro!</p>
      </div>
    `,
    relatedTopics: ['dashboard.overview', 'page.trends'],
  },

  'chart.alberta_supply_demand': {
    id: 'chart.alberta_supply_demand',
    title: 'Alberta Supply & Demand',
    shortText: 'Real-time balance between electricity supply and demand in Alberta',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Electricity Balancing Act</h3>
      <p class="mb-4">Electricity grids must <strong>always balance supply and demand</strong>. Too much or too little can cause blackouts!</p>
      
      <h4 class="font-semibold mt-4 mb-2">What You're Seeing:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Purple Line (Supply)</strong> - How much electricity power plants are generating</li>
        <li><strong>Blue Line (Demand)</strong> - How much electricity people are using</li>
        <li><strong>Price</strong> - Cost per megawatt-hour (goes up when demand is high)</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Why Supply > Demand:</h4>
      <p class="mb-4">Supply should always be <em>slightly higher</em> than demand to:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Maintain stable voltage (like water pressure in pipes)</li>
        <li>Have reserves ready for sudden spikes</li>
        <li>Prevent blackouts</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Price Dynamics:</h4>
      <p class="mb-3">Electricity price changes based on:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>High Demand + Limited Supply</strong> = Higher Prices 📈</li>
        <li><strong>Low Demand + Plenty of Supply</strong> = Lower Prices 📉</li>
        <li><strong>Time of Day</strong> - Peak hours cost more</li>
      </ul>
      
      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚡ Fun Fact:</strong> Alberta has a "deregulated" electricity market, meaning prices change minute-by-minute based on supply and demand - like a stock market for electricity!</p>
      </div>
    `,
    relatedTopics: ['chart.ontario_demand', 'page.investment'],
  },

  'chart.weather_correlation': {
    id: 'chart.weather_correlation',
    title: 'Weather & Energy Correlation',
    shortText: 'How temperature affects electricity demand',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Temperature's Impact on Energy Use</h3>
      <p class="mb-4">Temperature and electricity demand are <strong>closely related</strong>. This chart shows how much!</p>
      
      <h4 class="font-semibold mt-4 mb-2">Understanding Correlation:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>1.0 = Perfect Correlation</strong> - Temperature and demand move together exactly</li>
        <li><strong>0.7-0.9 = Strong Correlation</strong> - Temperature is a major factor</li>
        <li><strong>0.4-0.6 = Moderate Correlation</strong> - Temperature matters, but other factors too</li>
        <li><strong>< 0.3 = Weak Correlation</strong> - Temperature doesn't affect demand much</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Why Temperature Matters:</h4>
      <p class="mb-3"><strong>Hot Days:</strong></p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>Air conditioners work harder → More electricity used</li>
        <li>Peak demand in summer afternoons (2-5 PM)</li>
        <li>Can strain the grid during heatwaves</li>
      </ul>
      
      <p class="mb-3"><strong>Cold Days:</strong></p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Electric heaters run more → Higher demand</li>
        <li>Peak demand in winter mornings (6-9 AM)</li>
        <li>Some homes use gas heat (lowers electricity correlation)</li>
      </ul>
      
      <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mt-4">
        <p class="text-sm"><strong>🌡️ City Differences:</strong> Calgary shows higher correlation because more buildings use electric heating. Vancouver shows lower correlation due to milder climate and less AC usage!</p>
      </div>
    `,
    relatedTopics: ['chart.ontario_demand', 'dashboard.overview'],
  },

  // ==================== INDIGENOUS DASHBOARD ====================

  'page.indigenous': {
    id: 'page.indigenous',
    title: 'Indigenous Energy Partnerships',
    shortText: 'Tracking consultation and collaboration with Indigenous communities',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Indigenous Rights & Energy Projects</h3>
      <p class="mb-4">Canada has a <strong>legal duty to consult</strong> with Indigenous communities on energy projects that may affect their lands, rights, or interests.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Why Indigenous Consultation Matters:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Treaties & Rights</strong> - Many energy projects occur on traditional territories</li>
        <li><strong>Environmental Protection</strong> - Indigenous knowledge helps protect ecosystems</li>
        <li><strong>Economic Participation</strong> - Fair benefit-sharing from energy development</li>
        <li><strong>Reconciliation</strong> - Honoring UNDRIP (United Nations Declaration on the Rights of Indigenous Peoples)</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">What This Dashboard Tracks:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Active consultation processes</li>
        <li>Completed agreements</li>
        <li>Indigenous-led energy projects</li>
        <li>Territorial mapping</li>
      </ul>
      
      <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 mt-4">
        <p class="text-sm"><strong>📚 Learning More:</strong> The Truth and Reconciliation Commission's Calls to Action (#92) emphasizes the importance of Indigenous participation in energy decision-making.</p>
      </div>
    `,
    relatedTopics: [
      'metric.indigenous.completed_consultations',
      'chart.indigenous.consultation_status',
    ],
  },

  'metric.indigenous.completed_consultations': {
    id: 'metric.indigenous.completed_consultations',
    title: 'Completed Consultations',
    shortText: 'Number of consultation processes completed with Indigenous communities',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">What Are Energy Consultations?</h3>
      <p class="mb-4">A <strong>consultation</strong> is a formal process where energy companies and governments discuss project plans with Indigenous communities.</p>
      
      <h4 class="font-semibold mt-4 mb-2">The Consultation Process:</h4>
      <ol class="list-decimal pl-5 space-y-2 mb-4">
        <li><strong>Notification</strong> - Community is informed of proposed project</li>
        <li><strong>Information Sharing</strong> - Technical details, environmental impacts</li>
        <li><strong>Dialogue</strong> - Concerns, questions, Traditional Knowledge shared</li>
        <li><strong>Accommodation</strong> - Project adjusted based on feedback</li>
        <li><strong>Agreement or Decision</strong> - Final outcome documented</li>
      </ol>
      
      <h4 class="font-semibold mt-4 mb-2">Why Track This Number?</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Shows progress on reconciliation commitments</li>
        <li>Indicates government/industry engagement levels</li>
        <li>Helps communities plan capacity for future consultations</li>
      </ul>
      
      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>✅ Good Consultation:</strong> Takes time, involves community elders, respects traditional territories, and results in free, prior, and informed consent (FPIC).</p>
      </div>
    `,
    relatedTopics: ['page.indigenous', 'metric.indigenous.completion_rate'],
  },

  'metric.indigenous.completion_rate': {
    id: 'metric.indigenous.completion_rate',
    title: 'Consultation Completion Rate',
    shortText: 'Percentage of consultations successfully completed',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Measuring Consultation Success</h3>
      <p class="mb-4">The <strong>completion rate</strong> shows what percentage of started consultations reach a final agreement or decision.</p>
      
      <h4 class="font-semibold mt-4 mb-2">How It's Calculated:</h4>
      <div class="bg-slate-100 p-3 rounded mb-4 font-mono text-sm">
        Completion Rate = (Completed Consultations / Total Started) × 100%
      </div>
      
      <h4 class="font-semibold mt-4 mb-2">What Different Rates Mean:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>90-100%</strong> - Excellent track record, strong relationships</li>
        <li><strong>70-89%</strong> - Good progress, some challenges</li>
        <li><strong>50-69%</strong> - Moderate success, room for improvement</li>
        <li><strong>< 50%</strong> - Significant issues, need better processes</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Why Some Don't Complete:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Project cancelled or postponed</li>
        <li>Unresolved concerns from community</li>
        <li>Insufficient time or resources allocated</li>
        <li>Breakdown in trust or communication</li>
      </ul>
      
      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚖️ Legal Context:</strong> Under Canadian law, the Crown has a duty to consult when actions might infringe on Aboriginal or treaty rights. Incomplete consultations can lead to legal challenges!</p>
      </div>
    `,
    relatedTopics: ['metric.indigenous.completed_consultations', 'page.indigenous'],
  },

  'chart.indigenous.consultation_status': {
    id: 'chart.indigenous.consultation_status',
    title: 'Consultation Status Breakdown',
    shortText: 'Current stage of all consultation processes',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Tracking Consultation Progress</h3>
      <p class="mb-4">This chart shows where each consultation currently stands in the process.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Status Categories:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>🟢 Completed</strong> - Agreement reached or final decision made</li>
        <li><strong>🟡 In Progress</strong> - Active discussions happening</li>
        <li><strong>🟠 On Hold</strong> - Paused (waiting for info, funding, or other factors)</li>
        <li><strong>🔴 Delayed</strong> - Behind schedule, may have issues</li>
        <li><strong>⚪ Planned</strong> - Scheduled to start soon</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">What "In Progress" Means:</h4>
      <p class="mb-4">Active consultations might involve:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Community meetings and presentations</li>
        <li>Environmental impact assessments</li>
        <li>Negotiating benefit-sharing agreements</li>
        <li>Incorporating Traditional Ecological Knowledge</li>
      </ul>
      
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>🔄 Timeframes:</strong> Good consultations take 6-18 months. Rushing leads to poor outcomes. Quality matters more than speed!</p>
      </div>
    `,
    relatedTopics: ['page.indigenous', 'metric.indigenous.completion_rate'],
  },

  // ==================== INVESTMENT ANALYSIS ====================

  'page.investment': {
    id: 'page.investment',
    title: 'Energy Investment Analysis',
    shortText: 'Financial analysis tools for energy projects',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Understanding Energy Project Finance</h3>
      <p class="mb-4">Energy projects require <strong>massive upfront investment</strong> but generate revenue over decades. This tool helps evaluate if they're worth it!</p>
      
      <h4 class="font-semibold mt-4 mb-2">Key Financial Metrics:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>NPV (Net Present Value)</strong> - Total profit over project lifetime, adjusted for time value of money</li>
        <li><strong>IRR (Internal Rate of Return)</strong> - Annual return percentage, like interest rate</li>
        <li><strong>Payback Period</strong> - How long until initial investment is recovered</li>
        <li><strong>LCOE (Levelized Cost of Energy)</strong> - Average cost per kWh over project life</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">Why Different Energy Sources Cost Different:</h4>
      <div class="space-y-3 mb-4">
        <div>
          <strong>☀️ Solar:</strong> High upfront cost, $0 fuel cost, 25-30 year lifespan
        </div>
        <div>
          <strong>💨 Wind:</strong> Medium upfront, $0 fuel, 20-25 years
        </div>
        <div>
          <strong>☢️ Nuclear:</strong> Very high upfront, low fuel cost, 60+ years
        </div>
        <div>
          <strong>🔥 Natural Gas:</strong> Low upfront, high ongoing fuel cost, 30-40 years
        </div>
      </div>
      
      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Decision Making:</strong> Projects with NPV > $0 and IRR > 8-12% are typically considered good investments. But also consider: grid reliability, emissions, job creation, and energy security!</p>
      </div>
    `,
    relatedTopics: ['metric.investment.npv', 'metric.investment.irr'],
  },

  // ==================== RESILIENCE & SECURITY ====================

  'page.resilience': {
    id: 'page.resilience',
    title: 'Energy Resilience Analysis',
    shortText: 'Assessing energy system ability to withstand disruptions',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">What is Energy Resilience?</h3>
      <p class="mb-4"><strong>Resilience</strong> = The ability to prepare for, withstand, and recover from disruptions to energy systems.</p>
      
      <h4 class="font-semibold mt-4 mb-2">Types of Threats:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>🌪️ Natural Disasters</strong> - Hurricanes, ice storms, floods, wildfires</li>
        <li><strong>🌡️ Climate Change</strong> - Heatwaves, droughts, extreme weather</li>
        <li><strong>💻 Cyber Attacks</strong> - Hacking power grid controls</li>
        <li><strong>🔧 Equipment Failures</strong> - Transformer failures, line breaks</li>
        <li><strong>⛽ Fuel Supply Issues</strong> - Pipeline disruptions, gas shortages</li>
      </ul>
      
      <h4 class="font-semibold mt-4 mb-2">How We Build Resilience:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Redundancy</strong> - Multiple power sources and transmission paths</li>
        <li><strong>Diversification</strong> - Mix of energy types (not all eggs in one basket)</li>
        <li><strong>Smart Grids</strong> - Automated systems that reroute power during failures</li>
        <li><strong>Energy Storage</strong> - Batteries to bridge supply gaps</li>
        <li><strong>Microgrids</strong> - Local grids that can operate independently</li>
      </ul>
      
      <div class="bg-red-50 border-l-4 border-red-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Real Example:</strong> The 2021 Texas blackouts showed what happens when systems aren't resilient. Extreme cold + natural gas shortages = millions without power for days. Canada's more diverse energy mix helps prevent this!</p>
      </div>
    `,
    relatedTopics: ['page.security', 'chart.provincial_generation'],
  },
};
