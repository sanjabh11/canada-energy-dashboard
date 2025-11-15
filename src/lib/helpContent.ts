/**
 * Comprehensive Help Content Database
 * 
 * Student-friendly explanations for all platform features.
 * Designed to be educational, clear, and accessible.
 */

export interface HelpContentItem {
  id: string;
  title: string;
  shortText: string;
  bodyHtml: string;
  relatedTopics?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Complete help content library
 * Each entry provides clear, student-friendly explanations
 */
export const HELP_CONTENT_DATABASE: Record<string, HelpContentItem> = {
  
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
    relatedTopics: ['chart.ontario_demand', 'chart.provincial_generation']
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
    relatedTopics: ['dashboard.overview', 'chart.weather_correlation']
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
    relatedTopics: ['dashboard.overview', 'page.trends']
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
    relatedTopics: ['chart.ontario_demand', 'page.investment']
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
    relatedTopics: ['chart.ontario_demand', 'dashboard.overview']
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
    relatedTopics: ['metric.indigenous.completed_consultations', 'chart.indigenous.consultation_status']
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
    relatedTopics: ['page.indigenous', 'metric.indigenous.completion_rate']
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
    relatedTopics: ['metric.indigenous.completed_consultations', 'page.indigenous']
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
    relatedTopics: ['page.indigenous', 'metric.indigenous.completion_rate']
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
    relatedTopics: ['metric.investment.npv', 'metric.investment.irr']
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
    relatedTopics: ['page.security', 'chart.provincial_generation']
  },

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
    relatedTopics: ['ai-datacentre.pue', 'ai-datacentre.queue', 'ai-datacentre.phase1']
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
        <li><strong>PUE = 1.2 (Excellent)</strong> - World-class efficiency. Google/Microsoft hyperscale facilities</li>
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
    relatedTopics: ['ai-datacentre.overview', 'ai-datacentre.cooling']
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
        <p class="text-sm"><strong>⚠️ Grid Crisis:</strong> The queue is now over 80% of Alberta's peak demand (12,100 MW). This is unprecedented and requires massive grid expansion!</p>
      </div>
    `,
    relatedTopics: ['ai-datacentre.phase1', 'ai-datacentre.overview']
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
    relatedTopics: ['ai-datacentre.queue', 'ai-datacentre.overview']
  },

  // ==================== HYDROGEN ECONOMY ====================

  'hydrogen.overview': {
    id: 'hydrogen.overview',
    title: 'Hydrogen Economy Hub Dashboard',
    shortText: 'Track Canada hydrogen production, pricing, and infrastructure',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Hydrogen Economy</h3>
      <p class="mb-4">Hydrogen (H₂) is emerging as a clean fuel for heavy transportation, industry, and power generation. Canada is investing $300M to become a global hydrogen leader!</p>

      <h4 class="font-semibold mt-4 mb-2">The 3 Colors of Hydrogen:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>💚 Green Hydrogen</strong> - Made using renewable electricity (wind, solar, hydro) to split water. Zero emissions!</li>
        <li><strong>🔵 Blue Hydrogen</strong> - Made from natural gas with Carbon Capture and Storage (CCS). Low emissions (~85-95% captured)</li>
        <li><strong>⚫ Grey Hydrogen</strong> - Made from natural gas without CCS. High emissions (not sustainable)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Why Hydrogen Matters:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Hard-to-Decarbonize Sectors</strong> - Steel, cement, ammonia production can't easily use batteries</li>
        <li><strong>Heavy Transport</strong> - Fuel cell trucks, trains, ships need long range and fast refueling</li>
        <li><strong>Energy Storage</strong> - Store excess renewable energy as hydrogen for later</li>
        <li><strong>Heating</strong> - Can blend into natural gas pipelines for cleaner heating</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">What This Dashboard Shows:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Edmonton vs Calgary hydrogen hubs (capacity, projects, investment)</li>
        <li>Hydrogen production facilities and methods</li>
        <li>Pricing trends ($/kg) and diesel equivalency</li>
        <li>Refueling infrastructure rollout</li>
        <li>Demand forecasts for transportation, industry, power</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Alberta Advantage:</strong> Alberta has cheap natural gas for blue hydrogen + strong wind/solar potential for green hydrogen. The province aims to produce 2.5 million tonnes/year by 2030!</p>
      </div>
    `,
    relatedTopics: ['hydrogen.colors', 'hydrogen.production', 'hydrogen.pricing']
  },

  'hydrogen.colors': {
    id: 'hydrogen.colors',
    title: 'Hydrogen Color Classification',
    shortText: 'Green vs Blue vs Grey hydrogen explained',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Hydrogen Rainbow</h3>
      <p class="mb-4">Not all hydrogen is created equal! The "color" system helps us understand how clean the production process is.</p>

      <h4 class="font-semibold mt-4 mb-2">💚 Green Hydrogen (Cleanest)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>How It's Made:</strong> Electrolysis (electricity splits water into H₂ + O₂)</li>
        <li><strong>Power Source:</strong> 100% renewable (wind, solar, hydro)</li>
        <li><strong>Emissions:</strong> ZERO (only byproduct is oxygen!)</li>
        <li><strong>Cost:</strong> $4-7/kg (expensive now, but dropping fast)</li>
        <li><strong>Example:</strong> Quebec hydro-powered electrolyzer facilities</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">🔵 Blue Hydrogen (Low Emission)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>How It's Made:</strong> Steam Methane Reforming (SMR) of natural gas</li>
        <li><strong>Carbon Capture:</strong> 85-95% of CO₂ captured and stored underground</li>
        <li><strong>Emissions:</strong> Low (~1-2 kg CO₂/kg H₂ vs 10 kg without CCS)</li>
        <li><strong>Cost:</strong> $2-3/kg (cheaper than green, for now)</li>
        <li><strong>Example:</strong> Air Products' Alberta facility (1,500 tonnes/day)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">⚫ Grey Hydrogen (High Emission)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>How It's Made:</strong> SMR without carbon capture</li>
        <li><strong>Emissions:</strong> High (~10 kg CO₂/kg H₂)</li>
        <li><strong>Cost:</strong> $1-2/kg (cheapest, but dirty)</li>
        <li><strong>Status:</strong> 95% of today's hydrogen, but being phased out</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Other Colors (Bonus):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Pink:</strong> Electrolysis powered by nuclear</li>
        <li><strong>Turquoise:</strong> Methane pyrolysis (produces solid carbon, not CO₂)</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🎯 The Goal:</strong> Transition from grey → blue → green by 2050. Canada aims for 30% green hydrogen by 2030!</p>
      </div>
    `,
    relatedTopics: ['hydrogen.production', 'hydrogen.overview']
  },

  'hydrogen.production': {
    id: 'hydrogen.production',
    title: 'Hydrogen Production Methods',
    shortText: 'How hydrogen is produced at scale',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Making Hydrogen</h3>
      <p class="mb-4">There are two main ways to produce hydrogen at industrial scale: electrolysis (splitting water) and steam methane reforming (converting natural gas).</p>

      <h4 class="font-semibold mt-4 mb-2">1. Electrolysis (Green Hydrogen)</h4>
      <p class="mb-2">Using electricity to split water molecules:</p>
      <div class="bg-slate-100 p-3 rounded mb-3 font-mono text-sm">
        2H₂O + electricity → 2H₂ + O₂
      </div>
      <p class="mb-2"><strong>Types of Electrolyzers:</strong></p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Alkaline (AEL):</strong> Mature tech, 60-70% efficient, $500-1,000/kW</li>
        <li><strong>PEM (Proton Exchange Membrane):</strong> Faster response, 65-75% efficient, $1,000-1,500/kW</li>
        <li><strong>SOEC (Solid Oxide):</strong> High-temp, 80-85% efficient (future tech)</li>
      </ul>
      <p class="mb-4"><strong>Energy Required:</strong> 50-55 kWh per kg of H₂ (enough to power 5 homes for a day)</p>

      <h4 class="font-semibold mt-4 mb-2">2. Steam Methane Reforming (Blue/Grey Hydrogen)</h4>
      <p class="mb-2">Reacting natural gas with high-temperature steam:</p>
      <div class="bg-slate-100 p-3 rounded mb-3 font-mono text-sm">
        CH₄ + 2H₂O → 4H₂ + CO₂
      </div>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Process:</strong> Heat natural gas to 700-1,000°C with steam</li>
        <li><strong>Efficiency:</strong> 70-80% (lower than electrolysis, but cheaper)</li>
        <li><strong>CO₂ Byproduct:</strong> ~10 kg CO₂ per kg H₂ (must be captured for "blue" hydrogen)</li>
        <li><strong>Cost:</strong> $1-3/kg depending on gas price and CCS</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Production Economics:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Method</th>
            <th class="border px-2 py-1">Cost ($/kg)</th>
            <th class="border px-2 py-1">CO₂ Emissions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Grey SMR</td>
            <td class="border px-2 py-1">$1-2</td>
            <td class="border px-2 py-1">10 kg CO₂/kg H₂</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Blue SMR+CCS</td>
            <td class="border px-2 py-1">$2-3</td>
            <td class="border px-2 py-1">1-2 kg CO₂/kg H₂</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Green Electrolysis</td>
            <td class="border px-2 py-1">$4-7</td>
            <td class="border px-2 py-1">0 kg CO₂/kg H₂</td>
          </tr>
        </tbody>
      </table>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚡ Fun Fact:</strong> One kilogram of hydrogen contains about the same energy as 3 litres of diesel, but only weighs 1kg vs 2.6kg for the diesel!</p>
      </div>
    `,
    relatedTopics: ['hydrogen.colors', 'hydrogen.pricing', 'hydrogen.overview']
  },

  'hydrogen.pricing': {
    id: 'hydrogen.pricing',
    title: 'Hydrogen Pricing & Economics',
    shortText: 'Understanding hydrogen costs and diesel equivalency',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">How Much Does Hydrogen Cost?</h3>
      <p class="mb-4">Hydrogen pricing is evolving rapidly as production scales up and technology improves. Prices are typically measured in $/kg (dollars per kilogram).</p>

      <h4 class="font-semibold mt-4 mb-2">Current Pricing (2024-2025):</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Grey H₂:</strong> $1-2/kg (natural gas price-dependent)</li>
        <li><strong>Blue H₂:</strong> $2-3/kg (grey + CCS cost)</li>
        <li><strong>Green H₂:</strong> $4-7/kg (dropping 8-10% annually)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Diesel Equivalency:</h4>
      <p class="mb-2">To compare hydrogen with diesel fuel:</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>1 kg H₂ ≈ 3 litres diesel</strong> (energy content)</li>
        <li><strong>At $5/kg H₂:</strong> Equivalent to $1.67/litre diesel</li>
        <li><strong>At $3/kg H₂:</strong> Equivalent to $1.00/litre diesel</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">What Affects Hydrogen Price?</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Production Method:</strong> Green costs 2-3× more than grey (for now)</li>
        <li><strong>Electricity Costs:</strong> Green H₂ needs ~55 kWh/kg → cheap power = cheap hydrogen</li>
        <li><strong>Natural Gas Prices:</strong> Affects grey/blue hydrogen costs</li>
        <li><strong>Carbon Pricing:</strong> $170/tonne carbon tax adds ~$1/kg to grey H₂</li>
        <li><strong>Scale:</strong> Gigawatt-scale production → 30-40% cost reduction</li>
        <li><strong>Technology Learning:</strong> Electrolyzer costs dropping 10-15%/year</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Price Forecasts:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>2025:</strong> Green H₂ at $4-6/kg</li>
        <li><strong>2030:</strong> Green H₂ reaches parity with blue at $2-3/kg</li>
        <li><strong>2050:</strong> Green H₂ below $1.50/kg (competitive with fossil fuels)</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💰 Investment Opportunity:</strong> Canada's Hydrogen Strategy aims for $50B in economic activity by 2050. Early movers in production, infrastructure, and fuel cells could capture massive value!</p>
      </div>
    `,
    relatedTopics: ['hydrogen.production', 'hydrogen.overview']
  },

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
    relatedTopics: ['ev-infrastructure.networks', 'ev-infrastructure.adoption', 'ev-charging-levels']
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
    relatedTopics: ['ev-charging-levels', 'grid-stability', 'energy-storage']
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
    relatedTopics: ['ev-infrastructure.overview', 'ev-charging-levels']
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
    relatedTopics: ['ev-infrastructure.overview', 'ev-infrastructure.networks']
  },

  // ==================== CARBON EMISSIONS (ADDITIONAL) ====================

  'carbon.grid-intensity': {
    id: 'carbon.grid-intensity',
    title: 'Grid Carbon Intensity (gCO2/kWh)',
    shortText: 'How much pollution per unit of electricity',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Measuring How "Dirty" or "Clean" Your Electricity Is</h3>
      <p class="mb-4"><strong>Grid Carbon Intensity</strong> measures how much CO₂ is emitted to generate 1 kWh of electricity (gCO2/kWh).</p>

      <h4 class="font-semibold mt-4 mb-2">Canadian Provincial Comparison:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Quebec:</strong> 30 gCO2/kWh (95% hydro) ✅</li>
        <li><strong>Ontario:</strong> 40 gCO2/kWh (nuclear + hydro) ✅</li>
        <li><strong>Alberta:</strong> 600 gCO2/kWh (gas + coal) ❌</li>
        <li><strong>Saskatchewan:</strong> 650 gCO2/kWh (coal + gas) ❌</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Why It Matters:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>EVs are 20× cleaner in Quebec than Alberta</li>
        <li>Heat pumps save more in clean provinces</li>
        <li>Intensity varies hour-by-hour (lower at night)</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Impact:</strong> Lowering Canada's average from 130 → 30 gCO2/kWh = Removing 40 million cars!</p>
      </div>
    `,
    relatedTopics: ['carbon-emissions', 'energy-mix']
  },

  'carbon.lifecycle-emissions': {
    id: 'carbon.lifecycle-emissions',
    title: 'Lifecycle vs Direct Emissions',
    shortText: 'Full picture including manufacturing',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Full Carbon Footprint</h3>
      <p class="mb-4">Lifecycle emissions count EVERYTHING: mining, manufacturing, operation, and decommissioning.</p>

      <h4 class="font-semibold mt-4 mb-2">Comparison:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Coal:</strong> 950 gCO2/kWh lifecycle</li>
        <li><strong>Natural Gas:</strong> 490 gCO2/kWh lifecycle</li>
        <li><strong>Solar:</strong> 45 gCO2/kWh (silicon purification)</li>
        <li><strong>Wind:</strong> 11 gCO2/kWh (steel/concrete)</li>
        <li><strong>Nuclear:</strong> 12 gCO2/kWh (uranium mining)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Key Insight:</h4>
      <p class="mb-4">Even including manufacturing, renewables are still 80-95% cleaner than fossil fuels! Solar pays back its carbon in 1-3 years, then generates clean power for 25-30 years.</p>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🔄 Future:</strong> Recycling wind blades and solar panels can cut lifecycle emissions another 20-40%!</p>
      </div>
    `,
    relatedTopics: ['carbon-emissions', 'renewable-energy']
  },

  'carbon.avoided-emissions': {
    id: 'carbon.avoided-emissions',
    title: 'Avoided Emissions from Clean Energy',
    shortText: 'How much pollution renewables prevent',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Pollution That Didn't Happen</h3>
      <p class="mb-4"><strong>Avoided emissions</strong> measure how much CO₂ we DIDN'T release because we used clean energy instead of fossil fuels.</p>

      <h4 class="font-semibold mt-4 mb-2">How It's Calculated:</h4>
      <div class="bg-slate-100 p-3 rounded mb-4 font-mono text-sm">
        Avoided = Clean Energy (kWh) × Grid Emission Factor (gCO2/kWh)
      </div>

      <h4 class="font-semibold mt-4 mb-2">Canada's Avoided Emissions (2023):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Hydro:</strong> 380 TWh → 228 Mt CO₂ avoided</li>
        <li><strong>Nuclear:</strong> 90 TWh → 54 Mt avoided</li>
        <li><strong>Wind:</strong> 40 TWh → 24 Mt avoided</li>
        <li><strong>Total:</strong> 309 Mt avoided = 65M cars off road!</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Compounding:</strong> Every TWh of clean energy avoids emissions EVERY YEAR for 30-80 years!</p>
      </div>
    `,
    relatedTopics: ['carbon-emissions', 'renewable-energy']
  },

  'carbon.net-zero': {
    id: 'carbon.net-zero',
    title: 'Net-Zero by 2050',
    shortText: 'Canada plan to eliminate emissions',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Canada's Climate Promise</h3>
      <p class="mb-4"><strong>Net-Zero by 2050</strong> means Canada will produce no more GHG emissions than it removes from the atmosphere.</p>

      <h4 class="font-semibold mt-4 mb-2">2030 Interim Targets (40-45% below 2005):</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Electricity:</strong> 90% zero-emission generation</li>
        <li><strong>Transport:</strong> 60% EV sales</li>
        <li><strong>Buildings:</strong> 50% heat pump adoption</li>
        <li><strong>Industry:</strong> CCUS in cement, steel, hydrogen</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2050 Net-Zero:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>100% clean electricity (renewables + nuclear)</li>
        <li>98% electric transport, 2% green hydrogen</li>
        <li>95% heat pumps in buildings</li>
        <li>50+ Mt/year negative emissions (DAC + forests)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Investment Required:</h4>
      <p class="mb-4"><strong>$125-140 billion/year</strong> through 2050 ($3.8 trillion total)</p>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🌍 Global:</strong> 130+ countries representing 88% of emissions have committed to net-zero by 2050-2070!</p>
      </div>
    `,
    relatedTopics: ['carbon-emissions', 'renewable-energy']
  },

  // ==================== ADD MORE AS NEEDED ====================
  // ==================== CRITICAL MINERALS (Phase 2) ====================

  'minerals.overview': {
    id: 'minerals.overview',
    title: 'Critical Minerals Supply Chain Dashboard',
    shortText: 'Track minerals essential for clean energy transition',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The Foundation of Clean Energy</h3>
      <p class="mb-4">Critical minerals are the raw materials needed for batteries, solar panels, wind turbines, and electric motors. Canada's $6.4B strategy aims to secure supply chains.</p>

      <h4 class="font-semibold mt-4 mb-2">Why Critical?</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Essential for EVs, batteries, renewables</li>
        <li>China controls 70-90% of processing</li>
        <li>Supply risk threatens energy transition</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Canada's Advantage:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>30% Investment Tax Credit for mining/processing</li>
        <li>World-class reserves (top 5 for most minerals)</li>
        <li>Clean hydro power = lower carbon footprint</li>
        <li>Proximity to US market</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💰 Opportunity:</strong> Critical minerals market worth $500B/year by 2030. Canada aims for $50B+ share.</p>
      </div>
    `,
    relatedTopics: ['minerals.supply-chain', 'minerals.battery-chemistry']
  },

  'minerals.supply-chain': {
    id: 'minerals.supply-chain',
    title: '6-Stage Supply Chain',
    shortText: 'From mine to battery manufacturing',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Mining → Refining → Manufacturing</h3>
      <p class="mb-4">Canada dominates Stage 1 (mining) but needs to build Stages 3-5 (refining/processing) where China captures most value.</p>

      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Stage</th>
            <th class="border px-2 py-1">Process</th>
            <th class="border px-2 py-1">Value Add</th>
            <th class="border px-2 py-1">Canada</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">1. Mining</td>
            <td class="border px-2 py-1">Extract ore</td>
            <td class="border px-2 py-1">$20/ton</td>
            <td class="border px-2 py-1 bg-green-100">Strong</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2. Concentration</td>
            <td class="border px-2 py-1">Crush, separate</td>
            <td class="border px-2 py-1">$1,000/ton</td>
            <td class="border px-2 py-1 bg-yellow-100">Moderate</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">3. Refining</td>
            <td class="border px-2 py-1">Chemical purification</td>
            <td class="border px-2 py-1">$25,000/ton</td>
            <td class="border px-2 py-1 bg-red-100">Weak</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">4. Cathode Production</td>
            <td class="border px-2 py-1">Mix into battery powder</td>
            <td class="border px-2 py-1">$55,000/ton</td>
            <td class="border px-2 py-1 bg-red-100">Very Weak</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">5. Cell Manufacturing</td>
            <td class="border px-2 py-1">Assemble batteries</td>
            <td class="border px-2 py-1">$150/kWh</td>
            <td class="border px-2 py-1 bg-yellow-100">Emerging</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">6. Recycling</td>
            <td class="border px-2 py-1">Recover minerals</td>
            <td class="border px-2 py-1">95% recovery</td>
            <td class="border px-2 py-1 bg-yellow-100">Growing</td>
          </tr>
        </tbody>
      </table>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Gap:</strong> Canada exports $20/ton ore, imports $25,000/ton refined material. $6.4B strategy fixes this.</p>
      </div>
    `,
    relatedTopics: ['minerals.overview', 'minerals.battery-chemistry']
  },

  'minerals.priority-list': {
    id: 'minerals.priority-list',
    title: 'Priority Minerals List',
    shortText: 'Lithium, Nickel, Cobalt, Graphite, Copper, REEs',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">The 6 Critical Minerals</h3>

      <h4 class="font-semibold mt-4 mb-2">1. Lithium - Battery Electrolyte</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>8-12 kg per EV battery</li>
        <li>Canada reserves: 930,000 tonnes</li>
        <li>Price: $15K-80K/ton (volatile!)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. Graphite - Battery Anode</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>50-70 kg per EV (most of any mineral)</li>
        <li>China: 70% natural, 100% spherical processing</li>
        <li>Export restrictions risk</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. Nickel - Energy Density</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>5-10 kg per EV (NMC batteries)</li>
        <li>Canada #3 globally (Vale Sudbury)</li>
        <li>Need Class 1 sulfate for batteries</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">4. Cobalt - Stability</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>2-8 kg per EV (decreasing)</li>
        <li>70% from DRC (ethical concerns)</li>
        <li>Canada: byproduct of nickel</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">5. Copper - Wiring/Motors</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>80 kg per EV (vs 20 kg gas car)</li>
        <li>2030: 8 Mt demand vs 6 Mt supply</li>
        <li>Wind turbines: 4-5 tonnes per MW</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">6. Rare Earths - Magnets</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li>1-2 kg per EV motor (Nd, Dy, Pr)</li>
        <li>China: 90% processing monopoly</li>
        <li>Canada: Nechalacho (NWT) mine</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Demand:</strong> All minerals will see 4-7× demand growth by 2030 vs 2020.</p>
      </div>
    `,
    relatedTopics: ['minerals.battery-chemistry', 'minerals.supply-chain']
  },

  'minerals.battery-chemistry': {
    id: 'minerals.battery-chemistry',
    title: 'Battery Chemistry Types',
    shortText: 'LFP vs NMC vs NCA explained',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">3 Main Battery Types</h3>

      <h4 class="font-semibold mt-4 mb-2">1. LFP (Lithium Iron Phosphate)</h4>
      <p class="mb-2"><strong>Recipe:</strong> LiFePO₄</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Pros:</strong> Safe, cheap, no cobalt/nickel</li>
        <li><strong>Cons:</strong> Lower energy density (125 Wh/kg)</li>
        <li><strong>Cost:</strong> $80-100/kWh</li>
        <li><strong>Used In:</strong> Tesla Standard Range, BYD, Chinese EVs</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. NMC (Nickel Manganese Cobalt)</h4>
      <p class="mb-2"><strong>Recipe:</strong> LiNi₀.₈Mn₀.₁Co₀.₁O₂ (NMC 811)</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Pros:</strong> Balanced performance, flexible chemistry</li>
        <li><strong>Cons:</strong> More expensive, cobalt ethical issues</li>
        <li><strong>Energy Density:</strong> 200-250 Wh/kg</li>
        <li><strong>Cost:</strong> $120-150/kWh</li>
        <li><strong>Used In:</strong> GM, VW, BMW, most Western EVs</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. NCA (Nickel Cobalt Aluminum)</h4>
      <p class="mb-2"><strong>Recipe:</strong> LiNi₀.₈Co₀.₁₅Al₀.₀₅O₂</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Pros:</strong> Highest energy density (260 Wh/kg)</li>
        <li><strong>Cons:</strong> Less stable, Tesla-exclusive</li>
        <li><strong>Used In:</strong> Tesla Model S, X (long range)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Future Chemistries:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Sodium-ion:</strong> No lithium, cheaper, lower density (CATL 2024)</li>
        <li><strong>Solid-state:</strong> 400+ Wh/kg, safer, 2027+ commercialization</li>
        <li><strong>Lithium-Sulfur:</strong> 500 Wh/kg theoretical, 2030+</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🔄 Trend:</strong> Tesla switching to LFP for standard models (no cobalt!), reserving NCA for performance.</p>
      </div>
    `,
    relatedTopics: ['minerals.priority-list', 'minerals.supply-chain']
  },

  // ==================== CCUS PROJECTS (Phase 2) ====================

  'ccus.overview': {
    id: 'ccus.overview',
    title: 'CCUS Projects Dashboard',
    shortText: 'Track carbon capture and storage projects',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Carbon Capture, Utilization & Storage</h3>
      <p class="mb-4"><strong>CCUS</strong> captures CO₂ from industrial facilities before it reaches the atmosphere, then stores it underground permanently or uses it for products.</p>

      <h4 class="font-semibold mt-4 mb-2">Why CCUS Matters:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Hard-to-Abate Sectors:</strong> Cement, steel, hydrogen can't easily electrify</li>
        <li><strong>Blue Hydrogen:</strong> Enables clean hydrogen from natural gas</li>
        <li><strong>Existing Assets:</strong> Keeps gas plants/refineries running cleaner</li>
        <li><strong>Negative Emissions:</strong> Direct Air Capture removes past CO₂</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Canada's CCUS Strategy:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Investment Tax Credit:</strong> 50-60% of CCUS project costs</li>
        <li><strong>Pathfinder Initiative:</strong> Alberta CCUS hubs ($16.5B Strathcona)</li>
        <li><strong>2030 Target:</strong> 15 Mt CO₂/year captured</li>
        <li><strong>Key Projects:</strong> Quest (8 Mt stored), Alberta Carbon Trunk Line</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">What This Dashboard Shows:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>CCUS projects by status (operational, planning, construction)</li>
        <li>Capture capacity & CO₂ stored to date</li>
        <li>Cost per tonne trends</li>
        <li>CCUS hubs & shared infrastructure</li>
        <li>Investment & ITC value</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 Scale:</strong> Quest project has stored 8 Mt CO₂ since 2015 with 99%+ retention rate. Proven technology!</p>
      </div>
    `,
    relatedTopics: ['ccus.technologies', 'ccus.economics', 'ccus.applications']
  },

  'ccus.technologies': {
    id: 'ccus.technologies',
    title: 'Carbon Capture Technologies',
    shortText: '4 ways to capture CO₂',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">How We Capture Carbon</h3>

      <h4 class="font-semibold mt-4 mb-2">1. Post-Combustion Capture</h4>
      <p class="mb-2"><strong>Process:</strong> Scrub CO₂ from flue gas AFTER burning fuel</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Technology:</strong> Amine solvents (MEA, MDEA)</li>
        <li><strong>Capture Rate:</strong> 85-95%</li>
        <li><strong>Energy Penalty:</strong> 25-30% (reduce plant efficiency)</li>
        <li><strong>Best For:</strong> Retrofitting existing power plants</li>
        <li><strong>Example:</strong> Boundary Dam (Sask) - 1 Mt/year</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. Pre-Combustion Capture</h4>
      <p class="mb-2"><strong>Process:</strong> Remove carbon BEFORE burning (IGCC, SMR)</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Technology:</strong> Steam methane reforming + H₂ separation</li>
        <li><strong>Capture Rate:</strong> 90-95%</li>
        <li><strong>Energy Penalty:</strong> 15-20% (better than post)</li>
        <li><strong>Best For:</strong> Blue hydrogen production</li>
        <li><strong>Example:</strong> Quest (Shell) - hydrogen from oil sands</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. Oxy-Fuel Combustion</h4>
      <p class="mb-2"><strong>Process:</strong> Burn fuel with pure oxygen (not air)</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Output:</strong> Nearly pure CO₂ stream (easy to capture)</li>
        <li><strong>Capture Rate:</strong> 90-95%</li>
        <li><strong>Challenge:</strong> Oxygen separation is energy-intensive</li>
        <li><strong>Best For:</strong> New-build power/industrial plants</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">4. Direct Air Capture (DAC)</h4>
      <p class="mb-2"><strong>Process:</strong> Suck CO₂ directly from ambient air</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Technology:</strong> Solid sorbents or liquid solvents</li>
        <li><strong>Concentration:</strong> 420 ppm (vs 10-15% in flue gas)</li>
        <li><strong>Cost:</strong> $300-600/tonne (expensive!)</li>
        <li><strong>Benefit:</strong> Can deploy anywhere, removes legacy CO₂</li>
        <li><strong>Example:</strong> Carbon Engineering (Squamish, BC)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Technology Comparison:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Technology</th>
            <th class="border px-2 py-1">Capture Rate</th>
            <th class="border px-2 py-1">Cost ($/ton)</th>
            <th class="border px-2 py-1">Maturity</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Post-Combustion</td>
            <td class="border px-2 py-1">85-95%</td>
            <td class="border px-2 py-1">$60-100</td>
            <td class="border px-2 py-1 bg-green-100">Commercial</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Pre-Combustion</td>
            <td class="border px-2 py-1">90-95%</td>
            <td class="border px-2 py-1">$50-80</td>
            <td class="border px-2 py-1 bg-green-100">Commercial</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Oxy-Fuel</td>
            <td class="border px-2 py-1">90-95%</td>
            <td class="border px-2 py-1">$70-110</td>
            <td class="border px-2 py-1 bg-yellow-100">Pilot</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Direct Air Capture</td>
            <td class="border px-2 py-1">N/A</td>
            <td class="border px-2 py-1">$300-600</td>
            <td class="border px-2 py-1 bg-yellow-100">Emerging</td>
          </tr>
        </tbody>
      </table>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚡ Energy Penalty:</strong> Capturing CO₂ requires significant energy (15-30% of plant output), which is why cheap power (hydro, nuclear) helps economics.</p>
      </div>
    `,
    relatedTopics: ['ccus.overview', 'ccus.economics']
  },

  'ccus.economics': {
    id: 'ccus.economics',
    title: 'CCUS Economics & Tax Credits',
    shortText: 'Costs, subsidies, and business case',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Making CCUS Economically Viable</h3>

      <h4 class="font-semibold mt-4 mb-2">Current Costs:</h4>
      <ul class="list-disc pl-5 space-y-2 mb-4">
        <li><strong>Capture:</strong> $50-150/tonne CO₂ (technology-dependent)</li>
        <li><strong>Transport:</strong> $5-20/tonne (pipeline distance)</li>
        <li><strong>Storage:</strong> $10-30/tonne (well injection, monitoring)</li>
        <li><strong>Total:</strong> $65-200/tonne all-in</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Canada Investment Tax Credit (ITC):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Application</th>
            <th class="border px-2 py-1">ITC Rate</th>
            <th class="border px-2 py-1">Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Direct Air Capture</td>
            <td class="border px-2 py-1 bg-green-100">60%</td>
            <td class="border px-2 py-1">$1B project → $600M credit</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Dedicated Geological Storage</td>
            <td class="border px-2 py-1 bg-yellow-100">50%</td>
            <td class="border px-2 py-1">Saline aquifer injection</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Other Applications</td>
            <td class="border px-2 py-1 bg-yellow-100">37.5%</td>
            <td class="border px-2 py-1">EOR, industrial use</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">US 45Q Tax Credit (Comparison):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Geological Storage:</strong> $85/tonne CO₂</li>
        <li><strong>EOR:</strong> $60/tonne CO₂</li>
        <li><strong>DAC:</strong> $180/tonne CO₂</li>
        <li><strong>Duration:</strong> 12 years of credits</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Breakeven Analysis Example:</h4>
      <p class="mb-2"><strong>Blue Hydrogen Facility ($1.5B capex):</strong></p>
      <div class="bg-slate-100 p-3 rounded mb-4 text-sm">
        <p>Capture Cost: $70/tonne × 3 Mt/year = $210M/year</p>
        <p>Revenue from H₂: $5/kg × 1,500 tonnes/day = $2.7B/year</p>
        <p>ITC: 50% × $1.5B = $750M (one-time)</p>
        <p>Payback: 4-6 years with ITC vs 10+ without</p>
      </div>

      <h4 class="font-semibold mt-4 mb-2">Market Drivers:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Carbon Price:</strong> $170/tonne by 2030 makes CCUS competitive</li>
        <li><strong>Clean Fuel Standards:</strong> Low-carbon hydrogen premium</li>
        <li><strong>Corporate ESG:</strong> Companies paying $50-100/tonne for offsets</li>
        <li><strong>Export Markets:</strong> EU/Japan demand low-carbon products</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💰 Strathcona Hub:</strong> $16.5B project with 60% ITC = $10B government support. Enables $50B+ in industrial investment.</p>
      </div>
    `,
    relatedTopics: ['ccus.technologies', 'ccus.applications']
  },

  'ccus.applications': {
    id: 'ccus.applications',
    title: 'CCUS Applications',
    shortText: 'Where CCUS makes sense',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Industries Using CCUS</h3>

      <h4 class="font-semibold mt-4 mb-2">1. Blue Hydrogen Production (Biggest)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Process:</strong> SMR of natural gas + CCUS → clean H₂</li>
        <li><strong>Capture Rate:</strong> 90-95% (pre-combustion)</li>
        <li><strong>Cost:</strong> $2-3/kg H₂ (vs $1-2 grey, $4-7 green)</li>
        <li><strong>Example:</strong> Air Products $1.3B facility - 3 Mt/year captured</li>
        <li><strong>Market:</strong> $50B+ opportunity in Canada by 2050</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. Cement Production</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Challenge:</strong> Chemical process releases CO₂ (CaCO₃ → CaO + CO₂)</li>
        <li><strong>Emissions:</strong> ~600 kg CO₂/tonne cement (can't avoid)</li>
        <li><strong>CCUS Potential:</strong> 85-90% capture from concentrated stream</li>
        <li><strong>Cost Impact:</strong> +$30-50/tonne cement (+15-20%)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. Steel Production</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Challenge:</strong> Blast furnaces produce 1.8 tonnes CO₂/tonne steel</li>
        <li><strong>Alternatives:</strong> H₂-based DRI (direct reduced iron)</li>
        <li><strong>CCUS Role:</strong> Capture from blast furnace gas (transitional)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">4. Natural Gas Power Plants</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Role:</strong> "Firm" backup for renewables</li>
        <li><strong>Capture:</strong> Post-combustion amine scrubbing</li>
        <li><strong>Cost:</strong> +$40-60/MWh (doubles electricity cost)</li>
        <li><strong>Alternative:</strong> Batteries + green hydrogen by 2035</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">5. Oil Sands (Alberta)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Emissions:</strong> 70-90 kg CO₂/barrel bitumen</li>
        <li><strong>Pathways Partnership:</strong> Industry consortium for CCUS</li>
        <li><strong>Target:</strong> Net-zero oil sands by 2050</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">6. Direct Air Capture (Future)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Purpose:</strong> Negative emissions (remove past CO₂)</li>
        <li><strong>Cost:</strong> $300-600/tonne (needs to drop to $100)</li>
        <li><strong>Scale Needed:</strong> 1-2 Gt/year globally by 2050</li>
        <li><strong>Canadian Advantage:</strong> Cheap hydro power (BC, Quebec)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Priority Ranking:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Application</th>
            <th class="border px-2 py-1">Mt CO₂/yr</th>
            <th class="border px-2 py-1">Economics</th>
            <th class="border px-2 py-1">Priority</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Blue Hydrogen</td>
            <td class="border px-2 py-1">10-15</td>
            <td class="border px-2 py-1 bg-green-100">Good</td>
            <td class="border px-2 py-1">High</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Cement</td>
            <td class="border px-2 py-1">3-5</td>
            <td class="border px-2 py-1 bg-yellow-100">Moderate</td>
            <td class="border px-2 py-1">High</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Oil Sands</td>
            <td class="border px-2 py-1">5-8</td>
            <td class="border px-2 py-1 bg-green-100">Good (ITC)</td>
            <td class="border px-2 py-1">High</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Power Plants</td>
            <td class="border px-2 py-1">2-4</td>
            <td class="border px-2 py-1 bg-red-100">Poor</td>
            <td class="border px-2 py-1">Low (phase out)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Direct Air Capture</td>
            <td class="border px-2 py-1">0.1-0.5</td>
            <td class="border px-2 py-1 bg-red-100">Very Expensive</td>
            <td class="border px-2 py-1">Future</td>
          </tr>
        </tbody>
      </table>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>🎯 Strategy:</strong> Focus on blue hydrogen (export market) and hard-to-abate sectors (cement, steel). Phase out fossil power by 2035.</p>
      </div>
    `,
    relatedTopics: ['ccus.technologies', 'ccus.economics', 'ccus.overview']
  },

  // ==================== HEAT PUMPS (Phase 3) ====================

  'heatpump.overview': {
    id: 'heatpump.overview',
    title: 'Heat Pump Technology Dashboard',
    shortText: 'Electrify home heating with heat pump rebates',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Electrifying Canada's Homes</h3>
      <p class="mb-4">Heat pumps are 3-4× more efficient than furnaces because they move heat instead of burning fuel. Canada targets 5-10 million heat pumps by 2030 to eliminate oil/gas heating.</p>

      <h4 class="font-semibold mt-4 mb-2">How Heat Pumps Work:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Reverse refrigeration cycle (same as AC in summer)</li>
        <li>Extract heat from outdoor air even at -30°C</li>
        <li>Deliver 3-4 units of heat per 1 unit of electricity (COP 3-4)</li>
        <li>Work with existing radiators/baseboard/forced-air</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Why Critical for Net-Zero:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Heating = 60% of residential energy use in Canada</li>
        <li>5.5M homes still use oil/propane (high carbon + cost)</li>
        <li>Heat pumps cut emissions 80-90% vs oil furnace</li>
        <li>Enable demand response (grid flexibility)</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💰 Savings:</strong> Average home saves $500-2,000/year switching from oil to heat pump (NB, NS, PEI).</p>
      </div>
    `,
    relatedTopics: ['heatpump.rebates', 'heatpump.types']
  },

  'heatpump.rebates': {
    id: 'heatpump.rebates',
    title: 'Heat Pump Rebate Programs',
    shortText: 'Stack federal and provincial rebates up to $18,000',
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Maximize Your Rebates</h3>
      <p class="mb-4">Federal and provincial programs can be combined ("stacked") to reduce upfront cost by 40-60%. Low-income households eligible for extra grants.</p>

      <h4 class="font-semibold mt-4 mb-2">Federal Programs:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Program</th>
            <th class="border px-2 py-1">Amount</th>
            <th class="border px-2 py-1">Eligibility</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Canada Greener Homes Grant</td>
            <td class="border px-2 py-1">$5,000</td>
            <td class="border px-2 py-1">Homeowners, requires EnerGuide audit ($600 rebated)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Oil to Heat Pump Affordability (OHPA)</td>
            <td class="border px-2 py-1">$5,000-10,000</td>
            <td class="border px-2 py-1">Atlantic/rural, oil/propane conversion, income-tested</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Canada Greener Homes Loan</td>
            <td class="border px-2 py-1">0% up to $40,000</td>
            <td class="border px-2 py-1">10 years, interest-free financing</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Provincial Top-Ups (Examples):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>BC CleanBC:</strong> $3,000-6,000 (income-tested)</li>
        <li><strong>Quebec Chauffez Vert:</strong> $3,500-8,500 (oil conversion priority)</li>
        <li><strong>Nova Scotia HomeWarming:</strong> $3,500 free installation (low-income)</li>
        <li><strong>Ontario Enbridge:</strong> $4,000-7,000 (natural gas customers)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Maximum Stack Example (NS low-income oil conversion):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>Federal OHPA: $10,000</li>
        <li>Federal Greener Homes: $5,000</li>
        <li>NS HomeWarming: $3,500</li>
        <li><strong>Total: $18,500</strong> for $15,000-20,000 system = 90% covered</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>⚡ Tip:</strong> Do EnerGuide audit first ($600 rebate covers cost). Identifies best upgrades and unlocks all federal programs.</p>
      </div>
    `,
    relatedTopics: ['heatpump.overview', 'heatpump.economics']
  },

  'heatpump.types': {
    id: 'heatpump.types',
    title: 'Heat Pump Types and Efficiency',
    shortText: 'Air-source vs ground-source, cold climate models',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Choosing the Right Heat Pump</h3>

      <h4 class="font-semibold mt-4 mb-2">1. Air-Source Heat Pumps (ASHP)</h4>
      <p class="mb-2"><strong>Most Popular:</strong> 95% of installations</p>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>How it works:</strong> Extract heat from outdoor air (even at -30°C)</li>
        <li><strong>Cost:</strong> $5,000-15,000 installed (ducted whole-home)</li>
        <li><strong>COP:</strong> 2.5-4.0 at 0°C, 1.5-2.5 at -25°C</li>
        <li><strong>Types:</strong> Ducted (central), ductless mini-splits (multi-zone)</li>
        <li><strong>Best for:</strong> Most Canadian homes, quick install (1-3 days)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. Ground-Source (Geothermal) Heat Pumps (GSHP)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>How it works:</strong> Extract heat from underground (constant 8-12°C)</li>
        <li><strong>Cost:</strong> $20,000-40,000 (drilling + system)</li>
        <li><strong>COP:</strong> 3.5-5.0 year-round (more efficient than ASHP)</li>
        <li><strong>Payback:</strong> 10-20 years vs ASHP (but 25+ year lifespan)</li>
        <li><strong>Best for:</strong> Rural properties with land, new construction</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. Cold Climate Heat Pumps (ccASHP)</h4>
      <p class="mb-2"><strong>Engineered for Canada:</strong> Mitsubishi Hyper-Heat, Carrier Greenspeed, Bosch IDS</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>100% heating capacity maintained at -25°C (vs 50% standard ASHP)</li>
        <li>Vapor injection compressor + larger heat exchanger</li>
        <li>NRCan requires cold climate rating for rebates (HSPF ≥ 9.0)</li>
        <li>Cost premium: $2,000-4,000 vs standard ASHP</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Key Ratings to Understand:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>COP (Coefficient of Performance):</strong> Heat out / electricity in (higher = better)</li>
        <li><strong>HSPF (Heating Seasonal Performance Factor):</strong> Efficiency over full winter (≥9.0 for rebates)</li>
        <li><strong>SEER (Seasonal Energy Efficiency Ratio):</strong> Cooling efficiency (bonus: heat pumps replace AC)</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Sizing:</strong> Oversized = short-cycling = inefficiency. Get Manual J calculation from installer (accounts for insulation, windows, climate).</p>
      </div>
    `,
    relatedTopics: ['heatpump.overview', 'heatpump.economics']
  },

  'heatpump.economics': {
    id: 'heatpump.economics',
    title: 'Heat Pump Economics and Savings',
    shortText: 'Operating costs, payback periods, total cost of ownership',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Total Cost of Ownership</h3>

      <h4 class="font-semibold mt-4 mb-2">Example: Nova Scotia Oil-to-Heat Pump Conversion</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Cost Item</th>
            <th class="border px-2 py-1">Oil Furnace</th>
            <th class="border px-2 py-1">Cold Climate Heat Pump</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Upfront Cost (after rebates)</td>
            <td class="border px-2 py-1">$4,000 (replacement)</td>
            <td class="border px-2 py-1">$2,000 (after $16K rebates)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Annual Heating Cost (2,500 L oil / 30,000 kWh)</td>
            <td class="border px-2 py-1">$3,500 ($1.40/L)</td>
            <td class="border px-2 py-1">$1,200 (10,000 kWh @ $0.12/kWh)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1 font-semibold">Payback Period</td>
            <td class="border px-2 py-1">-</td>
            <td class="border px-2 py-1 bg-green-100">1 year (saves $2,300/year)</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">15-Year Total Cost</td>
            <td class="border px-2 py-1">$56,500</td>
            <td class="border px-2 py-1 bg-green-100">$20,000 (saves $36,500!)</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Operating Cost by Fuel (per kWh thermal output):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Heat Pump (COP 3.0):</strong> $0.04/kWh (electricity $0.12/kWh ÷ 3)</li>
        <li><strong>Natural Gas (90% eff):</strong> $0.06/kWh ($8/GJ)</li>
        <li><strong>Propane (90% eff):</strong> $0.12/kWh ($30/GJ)</li>
        <li><strong>Oil Furnace (80% eff):</strong> $0.14/kWh ($1.40/L)</li>
        <li><strong>Electric Baseboard:</strong> $0.12/kWh (COP 1.0)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">When Payback is Longer:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Natural gas homes:</strong> 10-15 years (smaller savings, but still reduces emissions 30-50%)</li>
        <li><strong>No rebates:</strong> 5-8 years for oil, 15-20 years for gas</li>
        <li><strong>Ontario high electricity rates:</strong> Time-of-use shifts matter (heat at night = lower cost)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Hidden Benefits:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Free AC:</strong> Heat pumps cool in summer (vs $3,000+ separate AC system)</li>
        <li><strong>No tank leaks:</strong> Avoid $5,000-20,000 oil tank removal/cleanup</li>
        <li><strong>Home value:</strong> Heat pump adds $5,000-10,000 to resale (energy efficiency premium)</li>
        <li><strong>Grid services:</strong> Future revenue from demand response ($50-200/year potential)</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>📊 ROI Tip:</strong> Best economics for oil/propane conversions in Atlantic Canada and rural areas. Natural gas homes should wait for better rebates or pair with solar.</p>
      </div>
    `,
    relatedTopics: ['heatpump.rebates', 'heatpump.types']
  },

  // ==================== SMALL MODULAR REACTORS (Phase 3) ====================

  'smr.overview': {
    id: 'smr.overview',
    title: 'Small Modular Reactor Technology',
    shortText: 'Next-generation nuclear for clean baseload power',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Canada's Nuclear Future</h3>
      <p class="mb-4">SMRs are factory-built reactors (10-300 MW) vs traditional large reactors (1,000+ MW). OPG's Darlington SMR will be first grid-scale Gen IV reactor in North America (2029 target).</p>

      <h4 class="font-semibold mt-4 mb-2">Why SMRs vs Large Reactors:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Factory Construction:</strong> 80% built in factory = quality control, 3-4 year build vs 10+ years</li>
        <li><strong>Lower Capital Risk:</strong> $500M-1B per unit vs $10B+ for large reactor</li>
        <li><strong>Flexible Siting:</strong> Can replace coal plants, serve remote mines, produce hydrogen</li>
        <li><strong>Passive Safety:</strong> Gen IV designs shut down without power/operator (gravity, natural circulation)</li>
        <li><strong>Load Following:</strong> Can ramp up/down to complement renewables (vs baseload-only large reactors)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Canada's SMR Advantage:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li>70 years nuclear expertise (CANDU reactors)</li>
        <li>World-class regulator (CNSC) with SMR-specific licensing</li>
        <li>Domestic uranium supply (Cameco - 2nd largest globally)</li>
        <li>Federal SMR Action Plan: $1.2B+ funding committed</li>
        <li>3 vendors in CNSC Vendor Design Review (GE Hitachi, Westinghouse, X-energy)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Use Cases in Canada:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Grid Baseload:</strong> Replace retiring coal/gas (OPG Darlington 300 MW)</li>
        <li><strong>Remote Mines:</strong> Replace diesel (NWT diamond mines = $0.50/kWh diesel cost)</li>
        <li><strong>Industrial Heat:</strong> Oil sands SAGD, cement kilns (400-800°C process heat)</li>
        <li><strong>Hydrogen Production:</strong> High-temp electrolysis or thermochemical (pink hydrogen)</li>
      </ul>

      <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mt-4">
        <p class="text-sm"><strong>🇨🇦 Milestone:</strong> OPG received construction license for BWRX-300 (April 2025). First concrete 2026, commercial operation 2029.</p>
      </div>
    `,
    relatedTopics: ['smr.projects', 'smr.regulatory']
  },

  'smr.projects': {
    id: 'smr.projects',
    title: 'Canadian SMR Projects',
    shortText: 'OPG Darlington 2029, SaskPower, Chalk River',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Pipeline of SMR Deployments</h3>

      <h4 class="font-semibold mt-4 mb-2">1. OPG Darlington (Ontario) - CONSTRUCTION LICENSE ISSUED</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Reactor:</strong> GE Hitachi BWRX-300 (300 MW)</li>
        <li><strong>Cost:</strong> $5-7B for first unit (learning curve, expect $3-4B for 2nd)</li>
        <li><strong>Timeline:</strong> First concrete 2026, grid connection 2029</li>
        <li><strong>Significance:</strong> First Gen IV reactor in North America, demonstration for global export</li>
        <li><strong>Unique Features:</strong> Passive safety (72 hours no operator/power), 10% higher efficiency than Gen III</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2. SaskPower (Saskatchewan) - FEASIBILITY STUDY</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Target:</strong> 2030s, site TBD (Estevan coal replacement option)</li>
        <li><strong>Reactor Options:</strong> BWRX-300 (GE Hitachi) or Xe-100 (X-energy)</li>
        <li><strong>Context:</strong> Saskatchewan 40% coal (highest in Canada), needs baseload replacement</li>
        <li><strong>Challenge:</strong> Public support (polling 55% favor, 30% oppose)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">3. Canadian Nuclear Laboratories - Chalk River (Ontario)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Project:</strong> Micro-reactor demonstration (1-15 MW)</li>
        <li><strong>Vendors Competing:</strong> Westinghouse eVinci, X-energy Xe-Mobile, USNC MMR</li>
        <li><strong>Purpose:</strong> Off-grid applications, remote communities, industrial sites</li>
        <li><strong>Timeline:</strong> Vendor selection 2024-2025, operation 2028-2030</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">4. New Brunswick Point Lepreau (NB Power)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Plan:</strong> ARC-100 (100 MW sodium fast reactor) or BWRX-300</li>
        <li><strong>Status:</strong> Pre-feasibility, MOU with ARC Clean Energy</li>
        <li><strong>Timing:</strong> 2030s (after Point Lepreau CANDU refurbishment)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">5. Alberta Industrial SMRs (Proposed)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Application:</strong> Oil sands SAGD steam generation (replace natural gas boilers)</li>
        <li><strong>Interest:</strong> Capital Power, Suncor exploring feasibility</li>
        <li><strong>Emissions Impact:</strong> Could eliminate 30-40 Mt CO₂/year (10% of Canada's emissions!)</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>📈 Export Potential:</strong> If OPG Darlington succeeds, GE Hitachi projects 30+ BWRX-300 sales globally by 2035 (Poland, Estonia, Finland interest).</p>
      </div>
    `,
    relatedTopics: ['smr.overview', 'smr.regulatory']
  },

  'smr.regulatory': {
    id: 'smr.regulatory',
    title: 'CNSC Licensing Process',
    shortText: '4-stage approval: VDR, Site Prep, Construction, Operating',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Nuclear Regulatory Framework</h3>
      <p class="mb-4">Canadian Nuclear Safety Commission (CNSC) oversees all nuclear activities. SMRs follow 4-stage licensing process designed for Gen IV safety features.</p>

      <h4 class="font-semibold mt-4 mb-2">Stage 1: Vendor Design Review (VDR)</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Purpose:</strong> Pre-licensing technical assessment (optional but recommended)</li>
        <li><strong>Duration:</strong> 3-4 years, 3 phases (~$10-15M vendor cost)</li>
        <li><strong>Status:</strong> GE Hitachi BWRX-300 ✓ completed (2021), X-energy Xe-100 in Phase 3, Westinghouse eVinci in Phase 2</li>
        <li><strong>Output:</strong> CNSC technical report identifying areas needing further work</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Stage 2: Site Preparation License</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Requirements:</strong> Environmental impact statement, Indigenous consultation, site geotechnical studies</li>
        <li><strong>Duration:</strong> 1-2 years review</li>
        <li><strong>OPG Darlington:</strong> Issued 2023, allowed grading, excavation (no nuclear components)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Stage 3: Construction License</h4>
      <ul class="list-disc pl-5 space-y-1 mb-3">
        <li><strong>Key Documents:</strong> Final Safety Analysis Report (FSAR), Quality Assurance Program, Detailed Design</li>
        <li><strong>CNSC Review:</strong> 18-24 months (parallel with site prep work)</li>
        <li><strong>OPG Darlington:</strong> Issued April 2025 (first Gen IV construction license globally!)</li>
        <li><strong>Permits:</strong> Nuclear component installation, reactor assembly, fuel loading prep</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Stage 4: Operating License</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Requirements:</strong> Successful commissioning tests, operator training, emergency response plans</li>
        <li><strong>Duration:</strong> Typically 10-20 years (renewable), then relicensing process</li>
        <li><strong>Ongoing:</strong> CNSC inspections, annual compliance reports, public hearings every 5 years</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Key Regulatory Innovations for SMRs:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Passive Safety Credit:</strong> Reduced emergency planning zone (3 km vs 10 km for large reactors)</li>
        <li><strong>Factory QA:</strong> Accepts factory quality control for modular components (vs all on-site inspection)</li>
        <li><strong>Risk-Informed:</strong> Focuses on high-risk areas, streamlines low-risk items (faster than old prescriptive rules)</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>⚖️ Public Participation:</strong> CNSC mandates public hearings for each license stage. Indigenous communities have formal intervention rights. Documents public on CNSC registry.</p>
      </div>
    `,
    relatedTopics: ['smr.projects', 'smr.economics']
  },

  'smr.economics': {
    id: 'smr.economics',
    title: 'SMR Economics and Funding',
    shortText: 'CAPEX costs, federal support, hydrogen cogeneration revenue',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Cost and Investment Analysis</h3>

      <h4 class="font-semibold mt-4 mb-2">CAPEX Comparison ($/kW):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Technology</th>
            <th class="border px-2 py-1">CAPEX ($/kW)</th>
            <th class="border px-2 py-1">Capacity Factor</th>
            <th class="border px-2 py-1">LCOE ($/MWh)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">SMR (BWRX-300) - FOAK</td>
            <td class="border px-2 py-1">$15,000-20,000</td>
            <td class="border px-2 py-1">95%</td>
            <td class="border px-2 py-1">$120-150</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">SMR (BWRX-300) - NOAK (5th+)</td>
            <td class="border px-2 py-1 bg-green-100">$8,000-10,000</td>
            <td class="border px-2 py-1">95%</td>
            <td class="border px-2 py-1 bg-green-100">$70-90</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Large Nuclear (Gen III)</td>
            <td class="border px-2 py-1">$8,000-12,000</td>
            <td class="border px-2 py-1">90%</td>
            <td class="border px-2 py-1">$80-100</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Wind (Onshore)</td>
            <td class="border px-2 py-1">$2,000-3,000</td>
            <td class="border px-2 py-1">35%</td>
            <td class="border px-2 py-1">$40-60 + storage</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Natural Gas (CCGT)</td>
            <td class="border px-2 py-1">$1,200-1,800</td>
            <td class="border px-2 py-1">50-60%</td>
            <td class="border px-2 py-1">$60-80 + carbon tax</td>
          </tr>
        </tbody>
      </table>

      <p class="text-sm mb-4"><em>FOAK = First Of A Kind, NOAK = Nth Of A Kind. Learning curve critical for SMR economics.</em></p>

      <h4 class="font-semibold mt-4 mb-2">Federal Funding Programs:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Strategic Innovation Fund (SIF):</strong> $600M committed to OPG Darlington (cost-share with Ontario)</li>
        <li><strong>Clean Energy Fund:</strong> $300M for SMR development (CNL, vendor design reviews)</li>
        <li><strong>Investment Tax Credit (ITC):</strong> 30% for clean electricity (SMRs eligible as of 2024)</li>
        <li><strong>Export Development Canada:</strong> $1B financing facility for SMR exports (Poland, Estonia)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Revenue Stacking Opportunities:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Baseload Electricity:</strong> $80-120/MWh (Ontario IESO contracts, Alberta market)</li>
        <li><strong>Capacity Payments:</strong> $40-80/kW-year (availability payments for grid reliability)</li>
        <li><strong>Hydrogen Cogeneration:</strong> Use 10-20% thermal output for electrolysis ($2-4/kg pink H₂)</li>
        <li><strong>Industrial Steam:</strong> Replace natural gas boilers (oil sands = $200-300M/year savings potential)</li>
        <li><strong>District Heating:</strong> Cogeneration for municipalities (waste heat utilization)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">OPG Darlington Business Case:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Total Cost:</strong> $5.6B (FOAK, includes regulatory, engineering, construction)</li>
        <li><strong>Federal/Provincial Support:</strong> ~$1.5B grants + 30% ITC = $3.2B effective support</li>
        <li><strong>Net Cost to OPG:</strong> ~$2.4B for 300 MW = $8,000/kW (competitive with large nuclear)</li>
        <li><strong>Learning Curve:</strong> 2nd unit expected $3-4B (50% cost reduction, NOAK status)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Key Economic Challenges:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>FOAK Risk:</strong> First unit expensive (learning curve penalty $2-3B)</li>
        <li><strong>Long Build:</strong> 6-8 years (vs 2-3 years wind/solar) = financing costs</li>
        <li><strong>Public Acceptance:</strong> Local opposition can delay projects (see SaskPower polling)</li>
        <li><strong>Waste Management:</strong> Used fuel costs $5-10/MWh (federal long-term repository needed)</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Break-Even:</strong> SMRs need carbon price $80-120/tonne OR 5+ unit fleet to compete with gas. With 30% ITC + provincial support, OPG Darlington is economic.</p>
      </div>
    `,
    relatedTopics: ['smr.projects', 'smr.overview']
  },

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
    relatedTopics: ['grid.demand-response', 'grid.congestion']
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
    relatedTopics: ['grid.optimization.overview', 'grid.frequency-voltage']
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
    relatedTopics: ['grid.optimization.overview', 'grid.demand-response']
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
    relatedTopics: ['grid.optimization.overview', 'grid.congestion']
  },

  // ==================== CANADIAN CLIMATE POLICY (Phase 4.2) ====================

  'climate.policy.overview': {
    id: 'climate.policy.overview',
    title: 'Canadian Climate Policy Dashboard',
    shortText: 'Track federal climate policy compliance and progress',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Canada's Net-Zero Framework</h3>
      <p class="mb-4">Canada has committed to net-zero emissions by 2050, with interim targets of 40-45% below 2005 levels by 2030. Three major federal policies drive this: carbon pricing, clean fuel regulations, and net-zero accountability tracking.</p>

      <h4 class="font-semibold mt-4 mb-2">Key Federal Climate Policies:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Carbon Pricing:</strong> $80/tonne CO₂e in 2024, rising to $170/tonne by 2030. Applied via federal backstop or provincial equivalent systems.</li>
        <li><strong>Clean Fuel Regulations (CFR):</strong> Reduce lifecycle carbon intensity of fuels by 15 gCO₂e/MJ by 2030 (from 2016 baseline of ~90 gCO₂e/MJ for gasoline).</li>
        <li><strong>Net-Zero Emissions Accountability Act:</strong> Legally binding 5-year milestones, independent progress reports, climate action plans.</li>
        <li><strong>Clean Electricity Regulations:</strong> Phase out unabated fossil fuel generation by 2035 (natural gas without CCS).</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2030 Emissions Reduction Plan:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>2005 Baseline:</strong> 730 Mt CO₂e</li>
        <li><strong>2030 Target:</strong> 40-45% reduction = 440 Mt CO₂e (range: 401-438 Mt)</li>
        <li><strong>2022 Actual:</strong> 708 Mt CO₂e (only 3% reduction from 2005)</li>
        <li><strong>Gap to Close:</strong> 268-307 Mt CO₂e reduction needed in 8 years</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Sectoral Breakdown (2022 Emissions):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Oil & Gas:</strong> 189 Mt (27%) - highest sector, methane regulations + carbon pricing key levers</li>
        <li><strong>Transportation:</strong> 185 Mt (26%) - EV mandates (20% by 2026, 100% by 2035) + clean fuel standard</li>
        <li><strong>Buildings:</strong> 87 Mt (12%) - heat pump deployment, energy efficiency retrofits</li>
        <li><strong>Heavy Industry:</strong> 76 Mt (11%) - steel, cement (CCUS investment tax credits)</li>
        <li><strong>Electricity:</strong> 51 Mt (7%) - declining due to coal phase-out (complete by 2030)</li>
        <li><strong>Agriculture:</strong> 73 Mt (10%) - fertilizer emissions, livestock methane</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Reality Check:</strong> Canada's emissions have been flat since 2005 despite multiple climate plans. Achieving 40-45% reduction by 2030 requires unprecedented policy implementation + $15-20B/year investment.</p>
      </div>
    `,
    relatedTopics: ['climate.carbon-pricing', 'climate.clean-fuel', 'climate.net-zero']
  },

  'climate.carbon-pricing': {
    id: 'climate.carbon-pricing',
    title: 'Federal Carbon Pricing System',
    shortText: '$80/tonne in 2024, rising to $170/tonne by 2030',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Pan-Canadian Carbon Pricing Framework</h3>
      <p class="mb-4">Federal carbon pricing applies where provinces lack equivalent systems. Two mechanisms: fuel charge (consumers/businesses) and Output-Based Pricing System (large emitters).</p>

      <h4 class="font-semibold mt-4 mb-2">Carbon Price Schedule:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Year</th>
            <th class="border px-2 py-1">Carbon Price ($/tonne CO₂e)</th>
            <th class="border px-2 py-1">Gasoline Impact (¢/litre)</th>
            <th class="border px-2 py-1">Natural Gas Impact (¢/m³)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">2024</td>
            <td class="border px-2 py-1">$80</td>
            <td class="border px-2 py-1">17.6¢</td>
            <td class="border px-2 py-1">15.3¢</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2026</td>
            <td class="border px-2 py-1">$110</td>
            <td class="border px-2 py-1">24.2¢</td>
            <td class="border px-2 py-1">21.0¢</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2030</td>
            <td class="border px-2 py-1 bg-yellow-100">$170</td>
            <td class="border px-2 py-1">37.4¢</td>
            <td class="border px-2 py-1">32.5¢</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Provincial Systems (Equivalency Assessed):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Federal Backstop:</strong> ON, MB, SK, AB (fuel charge), NB, PE, NL, NU, YT, NT</li>
        <li><strong>Provincial Carbon Tax:</strong> BC ($80/tonne, rising to $170 by 2030)</li>
        <li><strong>Cap-and-Trade:</strong> Quebec (linked with California, ~$38 CAD/tonne in 2023 - below federal benchmark, top-up required)</li>
        <li><strong>Hybrid Systems:</strong> Alberta TIER (Technology Innovation and Emissions Reduction) for large emitters</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Output-Based Pricing System (OBPS):</h4>
      <p class="mb-2">For facilities emitting >50,000 tonnes CO₂e/year (power plants, refineries, cement):</p>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Benchmark:</strong> Sector-specific emissions intensity (e.g., 0.37 tonnes CO₂e/tonne cement)</li>
        <li><strong>Pay if Over:</strong> Facility pays $80/tonne for emissions above benchmark × production</li>
        <li><strong>Earn Credits if Under:</strong> Can sell credits to other facilities or bank for future</li>
        <li><strong>Example:</strong> Cement plant producing 1M tonnes at 0.40 tCO₂e/tonne pays (0.40-0.37) × 1M × $80 = $2.4M</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Revenue Recycling:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Direct Rebates (Households):</strong> 90% of federal fuel charge revenue returned via Climate Action Incentive Payment. Example: Ontario family of 4 receives $976 in 2024.</li>
        <li><strong>Small Business Support:</strong> 10% of revenue funds small business energy efficiency programs</li>
        <li><strong>Provincial Flexibility:</strong> Provinces can design own systems if equivalent stringency (BC uses revenue for transit, clean tech)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Effectiveness and Challenges:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Emissions Reduction:</strong> ECCC estimates carbon pricing will reduce 2030 emissions by 50-60 Mt CO₂e (vs business-as-usual)</li>
        <li><strong>Competitiveness Concerns:</strong> Energy-intensive trade-exposed industries (steel, aluminum) lobby for exemptions/rebates</li>
        <li><strong>Political Volatility:</strong> Opposition parties pledge to repeal carbon tax if elected (2025 federal election risk)</li>
      </ul>

      <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
        <p class="text-sm"><strong>💰 Economic Impact:</strong> At $170/tonne in 2030, carbon pricing generates $35-40B/year federal revenue. Rebates make 8/10 households net better off (lower-income use less fuel).</p>
      </div>
    `,
    relatedTopics: ['climate.policy.overview', 'climate.clean-fuel']
  },

  'climate.clean-fuel': {
    id: 'climate.clean-fuel',
    title: 'Clean Fuel Regulations',
    shortText: 'Reduce fuel carbon intensity 15% by 2030',
    difficulty: 'advanced',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Lifecycle Carbon Intensity Reduction</h3>
      <p class="mb-4">Clean Fuel Regulations (CFR) require fuel suppliers to reduce lifecycle carbon intensity of gasoline, diesel, and fossil gas sold in Canada. Came into effect July 2023.</p>

      <h4 class="font-semibold mt-4 mb-2">Reduction Targets (from 2016 baseline):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Fuel Type</th>
            <th class="border px-2 py-1">2016 Baseline (gCO₂e/MJ)</th>
            <th class="border px-2 py-1">2030 Target Reduction</th>
            <th class="border px-2 py-1">2030 Target (gCO₂e/MJ)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Gasoline</td>
            <td class="border px-2 py-1">93.67</td>
            <td class="border px-2 py-1">15 gCO₂e/MJ</td>
            <td class="border px-2 py-1 bg-green-100">78.67</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Diesel</td>
            <td class="border px-2 py-1">95.99</td>
            <td class="border px-2 py-1">13 gCO₂e/MJ</td>
            <td class="border px-2 py-1 bg-green-100">82.99</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Fossil Gas (heating/industry)</td>
            <td class="border px-2 py-1">65.07</td>
            <td class="border px-2 py-1">6 gCO₂e/MJ</td>
            <td class="border px-2 py-1 bg-green-100">59.07</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">How Suppliers Comply (Credit System):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Biofuel Blending:</strong> E10 gasoline (10% ethanol), B5 diesel (5% biodiesel). Ethanol ~45% lower CI than gasoline.</li>
        <li><strong>Advanced Biofuels:</strong> Renewable diesel (RD), sustainable aviation fuel (SAF). Can have 70-90% lower CI.</li>
        <li><strong>Electric Vehicle Charging:</strong> Credit for supplying EV charging infrastructure (based on kWh delivered × avoided gasoline emissions)</li>
        <li><strong>Hydrogen Blending:</strong> Renewable/blue hydrogen into natural gas pipeline (small volumes, max 5-10%)</li>
        <li><strong>Carbon Capture:</strong> CCS at refineries reduces production emissions → credit</li>
        <li><strong>Buy Credits:</strong> Purchase excess credits from overperformers or banking from previous years</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Projected Compliance Costs:</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Year</th>
            <th class="border px-2 py-1">Gasoline (¢/litre)</th>
            <th class="border px-2 py-1">Diesel (¢/litre)</th>
            <th class="border px-2 py-1">Natural Gas ($/GJ)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">2024-2026</td>
            <td class="border px-2 py-1">6-8¢</td>
            <td class="border px-2 py-1">5-7¢</td>
            <td class="border px-2 py-1">$0.50-0.80</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">2027-2030</td>
            <td class="border px-2 py-1">13-17¢</td>
            <td class="border px-2 py-1">11-15¢</td>
            <td class="border px-2 py-1">$1.20-1.50</td>
          </tr>
        </tbody>
      </table>

      <p class="text-sm mb-4"><em>Note: These costs are IN ADDITION to carbon pricing. Combined impact by 2030: ~50¢/litre gasoline.</em></p>

      <h4 class="font-semibold mt-4 mb-2">Emissions Impact:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>2030 Reduction:</strong> 26-28 Mt CO₂e/year (roughly equivalent to removing 6M cars from roads)</li>
        <li><strong>Pathway:</strong> 50% from biofuel blending, 30% from EV adoption, 20% from operational efficiency improvements</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Industry Challenges:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Biofuel Supply Constraints:</strong> Canada imports 60% of ethanol (US). Limited domestic advanced biofuel production.</li>
        <li><strong>Food vs Fuel:</strong> Corn ethanol criticized for land use competition. Shift to cellulosic/waste feedstocks needed.</li>
        <li><strong>Infrastructure Gaps:</strong> Limited renewable diesel refining capacity in Canada. Reliant on US imports (LCFS premium in CA).</li>
        <li><strong>Cross-Border Leakage:</strong> US border states with no clean fuel standard = incentive to import cheaper fuel</li>
      </ul>

      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Opportunity:</strong> CFR creates $10-15B market for low-carbon fuels by 2030. Renewable diesel, SAF, renewable natural gas (RNG) from waste sectors positioned for growth.</p>
      </div>
    `,
    relatedTopics: ['climate.carbon-pricing', 'climate.net-zero']
  },

  'climate.net-zero': {
    id: 'climate.net-zero',
    title: 'Net-Zero Emissions Accountability Act',
    shortText: 'Legally binding 2050 net-zero target with 5-year milestones',
    difficulty: 'intermediate',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">Legislated Climate Accountability</h3>
      <p class="mb-4">Passed in 2021, the Net-Zero Emissions Accountability Act enshrines Canada's 2050 net-zero commitment in law. Requires binding 5-year targets, progress reports, and independent oversight.</p>

      <h4 class="font-semibold mt-4 mb-2">Key Provisions:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>National Targets:</strong> Minister must set emissions targets for 2030, 2035, 2040, 2045 (2030 = 40-45% below 2005 already set)</li>
        <li><strong>Climate Action Plans:</strong> Detailed plans within 9 months of each target, outlining policies and measures</li>
        <li><strong>Progress Reports:</strong> Annual reporting on emissions trajectory, policy implementation</li>
        <li><strong>Independent Advice:</strong> Net-Zero Advisory Body (15 experts) provides non-binding recommendations</li>
        <li><strong>5-Year Assessment:</strong> Commissioner of Environment and Sustainable Development audits progress</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">2030 Emissions Reduction Plan (March 2022):</h4>
      <table class="min-w-full border text-sm mb-4">
        <thead>
          <tr class="bg-slate-100">
            <th class="border px-2 py-1">Sector</th>
            <th class="border px-2 py-1">2022 Emissions</th>
            <th class="border px-2 py-1">2030 Target</th>
            <th class="border px-2 py-1">Key Policies</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border px-2 py-1">Oil & Gas</td>
            <td class="border px-2 py-1">189 Mt</td>
            <td class="border px-2 py-1">110-119 Mt</td>
            <td class="border px-2 py-1">Emissions cap, methane regulations</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Transport</td>
            <td class="border px-2 py-1">185 Mt</td>
            <td class="border px-2 py-1">115-120 Mt</td>
            <td class="border px-2 py-1">EV mandates, clean fuel standard</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Buildings</td>
            <td class="border px-2 py-1">87 Mt</td>
            <td class="border px-2 py-1">42-49 Mt</td>
            <td class="border px-2 py-1">Heat pumps, energy retrofits</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Industry</td>
            <td class="border px-2 py-1">76 Mt</td>
            <td class="border px-2 py-1">49-55 Mt</td>
            <td class="border px-2 py-1">CCUS ITCs, performance standards</td>
          </tr>
          <tr>
            <td class="border px-2 py-1">Electricity</td>
            <td class="border px-2 py-1">51 Mt</td>
            <td class="border px-2 py-1">5-8 Mt</td>
            <td class="border px-2 py-1">Coal phase-out, CER 2035</td>
          </tr>
        </tbody>
      </table>

      <h4 class="font-semibold mt-4 mb-2">Net-Zero Advisory Body Recommendations (2023):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Oil & Gas Cap:</strong> Implement sector emissions cap by 2025 (100 Mt ceiling recommended)</li>
        <li><strong>Phase Out Fossil Fuel Subsidies:</strong> Eliminate by 2025 (currently $4-5B/year federal support)</li>
        <li><strong>Just Transition Legislation:</strong> Support workers/communities in shift from fossil fuels (Bill C-50 introduced 2023)</li>
        <li><strong>Indigenous Climate Leadership:</strong> $500M fund for Indigenous-led conservation, clean energy projects</li>
        <li><strong>Nature-Based Solutions:</strong> Protect/restore wetlands, forests (30-40 Mt CO₂e annual sequestration potential)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">Progress Tracking (2024 Update):</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Current Trajectory:</strong> 591 Mt in 2030 (with announced policies) - MISSES 40-45% target by 150+ Mt</li>
        <li><strong>Policy Gap:</strong> Need additional measures worth 150-190 Mt CO₂e reduction</li>
        <li><strong>Implementation Risk:</strong> Many policies announced but not yet implemented (oil & gas cap, clean electricity regs)</li>
      </ul>

      <h4 class="font-semibold mt-4 mb-2">International Comparison:</h4>
      <ul class="list-disc pl-5 space-y-1 mb-4">
        <li><strong>UK:</strong> Net-zero by 2050, legally binding carbon budgets (5-year periods). On track to meet 2030 target (68% below 1990).</li>
        <li><strong>EU:</strong> Net-zero by 2050, 55% below 1990 by 2030. Emissions trading system, fit-for-55 package.</li>
        <li><strong>Canada Challenge:</strong> Growing population, cold climate, large geography = higher per-capita emissions baseline</li>
      </ul>

      <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
        <p class="text-sm"><strong>⚠️ Accountability Gap:</strong> Act has no enforcement mechanism if targets missed. Political pressure only tool. Some advocate for penalty provisions (e.g., automatic carbon price increase if off track).</p>
      </div>
    `,
    relatedTopics: ['climate.policy.overview', 'climate.carbon-pricing']
  },

};

/**
 * Get help content by ID
 * Falls back to auto-generated content if not found
 */
export function getHelpContent(id: string): HelpContentItem {
  // Check if we have custom content
  if (HELP_CONTENT_DATABASE[id]) {
    return HELP_CONTENT_DATABASE[id];
  }

  // Generate friendly fallback for missing content
  const title = id
    .split('.')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).replace(/_/g, ' '))
    .join(' - ');

  return {
    id,
    title,
    shortText: `Learn about ${title}`,
    difficulty: 'beginner',
    bodyHtml: `
      <h3 class="text-lg font-semibold mb-3">${title}</h3>
      <p class="mb-4">Detailed help content for this feature is being developed.</p>
      <p class="mb-4">This feature is fully functional and ready to use.</p>
      
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
        <p class="text-sm"><strong>💡 Need Help?</strong> If you have questions about this feature, please contact your instructor or check the platform documentation.</p>
      </div>
    `
  };
}

/**
 * Get short tooltip text for quick help
 */
export function getShortHelp(id: string): string {
  const content = HELP_CONTENT_DATABASE[id];
  return content?.shortText || 'Click for more information';
}

/**
 * Search help content
 */
export function searchHelpContent(query: string): HelpContentItem[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(HELP_CONTENT_DATABASE).filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.shortText.toLowerCase().includes(lowerQuery) ||
    item.bodyHtml.toLowerCase().includes(lowerQuery)
  );
}
