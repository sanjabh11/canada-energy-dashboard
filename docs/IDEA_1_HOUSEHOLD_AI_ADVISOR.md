# 💡 IDEA #1: AI-POWERED HOUSEHOLD ENERGY ADVISOR ("My Energy AI")
## Detailed Implementation Plan

---

## 🎯 EXECUTIVE SUMMARY

**Vision**: Every Canadian household gets a personal AI energy advisor that saves them money, reduces consumption, and educates on clean energy.

**Impact**: 15 million+ households across all 10 provinces and 3 territories

**Average Savings**: $300-800/year per household = $4.5 - $12 BILLION national savings

**Uniqueness**: World's first conversational AI integrating real-time provincial grid data with household consumption patterns

---

## 🏆 WHY THIS WINS THE COMPETITION

### **1. Universal Impact**
- ✅ Works for ALL provinces (not geography-restricted)
- ✅ Helps everyday Canadians, not just researchers/experts
- ✅ Immediate tangible benefit (money savings)
- ✅ Addresses climate goals through behavior change

### **2. Technical Innovation**
- 🌟 First AI to combine provincial grid operations with household patterns
- 🌟 Natural language interface accessible to seniors, immigrants, youth
- 🌟 Real-time integration with IESO, AESO, BC Hydro, Hydro-Québec APIs
- 🌟 Predictive analytics using your existing AI Oracle + Gemini LLM

### **3. Social Good**
- 🌍 Reduces energy poverty through education and optimization
- 🌍 Empowers renters and homeowners equally
- 🌍 Multilingual support (English, French, Indigenous languages)
- 🌍 Privacy-first: data stays on user's device (local storage)

---

## 🔧 TECHNICAL IMPLEMENTATION

### **Architecture Overview**

```
┌─────────────────────────────────────────────────────────┐
│                 USER INTERFACE (React)                   │
│  - Chat Interface (Natural Language)                     │
│  - Dashboard (Consumption, Savings, Recommendations)     │
│  - Alerts Panel (Price spikes, optimal usage times)     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              AI ORCHESTRATION LAYER                      │
│  - Gemini 2.5 Pro (Conversational AI)                   │
│  - aiOracle.ts (Predictive Analytics)                   │
│  - llmClient.ts (Energy Recommendations)                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              DATA INTEGRATION LAYER                      │
│  Provincial Grid Data    │    Household Data             │
│  - IESO (Ontario)       │    - Manual input             │
│  - AESO (Alberta)       │    - Smart meter (optional)   │
│  - BC Hydro             │    - Bill uploads             │
│  - Hydro-Québec         │    - Appliance inventory      │
│  - SaskPower            │    - Local storage            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              RECOMMENDATION ENGINE                       │
│  - Time-of-use optimization                             │
│  - Appliance-level insights                             │
│  - Rebate matching (federal + provincial)               │
│  - Behavioral nudges                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 COMPONENTS TO BUILD

### **1. HouseholdEnergyAdvisor.tsx** (Main Component)

**Location**: `src/components/HouseholdEnergyAdvisor.tsx`

**Features**:
- Conversational chat interface (like ChatGPT)
- Real-time energy dashboard
- Personalized recommendations panel
- Cost savings tracker
- Provincial data integration

**UI Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  My Energy AI - Your Personal Energy Advisor            │
├─────────────────────────────────────────────────────────┤
│  💬 Chat with Your Energy AI                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ You: "Why is my bill so high this month?"       │   │
│  │ AI: "I analyzed your usage. Your heating ran    │   │
│  │     60% more due to cold snap. Here are 3       │   │
│  │     ways to save $45/month..."                  │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  📊 Your Energy Profile                                 │
│  Monthly: 850 kWh | Avg Cost: $127 | vs Neighbors: +15%│
├─────────────────────────────────────────────────────────┤
│  💡 AI Recommendations (Updated Daily)                  │
│  1. ⚡ Run dishwasher after 7 PM - Save $12/month      │
│  2. 🌡️ Lower thermostat 2°C at night - Save $23/month │
│  3. 💰 You qualify for $500 heat pump rebate (Ontario) │
└─────────────────────────────────────────────────────────┘
```

---

### **2. EnergyAdvisorChat.tsx** (Chat Interface)

**Location**: `src/components/EnergyAdvisorChat.tsx`

**Capabilities**:
- Natural language processing via Gemini 2.5 Pro
- Context-aware responses (knows user's province, usage patterns)
- Multi-turn conversations with memory
- Voice input support (accessibility)

**Sample Queries Users Can Ask**:
```typescript
// Bill Analysis
"Why did my electricity bill increase this month?"
"Compare my usage to last year"

// Optimization
"When is the cheapest time to run my washing machine?"
"How can I reduce my heating costs?"

// Education
"What is time-of-use pricing?"
"Should I install solar panels in Saskatchewan?"

// Rebates
"What rebates am I eligible for in BC?"
"How do I apply for the Canada Greener Homes Grant?"

// Emergencies
"There's a heat wave coming - how can I stay cool without high bills?"
```

---

### **3. HouseholdDataManager.ts** (Data Layer)

**Location**: `src/lib/householdDataManager.ts`

**Functions**:
```typescript
interface HouseholdProfile {
  userId: string;
  province: string;
  postalCode: string;
  homeType: 'house' | 'apartment' | 'condo' | 'townhouse';
  squareFootage: number;
  occupants: number;
  heatingType: 'gas' | 'electric' | 'oil' | 'heat-pump';
  hasAC: boolean;
  hasSolar: boolean;
  hasEV: boolean;
  utilityProvider: string;
}

interface MonthlyUsage {
  month: string;
  consumption_kwh: number;
  cost_cad: number;
  peakUsageHours: number[];
  weather: { avgTemp: number; heatingDegreeDays: number };
}

class HouseholdDataManager {
  // Store user profile in local storage (privacy-first)
  saveProfile(profile: HouseholdProfile): void;
  
  // Calculate personalized benchmarks
  calculateBenchmark(profile: HouseholdProfile): { 
    expectedUsage: number; 
    avgCost: number; 
    similarHomes: number[] 
  };
  
  // Integrate with provincial grid data
  async getProvincialPricing(province: string): Promise<PricingData>;
  
  // Generate AI recommendations
  async generateRecommendations(
    profile: HouseholdProfile, 
    usage: MonthlyUsage[]
  ): Promise<Recommendation[]>;
}
```

---

### **4. RebateMatcher.ts** (Federal + Provincial Programs)

**Location**: `src/lib/rebateMatcher.ts`

**Data Sources**:
- Natural Resources Canada (NRCan) rebate database
- Provincial utility rebate programs
- Municipal incentives

**Features**:
```typescript
interface Rebate {
  id: string;
  name: string;
  provider: 'federal' | 'provincial' | 'municipal' | 'utility';
  province: string;
  amount: number; // CAD
  type: 'heat-pump' | 'insulation' | 'windows' | 'solar' | 'EV-charger' | 'smart-thermostat';
  eligibility: string[];
  applicationUrl: string;
  deadline?: string;
}

class RebateMatcher {
  // Match user to available rebates
  async findEligibleRebates(
    profile: HouseholdProfile
  ): Promise<Rebate[]>;
  
  // Calculate total potential savings
  calculateMaxRebates(rebates: Rebate[]): number;
  
  // Priority ranking (highest value + easiest to claim)
  rankByValue(rebates: Rebate[]): Rebate[];
}
```

**Sample Rebate Database** (Implement in Supabase):
```sql
CREATE TABLE energy_rebates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  province TEXT NOT NULL,
  amount_min INTEGER,
  amount_max INTEGER,
  rebate_type TEXT,
  eligibility_json JSONB,
  application_url TEXT,
  active_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate with known programs
INSERT INTO energy_rebates VALUES
('nrcan-greener-homes', 'Canada Greener Homes Grant', 'federal', 'ALL', 125, 5000, 'home-retrofit', '{"income_limit": null}', 'https://natural-resources.canada.ca/...', '2027-03-31'),
('on-home-efficiency', 'Ontario Home Efficiency Rebate', 'provincial', 'ON', 0, 10000, 'heat-pump', '{"homeowner": true}', 'https://ontario.ca/...', NULL);
```

---

## 📊 DATA SOURCES & INTEGRATION

### **Provincial Grid Data (Real-Time)**

| Province | API/Source | Data Available | Integration Status |
|----------|-----------|----------------|-------------------|
| **Ontario** | IESO API | Demand, prices, generation | ✅ Already integrated |
| **Alberta** | AESO API | Market prices, supply/demand | ✅ Already integrated |
| **BC** | BC Hydro Open Data | Rates, time-of-use | 🔄 Need to add |
| **Quebec** | Hydro-Québec API | Pricing, consumption stats | 🔄 Need to add |
| **Saskatchewan** | SaskPower | Rate schedules | 🔄 Need to add |
| **Manitoba** | Manitoba Hydro | Rates, conservation programs | 🔄 Need to add |
| **Maritimes** | NB Power, NS Power, etc. | Regional pricing | 🔄 Need to add |

### **Weather Data**
- **Source**: Environment and Climate Change Canada (ECCC) API
- **Use**: Correlate consumption with temperature, predict heating/cooling needs
- **Already Available**: Your codebase has weather integration infrastructure

### **Rebate Data**
- **Federal**: NRCan Canada Greener Homes Initiative API
- **Provincial**: Web scraping + manual curation (no unified API)
- **Storage**: Supabase table `energy_rebates`

---

## 🤖 AI MODEL IMPLEMENTATION

### **Conversational AI (Gemini 2.5 Pro)**

**System Prompt** (Add to `src/lib/householdAdvisorPrompt.ts`):
```typescript
export const HOUSEHOLD_ADVISOR_PROMPT = `
You are "My Energy AI", a friendly and knowledgeable energy advisor for Canadian households.

CORE CAPABILITIES:
- Analyze household energy consumption patterns
- Provide personalized money-saving recommendations
- Explain electricity bills in simple language
- Match households to federal and provincial rebate programs
- Educate on time-of-use pricing, peak hours, and optimization

USER CONTEXT:
Province: {{province}}
Home Type: {{homeType}}
Monthly Usage: {{monthlyKwh}} kWh
Monthly Cost: {{monthlyCost}} CAD
Current Provincial Price: {{currentPrice}} cents/kWh

RESPONSE FRAMEWORK:
1. **Acknowledge**: Understand the user's question/concern
2. **Analyze**: Use provided data to identify patterns
3. **Recommend**: Give 2-3 specific, actionable steps
4. **Educate**: Briefly explain WHY (e.g., "during peak hours, prices are 3x higher")
5. **Empower**: Show potential savings ("This could save you $X/month")

COMMUNICATION STYLE:
- Warm, encouraging, non-judgmental
- Use simple language (avoid jargon)
- Provide specific numbers (kWh, $, %)
- Celebrate wins ("Great job! Your usage is 10% lower than last month")
- Multilingual support: Respond in user's preferred language

EXAMPLES:
User: "Why is my bill so high?"
AI: "I see your January bill was $215, which is $48 higher than December. The main driver was heating - you used 320 kWh more. Here's why: January had 15 days below -10°C (coldest in 3 years). 

3 Ways to Lower Your Next Bill:
1. Lower thermostat 2°C at night (saves ~$25/month)
2. Seal window drafts (I found a $150 rebate for weatherization in Ontario)
3. Run appliances after 7 PM when rates drop 40%

Let's tackle these together!"
`;
```

### **Recommendation Engine** (Rule-Based + ML)

**Phase 1 (Quick Win - Rule-Based)**:
```typescript
// src/lib/energyRecommendations.ts
interface Recommendation {
  id: string;
  category: 'behavioral' | 'upgrade' | 'rebate' | 'emergency';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSavings: { monthly: number; annual: number };
  effort: 'easy' | 'moderate' | 'significant';
  actionSteps: string[];
}

function generateRecommendations(
  profile: HouseholdProfile,
  usage: MonthlyUsage[],
  provincialData: ProvincialData
): Recommendation[] {
  const recs: Recommendation[] = [];
  
  // Rule 1: High heating costs
  if (profile.heatingType === 'electric' && usage[0].consumption_kwh > 1500) {
    recs.push({
      id: 'heating-optimization',
      category: 'behavioral',
      priority: 'high',
      title: 'Reduce Heating Costs by 20%',
      description: 'Your electric heating is using 60% of your energy. Small adjustments can save big.',
      potentialSavings: { monthly: 35, annual: 420 },
      effort: 'easy',
      actionSteps: [
        'Lower thermostat by 2°C when sleeping (saves $15/month)',
        'Use programmable thermostat to reduce heat when away',
        'Close vents in unused rooms',
        'Check for drafts around windows and doors'
      ]
    });
  }
  
  // Rule 2: Time-of-use opportunities
  if (provincialData.hasTOUPricing && detectPeakUsage(usage)) {
    recs.push({
      id: 'tou-shifting',
      category: 'behavioral',
      priority: 'high',
      title: 'Shift Usage to Off-Peak Hours',
      description: 'You\'re using 40% of energy during expensive peak hours (11AM-5PM).',
      potentialSavings: { monthly: 28, annual: 336 },
      effort: 'easy',
      actionSteps: [
        'Run dishwasher after 7 PM (saves $8/month)',
        'Do laundry on weekends or evenings',
        'Charge EV overnight (if applicable)',
        'Set smart plugs to delay appliances'
      ]
    });
  }
  
  // Rule 3: Heat pump rebate eligibility
  if (profile.province === 'ON' && profile.heatingType === 'gas' && profile.homeType === 'house') {
    recs.push({
      id: 'heat-pump-rebate',
      category: 'rebate',
      priority: 'medium',
      title: 'Get $10,000 for Heat Pump Upgrade',
      description: 'You qualify for federal + provincial rebates totaling $10,000 for a cold-climate heat pump.',
      potentialSavings: { monthly: 60, annual: 720 },
      effort: 'significant',
      actionSteps: [
        'Get free EnergyGuide assessment (required)',
        'Apply for Canada Greener Homes Grant ($5,000)',
        'Apply for Ontario Enbridge rebate ($5,000)',
        'Payback period: 4-6 years with rebates'
      ]
    });
  }
  
  return recs.sort((a, b) => b.potentialSavings.annual - a.potentialSavings.annual);
}
```

**Phase 2 (Advanced - ML Model)**:
- Train model on anonymized usage patterns from 1000s of households
- Predict consumption based on home characteristics + weather
- Identify outliers (high users for similar homes)
- Use clustering to find peer groups for comparisons

---

## 🎨 UI/UX DESIGN

### **Onboarding Flow** (5-minute setup)

**Step 1: Welcome**
```
┌─────────────────────────────────────────────────────────┐
│  👋 Welcome to My Energy AI!                            │
│                                                          │
│  I'm your personal energy advisor. In 5 minutes,        │
│  I'll help you:                                         │
│  ✓ Understand your energy usage                        │
│  ✓ Find ways to save money                             │
│  ✓ Discover rebates you qualify for                    │
│                                                          │
│  Your data stays private on your device.               │
│                                                          │
│            [Let's Get Started →]                        │
└─────────────────────────────────────────────────────────┘
```

**Step 2: Basic Info**
```
Province: [Dropdown: ON, AB, BC, QC, ...]
Postal Code: [M5V 3A8]
Home Type: [House] [Apartment] [Condo] [Townhouse]
```

**Step 3: Upload Bill (Optional)**
```
📄 Upload your latest electricity bill (PDF/JPG)
   [Upload Button] or [Enter Manually]
   
If manual:
  Monthly Usage: [850] kWh
  Monthly Cost: [$127]
```

**Step 4: Household Details**
```
Occupants: [3] people
Square Footage: [1200] sq ft
Heating: [Electric] [Gas] [Oil] [Heat Pump]
Air Conditioning: [Yes] [No]
```

**Step 5: AI Analysis**
```
🤖 Analyzing your profile...
   ✓ Compared to 5,432 similar homes in Ontario
   ✓ Found 3 money-saving opportunities
   ✓ Matched you to 2 rebate programs
   
   Potential Annual Savings: $640
   
   [View My Dashboard →]
```

---

### **Main Dashboard Design**

```tsx
// src/components/HouseholdEnergyAdvisor.tsx
import React, { useState, useEffect } from 'react';
import { MessageSquare, TrendingDown, DollarSign, Gift, Zap } from 'lucide-react';

export const HouseholdEnergyAdvisor: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap /> My Energy AI
        </h1>
        <p className="mt-2">Your personal energy advisor for smarter, cheaper, cleaner energy</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          icon={<TrendingDown />} 
          title="This Month" 
          value="782 kWh" 
          change="-8% vs last month" 
          positive 
        />
        <StatCard 
          icon={<DollarSign />} 
          title="Current Bill" 
          value="$118" 
          change="$12 lower than avg" 
          positive 
        />
        <StatCard 
          icon={<Gift />} 
          title="Available Rebates" 
          value="$6,500" 
          change="2 programs matched" 
        />
        <StatCard 
          icon={<Zap />} 
          title="Potential Savings" 
          value="$640/year" 
          change="From 5 recommendations" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chat Interface (2 columns) */}
        <div className="lg:col-span-2">
          <EnergyAdvisorChat />
        </div>

        {/* Right: Recommendations */}
        <div>
          <RecommendationsPanel />
        </div>
      </div>

      {/* Usage Charts */}
      <div className="mt-6">
        <UsageAnalytics />
      </div>
    </div>
  );
};
```

---

## 🚀 IMPLEMENTATION TIMELINE

### **Phase 1: Foundation (Weeks 1-2)**
- ✅ Build `HouseholdEnergyAdvisor.tsx` component
- ✅ Implement `HouseholdDataManager.ts` with local storage
- ✅ Create onboarding flow
- ✅ Integrate existing provincial data (IESO, AESO)

### **Phase 2: AI Integration (Weeks 3-4)**
- ✅ Configure Gemini 2.5 Pro with household advisor prompt
- ✅ Build `EnergyAdvisorChat.tsx` component
- ✅ Implement rule-based recommendation engine
- ✅ Test conversational flows

### **Phase 3: Rebate Matching (Weeks 5-6)**
- ✅ Build `energy_rebates` table in Supabase
- ✅ Populate with federal + provincial programs (100+ rebates)
- ✅ Implement `RebateMatcher.ts`
- ✅ Create rebate application workflow

### **Phase 4: Enhancement (Weeks 7-8)**
- ✅ Add more provincial data sources (BC Hydro, Hydro-Québec)
- ✅ Implement usage analytics and charts
- ✅ Build peer comparison feature
- ✅ Add multilingual support (French, basic Indigenous)

### **Phase 5: Testing & Polish (Weeks 9-10)**
- ✅ User testing with 50 beta households across provinces
- ✅ Performance optimization
- ✅ Accessibility audit (WCAG 2.1)
- ✅ Competition submission preparation

---

## 📈 SUCCESS METRICS

### **User Engagement**
- Target: 100,000 households onboarded in first 3 months
- Chat interactions: 5+ messages per user per month
- Return rate: 60% monthly active users

### **Energy Savings**
- Average reduction: 10-15% in consumption
- Total savings: $30M+ annually (100K households × $300 avg)
- CO2 reduction: 45,000 tonnes/year

### **Rebate Claims**
- Target: $10M in rebates claimed through platform
- 20% conversion rate (users who see rebate → apply)

### **Competition Impact**
- **Scalability**: Works for ALL 15M Canadian households
- **Innovation**: First conversational AI for household energy
- **Social Good**: Reduces energy poverty, empowers citizens
- **Technical Excellence**: Real-time integration, privacy-first design

---

## 💰 COST ESTIMATE

### **Development**
- Developer time: 10 weeks × 1 FTE = $30,000
- Gemini API costs: $500/month (100K households × 10 queries/month)
- Supabase hosting: $100/month (rebate database)

### **Data Acquisition**
- Provincial API integrations: $5,000 one-time (BC, QC, SK, MB)
- Rebate database curation: $3,000 one-time

**Total First Year**: ~$45,000
**Cost per Household**: $0.45/year (incredibly cost-effective!)

---

## 🏆 COMPETITION EDGE

### **Why This Wins**
1. **Universal Impact**: Every Canadian household benefits
2. **Immediate Value**: Tangible savings in first month
3. **Technical Innovation**: No other platform integrates AI + provincial grids + household data
4. **Social Justice**: Helps vulnerable populations reduce energy costs
5. **Scalability**: Cloud-native, can handle millions of users
6. **Privacy-First**: Data stored locally, not harvested
7. **Multilingual**: Accessible to all Canadians
8. **Government Alignment**: Supports Net-Zero 2050 goals through behavior change

**This is not just a feature - it's a MOVEMENT to democratize energy intelligence for every Canadian.**

---

**Next: See IDEA_3_ENERGY_POVERTY.md for the second priority implementation**
