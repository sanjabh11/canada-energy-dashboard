/**
 * Certificate Module Content
 *
 * 15 educational modules across 3 certificate tracks:
 * - Residential Energy Management (5 modules)
 * - Grid Operations & Trading (5 modules)
 * - Policy & Regulatory Compliance (5 modules)
 *
 * Each module includes content_data specific to its type:
 * - video: { url, duration, transcript }
 * - reading: { content (markdown), estimatedReadTime }
 * - quiz: { questions[], passingScore }
 * - interactive: { tool, parameters }
 */

export type ContentType = 'video' | 'reading' | 'quiz' | 'interactive';

export interface VideoContent {
  url: string;
  duration: number; // seconds
  transcript?: string;
  thumbnailUrl?: string;
}

export interface ReadingContent {
  content: string; // Markdown
  estimatedReadTime: number; // minutes
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  explanation: string;
}

export interface QuizContent {
  questions: QuizQuestion[];
  passingScore: number; // Percentage (e.g., 80 = 80%)
}

export interface InteractiveContent {
  tool: 'calculator' | 'simulator' | 'comparison';
  title: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface Module {
  id: string;
  track_id: string;
  track_slug: string;
  title: string;
  description: string;
  sequence_number: number;
  duration_minutes: number;
  content_type: ContentType;
  content_data: VideoContent | ReadingContent | QuizContent | InteractiveContent;
  learning_objectives: string[];
  prerequisites?: string[];
}

/**
 * Track 1: Residential Energy Management
 * Focus: Homeowners, residential energy advisors
 */
export const RESIDENTIAL_MODULES: Module[] = [
  {
    id: 'res-001',
    track_id: 'track-residential',
    track_slug: 'residential-energy',
    title: 'Understanding Your Home Energy Bill',
    description: 'Learn to decode electricity bills, understand time-of-use rates, and identify cost-saving opportunities.',
    sequence_number: 1,
    duration_minutes: 25,
    content_type: 'reading',
    content_data: {
      content: `# Understanding Your Home Energy Bill

## Introduction

Your electricity bill contains valuable information about your energy consumption patterns. Understanding these details is the first step toward reducing costs and environmental impact.

## Key Components of an Energy Bill

### 1. Energy Charges (¢/kWh)
- **What it is**: The cost per kilowatt-hour (kWh) of electricity consumed
- **Typical range in Canada**: 8-15¢/kWh depending on province
- **Alberta average**: ~12¢/kWh (deregulated market)

### 2. Delivery Charges
- **Transmission**: Moving electricity from generators to your region
- **Distribution**: Delivering power to your home
- **Combined cost**: Often 30-40% of total bill

### 3. Time-of-Use (TOU) Rates
Many provinces offer TOU pricing:
- **On-Peak** (highest cost): Weekdays 7am-11am, 5pm-9pm
- **Mid-Peak** (medium cost): Weekdays 11am-5pm
- **Off-Peak** (lowest cost): Nights, weekends, holidays

**Example savings**: Shifting dishwasher run from 7pm to 11pm can save 40% on that load.

## Reading Your Consumption Data

### Understanding kWh Usage
- **1 kWh** = Running a 1000W appliance for 1 hour
- **Average Canadian home**: 900-1100 kWh/month
- **Efficient home**: 600-800 kWh/month

### Seasonal Patterns
- **Winter peak**: Heating (electric furnaces, heat pumps)
- **Summer peak**: Air conditioning
- **Shoulder seasons**: Lowest consumption

## Cost-Saving Strategies

### 1. Shift High-Energy Activities
- Run dishwasher, laundry during off-peak hours
- Charge EVs overnight
- Use programmable thermostats

### 2. Identify Energy Vampires
Appliances that consume power even when "off":
- Cable boxes: ~30W continuous
- Gaming consoles: ~15W standby
- Phone chargers: ~5W when plugged in

**Solution**: Use smart power bars with auto-shutoff

### 3. Monitor High-Impact Appliances
Top 5 household energy consumers:
1. **HVAC system**: 40-50% of total
2. **Water heater**: 15-20%
3. **Appliances** (fridge, washer, dryer): 15-20%
4. **Lighting**: 10-15%
5. **Electronics**: 5-10%

## Alberta-Specific Considerations

### Regulated Rate Option (RRO)
- Variable rate set monthly
- Reflects wholesale market conditions
- Can fluctuate significantly

### Competitive Retail Market
- Fixed-rate contracts (1-5 years)
- Protection from price spikes
- Compare rates at ucahelps.alberta.ca

### Green Energy Programs
- EPCOR GreenPower: Pay premium for renewable energy
- Enmax EasyMax Green: 50% or 100% renewable options

## Action Items

After completing this module:
1. ✓ Locate your most recent electricity bill
2. ✓ Identify your consumption (kWh/month)
3. ✓ Calculate your effective rate ($/kWh)
4. ✓ Check if you're on TOU or flat rate
5. ✓ Compare to Canadian average (900 kWh/month)

## Next Module Preview

**Module 2** will cover home energy audits and how to identify specific inefficiencies using free and low-cost tools.

---

**Did you know?**
Canadians pay among the lowest electricity rates in the world, but we also consume more per capita than most countries. Efficiency improvements can save $200-500/year for the average household.
`,
      estimatedReadTime: 15
    },
    learning_objectives: [
      'Understand all components of an electricity bill',
      'Calculate effective electricity rate (¢/kWh)',
      'Identify time-of-use pricing opportunities',
      'Compare personal consumption to Canadian averages',
      'List top 5 household energy consumers'
    ]
  },
  {
    id: 'res-002',
    track_id: 'track-residential',
    track_slug: 'residential-energy',
    title: 'Home Energy Audit Fundamentals',
    description: 'Conduct a DIY energy audit using free tools and identify quick wins for efficiency improvements.',
    sequence_number: 2,
    duration_minutes: 30,
    content_type: 'video',
    content_data: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - replace with actual energy audit video
      duration: 1200, // 20 minutes
      transcript: 'This video demonstrates how to conduct a comprehensive home energy audit...',
      thumbnailUrl: 'https://via.placeholder.com/640x360/0ea5e9/ffffff?text=Energy+Audit+Video'
    },
    learning_objectives: [
      'Identify common air leaks using visual inspection',
      'Use thermal imaging (smartphone apps) to find heat loss',
      'Assess insulation quality in attic and walls',
      'Evaluate window and door efficiency',
      'Create prioritized improvement list based on ROI'
    ],
    prerequisites: ['res-001']
  },
  {
    id: 'res-003',
    track_id: 'track-residential',
    track_slug: 'residential-energy',
    title: 'HVAC Efficiency & Smart Thermostats',
    description: 'Optimize your heating and cooling systems for maximum efficiency and comfort.',
    sequence_number: 3,
    duration_minutes: 20,
    content_type: 'quiz',
    content_data: {
      questions: [
        {
          id: 'hvac-q1',
          question: 'What percentage of home energy consumption does HVAC typically represent?',
          options: ['10-20%', '25-35%', '40-50%', '60-70%'],
          correctAnswer: 2,
          explanation: 'HVAC systems typically account for 40-50% of total home energy consumption, making them the largest single energy user in most homes.'
        },
        {
          id: 'hvac-q2',
          question: 'What is the recommended thermostat setback for sleeping hours in winter?',
          options: ['1-2°C', '3-4°C', '5-6°C', '7-8°C'],
          correctAnswer: 1,
          explanation: 'A setback of 3-4°C (e.g., from 21°C to 17°C) during sleeping hours is recommended. This provides optimal energy savings without sacrificing comfort or causing excessive strain on the heating system.'
        },
        {
          id: 'hvac-q3',
          question: 'How often should furnace filters be changed during peak heating season?',
          options: ['Every 6 months', 'Every 3 months', 'Every month', 'Every 2 weeks'],
          correctAnswer: 2,
          explanation: 'During peak heating (or cooling) season, filters should be checked monthly and changed as needed. Dirty filters reduce airflow, forcing the system to work harder and consume more energy.'
        },
        {
          id: 'hvac-q4',
          question: 'Which smart thermostat feature provides the most energy savings?',
          options: ['Remote control via smartphone', 'Learning algorithms for occupancy patterns', 'Voice control integration', 'Color touchscreen display'],
          correctAnswer: 1,
          explanation: 'Learning algorithms that automatically adjust based on occupancy patterns provide the most significant savings (10-23% on average) by ensuring heating/cooling only when needed without manual intervention.'
        },
        {
          id: 'hvac-q5',
          question: 'What is the ideal temperature setting for a heat pump to maximize efficiency?',
          options: ['Constant temperature (no setbacks)', 'Frequent adjustments throughout day', 'Large setbacks (5°C+) when away', 'Maximum temperature setting'],
          correctAnswer: 0,
          explanation: 'Heat pumps work most efficiently at a constant temperature. Large setbacks can trigger auxiliary electric heating during recovery, which is less efficient. Small setbacks (1-2°C) are acceptable.'
        },
        {
          id: 'hvac-q6',
          question: 'What is the minimum recommended attic insulation value (RSI) for Canadian homes?',
          options: ['RSI 3.5 (R-20)', 'RSI 5.3 (R-30)', 'RSI 7.0 (R-40)', 'RSI 8.8 (R-50)'],
          correctAnswer: 3,
          explanation: 'The Canadian building code recommends minimum RSI 8.8 (R-50) for attic insulation in most climates. Proper insulation significantly reduces HVAC load and energy consumption.'
        },
        {
          id: 'hvac-q7',
          question: 'Which action provides the best immediate return on investment for HVAC efficiency?',
          options: ['Replace entire HVAC system', 'Install smart thermostat', 'Seal air leaks around windows/doors', 'Upgrade to high-efficiency filters'],
          correctAnswer: 2,
          explanation: 'Sealing air leaks provides the best immediate ROI, often saving 10-20% on heating/cooling costs with minimal investment. It should be done before upgrading equipment or controls.'
        },
        {
          id: 'hvac-q8',
          question: 'What is the expected lifespan of a residential furnace in Canada?',
          options: ['8-12 years', '15-20 years', '25-30 years', '35-40 years'],
          correctAnswer: 1,
          explanation: 'A well-maintained residential furnace typically lasts 15-20 years in Canadian climates. Regular maintenance can extend lifespan, while neglect can shorten it significantly.'
        }
      ],
      passingScore: 75
    },
    learning_objectives: [
      'Explain HVAC impact on home energy consumption',
      'Configure smart thermostat for optimal savings',
      'Understand heat pump efficiency principles',
      'Identify when HVAC maintenance is needed',
      'Calculate potential savings from thermostat setbacks'
    ],
    prerequisites: ['res-001', 'res-002']
  },
  {
    id: 'res-004',
    track_id: 'track-residential',
    track_slug: 'residential-energy',
    title: 'Solar PV ROI Calculator',
    description: 'Calculate the return on investment for residential solar installations using real Alberta data.',
    sequence_number: 4,
    duration_minutes: 25,
    content_type: 'interactive',
    content_data: {
      tool: 'calculator',
      title: 'Residential Solar ROI Calculator',
      description: 'Input your home details to calculate solar panel ROI, payback period, and lifetime savings.',
      parameters: {
        inputs: [
          { name: 'monthlyBill', label: 'Average Monthly Bill ($)', type: 'number', default: 150 },
          { name: 'roofArea', label: 'Available Roof Area (sq ft)', type: 'number', default: 400 },
          { name: 'systemSize', label: 'System Size (kW)', type: 'number', default: 5 },
          { name: 'installCost', label: 'Installation Cost ($)', type: 'number', default: 12500 },
          { name: 'province', label: 'Province', type: 'select', options: ['AB', 'BC', 'SK', 'MB', 'ON'], default: 'AB' }
        ],
        calculations: {
          annualProduction: 'systemSize * 1200', // kWh/kW/year for Alberta
          annualSavings: 'annualProduction * 0.12', // $0.12/kWh
          paybackPeriod: 'installCost / annualSavings',
          lifetimeSavings: '(annualSavings * 25) - installCost',
          co2Offset: 'annualProduction * 0.5' // kg CO2/year
        }
      }
    },
    learning_objectives: [
      'Calculate solar PV system size needed for home',
      'Estimate payback period for Alberta installations',
      'Understand net metering and microgeneration programs',
      'Compare solar ROI across Canadian provinces',
      'Identify financing options (PACE, green mortgages)'
    ],
    prerequisites: ['res-001', 'res-002']
  },
  {
    id: 'res-005',
    track_id: 'track-residential',
    track_slug: 'residential-energy',
    title: 'Government Rebates & Incentives',
    description: 'Navigate federal and provincial rebate programs to maximize savings on energy upgrades.',
    sequence_number: 5,
    duration_minutes: 30,
    content_type: 'reading',
    content_data: {
      content: `# Government Rebates & Incentives for Home Energy Upgrades

## Federal Programs

### Canada Greener Homes Grant
**Amount**: Up to $5,000 + $600 for EnergyGuide evaluation
**Eligibility**: Homeowners, principal residence
**Qualifying upgrades**:
- Insulation improvements
- Air sealing
- Windows and doors
- Heating systems (furnaces, heat pumps)
- Solar PV systems
- Smart thermostats

**Application process**:
1. Book pre-retrofit EnergyGuide evaluation ($600 grant)
2. Complete recommended upgrades
3. Book post-retrofit evaluation
4. Receive grant payment (up to $5,000)

### Canada Greener Homes Loan
**Amount**: Up to $40,000 interest-free
**Term**: 10 years
**Can be combined with**: Greener Homes Grant
**Use**: Major renovations (heat pumps, solar, deep retrofits)

## Provincial Programs (Alberta)

### Residential and Commercial Solar Program
**Amount**: $0.75/W for solar PV (up to 35% of cost)
**Maximum**: $10,500 for systems up to 14kW
**Eligibility**: Alberta homeowners
**Website**: energy.alberta.ca/solar

### Municipal Utility Rebates

#### EPCOR (Edmonton)
- Fridge recycling: $50
- Showerhead swap: FREE
- Smart thermostat: $100 rebate
- Home energy kit: FREE

#### ENMAX (Calgary)
- Energy efficiency assessment: $75
- Furnace rebate: Up to $1,000
- Window rebates: Up to $400
- Insulation rebates: $1/sq ft

## Stacking Strategies

### Example: Heat Pump Installation
1. **Federal grant**: $5,000 (Greener Homes)
2. **Provincial rebate**: $1,000 (utility-specific)
3. **Federal loan**: $15,000 (interest-free)
**Total support**: $6,000 grant + $15,000 loan for ~$18,000 installation

**Net cost after grants**: $12,000
**Payback period**: 8-10 years (from energy savings)

### Example: Solar PV System (7kW)
1. **Federal grant**: $5,000 (Greener Homes)
2. **Provincial rebate**: $5,250 (7kW × $0.75/W)
3. **Federal loan**: $10,000 (interest-free)
**Total support**: $10,250 grant + $10,000 loan for ~$21,000 installation

**Net cost after grants**: $10,750
**Payback period**: 6-8 years (from energy savings)

## Indigenous-Specific Programs

### Indigenous Community Energy Program
- 100% funding for energy retrofits on-reserve
- Technical assistance for project planning
- Priority for First Nations, Inuit, Métis communities

## Low-Income Programs

### Energy Savings for Business & Industry
**For multi-unit residential buildings**:
- Free energy assessments
- Rebates up to 70% of upgrade costs
- LED lighting rebates
- HVAC system rebates

## Application Tips

### 1. Start with EnergyGuide Evaluation
- Required for federal grants
- Costs ~$400-600 (covered by $600 grant)
- Provides prioritized upgrade list with ROI

### 2. Plan Stacking Strategy
- Apply federal programs first (largest amounts)
- Then layer provincial/municipal rebates
- Timing matters: Some programs are first-come, first-served

### 3. Use Pre-Approved Contractors
- Many programs require certified installers
- Check NRCan list for Greener Homes program
- Get 3 quotes to ensure competitive pricing

### 4. Keep Documentation
- Before/after photos
- Invoices and receipts
- Product specifications
- Installation certificates

## Common Mistakes to Avoid

❌ **Starting work before approval**: Many programs require pre-approval
❌ **Using non-certified contractors**: Can disqualify grant application
❌ **Not checking expiry dates**: Some programs end March 31, 2024
❌ **Forgetting post-evaluation**: Required for federal grant payout

## Resources

### Federal
- Natural Resources Canada: nrcan.gc.ca/energy-efficiency
- Greener Homes: canada.ca/en/services/environment/weather/climatechange/climate-action/federal-programs-guide.html

### Provincial (Alberta)
- Energy.alberta.ca
- Efficiencyalberta.ca

### Utilities
- EPCOR: epcor.com/products-services/power/save-energy
- ENMAX: enmax.com/home/save-energy-and-money

## Action Items

✓ Check eligibility for Canada Greener Homes Grant
✓ Book EnergyGuide evaluation ($600 grant covers cost)
✓ Review provincial rebates available in your area
✓ Calculate potential total savings for planned upgrades
✓ Create timeline: Some programs have limited funding windows

---

**Certificate Completion**: After mastering rebate programs, you'll receive the **Residential Energy Management Certificate** and unlock the **Energy Advisor** badge (Silver tier, +200 points).
`,
      estimatedReadTime: 20
    },
    learning_objectives: [
      'Navigate Canada Greener Homes Grant application process',
      'Identify province-specific energy rebates',
      'Calculate total available incentives for home upgrades',
      'Develop rebate stacking strategy to maximize savings',
      'Avoid common application mistakes that delay funding'
    ],
    prerequisites: ['res-001', 'res-002', 'res-003', 'res-004']
  }
];

/**
 * Track 2: Grid Operations & Trading
 * Focus: Energy traders, grid operators, power marketers
 */
export const GRID_OPS_MODULES: Module[] = [
  {
    id: 'grid-001',
    track_id: 'track-gridops',
    track_slug: 'grid-operations',
    title: 'Alberta Electricity Market Structure',
    description: 'Understand the AESO, energy-only market design, and real-time pool price formation.',
    sequence_number: 1,
    duration_minutes: 35,
    content_type: 'reading',
    content_data: {
      content: `# Alberta Electricity Market Structure

## Overview

Alberta operates Canada's only **deregulated, energy-only electricity market**, fundamentally different from capacity markets in other provinces.

## Key Market Participants

### 1. Alberta Electric System Operator (AESO)
**Role**: Independent system operator
**Responsibilities**:
- Real-time grid balancing
- Merit order dispatch
- Transmission planning
- Market surveillance

### 2. Generators
- 55+ generation companies
- Mix: Natural gas (80%), wind (15%), solar (3%), hydro (2%)
- Must offer into pool hourly

### 3. Retailers
- Competitive market: ~25 retailers
- Sell electricity to consumers
- Manage price risk through hedging

### 4. Load (Consumers)
- Regulated Rate Option (RRO): Variable pricing
- Retail contracts: Fixed or variable
- Large industrial: Direct pool purchase

## Pool Price Formation

### Merit Order Dispatch
1. Generators offer supply curves ($/MWh)
2. AESO stacks offers from lowest to highest
3. **Pool price** = marginal cost of last unit needed
4. All dispatched generators paid pool price

### Example Hour
- Demand: 10,000 MW
- Supply offers:
  * 0-5,000 MW: $20/MWh (baseload)
  * 5,000-9,000 MW: $50/MWh (mid-merit)
  * 9,000-10,000 MW: $80/MWh (peaking)
  * 10,000-10,500 MW: $500/MWh (emergency reserves)

**Pool price that hour**: $80/MWh (marginal unit)

### Price Volatility
- **Typical range**: $10-100/MWh
- **Peak hours**: Can exceed $300/MWh
- **Scarcity pricing**: Up to $999.99/MWh
- **2021 cold snap**: $700+/MWh for 18 hours

## Energy-Only Market Design

### No Capacity Payments
- Generators paid only for energy produced
- Must recover fixed costs through pool prices
- Encourages efficiency, penalizes uneconomic plants

### Scarcity Pricing
- High prices during tight supply-demand balance
- Incentivizes peaking capacity investment
- Self-correcting: High prices → new entry

## Ancillary Services

### Regulating Reserves
- Automatic frequency control
- ±150 MW capacity
- Paid for availability + activation

### Spinning Reserves
- Online capacity (10-minute response)
- 500-800 MW requirement
- Prevent frequency collapse

### Supplemental Reserves
- Offline capacity (30-minute response)
- Additional reliability layer

## Transmission System

### 500 kV Backbone
- North-South main corridors
- Connects Calgary-Edmonton load centers
- Import/export ties to BC, Saskatchewan, Montana

### Constraint Management
- Congestion can split market into zones
- Locational pricing during outages
- Intertie import limits

## Market Monitoring

### Market Surveillance Administrator (MSA)
- Monitors for manipulation
- Investigates physical/economic withholding
- Can impose penalties up to $1M per violation

### Reporting Requirements
- Real-time: Pool price, demand, supply
- Daily: Asset Availability Report
- Monthly: Generator performance data

## Learning Check

Key concepts to master:
✓ Merit order dispatch mechanism
✓ Pool price = marginal cost of last unit
✓ Energy-only vs capacity market design
✓ AESO's role as system operator
✓ Ancillary service types and procurement

## Next Module Preview

**Module 2** covers real-time trading strategies, including spread trading, congestion management, and renewable integration challenges.
`,
      estimatedReadTime: 25
    },
    learning_objectives: [
      'Explain Alberta\'s energy-only market design',
      'Describe merit order dispatch and pool price formation',
      'Identify key market participants and their roles',
      'Understand scarcity pricing mechanisms',
      'Differentiate ancillary service types'
    ]
  },
  {
    id: 'grid-002',
    track_id: 'track-gridops',
    track_slug: 'grid-operations',
    title: 'Real-Time Trading Fundamentals',
    description: 'Learn trading strategies, spread arbitrage, and renewable integration challenges in Alberta\'s market.',
    sequence_number: 2,
    duration_minutes: 30,
    content_type: 'video',
    content_data: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder
      duration: 1500,
      transcript: 'This video covers real-time trading strategies in the Alberta market...',
      thumbnailUrl: 'https://via.placeholder.com/640x360/0ea5e9/ffffff?text=Trading+Strategies'
    },
    learning_objectives: [
      'Execute spread trades between real-time and day-ahead',
      'Manage intertie congestion risk',
      'Forecast wind/solar generation impact on pool prices',
      'Apply risk management strategies for volatile periods',
      'Identify trading opportunities during shoulder hours'
    ],
    prerequisites: ['grid-001']
  },
  {
    id: 'grid-003',
    track_id: 'track-gridops',
    track_slug: 'grid-operations',
    title: 'Grid Reliability & Balancing',
    description: 'Master frequency control, load following, and emergency procedures for grid operators.',
    sequence_number: 3,
    duration_minutes: 25,
    content_type: 'quiz',
    content_data: {
      questions: [
        {
          id: 'grid-q1',
          question: 'What is the target frequency for the Alberta grid?',
          options: ['50 Hz', '58 Hz', '60 Hz', '120 Hz'],
          correctAnswer: 2,
          explanation: 'The Alberta grid operates at 60 Hz, the standard frequency for North American grids. Maintaining this frequency is critical for system stability.'
        },
        {
          id: 'grid-q2',
          question: 'At what frequency deviation must Under Frequency Load Shedding (UFLS) activate?',
          options: ['59.5 Hz', '59.3 Hz', '58.9 Hz', '58.5 Hz'],
          correctAnswer: 2,
          explanation: 'UFLS activates at 58.9 Hz to prevent cascading failures. Load is shed in stages as frequency drops to balance generation and demand.'
        },
        {
          id: 'grid-q3',
          question: 'What is the primary purpose of spinning reserves?',
          options: ['Reduce electricity prices', 'Respond to sudden generation loss within 10 minutes', 'Replace aging infrastructure', 'Store excess renewable energy'],
          correctAnswer: 1,
          explanation: 'Spinning reserves provide fast-responding capacity (10-minute response) to compensate for sudden generator outages or demand surges, maintaining grid stability.'
        },
        {
          id: 'grid-q4',
          question: 'Which renewable energy source poses the greatest short-term forecasting challenge for grid operators?',
          options: ['Solar PV', 'Wind', 'Hydro', 'Biomass'],
          correctAnswer: 1,
          explanation: 'Wind generation is highly variable and difficult to forecast on 1-6 hour horizons. Solar is more predictable (cloud tracking), while hydro and biomass are dispatchable.'
        },
        {
          id: 'grid-q5',
          question: 'What is "inertia" in grid operations?',
          options: ['Resistance to new technology adoption', 'Rotational energy stored in synchronous generators', 'Time delay in price signals', 'Transmission line resistance'],
          correctAnswer: 1,
          explanation: 'Inertia is the rotational energy stored in spinning generators. It resists frequency changes, providing critical stability. Inverter-based renewables (wind/solar) contribute minimal inertia, increasing frequency control challenges.'
        }
      ],
      passingScore: 80
    },
    learning_objectives: [
      'Monitor frequency deviations and respond appropriately',
      'Coordinate spinning and supplemental reserves',
      'Execute UFLS protocols during emergencies',
      'Manage renewable intermittency with flexible generation',
      'Understand inertia requirements for grid stability'
    ],
    prerequisites: ['grid-001', 'grid-002']
  },
  {
    id: 'grid-004',
    track_id: 'track-gridops',
    track_slug: 'grid-operations',
    title: 'Renewable Integration Simulator',
    description: 'Simulate grid balancing with high renewable penetration and solve real-world dispatch challenges.',
    sequence_number: 4,
    duration_minutes: 35,
    content_type: 'interactive',
    content_data: {
      tool: 'simulator',
      title: 'Grid Dispatch Simulator',
      description: 'Balance supply and demand in a simplified Alberta grid with wind, solar, gas, and battery storage.',
      parameters: {
        initialState: {
          demand: 10000, // MW
          wind: 2000,
          solar: 500,
          gas: 6500,
          hydro: 500,
          battery: 500,
          batteryCharge: 50 // %
        },
        scenarios: [
          { name: 'Morning Ramp', description: 'Demand increases 2000 MW in 1 hour, solar ramps up' },
          { name: 'Wind Drop', description: 'Wind drops 1500 MW in 30 minutes' },
          { name: 'Peak Demand', description: 'Evening peak with low renewables' }
        ]
      }
    },
    learning_objectives: [
      'Balance generation and demand in real-time',
      'Utilize battery storage for frequency regulation',
      'Manage curtailment during excess renewable production',
      'Coordinate flexible gas generation with renewable ramps',
      'Calculate reserve margins for reliability'
    ],
    prerequisites: ['grid-001', 'grid-002', 'grid-003']
  },
  {
    id: 'grid-005',
    track_id: 'track-gridops',
    track_slug: 'grid-operations',
    title: 'Advanced Market Analytics',
    description: 'Analyze historical pool prices, forecast drivers, and build trading models using Alberta data.',
    sequence_number: 5,
    duration_minutes: 40,
    content_type: 'reading',
    content_data: {
      content: `# Advanced Market Analytics for Alberta's Electricity Market

## Price Drivers Analysis

### Primary Factors
1. **Natural gas prices** (80% correlation)
   - Henry Hub: North American benchmark
   - AECO: Alberta-specific pricing
   - Typical spread: AECO = Henry Hub - $1.00/GJ

2. **Renewable generation** (negative correlation)
   - High wind → Lower pool prices
   - 3000+ MW wind can depress prices by 40-60%

3. **Temperature extremes**
   - Below -20°C: Heating load spike
   - Above +30°C: Cooling load spike
   - Shoulder seasons: Lowest prices

### Historical Price Patterns

**2019-2024 Statistics:**
- Average pool price: $65/MWh
- 95th percentile: $180/MWh
- 99th percentile: $450/MWh
- Hours > $200/MWh: ~1.5% (130 hours/year)

**Seasonal Trends:**
- **Q1 (Winter)**: Highest average ($85/MWh)
- **Q2 (Spring)**: Lowest average ($45/MWh)
- **Q3 (Summer)**: High volatility ($70/MWh avg)
- **Q4 (Fall)**: Moderate ($60/MWh avg)

## Forecasting Methodologies

### Short-Term (1-24 hours)
**Inputs:**
- Weather forecasts (temperature, wind speed, solar irradiance)
- Scheduled generation outages
- Historical demand curves
- Intertie flows

**Methods:**
- Machine learning (XGBoost, neural networks)
- Regression models with weather variables
- Ensemble approaches

**Accuracy:**
- Mean Absolute Error: ~$15/MWh
- Direction accuracy: 75-80%

### Medium-Term (1 week - 1 month)
**Inputs:**
- Extended weather forecasts
- Maintenance schedules
- Seasonal patterns
- Natural gas forward curves

**Methods:**
- Fundamental supply-demand models
- Monte Carlo simulations
- Historical analogs

**Accuracy:**
- Decreases with horizon
- Focus on expected range rather than point forecast

## Trading Strategies

### 1. Spread Trading
**Opportunity:** Day-ahead vs real-time spread
- Buy day-ahead if expecting price drop
- Sell day-ahead if expecting price spike

**Risk Management:**
- Position limits: 50-100 MW
- Stop-loss triggers: ±$50/MWh
- Diversify across hours

### 2. Congestion Trading
**Opportunity:** Intertie price differentials
- BC → AB: Typically negative (export)
- AB → SK: Typically positive (import)
- Montana → AB: Variable (depends on wind)

**Example Trade:**
- Import 200 MW from BC at -$20/MWh differential
- Sell into Alberta pool at $80/MWh
- Gross margin: $20/MWh × 200 MW = $4,000/hour

### 3. Renewable Hedging
**Challenge:** Protect against low prices during high wind
**Solution:**
- Financial hedges (swaps, options)
- Physical storage (batteries)
- Curtailment agreements

## Risk Metrics

### Value at Risk (VaR)
- 95% VaR: Maximum loss in 19 out of 20 days
- Typical VaR for 100 MW position: $50,000/day

### Price at Risk (PaR)
- Measures exposure to price movements
- PaR = Position × Price Volatility × √Time

### Stress Testing
**Scenarios:**
- 2021 cold snap: 18 hours above $700/MWh
- 2022 wind drought: 72 hours below 500 MW wind
- 2023 summer heat: 10 consecutive days above $150/MWh

## Data Sources

### Real-Time Data (Free)
- AESO website: aeso.ca
  * Current supply/demand
  * Pool price
  * Intertie flows
  * Available transfer capability

### Historical Data (Free)
- AESO Historical Pool Price Report
- AESO Market Participant Reports
- MSA (Market Surveillance Administrator) reports

### Commercial Data (Paid)
- Bloomberg: AESOPOOL <Index>
- Refinitiv: Alberta Power Analytics
- ABB Velocity Suite: Full market suite

## Building a Price Model

### Step 1: Data Collection
Gather 3+ years of hourly data:
- Pool prices
- Demand
- Temperature (Calgary, Edmonton)
- Wind generation
- Solar generation
- Natural gas prices (AECO)

### Step 2: Feature Engineering
Create derived variables:
- Hour of day (1-24)
- Day of week (1-7)
- Month (1-12)
- Temperature deviations from average
- Wind capacity factor (%)
- Gas price changes (day-over-day)

### Step 3: Model Training
Split data:
- Training: 70% (2+ years)
- Validation: 15% (6 months)
- Test: 15% (6 months)

Try multiple algorithms:
- Linear regression (baseline)
- Random forest
- XGBoost
- LSTM neural network

### Step 4: Backtesting
Evaluate on test set:
- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)
- Direction accuracy (% correct up/down)

### Step 5: Production Deployment
- Retrain monthly with new data
- Monitor performance drift
- Alert on anomalies

## Case Study: 2021 Cold Snap

**Dates:** Feb 13-15, 2021
**Weather:** -30°C to -40°C across Alberta

**Market Impact:**
- Peak pool price: $778/MWh
- Average pool price (3 days): $355/MWh
- Total market value: $125M (vs. $40M normal)

**Lessons:**
1. Temperature extremes cause non-linear demand response
2. Wind generation can drop to near zero in extreme cold
3. Gas-fired generation faces fuel supply constraints
4. Forward hedging essential for extreme weather risk

## Actionable Insights

✓ **Build fundamental model:** Weather + demand + gas prices explain 70-80% of price variance
✓ **Monitor wind forecasts:** 1000 MW wind swing = $20-30/MWh price impact
✓ **Track gas-power spreads:** AECO gas price floors pool prices
✓ **Use machine learning:** Ensemble models outperform single approaches
✓ **Backtest rigorously:** Historical performance ≠ future results, but reveals model weaknesses

---

**Certificate Completion:** Mastering market analytics earns the **Grid Operations & Trading Certificate** and unlocks the **Power Market Analyst** badge (Gold tier, +300 points).
`,
      estimatedReadTime: 30
    },
    learning_objectives: [
      'Identify primary drivers of Alberta pool prices',
      'Build short-term price forecast models',
      'Execute profitable spread trades',
      'Calculate risk metrics (VaR, PaR)',
      'Analyze historical price events for trading insights'
    ],
    prerequisites: ['grid-001', 'grid-002', 'grid-003', 'grid-004']
  }
];

/**
 * Track 3: Policy & Regulatory Compliance
 * Focus: Policy makers, compliance officers, consultants
 */
export const POLICY_MODULES: Module[] = [
  {
    id: 'policy-001',
    track_id: 'track-policy',
    track_slug: 'policy-regulatory',
    title: 'Canadian Energy Regulatory Framework',
    description: 'Navigate federal and provincial energy regulations, carbon pricing, and clean electricity standards.',
    sequence_number: 1,
    duration_minutes: 40,
    content_type: 'reading',
    content_data: {
      content: `# Canadian Energy Regulatory Framework

## Introduction

Canada's energy sector operates under a complex multi-jurisdictional regulatory framework. Understanding federal versus provincial powers is critical for compliance and strategic planning.

## Constitutional Division of Powers

### Federal Jurisdiction
**Under Constitution Act, 1867**:
- Interprovincial and international trade and commerce (s. 91(2))
- Navigation and shipping (s. 91(10))
- Fisheries (s. 91(12))
- Works for general advantage of Canada (s. 92(10)(c))

**Key Federal Agencies**:
- **Natural Resources Canada (NRCan)**: Energy policy, R&D funding
- **Canadian Energy Regulator (CER)**: Interprovincial pipelines, electricity lines, offshore energy
- **Environment and Climate Change Canada (ECCC)**: Emissions regulations, carbon pricing
- **Impact Assessment Agency of Canada (IAAC)**: Major project reviews

### Provincial Jurisdiction
**Under s. 92A (Natural Resources)**:
- Exploration, development, conservation, management of natural resources
- Electricity generation within province
- Resource royalties and taxation

**Example - Alberta**:
- **Alberta Energy Regulator (AER)**: Oil, gas, coal development
- **Alberta Electric System Operator (AESO)**: Electricity market
- **Alberta Utilities Commission (AUC)**: Utility rates, facility siting

## Carbon Pricing in Canada

### Federal Backstop (Greenhouse Gas Pollution Pricing Act)
**Two components**:
1. **Fuel charge**: Applied to fossil fuels
   - Current rate (2024): $65/tonne CO2e
   - Increasing $15/year to $170/tonne by 2030
2. **Output-Based Pricing System (OBPS)**: For large industrial emitters
   - Applies to facilities emitting >50,000 tonnes CO2e/year
   - Pay on emissions above performance standard
   - Can earn credits if below standard

**Provinces with federal backstop** (as of 2024):
- Manitoba, Ontario, Saskatchewan, Alberta (partial)
- Federal system applies where province doesn't meet federal stringency

### Provincial Carbon Pricing Systems

**British Columbia**:
- Carbon tax since 2008 (revenue neutral until 2017)
- Current rate: $65/tonne (aligned with federal)
- Covers ~70% of provincial emissions

**Quebec**:
- Cap-and-trade system since 2013
- Linked with California and Washington (Western Climate Initiative)
- Declining annual cap on emissions
- Allowances auctioned quarterly

**Alberta**:
- Technology Innovation and Emissions Reduction (TIER) regulation
- Output-based system for large emitters
- Equivalent to federal OBPS stringency

## Clean Electricity Regulations (CER)

**Published**: August 2023 (final regulations expected 2024)

**Objective**: Achieve net-zero electricity grid by 2035

**Key Requirements**:
1. **Performance standard**: 30 tonnes CO2/GWh for new natural gas units
2. **Phase-out schedule**:
   - Units commissioned before 2025: Can operate to end of prescribed life (e.g., 20 years for gas)
   - Units after 2025: Must meet 30 tonnes/GWh standard
3. **Compliance mechanisms**:
   - Carbon capture and storage (CCS)
   - Co-firing with hydrogen or ammonia
   - Retirement of units

**Provincial Concerns**:
- Alberta, Saskatchewan: Reliance on natural gas generation
- Economic impact on ratepayers
- Grid reliability during transition

## Net-Zero by 2050

**Canadian Net-Zero Emissions Accountability Act** (2021):

**Binding targets**:
- 2030: 40-45% below 2005 levels
- 2050: Net-zero emissions

**Sectoral pathways**:
- **Electricity**: Net-zero by 2035 (CER)
- **Oil & Gas**: 75% reduction by 2030 (proposed emissions cap)
- **Transportation**: ZEV mandate (100% by 2035)
- **Buildings**: Net-zero energy ready by 2030

**Compliance mechanisms**:
- Carbon pricing ramp-up ($170/tonne by 2030)
- Sector-specific regulations (CER, ZEV mandate, Clean Fuel Regulations)
- Investment Tax Credits (ITCs) for clean technology

## Indigenous Consultation Requirements

### Duty to Consult (Constitution Act, s. 35)

**When required**:
- Crown contemplates action that might adversely affect Aboriginal or treaty rights
- Applies to energy projects on or near traditional territories

**Spectrum of consultation** (Haida Nation v. BC):
1. **Minimal consultation**: Low impact projects
2. **Deep consultation**: Potential for significant adverse effects
3. **Consent required**: Projects directly infringing treaty rights (UNDRIP alignment)

### United Nations Declaration on the Rights of Indigenous Peoples (UNDRIP) Act (2021)

**Free, Prior and Informed Consent (FPIC)**:
- Federal commitment to align laws with UNDRIP
- **NOT** a veto, but requires good-faith negotiation
- Increasingly expected for major projects

**Practical implications**:
- Early engagement with Indigenous communities (pre-application)
- Impact and Benefit Agreements (IBAs)
- Revenue sharing arrangements
- Environmental monitoring partnerships

### Recent Case Law

**Yahey v. British Columbia (2021)**:
- Cumulative impacts of industrial development in Treaty 8 territory
- First case finding treaty infringement from cumulative effects
- Implications: Government must consider cumulative impacts, not just individual projects

## Regulatory Review Processes

### Federal Impact Assessment (Impact Assessment Act, 2019)

**Triggers**:
- Projects on federal list (e.g., interprovincial pipelines, offshore oil)
- Projects designated by Minister

**Process**:
- Early planning and engagement
- Impact Statement preparation
- Public comment period
- Impact Assessment Report
- Decision by Minister or Governor in Council

**Timeline**: 300-600 days (can be extended)

### Provincial Reviews (Example: Alberta)

**Alberta Energy Regulator (AER)**:
- Single-window regulator for energy development
- Integrated review of applications
- Public interest test

**Timeline**: Varies (routine wells: 30 days; large projects: 12-24 months)

## Compliance Best Practices

### For Project Proponents

✓ **Early engagement**: Start Indigenous consultation 12-24 months pre-application
✓ **Baseline studies**: Environmental, socio-economic, cultural (2-3 years)
✓ **Regulatory roadmap**: Identify all required federal and provincial approvals
✓ **Public consultation**: Beyond minimum requirements (builds social license)
✓ **Adaptive management**: Commit to monitoring and adaptive responses

### Common Pitfalls

❌ **Late Indigenous engagement**: Delays, legal challenges
❌ **Underestimating timelines**: Regulatory reviews often take longer than planned
❌ **Inadequate baseline data**: Insufficient environmental studies
❌ **Ignoring cumulative effects**: Required under IAA
❌ **Poor public communication**: Opposition from lack of understanding

## Upcoming Regulatory Changes

**2024-2025 Expectations**:
- **Final CER**: Definitive phase-out schedule for gas generation
- **Emissions cap for oil & gas**: Proposed 2024, final 2025
- **Clean Electricity Investment Tax Credit**: Details for 15-30% ITCs
- **Nature Accountability Act**: Biodiversity commitments

## Action Items

After completing this module:
✓ Map federal and provincial jurisdictions for your sector
✓ Calculate carbon pricing impact on operations (current and 2030 rates)
✓ Identify Indigenous communities in your project area
✓ Review CER applicability to electricity assets
✓ Assess net-zero pathway for your organization

## Next Module Preview

**Module 2** covers Indigenous consultation in depth: FPIC implementation, IBA negotiation strategies, and case studies from successful energy projects.
`,
      estimatedReadTime: 30
    },
    learning_objectives: [
      'Differentiate federal vs provincial energy jurisdiction',
      'Explain carbon pricing mechanisms across Canada',
      'Understand Clean Electricity Regulations compliance',
      'Navigate Indigenous consultation requirements',
      'Apply regulatory frameworks to project planning'
    ]
  },
  {
    id: 'policy-002',
    track_id: 'track-policy',
    track_slug: 'policy-regulatory',
    title: 'Indigenous Consultation & UNDRIP',
    description: 'Master Free, Prior and Informed Consent (FPIC), Impact Benefit Agreements, and consultation best practices.',
    sequence_number: 2,
    duration_minutes: 35,
    content_type: 'video',
    content_data: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder
      duration: 1800,
      transcript: 'This video covers Indigenous consultation requirements, FPIC implementation, and case studies...',
      thumbnailUrl: 'https://via.placeholder.com/640x360/0ea5e9/ffffff?text=Indigenous+Consultation'
    },
    learning_objectives: [
      'Implement FPIC in project planning',
      'Negotiate Impact and Benefit Agreements (IBAs)',
      'Conduct culturally appropriate consultation',
      'Navigate treaty rights and traditional territories',
      'Apply learnings from case law (Haida, Yahey)'
    ],
    prerequisites: ['policy-001']
  },
  {
    id: 'policy-003',
    track_id: 'track-policy',
    track_slug: 'policy-regulatory',
    title: 'Environmental Compliance Quiz',
    description: 'Test your knowledge of impact assessments, emissions reporting, and environmental monitoring.',
    sequence_number: 3,
    duration_minutes: 25,
    content_type: 'quiz',
    content_data: {
      questions: [
        {
          id: 'env-q1',
          question: 'Which projects require a federal Impact Assessment under the Impact Assessment Act (2019)?',
          options: [
            'All energy projects in Canada',
            'Projects on the Project List or designated by Minister',
            'Only interprovincial pipelines',
            'Projects over $100M capital cost'
          ],
          correctAnswer: 1,
          explanation: 'Federal Impact Assessments are triggered for projects on the designated Project List (e.g., interprovincial pipelines, offshore oil, large hydro) or projects specifically designated by the Minister.'
        },
        {
          id: 'env-q2',
          question: 'What is the 2030 federal carbon price target under current legislation?',
          options: ['$95/tonne CO2e', '$125/tonne CO2e', '$170/tonne CO2e', '$200/tonne CO2e'],
          correctAnswer: 2,
          explanation: 'The federal carbon price increases $15/year from $65/tonne (2024) to reach $170/tonne by 2030 under the Greenhouse Gas Pollution Pricing Act.'
        },
        {
          id: 'env-q3',
          question: 'Under the Clean Electricity Regulations, what is the performance standard for new natural gas generation units?',
          options: ['0 tonnes CO2/GWh', '30 tonnes CO2/GWh', '100 tonnes CO2/GWh', '420 tonnes CO2/GWh (unabated)'],
          correctAnswer: 1,
          explanation: 'The CER sets a performance standard of 30 tonnes CO2/GWh for new gas units, effectively requiring CCS, hydrogen co-firing, or other emissions reduction technology.'
        },
        {
          id: 'env-q4',
          question: 'What does FPIC stand for in the context of Indigenous consultation?',
          options: [
            'Federal Project Impact Certificate',
            'Free, Prior and Informed Consent',
            'First Peoples Industrial Coalition',
            'Final Project Implementation Clearance'
          ],
          correctAnswer: 1,
          explanation: 'FPIC (Free, Prior and Informed Consent) is a principle from UNDRIP requiring meaningful consultation with Indigenous peoples before decisions affecting their rights or territories.'
        },
        {
          id: 'env-q5',
          question: 'Which landmark case established the "Duty to Consult" for Crown actions affecting Aboriginal rights?',
          options: ['R. v. Sparrow', 'Haida Nation v. BC', 'Delgamuukw v. BC', 'Yahey v. BC'],
          correctAnswer: 1,
          explanation: 'Haida Nation v. BC (2004) established the Crown\'s duty to consult and, where appropriate, accommodate Indigenous peoples when contemplating actions that might adversely affect Aboriginal or treaty rights.'
        },
        {
          id: 'env-q6',
          question: 'What is the minimum facility size threshold for the federal Output-Based Pricing System (OBPS)?',
          options: ['10,000 tonnes CO2e/year', '25,000 tonnes CO2e/year', '50,000 tonnes CO2e/year', '100,000 tonnes CO2e/year'],
          correctAnswer: 2,
          explanation: 'The OBPS applies to facilities emitting 50,000 tonnes CO2e or more per year. These large emitters pay on emissions above their facility-specific performance standard.'
        },
        {
          id: 'env-q7',
          question: 'Under federal regulations, what is Canada\'s net-zero target year?',
          options: ['2030', '2035', '2040', '2050'],
          correctAnswer: 3,
          explanation: 'The Canadian Net-Zero Emissions Accountability Act (2021) sets a legally binding target of net-zero greenhouse gas emissions by 2050, with interim target of 40-45% reduction below 2005 levels by 2030.'
        }
      ],
      passingScore: 75
    },
    learning_objectives: [
      'Identify when federal Impact Assessments are required',
      'Calculate carbon pricing obligations',
      'Apply CER performance standards',
      'Understand FPIC and duty to consult',
      'Recognize key regulatory timelines and thresholds'
    ],
    prerequisites: ['policy-001', 'policy-002']
  },
  {
    id: 'policy-004',
    track_id: 'track-policy',
    track_slug: 'policy-regulatory',
    title: 'Carbon Credit Calculator',
    description: 'Calculate offset project eligibility, credit generation, and compliance strategies for Alberta TIER and federal OBPS.',
    sequence_number: 4,
    duration_minutes: 30,
    content_type: 'interactive',
    content_data: {
      tool: 'calculator',
      title: 'Carbon Offset & Credit Calculator',
      description: 'Model offset project economics and compliance strategies under Alberta TIER and federal OBPS.',
      parameters: {
        inputs: [
          { name: 'facilityEmissions', label: 'Annual Facility Emissions (tonnes CO2e)', type: 'number', default: 75000 },
          { name: 'productionOutput', label: 'Annual Production Output (units)', type: 'number', default: 100000 },
          { name: 'offsetProject', label: 'Offset Project Type', type: 'select', options: ['none', 'solar', 'wind', 'forestry', 'methane'], default: 'none' },
          { name: 'offsetReduction', label: 'Estimated Offset Reduction (tonnes CO2e)', type: 'number', default: 5000 },
          { name: 'carbonPrice', label: 'Carbon Credit Price ($/tonne)', type: 'number', default: 65 }
        ],
        calculations: {
          emissionsIntensity: 'facilityEmissions / productionOutput',
          benchmarkIntensity: '0.60', // Example benchmark
          excessEmissions: 'max(0, facilityEmissions - (benchmarkIntensity * productionOutput))',
          complianceCost: 'excessEmissions * carbonPrice',
          offsetValue: 'offsetReduction * carbonPrice',
          netCost: 'complianceCost - offsetValue'
        }
      }
    },
    learning_objectives: [
      'Calculate emissions intensity for OBPS/TIER compliance',
      'Determine offset project eligibility',
      'Model carbon credit economics',
      'Compare compliance strategies (pay, reduce, offset)',
      'Understand performance benchmarks and credit mechanisms'
    ],
    prerequisites: ['policy-001', 'policy-002', 'policy-003']
  },
  {
    id: 'policy-005',
    track_id: 'track-policy',
    track_slug: 'policy-regulatory',
    title: 'Project Permitting Roadmap',
    description: 'Navigate multi-jurisdictional approvals, timelines, and stakeholder engagement for energy projects.',
    sequence_number: 5,
    duration_minutes: 45,
    content_type: 'reading',
    content_data: {
      content: `# Project Permitting Roadmap for Energy Projects in Canada

## Introduction

Navigating Canada's complex regulatory landscape requires strategic planning. Major energy projects face 15-30 distinct approval requirements across federal, provincial, and municipal jurisdictions.

**This module provides**: A step-by-step roadmap, timeline estimates, and stakeholder engagement strategies.

## Pre-Application Phase (12-36 months)

### Step 1: Regulatory Scoping (Months 1-3)

**Objective**: Identify all required approvals and establish timelines.

**Key Activities**:
1. **Jurisdictional analysis**:
   - Federal triggers (interprovincial, offshore, federal lands)
   - Provincial permits (development, environment, utilities)
   - Municipal zoning and land use

2. **Create approval matrix**:
   - List all permits required
   - Identify lead agencies
   - Map dependencies (which approvals require others first)
   - Estimate timelines

**Example - Solar Farm (Alberta)**:
- AUC approval for connection (6-12 months)
- AER approval if on Crown land (3-6 months)
- Municipal development permit (2-4 months)
- Federal IA (if >200 MW on federal lands, 18-24 months)

### Step 2: Baseline Studies (Months 3-24)

**Environmental Baseline** (12-24 months):
- Air quality monitoring (4 seasons minimum)
- Water quality sampling (spring, summer, fall, winter)
- Wildlife surveys (breeding bird surveys, ungulate surveys)
- Vegetation inventory
- Soil sampling

**Socio-Economic Baseline** (6-12 months):
- Employment and income data
- Traditional land use studies (Indigenous consultation)
- Cultural and heritage resource assessments
- Visual impact assessments

**Cost**: $500K - $5M depending on project scope

### Step 3: Early Engagement (Months 1-36)

**Indigenous Communities** (Start immediately):
- Identify affected First Nations, Métis, Inuit communities
- Initial notification letters
- Capacity funding for community review
- Traditional Knowledge studies
- Ongoing dialogue (monthly meetings)

**Stakeholders**:
- Landowners (lease negotiations, easements)
- Adjacent industries
- Municipal councils
- Environmental groups
- Industry associations

**Public**:
- Project website with updates
- Community open houses (3-5 events)
- Comment periods and feedback mechanisms

**Timeline**: Minimum 12 months before application; ongoing through project life

## Application Phase (6-18 months)

### Step 4: Application Preparation (Months 24-30)

**Federal Impact Assessment** (if required):
- Initial Project Description (3 months to prepare)
- Detailed Impact Statement (6-12 months to prepare)
  * Description of project
  * Alternatives considered
  * Environmental effects assessment
  * Mitigation measures
  * Follow-up and monitoring program
  * Indigenous consultation record

**Provincial Applications**:
- Development application (AER, AUC, etc.)
- Water licenses
- Air emissions approvals
- Wildlife permits
- Archaeological permits

**Cost**: $1M - $10M for major projects (consultants, studies, legal)

### Step 5: Application Submission & Review (Months 30-48)

**Timelines by Jurisdiction**:

**Federal (Impact Assessment)**:
- Screening: 90 days (can be extended)
- Impact Statement: 300 days (can pause for info requests)
- Decision: Up to 90 days post-report
- **Total**: 18-36 months

**Alberta (AUC for power projects)**:
- Application filing
- Completeness check: 30 days
- Public notice period: 30 days
- Information requests: 2-4 rounds
- Hearing (if required): 3-6 months
- Decision: 90 days post-hearing
- **Total**: 9-18 months

**British Columbia (EAO)**:
- Pre-application: 6-12 months
- Application: 180 days (can suspend for more info)
- Minister's decision: 60 days
- **Total**: 12-24 months

### Step 6: Information Requests & Deficiency Response

**Expect 2-5 rounds of IRs**:
- Regulatory questions
- Indigenous concerns
- Public comments
- Technical clarifications

**Response times**: 30-90 days per round

**Strategy**:
- Anticipate common questions
- Pre-file technical memos
- Maintain open dialogue with regulators

## Approval & Conditions Phase (Months 48-60)

### Step 7: Decision & Conditions

**Typical Approval Conditions**:
- Environmental monitoring (air, water, wildlife)
- Adaptive management triggers
- Reporting requirements (annual, incidents)
- Financial assurances (reclamation bonds)
- Indigenous monitoring participation
- Wildlife mitigation (timing windows, buffers)

**Appeals Period**:
- Federal: No direct appeal of IA decision (judicial review only)
- Provincial: 30 days (Alberta AUC), varies by jurisdiction

### Step 8: Pre-Construction Compliance

**Before breaking ground**:
✓ All regulatory conditions met
✓ Financial assurances posted
✓ Environmental monitors retained
✓ Contractor environmental training
✓ Emergency response plans filed
✓ Indigenous monitors engaged (if required)

## Construction & Operations Phase

### Ongoing Compliance

**Monitoring & Reporting**:
- Environmental monitoring (quarterly, annual)
- Incident reporting (24-hour for significant events)
- Compliance audits (regulatory inspections)
- Annual reports to regulators

**Adaptive Management**:
- Thresholds exceeded → Trigger mitigation
- Example: Bird mortality > threshold → Enhanced deterrents

**Stakeholder Relations**:
- Community liaison committee (quarterly meetings)
- Indigenous working groups
- Complaint hotline and response protocol

## Timeline Summary

**Typical Major Energy Project** (e.g., 500 MW wind farm, interprovincial pipeline):

| Phase | Duration | Key Activities |
|-------|----------|----------------|
| Pre-Application | 24-36 months | Baseline studies, engagement, scoping |
| Application Prep | 6-12 months | IA/EA preparation, technical studies |
| Regulatory Review | 18-36 months | Federal IA, provincial approvals |
| Decision & Appeals | 3-6 months | Conditions, financial assurances |
| **TOTAL** | **51-90 months** | **4-7.5 years pre-construction** |

**Construction**: 12-36 months

**Total Project Timeline**: **5-10 years** from concept to operations

## Common Delays & How to Avoid Them

### Delay #1: Inadequate Indigenous Consultation
**Impact**: 6-24 month delay, potential court challenges
**Avoidance**:
- Start engagement 24-36 months pre-application
- Provide capacity funding
- Co-develop monitoring programs
- Negotiate IBAs early

### Delay #2: Incomplete Baseline Data
**Impact**: 6-12 month delay for additional studies
**Avoidance**:
- Commission baseline studies 24 months before application
- Ensure 4-season coverage
- Use experienced consultants
- Pre-consult with regulators on scope

### Delay #3: Public Opposition
**Impact**: 6-18 month delay from hearings, protests
**Avoidance**:
- Early and ongoing public engagement
- Transparent communication (project website, newsletters)
- Address concerns proactively
- Demonstrate environmental responsibility

### Delay #4: Information Request Cycles
**Impact**: 3-9 months (multiple IR rounds)
**Avoidance**:
- Anticipate questions, file technical memos
- Maintain regular dialogue with regulators
- Respond fully and quickly (don't trigger follow-ups)

### Delay #5: Cumulative Effects Assessment
**Impact**: 12-24 months for additional analysis
**Avoidance**:
- Assess cumulative effects from Day 1
- Consider all existing and reasonably foreseeable projects
- Regional cooperation (share data with other proponents)

## Case Studies

### Case Study 1: Trans Mountain Pipeline Expansion
**Timeline**:
- Application: 2013
- Initial approval: 2016 (Federal Cabinet)
- Federal Court quashed: 2018 (inadequate Indigenous consultation)
- Re-review and approval: 2019
- Construction start: 2019
- **Total**: 6 years pre-construction

**Lessons**:
- Inadequate initial Indigenous consultation = major delay
- Court challenges can add years
- Political risk for controversial projects

### Case Study 2: Travers Solar Project (Alberta, 465 MW)
**Timeline**:
- Application: 2019
- AUC approval: 2020
- Construction: 2021-2023
- **Total**: ~2 years pre-construction

**Lessons**:
- Solar projects in Alberta face streamlined approval (no federal IA)
- Early landowner engagement critical
- Municipal support speeds zoning approvals

## Best Practices Checklist

**Before Application**:
✓ Regulatory roadmap with all approvals identified
✓ 24 months of baseline environmental data
✓ Indigenous engagement well underway (12+ months)
✓ Public consultation plan implemented
✓ Alternatives analysis completed
✓ Project design optimized for environmental performance

**During Review**:
✓ Dedicated regulatory team (internal + consultants)
✓ Rapid response to IRs (< 30 days)
✓ Transparent communication with all stakeholders
✓ Adaptive project design (respond to feedback)
✓ Legal counsel reviewing conditions and risks

**Post-Approval**:
✓ Conditions tracking system (software or spreadsheet)
✓ Environmental monitoring programs operational
✓ Stakeholder relations ongoing
✓ Compliance audits (internal, before regulatory inspections)

## Tools & Resources

**Regulatory Portals**:
- Canadian Impact Assessment Registry: iaac-aeic.gc.ca
- Alberta One Stop: osportal.alberta.ca
- BC EAO Project Information Centre: projects.eao.gov.bc.ca

**Guidance Documents**:
- NRCan: Guide to Impact Assessment
- Alberta AER: Directive 056 (Energy Development Applications)
- CER: Filing Manual (Pipelines and Facilities)

## Action Items

After completing this module:
✓ Draft regulatory roadmap for a sample project in your sector
✓ Estimate total timeline from concept to construction
✓ Identify Indigenous communities to engage
✓ Calculate estimated permitting costs
✓ Review recent case law for similar projects

---

**Certificate Completion**: After mastering the permitting roadmap, you'll receive the **Policy & Regulatory Compliance Certificate** and unlock the **Regulatory Expert** badge (Gold tier, +300 points).
`,
      estimatedReadTime: 35
    },
    learning_objectives: [
      'Create multi-jurisdictional approval matrix',
      'Estimate realistic project timelines (5-10 years typical)',
      'Design early Indigenous engagement strategy',
      'Identify common delay causes and mitigation',
      'Navigate federal IA and provincial EA processes'
    ],
    prerequisites: ['policy-001', 'policy-002', 'policy-003', 'policy-004']
  }
];

/**
 * All modules combined for easy access
 */
export const ALL_MODULES: Module[] = [
  ...RESIDENTIAL_MODULES,
  ...GRID_OPS_MODULES,
  ...POLICY_MODULES
];

/**
 * Get modules by track slug
 */
export function getModulesByTrack(trackSlug: string): Module[] {
  return ALL_MODULES.filter(m => m.track_slug === trackSlug);
}

/**
 * Get single module by ID
 */
export function getModuleById(id: string): Module | undefined {
  return ALL_MODULES.find(m => m.id === id);
}

/**
 * Get next module in sequence
 */
export function getNextModule(currentModuleId: string): Module | undefined {
  const currentModule = getModuleById(currentModuleId);
  if (!currentModule) return undefined;

  const trackModules = getModulesByTrack(currentModule.track_slug);
  const currentIndex = trackModules.findIndex(m => m.id === currentModuleId);

  return currentIndex < trackModules.length - 1
    ? trackModules[currentIndex + 1]
    : undefined;
}

/**
 * Get previous module in sequence
 */
export function getPreviousModule(currentModuleId: string): Module | undefined {
  const currentModule = getModuleById(currentModuleId);
  if (!currentModule) return undefined;

  const trackModules = getModulesByTrack(currentModule.track_slug);
  const currentIndex = trackModules.findIndex(m => m.id === currentModuleId);

  return currentIndex > 0
    ? trackModules[currentIndex - 1]
    : undefined;
}
