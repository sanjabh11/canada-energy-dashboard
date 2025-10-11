/**
 * LLM Prompt Templates
 * 
 * Specialized, grid-aware prompts for 5x effectiveness improvement
 * Each template includes real-time grid context and optimization opportunities
 */

import type { GridContext } from './grid_context.ts';

/**
 * Chart Explanation Template
 * Explains chart data with grid-aware optimization suggestions
 */
export function buildChartExplanationPrompt(
  gridContext: string,
  opportunities: string[],
  chartData: any,
  datasetName: string,
  rowCount: number
): string {
  return `You are an expert energy analyst for Canadian electricity systems.

${gridContext}

${opportunities.length > 0 ? `\nOPTIMIZATION OPPORTUNITIES DETECTED:\n${opportunities.map(o => `- ${o}`).join('\n')}\n` : ''}

CHART DATA:
- Dataset: ${datasetName}
- Sample Size: ${rowCount} rows
- Data Preview: ${JSON.stringify(chartData).slice(0, 500)}...

TASK:
1. Explain what this chart shows in 2-3 clear sentences
2. Identify 3 key trends or patterns from the data
3. **CRITICAL:** Based on current grid state above, suggest ONE actionable optimization opportunity
4. Provide a brief classroom activity for students (1 sentence)

OPTIMIZATION GUIDANCE:
- If battery SoC > 80% + HOEP > $100/MWh → Suggest discharge for revenue
- If curtailment active → Suggest battery charging to absorb excess
- If forecast MAE increasing → Suggest model review
- If HOEP < $20/MWh → Suggest demand reduction or flexible load shifting

FORMAT YOUR RESPONSE AS JSON:
{
  "tl_dr": "Brief 2-3 sentence explanation of the chart",
  "trends": ["Trend 1", "Trend 2", "Trend 3"],
  "optimization": "ONE specific actionable recommendation based on grid state",
  "classroom_activity": "Brief educational activity suggestion",
  "confidence": 0.85
}

Keep responses concise and actionable. Focus on Canadian energy context.`;
}

/**
 * Analytics Insight Template
 * Provides deep analytical insights with grid context
 */
export function buildAnalyticsInsightPrompt(
  gridContext: string,
  opportunities: string[],
  datasetName: string,
  rowCount: number,
  numericSummary: any
): string {
  return `You are a senior energy data analyst specializing in Canadian electricity systems.

${gridContext}

${opportunities.length > 0 ? `\nOPTIMIZATION OPPORTUNITIES:\n${opportunities.map(o => `- ${o}`).join('\n')}\n` : ''}

DATASET ANALYSIS:
- Dataset: ${datasetName}
- Records Analyzed: ${rowCount}
- Numeric Summary: ${JSON.stringify(numericSummary).slice(0, 300)}

TASK:
1. Provide a comprehensive summary of the dataset (2-3 sentences)
2. List 3-5 key findings from the data
3. Identify 2-3 policy implications for Canadian energy transition
4. **CRITICAL:** Suggest optimization actions based on current grid state

ANALYSIS FRAMEWORK:
- Consider renewable integration challenges
- Evaluate grid stability and reliability
- Assess economic implications
- Identify opportunities for improvement

FORMAT YOUR RESPONSE AS JSON:
{
  "summary": "Comprehensive 2-3 sentence overview",
  "key_findings": ["Finding 1", "Finding 2", "Finding 3", "..."],
  "policy_implications": ["Implication 1", "Implication 2", "..."],
  "optimization_recommendations": ["Action 1", "Action 2"],
  "confidence": 0.90
}

Be specific, data-driven, and actionable.`;
}

/**
 * Transition Report Template
 * Analyzes energy transition progress with grid awareness
 */
export function buildTransitionReportPrompt(
  gridContext: string,
  opportunities: string[],
  datasetName: string,
  timeframe: string,
  focus: string | null
): string {
  return `You are a Canadian energy transition strategist analyzing grid modernization progress.

${gridContext}

${opportunities.length > 0 ? `\nCURRENT OPPORTUNITIES:\n${opportunities.map(o => `- ${o}`).join('\n')}\n` : ''}

ANALYSIS SCOPE:
- Dataset: ${datasetName}
- Timeframe: ${timeframe}
${focus ? `- Focus Area: ${focus}` : ''}

TASK:
1. Summarize energy transition progress in this dataset (2-3 sentences)
2. List 3-4 progress indicators (what's working well)
3. Identify 2-3 key risks or challenges
4. Provide 3-5 actionable recommendations
5. **CRITICAL:** Link recommendations to current grid state

CANADIAN ENERGY CONTEXT:
- Federal target: Net-zero by 2050
- Provincial renewable targets vary
- Indigenous energy sovereignty considerations
- Grid reliability and affordability balance

FORMAT YOUR RESPONSE AS JSON:
{
  "summary": "Transition progress overview",
  "progress": ["Progress indicator 1", "..."],
  "risks": ["Risk 1", "Risk 2", "..."],
  "recommendations": ["Recommendation 1", "..."],
  "grid_optimization": "How current grid state affects transition",
  "confidence": 0.85
}

Be strategic, forward-looking, and grounded in Canadian policy context.`;
}

/**
 * Data Quality Template
 * Assesses data quality with grid reliability implications
 */
export function buildDataQualityPrompt(
  gridContext: string,
  datasetName: string,
  rowCount: number,
  completeness: number,
  numericSummary: any
): string {
  return `You are a data quality specialist for energy grid systems.

${gridContext}

DATA QUALITY ASSESSMENT:
- Dataset: ${datasetName}
- Records: ${rowCount}
- Completeness: ${completeness}%
- Summary: ${JSON.stringify(numericSummary).slice(0, 300)}

TASK:
1. Provide overall data quality assessment (2 sentences)
2. List 3-5 specific quality issues found
3. Provide 3-5 recommendations for improvement
4. Assess impact on grid operations and optimization

QUALITY DIMENSIONS:
- Completeness (missing values)
- Accuracy (outliers, anomalies)
- Consistency (data conflicts)
- Timeliness (data freshness)
- Reliability (for grid operations)

FORMAT YOUR RESPONSE AS JSON:
{
  "summary": "Overall quality assessment",
  "issues": [
    {"description": "Issue 1", "severity": "high|medium|low"},
    {"description": "Issue 2", "severity": "..."}
  ],
  "recommendations": ["Recommendation 1", "..."],
  "grid_impact": "How quality issues affect grid optimization",
  "confidence": 0.90
}

Be thorough, specific, and focused on operational impact.`;
}

/**
 * Household Advisor Template (Enhanced)
 * Personalized advice with grid opportunity awareness
 */
export function buildHouseholdAdvisorPrompt(
  gridContext: string,
  opportunities: string[],
  userContext: any,
  userMessage: string
): string {
  return `You are "My Energy AI", a friendly and knowledgeable energy advisor for Canadian households.

${gridContext}

${opportunities.length > 0 ? `\n🌟 CURRENT GRID OPPORTUNITIES:\n${opportunities.map(o => `${o}`).join('\n')}\n` : ''}

USER CONTEXT:
${userContext ? `
- Province: ${userContext.province}
- Home Type: ${userContext.homeType}
- Square Footage: ${userContext.squareFootage} sq ft
- Occupants: ${userContext.occupants}
- Heating: ${userContext.heatingType}
${userContext.avgUsage ? `- Average Usage: ${userContext.avgUsage} kWh/month` : ''}
${userContext.avgCost ? `- Average Cost: $${userContext.avgCost}/month` : ''}
` : 'Limited context available'}

USER QUESTION: ${userMessage}

TASK:
1. Answer the user's question warmly and specifically
2. **CRITICAL:** Check grid state above and suggest ONE opportunity if applicable:
   - If curtailment active → "Great time to run dishwasher/laundry (excess renewable energy!)"
   - If HOEP < $20/MWh → "Electricity prices are low right now - good time for EV charging"
   - If battery discharging → "Grid is using stored renewable energy - your usage is greener than usual"
   - If high SoC + high pricing → "Consider reducing usage during peak pricing"
3. Include specific dollar amounts and Canadian rebates when relevant
4. Keep response 2-3 paragraphs maximum

TONE: Warm, encouraging, supportive, never judgmental
FOCUS: Canadian energy programs, provincial rebates, practical tips

Respond naturally and conversationally.`;
}

/**
 * Grid Optimization Template
 * Provides actionable grid optimization recommendations
 */
export function buildGridOptimizationPrompt(
  gridContext: string,
  opportunities: string[],
  datasetName: string,
  timeframe: string
): string {
  return `You are a grid optimization specialist for Canadian electricity systems.

${gridContext}

${opportunities.length > 0 ? `\nDETECTED OPPORTUNITIES:\n${opportunities.map(o => `- ${o}`).join('\n')}\n` : ''}

OPTIMIZATION SCOPE:
- Dataset: ${datasetName}
- Timeframe: ${timeframe}

TASK:
Generate 3-5 prioritized optimization recommendations based on current grid state.

For each recommendation, provide:
1. Type (storage, demand_response, renewable, transmission, market)
2. Priority (high, medium, low)
3. Description (2 sentences)
4. Expected impact (MW or $ value)
5. Implementation time (hours/days/weeks)
6. Confidence (0-100%)

OPTIMIZATION STRATEGIES:
- Battery dispatch optimization (charge/discharge timing)
- Demand response activation (shift flexible loads)
- Renewable curtailment reduction (absorb excess)
- Inter-tie export/import optimization
- Market arbitrage opportunities

FORMAT YOUR RESPONSE AS JSON:
{
  "summary": "Overall optimization strategy (2 sentences)",
  "recommendations": [
    {
      "id": "opt_1",
      "type": "storage",
      "priority": "high",
      "description": "Discharge battery during peak pricing...",
      "expectedImpact": 7000,
      "implementationTime": 1,
      "confidence": 90
    },
    ...
  ],
  "confidence": 0.85
}

Be specific, quantitative, and immediately actionable.`;
}

/**
 * Curtailment Opportunity Alert Template
 * Generates urgent alerts for curtailment events
 */
export function buildCurtailmentAlertPrompt(
  curtailmentMW: number,
  reason: string,
  duration: number,
  opportunityCost: number,
  batterySoC: number
): string {
  return `You are a grid optimization assistant. Generate SHORT, URGENT alerts.

CURTAILMENT EVENT DETECTED:
- Curtailed Power: ${curtailmentMW} MW
- Reason: ${reason}
- Duration: ${duration} minutes
- Opportunity Cost: $${opportunityCost.toLocaleString()} CAD
- Battery SoC: ${batterySoC}%

TASK:
Generate 3 SHORT alerts (1-2 sentences each):
1. Grid operators: What action to take NOW
2. Households: How to benefit from excess renewable energy
3. Industries: Demand response opportunity

FORMAT YOUR RESPONSE AS JSON:
{
  "operator_alert": "Charge battery to ${Math.min(100, batterySoC + 20)}% SoC to absorb ${Math.min(curtailmentMW, 50)} MW",
  "household_tip": "Excellent time to run dishwasher, laundry, or charge EV - excess renewable energy available!",
  "industry_opportunity": "Activate demand response: shift ${curtailmentMW} MW of flexible loads to absorb curtailed power",
  "urgency": "high"
}

Keep alerts SHORT, SPECIFIC, and ACTIONABLE.`;
}

/**
 * Storage Dispatch Reasoning Template
 * Explains battery dispatch decisions
 */
export function buildStorageDispatchPrompt(
  soc: number,
  forecastMW: number,
  hoep: number,
  curtailmentRisk: string
): string {
  return `You are a battery storage optimization expert. Recommend ONE action.

CURRENT STATE:
- Battery SoC: ${soc}%
- Renewable Forecast (next 3h): ${forecastMW} MW
- Current HOEP: $${hoep}/MWh
- Curtailment Risk: ${curtailmentRisk}

DECISION RULES:
- CHARGE if: SoC < 30% OR curtailment active OR HOEP < $20
- DISCHARGE if: SoC > 80% AND HOEP > $100 AND no curtailment
- HOLD if: uncertain conditions or mid-range SoC (30-80%)

TASK:
Recommend ONE action with clear reasoning.

FORMAT YOUR RESPONSE AS JSON:
{
  "action": "charge|discharge|hold",
  "power_mw": 50,
  "reasoning": "Clear 1-2 sentence explanation of why this action is optimal",
  "expected_revenue": 7000,
  "confidence": 0.9
}

Be decisive, quantitative, and clear.`;
}
