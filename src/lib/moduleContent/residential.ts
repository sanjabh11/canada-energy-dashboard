/**
 * Certificate module content: Residential Energy Management track
 *
 * Split from src/lib/moduleContent.ts (F-11 / CODE-4 god-object refactor).
 * Module entries are verbatim slices of the original file.
 */
import type { Module } from './types';
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
    description:
      'Learn to decode electricity bills, understand time-of-use rates, and identify cost-saving opportunities.',
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
      estimatedReadTime: 15,
    },
    learning_objectives: [
      'Understand all components of an electricity bill',
      'Calculate effective electricity rate (¢/kWh)',
      'Identify time-of-use pricing opportunities',
      'Compare personal consumption to Canadian averages',
      'List top 5 household energy consumers',
    ],
  },
  {
    id: 'res-002',
    track_id: 'track-residential',
    track_slug: 'residential-energy',
    title: 'Home Energy Audit Fundamentals',
    description:
      'Conduct a DIY energy audit using free tools and identify quick wins for efficiency improvements.',
    sequence_number: 2,
    duration_minutes: 30,
    content_type: 'video',
    content_data: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - replace with actual energy audit video
      duration: 1200, // 20 minutes
      transcript: 'This video demonstrates how to conduct a comprehensive home energy audit...',
      thumbnailUrl: 'https://via.placeholder.com/640x360/0ea5e9/ffffff?text=Energy+Audit+Video',
    },
    learning_objectives: [
      'Identify common air leaks using visual inspection',
      'Use thermal imaging (smartphone apps) to find heat loss',
      'Assess insulation quality in attic and walls',
      'Evaluate window and door efficiency',
      'Create prioritized improvement list based on ROI',
    ],
    prerequisites: ['res-001'],
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
          explanation:
            'HVAC systems typically account for 40-50% of total home energy consumption, making them the largest single energy user in most homes.',
        },
        {
          id: 'hvac-q2',
          question: 'What is the recommended thermostat setback for sleeping hours in winter?',
          options: ['1-2°C', '3-4°C', '5-6°C', '7-8°C'],
          correctAnswer: 1,
          explanation:
            'A setback of 3-4°C (e.g., from 21°C to 17°C) during sleeping hours is recommended. This provides optimal energy savings without sacrificing comfort or causing excessive strain on the heating system.',
        },
        {
          id: 'hvac-q3',
          question: 'How often should furnace filters be changed during peak heating season?',
          options: ['Every 6 months', 'Every 3 months', 'Every month', 'Every 2 weeks'],
          correctAnswer: 2,
          explanation:
            'During peak heating (or cooling) season, filters should be checked monthly and changed as needed. Dirty filters reduce airflow, forcing the system to work harder and consume more energy.',
        },
        {
          id: 'hvac-q4',
          question: 'Which smart thermostat feature provides the most energy savings?',
          options: [
            'Remote control via smartphone',
            'Learning algorithms for occupancy patterns',
            'Voice control integration',
            'Color touchscreen display',
          ],
          correctAnswer: 1,
          explanation:
            'Learning algorithms that automatically adjust based on occupancy patterns provide the most significant savings (10-23% on average) by ensuring heating/cooling only when needed without manual intervention.',
        },
        {
          id: 'hvac-q5',
          question: 'What is the ideal temperature setting for a heat pump to maximize efficiency?',
          options: [
            'Constant temperature (no setbacks)',
            'Frequent adjustments throughout day',
            'Large setbacks (5°C+) when away',
            'Maximum temperature setting',
          ],
          correctAnswer: 0,
          explanation:
            'Heat pumps work most efficiently at a constant temperature. Large setbacks can trigger auxiliary electric heating during recovery, which is less efficient. Small setbacks (1-2°C) are acceptable.',
        },
        {
          id: 'hvac-q6',
          question:
            'What is the minimum recommended attic insulation value (RSI) for Canadian homes?',
          options: ['RSI 3.5 (R-20)', 'RSI 5.3 (R-30)', 'RSI 7.0 (R-40)', 'RSI 8.8 (R-50)'],
          correctAnswer: 3,
          explanation:
            'The Canadian building code recommends minimum RSI 8.8 (R-50) for attic insulation in most climates. Proper insulation significantly reduces HVAC load and energy consumption.',
        },
        {
          id: 'hvac-q7',
          question:
            'Which action provides the best immediate return on investment for HVAC efficiency?',
          options: [
            'Replace entire HVAC system',
            'Install smart thermostat',
            'Seal air leaks around windows/doors',
            'Upgrade to high-efficiency filters',
          ],
          correctAnswer: 2,
          explanation:
            'Sealing air leaks provides the best immediate ROI, often saving 10-20% on heating/cooling costs with minimal investment. It should be done before upgrading equipment or controls.',
        },
        {
          id: 'hvac-q8',
          question: 'What is the expected lifespan of a residential furnace in Canada?',
          options: ['8-12 years', '15-20 years', '25-30 years', '35-40 years'],
          correctAnswer: 1,
          explanation:
            'A well-maintained residential furnace typically lasts 15-20 years in Canadian climates. Regular maintenance can extend lifespan, while neglect can shorten it significantly.',
        },
      ],
      passingScore: 75,
    },
    learning_objectives: [
      'Explain HVAC impact on home energy consumption',
      'Configure smart thermostat for optimal savings',
      'Understand heat pump efficiency principles',
      'Identify when HVAC maintenance is needed',
      'Calculate potential savings from thermostat setbacks',
    ],
    prerequisites: ['res-001', 'res-002'],
  },
  {
    id: 'res-004',
    track_id: 'track-residential',
    track_slug: 'residential-energy',
    title: 'Solar PV ROI Calculator',
    description:
      'Calculate the return on investment for residential solar installations using real Alberta data.',
    sequence_number: 4,
    duration_minutes: 25,
    content_type: 'interactive',
    content_data: {
      tool: 'calculator',
      title: 'Residential Solar ROI Calculator',
      description:
        'Input your home details to calculate solar panel ROI, payback period, and lifetime savings.',
      parameters: {
        inputs: [
          { name: 'monthlyBill', label: 'Average Monthly Bill ($)', type: 'number', default: 150 },
          { name: 'roofArea', label: 'Available Roof Area (sq ft)', type: 'number', default: 400 },
          { name: 'systemSize', label: 'System Size (kW)', type: 'number', default: 5 },
          { name: 'installCost', label: 'Installation Cost ($)', type: 'number', default: 12500 },
          {
            name: 'province',
            label: 'Province',
            type: 'select',
            options: ['AB', 'BC', 'SK', 'MB', 'ON'],
            default: 'AB',
          },
        ],
        calculations: {
          annualProduction: 'systemSize * 1200', // kWh/kW/year for Alberta
          annualSavings: 'annualProduction * 0.12', // $0.12/kWh
          paybackPeriod: 'installCost / annualSavings',
          lifetimeSavings: '(annualSavings * 25) - installCost',
          co2Offset: 'annualProduction * 0.5', // kg CO2/year
        },
      },
    },
    learning_objectives: [
      'Calculate solar PV system size needed for home',
      'Estimate payback period for Alberta installations',
      'Understand net metering and microgeneration programs',
      'Compare solar ROI across Canadian provinces',
      'Identify financing options (PACE, green mortgages)',
    ],
    prerequisites: ['res-001', 'res-002'],
  },
  {
    id: 'res-005',
    track_id: 'track-residential',
    track_slug: 'residential-energy',
    title: 'Government Rebates & Incentives',
    description:
      'Navigate federal and provincial rebate programs to maximize savings on energy upgrades.',
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
      estimatedReadTime: 20,
    },
    learning_objectives: [
      'Navigate Canada Greener Homes Grant application process',
      'Identify province-specific energy rebates',
      'Calculate total available incentives for home upgrades',
      'Develop rebate stacking strategy to maximize savings',
      'Avoid common application mistakes that delay funding',
    ],
    prerequisites: ['res-001', 'res-002', 'res-003', 'res-004'],
  },
];
