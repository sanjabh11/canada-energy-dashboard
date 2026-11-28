/**
 * Certificate module content: Grid Operations & Trading track
 *
 * Split from src/lib/moduleContent.ts (F-11 / CODE-4 god-object refactor).
 * Module entries are verbatim slices of the original file.
 */
import type { Module } from './types';
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
    description:
      'Understand the AESO, energy-only market design, and real-time pool price formation.',
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
      estimatedReadTime: 25,
    },
    learning_objectives: [
      "Explain Alberta's energy-only market design",
      'Describe merit order dispatch and pool price formation',
      'Identify key market participants and their roles',
      'Understand scarcity pricing mechanisms',
      'Differentiate ancillary service types',
    ],
  },
  {
    id: 'grid-002',
    track_id: 'track-gridops',
    track_slug: 'grid-operations',
    title: 'Real-Time Trading Fundamentals',
    description:
      "Learn trading strategies, spread arbitrage, and renewable integration challenges in Alberta's market.",
    sequence_number: 2,
    duration_minutes: 30,
    content_type: 'video',
    content_data: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder
      duration: 1500,
      transcript: 'This video covers real-time trading strategies in the Alberta market...',
      thumbnailUrl: 'https://via.placeholder.com/640x360/0ea5e9/ffffff?text=Trading+Strategies',
    },
    learning_objectives: [
      'Execute spread trades between real-time and day-ahead',
      'Manage intertie congestion risk',
      'Forecast wind/solar generation impact on pool prices',
      'Apply risk management strategies for volatile periods',
      'Identify trading opportunities during shoulder hours',
    ],
    prerequisites: ['grid-001'],
  },
  {
    id: 'grid-003',
    track_id: 'track-gridops',
    track_slug: 'grid-operations',
    title: 'Grid Reliability & Balancing',
    description:
      'Master frequency control, load following, and emergency procedures for grid operators.',
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
          explanation:
            'The Alberta grid operates at 60 Hz, the standard frequency for North American grids. Maintaining this frequency is critical for system stability.',
        },
        {
          id: 'grid-q2',
          question:
            'At what frequency deviation must Under Frequency Load Shedding (UFLS) activate?',
          options: ['59.5 Hz', '59.3 Hz', '58.9 Hz', '58.5 Hz'],
          correctAnswer: 2,
          explanation:
            'UFLS activates at 58.9 Hz to prevent cascading failures. Load is shed in stages as frequency drops to balance generation and demand.',
        },
        {
          id: 'grid-q3',
          question: 'What is the primary purpose of spinning reserves?',
          options: [
            'Reduce electricity prices',
            'Respond to sudden generation loss within 10 minutes',
            'Replace aging infrastructure',
            'Store excess renewable energy',
          ],
          correctAnswer: 1,
          explanation:
            'Spinning reserves provide fast-responding capacity (10-minute response) to compensate for sudden generator outages or demand surges, maintaining grid stability.',
        },
        {
          id: 'grid-q4',
          question:
            'Which renewable energy source poses the greatest short-term forecasting challenge for grid operators?',
          options: ['Solar PV', 'Wind', 'Hydro', 'Biomass'],
          correctAnswer: 1,
          explanation:
            'Wind generation is highly variable and difficult to forecast on 1-6 hour horizons. Solar is more predictable (cloud tracking), while hydro and biomass are dispatchable.',
        },
        {
          id: 'grid-q5',
          question: 'What is "inertia" in grid operations?',
          options: [
            'Resistance to new technology adoption',
            'Rotational energy stored in synchronous generators',
            'Time delay in price signals',
            'Transmission line resistance',
          ],
          correctAnswer: 1,
          explanation:
            'Inertia is the rotational energy stored in spinning generators. It resists frequency changes, providing critical stability. Inverter-based renewables (wind/solar) contribute minimal inertia, increasing frequency control challenges.',
        },
      ],
      passingScore: 80,
    },
    learning_objectives: [
      'Monitor frequency deviations and respond appropriately',
      'Coordinate spinning and supplemental reserves',
      'Execute UFLS protocols during emergencies',
      'Manage renewable intermittency with flexible generation',
      'Understand inertia requirements for grid stability',
    ],
    prerequisites: ['grid-001', 'grid-002'],
  },
  {
    id: 'grid-004',
    track_id: 'track-gridops',
    track_slug: 'grid-operations',
    title: 'Renewable Integration Simulator',
    description:
      'Simulate grid balancing with high renewable penetration and solve real-world dispatch challenges.',
    sequence_number: 4,
    duration_minutes: 35,
    content_type: 'interactive',
    content_data: {
      tool: 'simulator',
      title: 'Grid Dispatch Simulator',
      description:
        'Balance supply and demand in a simplified Alberta grid with wind, solar, gas, and battery storage.',
      parameters: {
        initialState: {
          demand: 10000, // MW
          wind: 2000,
          solar: 500,
          gas: 6500,
          hydro: 500,
          battery: 500,
          batteryCharge: 50, // %
        },
        scenarios: [
          {
            name: 'Morning Ramp',
            description: 'Demand increases 2000 MW in 1 hour, solar ramps up',
          },
          { name: 'Wind Drop', description: 'Wind drops 1500 MW in 30 minutes' },
          { name: 'Peak Demand', description: 'Evening peak with low renewables' },
        ],
      },
    },
    learning_objectives: [
      'Balance generation and demand in real-time',
      'Utilize battery storage for frequency regulation',
      'Manage curtailment during excess renewable production',
      'Coordinate flexible gas generation with renewable ramps',
      'Calculate reserve margins for reliability',
    ],
    prerequisites: ['grid-001', 'grid-002', 'grid-003'],
  },
  {
    id: 'grid-005',
    track_id: 'track-gridops',
    track_slug: 'grid-operations',
    title: 'Advanced Market Analytics',
    description:
      'Analyze historical pool prices, forecast drivers, and build trading models using Alberta data.',
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
      estimatedReadTime: 30,
    },
    learning_objectives: [
      'Identify primary drivers of Alberta pool prices',
      'Build short-term price forecast models',
      'Execute profitable spread trades',
      'Calculate risk metrics (VaR, PaR)',
      'Analyze historical price events for trading insights',
    ],
    prerequisites: ['grid-001', 'grid-002', 'grid-003', 'grid-004'],
  },
];
