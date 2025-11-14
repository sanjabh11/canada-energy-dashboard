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

  // ==================== ADD MORE AS NEEDED ====================
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
