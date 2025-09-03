/**
 * Infrastructure Resilience Scoring Engine
 *
 * Comprehensive risk assessment and adaptation planning system for critical infrastructure
 */

// ========== TYPES AND INTERFACES ==========

export enum ClimateHazard {
  FLOODING = 'flooding',
  WILDFIRE = 'wildfire',
  HURRICANE = 'hurricane',
  SEA_LEVEL_RISE = 'sea_level_rise',
  EXTREME_HEAT = 'extreme_heat',
  DROUGHT = 'drought',
  LANDSLIDE = 'landslide',
  EROSION = 'erosion'
}

export enum AssetType {
  POWER_GRID = 'power_grid',
  WATER_SYSTEMS = 'water_systems',
  TRANSPORTATION = 'transportation',
  TELECOMMUNICATIONS = 'telecommunications',
  HEALTHCARE = 'healthcare',
  EMERGENCY_SERVICES = 'emergency_services',
  CRITICAL_MANUFACTURING = 'critical_manufacturing',
  FINANCIAL_SERVICES = 'financial_services'
}

export interface AssetProfile {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  assetType: AssetType;
  currentValue: number;
  dependents: number;
  criticalityScore: number;
  constructionYear: number;
  expectedLifespan: number;
  currentCondition: number;
  area_sq_km: number;
}

// ========== CORE ENGINE ==========

/**
 * Resilience Scoring Engine Class
 *
 * Provides mathematical algorithms for infrastructure resilience assessment
 */
export class ResilienceScoringEngine {

  /**
   * Calculate basic hazard vulnerability score
   */
  public calculateHazardScore(
    hazardType: ClimateHazard,
    assetType: AssetType,
    exposure: number,
    assetCondition: number = 7.0
  ): number {
    // Simple vulnerability calculation for Phase 2A
    const baseExposure = exposure / 10; // Normalize to 0-1
    const conditionFactor = assetCondition / 10; // Normalize to 0-1

    // Asset-specific hazard sensitivity
    const sensitivities: Record<AssetType, Record<ClimateHazard, number>> = {
      [AssetType.POWER_GRID]: {
        [ClimateHazard.FLOODING]: 0.8,
        [ClimateHazard.WILDFIRE]: 0.6,
        [ClimateHazard.HURRICANE]: 0.7,
        [ClimateHazard.SEA_LEVEL_RISE]: 0.5,
        [ClimateHazard.EXTREME_HEAT]: 0.6,
        [ClimateHazard.DROUGHT]: 0.3,
        [ClimateHazard.LANDSLIDE]: 0.4,
        [ClimateHazard.EROSION]: 0.5
      },
      [AssetType.HEALTHCARE]: {
        [ClimateHazard.FLOODING]: 0.9,
        [ClimateHazard.WILDFIRE]: 0.5,
        [ClimateHazard.HURRICANE]: 0.8,
        [ClimateHazard.SEA_LEVEL_RISE]: 0.7,
        [ClimateHazard.EXTREME_HEAT]: 0.6,
        [ClimateHazard.DROUGHT]: 0.4,
        [ClimateHazard.LANDSLIDE]: 0.3,
        [ClimateHazard.EROSION]: 0.3
      },
      // Add minimal defaults for other asset types
      [AssetType.WATER_SYSTEMS]: {} as any,
      [AssetType.TRANSPORTATION]: {} as any,
      [AssetType.TELECOMMUNICATIONS]: {} as any,
      [AssetType.EMERGENCY_SERVICES]: {} as any,
      [AssetType.CRITICAL_MANUFACTURING]: {} as any,
      [AssetType.FINANCIAL_SERVICES]: {} as any
    };

    const sensitivity = sensitivities[assetType]?.[hazardType] || 0.5;

    const vulnerability = baseExposure * sensitivity * conditionFactor;
    return Math.min(vulnerability * 100, 100); // Return percentage
  }

  /**
   * Calculate overall resilience score for an asset
   */
  public assessOverallResilience(
    asset: {
      id: string;
      name: string;
      assetType: AssetType;
      currentCondition: number;
      latitude: number;
      longitude: number;
      criticalDependents: number;
    },
    localHazards: Record<ClimateHazard, number>
  ): {
    overallScore: number;
    hazardBreakdown: Record<ClimateHazard, number>;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {

    // Calculate vulnerability for each hazard
    const hazardBreakdown: Record<ClimateHazard, number> = {} as Record<ClimateHazard, number>;

    for (const [hazard, exposure] of Object.entries(localHazards)) {
      hazardBreakdown[hazard as ClimateHazard] = this.calculateHazardScore(
        hazard as ClimateHazard,
        asset.assetType,
        exposure,
        asset.currentCondition
      );
    }

    // Weighted overall score based on hazard severity and asset criticality
    const hazardWeights: Record<ClimateHazard, number> = {
      [ClimateHazard.FLOODING]: 0.25,
      [ClimateHazard.HURRICANE]: 0.25,
      [ClimateHazard.SEA_LEVEL_RISE]: 0.20,
      [ClimateHazard.EXTREME_HEAT]: 0.15,
      [ClimateHazard.WILDFIRE]: 0.15,
      [ClimateHazard.DROUGHT]: 0.10,
      [ClimateHazard.LANDSLIDE]: 0.08,
      [ClimateHazard.EROSION]: 0.12
    };

    let weightedScore = 0;
    let totalWeight = 0;

    for (const [hazard, weight] of Object.entries(hazardWeights)) {
      if (hazard in hazardBreakdown) {
        weightedScore += hazardBreakdown[hazard as ClimateHazard] * weight;
        totalWeight += weight;
      }
    }

    if (totalWeight === 0) weightedScore = 0;
    else weightedScore = weightedScore / totalWeight;

    // Adjust based on critical dependents (socio-economic impact)
    const dependentsMultiplier = 1 + (asset.criticalDependents / 100000) * 0.3;
    const adjustedScore = Math.min(weightedScore * dependentsMultiplier, 100);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (adjustedScore >= 80) riskLevel = 'critical';
    else if (adjustedScore >= 60) riskLevel = 'high';
    else if (adjustedScore >= 40) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      overallScore: Math.round(adjustedScore),
      hazardBreakdown,
      riskLevel
    };
  }
}

// ========== UTILITIES AND CONSTANTS ==========

export const ResilienceUtils = {
  /**
   * Format resilience score as percentage
   */
  formatRiskScore: (score: number): string => `${score.toFixed(1)}%`,

  /**
   * Get risk level description and color
   */
  getRiskLevelInfo: (level: string) => {
    const levels = {
      low: { description: 'Minimal Resilience Risk', className: 'text-green-700 bg-green-100 border-green-200' },
      medium: { description: 'Moderate Resilience Risk', className: 'text-yellow-700 bg-yellow-100 border-yellow-200' },
      high: { description: 'Significant Resilience Risk', className: 'text-orange-700 bg-orange-100 border-orange-200' },
      critical: { description: 'Extreme Resilience Risk', className: 'text-red-700 bg-red-100 border-red-200' }
    };
    return levels[level as keyof typeof levels] || levels.low;
  }
};

// Default climate hazard profiles for common scenarios
export const DefaultClimateHazards: Record<string, Record<ClimateHazard, number>> = {
  coastalOntario: {
    [ClimateHazard.FLOODING]: 75,
    [ClimateHazard.HURRICANE]: 45,
    [ClimateHazard.SEA_LEVEL_RISE]: 60,
    [ClimateHazard.EXTREME_HEAT]: 80,
    [ClimateHazard.WILDFIRE]: 25,
    [ClimateHazard.DROUGHT]: 35,
    [ClimateHazard.LANDSLIDE]: 15,
    [ClimateHazard.EROSION]: 50
  },
  interiorBC: {
    [ClimateHazard.WILDFIRE]: 85,
    [ClimateHazard.EXTREME_HEAT]: 70,
    [ClimateHazard.FLOODING]: 35,
    [ClimateHazard.SEA_LEVEL_RISE]: 15,
    [ClimateHazard.DROUGHT]: 60,
    [ClimateHazard.LANDSLIDE]: 40,
    [ClimateHazard.HURRICANE]: 25,
    [ClimateHazard.EROSION]: 20
  }
};

// Export singleton instance
export const resilienceEngine = new ResilienceScoringEngine();