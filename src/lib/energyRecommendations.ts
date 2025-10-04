/**
 * Energy Recommendations Engine
 * Rule-based recommendation system for household energy optimization
 */

import type {
  HouseholdProfile,
  MonthlyUsage,
  ProvincialPricing,
  Recommendation,
  PotentialSavings,
  ActionStep,
} from './types/household';

/**
 * Detect if user has significant peak usage during time-of-use pricing hours
 */
function detectPeakUsage(usage: MonthlyUsage[]): boolean {
  if (usage.length === 0) return false;
  
  const recentMonth = usage[0];
  if (!recentMonth.peakUsageHours || recentMonth.peakUsageHours.length === 0) {
    return false;
  }
  
  // Peak hours typically 11 AM - 5 PM (11-16)
  const peakHourUsage = recentMonth.peakUsageHours.filter(
    hour => hour >= 11 && hour <= 16
  ).length;
  
  // If more than 40% of tracked hours are in peak, flag it
  return peakHourUsage / recentMonth.peakUsageHours.length > 0.4;
}

/**
 * Calculate average usage over recent months
 */
function calculateAverageUsage(usage: MonthlyUsage[], months: number = 3): number {
  if (usage.length === 0) return 0;
  
  const recentUsage = usage.slice(0, Math.min(months, usage.length));
  const total = recentUsage.reduce((sum, u) => sum + u.consumption_kwh, 0);
  return total / recentUsage.length;
}

/**
 * Detect seasonal usage patterns
 */
function detectSeasonalPattern(usage: MonthlyUsage[]): {
  highUsageMonths: string[];
  isWinterPeak: boolean;
  isSummerPeak: boolean;
} {
  if (usage.length < 6) {
    return { highUsageMonths: [], isWinterPeak: false, isSummerPeak: false };
  }

  const sortedByUsage = [...usage].sort((a, b) => b.consumption_kwh - a.consumption_kwh);
  const topThree = sortedByUsage.slice(0, 3);
  
  const winterMonths = ['01', '02', '03', '11', '12'];
  const summerMonths = ['06', '07', '08'];
  
  const isWinterPeak = topThree.filter(u => 
    winterMonths.includes(u.month.split('-')[1])
  ).length >= 2;
  
  const isSummerPeak = topThree.filter(u => 
    summerMonths.includes(u.month.split('-')[1])
  ).length >= 2;
  
  return {
    highUsageMonths: topThree.map(u => u.month),
    isWinterPeak,
    isSummerPeak,
  };
}

/**
 * Estimate typical monthly usage based on household profile
 * Used when no actual usage data is available
 */
function estimateUsageFromProfile(profile: HouseholdProfile): number {
  // Base usage per occupant
  let estimated = 300 * profile.occupants;
  
  // Adjust for square footage (larger homes use more)
  const sizeFactor = profile.squareFootage / 1500;
  estimated *= sizeFactor;
  
  // Adjust for heating type
  if (profile.heatingType === 'electric') {
    estimated *= 1.4; // Electric heating adds ~40%
  } else if (profile.heatingType === 'heat-pump') {
    estimated *= 1.2; // Heat pumps are more efficient but still electric
  }
  
  // Adjust for AC
  if (profile.hasAC) {
    estimated *= 1.15; // AC adds ~15% in summer (averaged over year)
  }
  
  // Adjust for EV
  if (profile.hasEV) {
    estimated += 300; // ~300 kWh/month for typical EV
  }
  
  // Solar reduces net usage
  if (profile.hasSolar) {
    estimated *= 0.6; // Solar can offset 40% or more
  }
  
  return Math.round(estimated);
}

/**
 * Generate personalized energy recommendations
 */
export function generateRecommendations(
  profile: HouseholdProfile,
  usage: MonthlyUsage[],
  provincialData: ProvincialPricing
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const avgUsage = calculateAverageUsage(usage);
  const seasonalPattern = detectSeasonalPattern(usage);
  const hasUsageData = usage.length > 0;
  
  // Estimate typical usage if no data available (based on profile)
  const estimatedUsage = !hasUsageData ? estimateUsageFromProfile(profile) : avgUsage;
  
  // RECOMMENDATION 1: High Electric Heating Costs (works with or without data)
  if (profile.heatingType === 'electric') {
    const usageToUse = hasUsageData ? avgUsage : estimatedUsage;
    const monthlySavings = Math.round(usageToUse * 0.15 * provincialData.currentPrice / 100);
    const annualSavings = monthlySavings * 12;
    const kwhSaved = Math.round(usageToUse * 0.15);
    
    recommendations.push({
      id: 'heating-optimization',
      category: 'behavioral',
      priority: 'high',
      title: 'Reduce Electric Heating Costs by 15-20%',
      description: hasUsageData 
        ? `Your electric heating is using significant energy in winter months. Small thermostat adjustments and draft sealing can make a big difference.`
        : `Electric heating can be expensive. Based on your ${profile.squareFootage} sq ft home in ${profile.province}, we estimate simple changes could save you significantly.`,
      potentialSavings: {
        monthly: monthlySavings,
        annual: annualSavings,
        kwh: kwhSaved * 12,
        co2Reduction: kwhSaved * 12 * 0.13, // ~0.13 kg CO2 per kWh in Canada avg
      },
      effort: 'easy',
      actionSteps: [
        {
          step: 'Lower thermostat by 2°C when sleeping (10 PM - 6 AM)',
          estimatedTime: '2 minutes',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Use a programmable or smart thermostat to automate temperature reductions',
          estimatedTime: '1 hour',
          difficulty: 'moderate',
          cost: 80,
        },
        {
          step: 'Check for drafts around windows and doors, apply weatherstripping',
          estimatedTime: '2 hours',
          difficulty: 'easy',
          cost: 30,
        },
        {
          step: 'Close heating vents in unused rooms',
          estimatedTime: '15 minutes',
          difficulty: 'easy',
          cost: 0,
        },
      ],
      relatedRebates: ['smart-thermostat-rebate'],
    });
  }

  // RECOMMENDATION 2: Time-of-Use Opportunities
  if (provincialData.hasTOUPricing && detectPeakUsage(usage)) {
    const peakPenalty = avgUsage * 0.4 * (provincialData.touRates!.onPeak - provincialData.touRates!.offPeak) / 100;
    const monthlySavings = Math.round(peakPenalty * 0.7);
    const annualSavings = monthlySavings * 12;
    
    recommendations.push({
      id: 'tou-shifting',
      category: 'behavioral',
      priority: 'high',
      title: 'Shift Usage to Off-Peak Hours',
      description: `You're using ${Math.round(avgUsage * 0.4)} kWh during expensive peak hours. Moving usage to evenings and weekends can save significantly.`,
      potentialSavings: {
        monthly: monthlySavings,
        annual: annualSavings,
        kwh: 0, // No actual kWh saved, just cost reduction
        co2Reduction: 0,
      },
      effort: 'easy',
      actionSteps: [
        {
          step: `Run dishwasher after 7 PM (off-peak rate: ${provincialData.touRates?.offPeak}¢/kWh)`,
          estimatedTime: 'Daily habit',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Do laundry on weekends or after 7 PM on weekdays',
          estimatedTime: 'Adjust schedule',
          difficulty: 'easy',
          cost: 0,
        },
        profile.hasEV && {
          step: 'Set EV to charge overnight (11 PM - 6 AM)',
          estimatedTime: '5 minutes setup',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Use smart plugs to delay appliances until off-peak',
          estimatedTime: '30 minutes',
          difficulty: 'moderate',
          cost: 40,
        },
      ].filter(Boolean) as ActionStep[],
    });
  }

  // RECOMMENDATION 3: Heat Pump Upgrade (Ontario specific, but adaptable)
  if (
    ['ON', 'BC', 'QC'].includes(profile.province) &&
    profile.heatingType === 'gas' &&
    profile.homeType === 'house' &&
    avgUsage < 2000 // Gas users typically have lower electricity usage
  ) {
    recommendations.push({
      id: 'heat-pump-rebate',
      category: 'rebate',
      priority: 'medium',
      title: 'Get Up to $10,000 for Heat Pump Upgrade',
      description: `Cold-climate heat pumps are 3x more efficient than electric heating. You qualify for significant federal and provincial rebates.`,
      potentialSavings: {
        monthly: 60,
        annual: 720,
        kwh: 0, // Complex calculation, depends on gas usage
        co2Reduction: 2400, // Heat pumps significantly reduce emissions
      },
      effort: 'significant',
      actionSteps: [
        {
          step: 'Book a free EnergyGuide home assessment (required for rebates)',
          estimatedTime: '2 hours',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Get 3 quotes from certified heat pump installers',
          estimatedTime: '1 week',
          difficulty: 'moderate',
          cost: 0,
        },
        {
          step: 'Apply for Canada Greener Homes Grant (up to $5,000)',
          estimatedTime: '1 hour',
          difficulty: 'moderate',
          cost: 0,
        },
        {
          step: 'Apply for provincial heat pump rebate (varies by province)',
          estimatedTime: '1 hour',
          difficulty: 'moderate',
          cost: 0,
        },
        {
          step: 'Schedule installation and second EnergyGuide assessment',
          estimatedTime: '1-2 days',
          difficulty: 'moderate',
          cost: 8000, // After rebates, typical out-of-pocket
        },
      ],
      relatedRebates: ['canada-greener-homes', 'provincial-heat-pump'],
    });
  }

  // RECOMMENDATION 4: High Summer Cooling Costs
  if (
    profile.hasAC && 
    seasonalPattern.isSummerPeak && 
    avgUsage > 800
  ) {
    const monthlySavings = Math.round(avgUsage * 0.12 * provincialData.currentPrice / 100);
    const annualSavings = monthlySavings * 4; // Summer months only
    
    recommendations.push({
      id: 'cooling-optimization',
      category: 'behavioral',
      priority: 'medium',
      title: 'Reduce Air Conditioning Costs',
      description: `Your summer electricity usage is ${Math.round((avgUsage / 600 - 1) * 100)}% higher than winter. Smart cooling strategies can help.`,
      potentialSavings: {
        monthly: monthlySavings,
        annual: annualSavings,
        kwh: Math.round(avgUsage * 0.12) * 4,
        co2Reduction: Math.round(avgUsage * 0.12) * 4 * 0.13,
      },
      effort: 'easy',
      actionSteps: [
        {
          step: 'Set AC to 24°C instead of 22°C (saves 10-15%)',
          estimatedTime: '1 minute',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Use ceiling or portable fans to circulate cool air',
          estimatedTime: '30 minutes',
          difficulty: 'easy',
          cost: 50,
        },
        {
          step: 'Close blinds during hottest part of day (10 AM - 4 PM)',
          estimatedTime: 'Daily habit',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Clean or replace AC filters monthly during summer',
          estimatedTime: '15 minutes',
          difficulty: 'easy',
          cost: 20,
        },
      ],
    });
  }

  // RECOMMENDATION 5: Smart Thermostat
  if (
    !['smart-thermostat', 'heat-pump'].includes(profile.heatingType) &&
    (avgUsage > 800 || seasonalPattern.isWinterPeak || seasonalPattern.isSummerPeak)
  ) {
    const monthlySavings = Math.round(avgUsage * 0.10 * provincialData.currentPrice / 100);
    const annualSavings = monthlySavings * 12;
    
    recommendations.push({
      id: 'smart-thermostat',
      category: 'upgrade',
      priority: 'medium',
      title: 'Install a Smart Thermostat',
      description: `Smart thermostats learn your schedule and can reduce heating/cooling by 10-15% automatically.`,
      potentialSavings: {
        monthly: monthlySavings,
        annual: annualSavings,
        kwh: Math.round(avgUsage * 0.10) * 12,
        co2Reduction: Math.round(avgUsage * 0.10) * 12 * 0.13,
      },
      effort: 'moderate',
      actionSteps: [
        {
          step: 'Research smart thermostats (Nest, Ecobee, Honeywell)',
          estimatedTime: '1 hour',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Check for utility rebates (many utilities offer $50-100 off)',
          estimatedTime: '15 minutes',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Purchase and install (DIY or electrician)',
          estimatedTime: '1-2 hours',
          difficulty: 'moderate',
          cost: 200,
        },
        {
          step: 'Set up schedules and temperature preferences in app',
          estimatedTime: '30 minutes',
          difficulty: 'easy',
          cost: 0,
        },
      ],
      relatedRebates: ['smart-thermostat-utility-rebate'],
    });
  }

  // RECOMMENDATION 6: High Overall Usage (General)
  if (avgUsage > 1500) {
    const monthlySavings = Math.round(avgUsage * 0.08 * provincialData.currentPrice / 100);
    const annualSavings = monthlySavings * 12;
    
    recommendations.push({
      id: 'general-conservation',
      category: 'behavioral',
      priority: 'medium',
      title: 'General Energy Conservation Tips',
      description: `Your usage is higher than average for similar homes. These simple habits can add up to significant savings.`,
      potentialSavings: {
        monthly: monthlySavings,
        annual: annualSavings,
        kwh: Math.round(avgUsage * 0.08) * 12,
        co2Reduction: Math.round(avgUsage * 0.08) * 12 * 0.13,
      },
      effort: 'easy',
      actionSteps: [
        {
          step: 'Switch all lights to LED bulbs (saves 75% vs incandescent)',
          estimatedTime: '1 hour',
          difficulty: 'easy',
          cost: 50,
        },
        {
          step: 'Unplug devices and chargers when not in use',
          estimatedTime: 'Daily habit',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Run full loads in dishwasher and washing machine',
          estimatedTime: 'Change habits',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Air-dry clothes instead of using dryer when possible',
          estimatedTime: 'Variable',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Turn off lights when leaving a room',
          estimatedTime: 'Daily habit',
          difficulty: 'easy',
          cost: 0,
        },
      ],
    });
  }

  // RECOMMENDATION 7: EV Charging Optimization
  if (profile.hasEV) {
    const evUsage = 300; // Estimated kWh per month
    const monthlySavings = provincialData.hasTOUPricing
      ? Math.round(evUsage * (provincialData.touRates!.onPeak - provincialData.touRates!.offPeak) / 100)
      : 15; // Minimum savings even without TOU
    
    recommendations.push({
      id: 'ev-charging-optimization',
      category: 'behavioral',
      priority: provincialData.hasTOUPricing ? 'high' : 'medium',
      title: provincialData.hasTOUPricing ? 'Optimize EV Charging Times' : 'EV Charging Best Practices',
      description: provincialData.hasTOUPricing
        ? `Charging your EV during off-peak hours can save you significantly with time-of-use pricing.`
        : `Optimize your EV charging habits to reduce strain on the grid and potentially save on costs.`,
      potentialSavings: {
        monthly: monthlySavings,
        annual: monthlySavings * 12,
        kwh: 0,
        co2Reduction: 0,
      },
      effort: 'easy',
      actionSteps: [
        {
          step: provincialData.hasTOUPricing 
            ? 'Set your EV to charge between 11 PM and 6 AM' 
            : 'Charge overnight when grid demand is lower',
          estimatedTime: '5 minutes',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Use your utility\'s EV charging app for lowest rates',
          estimatedTime: '15 minutes setup',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Consider a smart Level 2 charger for automated scheduling',
          estimatedTime: '2 hours install',
          difficulty: 'moderate',
          cost: 600,
        },
      ],
      relatedRebates: ['ev-charger-rebate'],
    });
  }

  // RECOMMENDATION 8: Smart Thermostat (always applicable, profile-based)
  if (!hasUsageData || estimatedUsage > 500) {
    const usageToUse = hasUsageData ? avgUsage : estimatedUsage;
    const savings = Math.round(usageToUse * 0.10 * provincialData.currentPrice / 100);
    
    recommendations.push({
      id: 'smart-thermostat',
      category: 'upgrade',
      priority: 'medium',
      title: 'Install a Smart Thermostat',
      description: 'Smart thermostats learn your schedule and can reduce heating/cooling costs by 10-15% automatically.',
      potentialSavings: {
        monthly: savings,
        annual: savings * 12,
        kwh: Math.round(usageToUse * 0.10 * 12),
        co2Reduction: Math.round(usageToUse * 0.10 * 12 * 0.13),
      },
      effort: 'moderate',
      actionSteps: [
        {
          step: 'Research smart thermostats (Nest, Ecobee, Honeywell)',
          estimatedTime: '30 minutes',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Check if your utility offers rebates (many do!)',
          estimatedTime: '15 minutes',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Purchase and install smart thermostat',
          estimatedTime: '1 hour',
          difficulty: 'moderate',
          cost: 200,
        },
        {
          step: 'Configure schedule and temperature preferences',
          estimatedTime: '30 minutes',
          difficulty: 'easy',
          cost: 0,
        },
      ],
      relatedRebates: ['smart-thermostat-rebate'],
    });
  }

  // RECOMMENDATION 9: Heat Pump Upgrade (for gas heating users)
  if (profile.heatingType === 'gas' && ['ON', 'BC', 'QC'].includes(profile.province)) {
    recommendations.push({
      id: 'heat-pump-upgrade',
      category: 'upgrade',
      priority: 'medium',
      title: 'Consider Heat Pump Upgrade',
      description: `Heat pumps are 2-3x more efficient than gas furnaces and eligible for up to $10,000 in rebates in ${profile.province}.`,
      potentialSavings: {
        monthly: 50,
        annual: 600,
        kwh: 0,
        co2Reduction: 2000, // Significant CO2 reduction from switching off gas
      },
      effort: 'significant',
      actionSteps: [
        {
          step: 'Get a free home energy audit',
          estimatedTime: '2 hours',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Get quotes from 3 HVAC contractors',
          estimatedTime: '3 hours',
          difficulty: 'moderate',
          cost: 0,
        },
        {
          step: 'Apply for rebates (Greener Homes Grant)',
          estimatedTime: '1 hour',
          difficulty: 'moderate',
          cost: 0,
        },
        {
          step: 'Schedule installation',
          estimatedTime: '1 day',
          difficulty: 'hard',
          cost: 8000,
        },
      ],
      relatedRebates: ['canada-greener-homes', 'heat-pump-rebate'],
    });
  }

  // RECOMMENDATION 10: General Energy Conservation (always applicable)
  if (!hasUsageData || recommendations.length < 3) {
    const usageToUse = hasUsageData ? avgUsage : estimatedUsage;
    const savings = Math.round(usageToUse * 0.08 * provincialData.currentPrice / 100);
    
    recommendations.push({
      id: 'general-conservation',
      category: 'behavioral',
      priority: 'low',
      title: 'Easy Energy-Saving Habits',
      description: 'Small daily changes can add up to significant savings over time.',
      potentialSavings: {
        monthly: savings,
        annual: savings * 12,
        kwh: Math.round(usageToUse * 0.08 * 12),
        co2Reduction: Math.round(usageToUse * 0.08 * 12 * 0.13),
      },
      effort: 'easy',
      actionSteps: [
        {
          step: 'Replace 5 most-used bulbs with LEDs',
          estimatedTime: '30 minutes',
          difficulty: 'easy',
          cost: 25,
        },
        {
          step: 'Unplug devices when not in use (phantom load)',
          estimatedTime: '10 minutes daily',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Use cold water for laundry',
          estimatedTime: '0 minutes (same effort)',
          difficulty: 'easy',
          cost: 0,
        },
        {
          step: 'Air-dry dishes instead of heated drying',
          estimatedTime: '0 minutes',
          difficulty: 'easy',
          cost: 0,
        },
      ],
    });
  }

  // Sort by potential annual savings (highest first)
  return recommendations.sort(
    (a, b) => b.potentialSavings.annual - a.potentialSavings.annual
  );
}

/**
 * Calculate total potential savings from all recommendations
 */
export function calculateTotalSavings(recommendations: Recommendation[]): PotentialSavings {
  return recommendations.reduce(
    (total, rec) => ({
      monthly: total.monthly + rec.potentialSavings.monthly,
      annual: total.annual + rec.potentialSavings.annual,
      kwh: total.kwh + rec.potentialSavings.kwh,
      co2Reduction: total.co2Reduction + rec.potentialSavings.co2Reduction,
    }),
    { monthly: 0, annual: 0, kwh: 0, co2Reduction: 0 }
  );
}

/**
 * Filter recommendations by effort level
 */
export function filterByEffort(
  recommendations: Recommendation[],
  maxEffort: 'easy' | 'moderate' | 'significant'
): Recommendation[] {
  const effortRank = { easy: 1, moderate: 2, significant: 3 };
  const maxRank = effortRank[maxEffort];
  
  return recommendations.filter(rec => effortRank[rec.effort] <= maxRank);
}

/**
 * Get quick wins (easy + high impact)
 */
export function getQuickWins(recommendations: Recommendation[]): Recommendation[] {
  return recommendations.filter(
    rec => rec.effort === 'easy' && rec.potentialSavings.annual > 100
  );
}
