/**
 * Technology Readiness Level (TRL) Assessment Engine
 *
 * Systematic evaluation of technology maturity and deployment readiness
 * Based on standard TRL scales (NASA/DoD methodology)
 */

// ========== TRL DEFINITIONS ==========

/**
 * Standard TRL Levels (1-9 scale from NASA/DoD)
 */
export enum TRL {
  TRL1_CONCEPTUAL = 1,
  TRL2_BASIC_RESEARCH = 2,
  TRL3_APPLIED_RESEARCH = 3,
  TRL4_PROOF_OF_CONCEPT = 4,
  TRL5_COMPONENTS_VALIDATION = 5,
  TRL6_SYSTEM_VALIDATION = 6,
  TRL7_SYSTEM_DEMONSTRATION = 7,
  TRL8_SYSTEM_COMPLETE = 8,
  TRL9_OPERATIONAL = 9
}

/**
 * Innovation categories for assessment
 */
export enum InnovationCategory {
  CLIMATE_TECH = 'climate_technology',
  ENERGY_STORAGE = 'energy_storage',
  RENEWABLE_ENERGY = 'renewable_energy',
  GRID_MANAGEMENT = 'grid_management',
  CARBON_CAPTURE = 'carbon_capture',
  MATERIAL_SCIENCE = 'material_science',
  DIGITAL_TWINS = 'digital_twins',
  AI_ML = 'ai_ml',
  HYDROGEN_TECH = 'hydrogen_technology'
}

/**
 * Market maturity stages
 */
export enum MarketMaturity {
  EMERGING = 'emerging',
  EARLY_ADOPTION = 'early_adoption',
  ESTABLISHED = 'established',
  MAINSTREAM = 'mainstream'
}

/**
 * Innovation assessment criteria
 */
export interface TRLEvaluation {
  innovationId: string;
  innovationName: string;
  category: InnovationCategory;
  trlScore: TRL;
  confidence: number; // 1-10 scale
  lastAssessed: string;
  assessor: string;
  evidenceDescription: string;
}

/**
 * Market opportunity analysis
 */
export interface MarketOpportunity {
  innovationId: string;
  marketSize: number; // USD potential
  growthRate: number; // % annual growth
  competitiveAdvantage: number; // 1-10 scale
  fundingReadiness: number; // 1-10 scale
  commercializationPath: string;
  barriersToEntry: string[];
  estimatedTimeframe: string; // "2-5 years", "5-10 years"
}

// ========== CORE SCORING ENGINE ==========

/**
 * TRL and Innovation Assessment Engine
 */
export class TechnologyReadinessEngine {

  /**
   * Evaluate TRL based on assessment criteria
   *
   * This uses a weighted scoring approach combining multiple factors
   */
  public assessTechnologyReadiness(
    innovationData: {
      name: string;
      description: string;
      patentsFiled?: number;
      prototypesBuilt?: number;
      pilotProjects?: number;
      commercialDeployments?: number;
      regulatoryApprovals?: string[];
      fundingSecured?: number;
      publications?: number;
      certifications?: string[];
      partnerships?: number;
      yearsOfDevelopment?: number;
    },
    category: InnovationCategory
  ): TRLEvaluation {

    // Assessment weights by category
    const categoryWeights: Record<InnovationCategory, {
      research: number;
      development: number;
      validation: number;
      commercial: number;
    }> = {
      [InnovationCategory.CLIMATE_TECH]: { research: 0.25, development: 0.3, validation: 0.3, commercial: 0.15 },
      [InnovationCategory.ENERGY_STORAGE]: { research: 0.2, development: 0.25, validation: 0.35, commercial: 0.2 },
      [InnovationCategory.RENEWABLE_ENERGY]: { research: 0.15, development: 0.2, validation: 0.25, commercial: 0.4 },
      [InnovationCategory.GRID_MANAGEMENT]: { research: 0.2, development: 0.25, validation: 0.3, commercial: 0.25 },
      [InnovationCategory.CARBON_CAPTURE]: { research: 0.3, development: 0.25, validation: 0.25, commercial: 0.2 },
      [InnovationCategory.MATERIAL_SCIENCE]: { research: 0.35, development: 0.3, validation: 0.25, commercial: 0.1 },
      [InnovationCategory.DIGITAL_TWINS]: { research: 0.15, development: 0.3, validation: 0.3, commercial: 0.25 },
      [InnovationCategory.AI_ML]: { research: 0.2, development: 0.3, validation: 0.25, commercial: 0.25 },
      [InnovationCategory.HYDROGEN_TECH]: { research: 0.25, development: 0.3, validation: 0.25, commercial: 0.2 }
    };

    const weights = categoryWeights[category];

    // Calculate readiness scores for each component
    const researchReadiness = this.calculateResearchReadiness(
      innovationData.publications || 0,
      innovationData.patentsFiled || 0,
      innovationData.yearsOfDevelopment || 0
    );

    const developmentReadiness = this.calculateDevelopmentReadiness(
      innovationData.prototypesBuilt || 0,
      innovationData.pilotProjects || 0,
      (innovationData.certifications?.length || 0) + (innovationData.regulatoryApprovals?.length || 0)
    );

    const validationReadiness = this.calculateValidationReadiness(
      innovationData.pilotProjects || 0,
      innovationData.partnerships || 0,
      innovationData.fundingSecured || 0
    );

    const commercialReadiness = this.calculateCommercialReadiness(
      innovationData.commercialDeployments || 0,
      innovationData.fundingSecured || 0,
      innovationData.partnerships || 0
    );

    // Weighted overall score
    const overallScore = (
      researchReadiness * weights.research +
      developmentReadiness * weights.development +
      validationReadiness * weights.validation +
      commercialReadiness * weights.commercial
    );

    // Map score to TRL level
    const trlScore = this.mapScoreToTRL(overallScore);
    const confidence = this.calculateConfidence(innovationData, overallScore);

    return {
      innovationId: this.generateInnovationId(innovationData.name),
      innovationName: innovationData.name,
      category,
      trlScore,
      confidence: Math.round(confidence * 10) / 10, // Round to 1 decimal
      lastAssessed: new Date().toISOString(),
      assessor: 'TRL Assessment Engine',
      evidenceDescription: this.generateEvidenceDescription(
        researchReadiness, developmentReadiness, validationReadiness, commercialReadiness
      )
    };
  }

  /**
   * Calculate research readiness (TRL 1-3 components)
   */
  private calculateResearchReadiness(
    publications: number,
    patents: number,
    yearsOfDevelopment: number
  ): number {
    const pubScore = Math.min(publications / 10, 1) * 0.3;  // Max at 10 publications
    const patentScore = Math.min(patents / 5, 1) * 0.3;     // Max at 5 patents
    const timeScore = Math.min(yearsOfDevelopment / 5, 1) * 0.4; // Max at 5 years

    return pubScore + patentScore + timeScore;
  }

  /**
   * Calculate development readiness (TRL 4-5 components)
   */
  private calculateDevelopmentReadiness(
    prototypes: number,
    pilots: number,
    certifications: number
  ): number {
    const prototypeScore = Math.min(prototypes / 3, 1) * 0.4;  // Max at 3 prototypes
    const pilotScore = Math.min(pilots / 2, 1) * 0.4;           // Max at 2 pilots
    const certScore = Math.min(certifications / 5, 1) * 0.2;    // Max at 5 certifications

    return prototypeScore + pilotScore + certScore;
  }

  /**
   * Calculate validation readiness (TRL 6-7 components)
   */
  private calculateValidationReadiness(
    pilots: number,
    partnerships: number,
    funding: number
  ): number {
    const pilotScore = Math.min(pilots / 3, 1) * 0.4;           // Max at 3 pilots
    const partnershipScore = Math.min(partnerships / 5, 1) * 0.3; // Max at 5 partnerships
    const fundingScore = Math.min(funding / 10000000, 1) * 0.3;   // Max at $10M

    return pilotScore + partnershipScore + fundingScore;
  }

  /**
   * Calculate commercial readiness (TRL 8-9 components)
   */
  private calculateCommercialReadiness(
    deployments: number,
    funding: number,
    partnerships: number
  ): number {
    const deploymentScore = Math.min(deployments / 10, 1) * 0.5;   // Max at 10 deployments
    const fundingScore = Math.min(funding / 50000000, 1) * 0.3;    // Max at $50M
    const partnershipScore = Math.min(partnerships / 10, 1) * 0.2;  // Max at 10 partnerships

    return deploymentScore + fundingScore + partnershipScore;
  }

  /**
   * Map overall score to TRL level
   */
  private mapScoreToTRL(score: number): TRL {
    if (score >= 0.90) return TRL.TRL9_OPERATIONAL;
    if (score >= 0.75) return TRL.TRL8_SYSTEM_COMPLETE;
    if (score >= 0.60) return TRL.TRL7_SYSTEM_DEMONSTRATION;
    if (score >= 0.45) return TRL.TRL6_SYSTEM_VALIDATION;
    if (score >= 0.35) return TRL.TRL5_COMPONENTS_VALIDATION;
    if (score >= 0.25) return TRL.TRL4_PROOF_OF_CONCEPT;
    if (score >= 0.15) return TRL.TRL3_APPLIED_RESEARCH;
    if (score >= 0.05) return TRL.TRL2_BASIC_RESEARCH;
    return TRL.TRL1_CONCEPTUAL;
  }

  /**
   * Calculate confidence in assessment
   */
  private calculateConfidence(data: any, score: number): number {
    let evidenceCount = 0;

    // Count available evidence
    if (data.publications > 0) evidenceCount += 0.2;
    if (data.patentsFiled > 0) evidenceCount += 0.2;
    if (data.prototypesBuilt > 0) evidenceCount += 0.2;
    if (data.pilotProjects > 0) evidenceCount += 0.15;
    if (data.commercialDeployments > 0) evidenceCount += 0.15;
    if (data.fundingSecured > 0) evidenceCount += 0.1;

    const evidenceConfidence = Math.min(evidenceCount + 0.3, 1.0); // Minimum 30% confidence
    const scoreConfidence = Math.max(0.8 - Math.abs(0.5 - score) * 1.6, 0.4); // More confident with scores near 0.5

    return (evidenceConfidence + scoreConfidence) / 2;
  }

  /**
   * Generate innovation ID
   */
  private generateInnovationId(name: string): string {
    const timestamp = Date.now().toString(36);
    const nameSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
    return `inn_${nameSlug}_${timestamp}`;
  }

  /**
   * Generate evidence description for assessment
   */
  private generateEvidenceDescription(
    research: number,
    development: number,
    validation: number,
    commercial: number
  ): string {
    const components: string[] = [];

    if (research > 0.3) components.push('strong research foundation');
    if (development > 0.3) components.push('robust development progress');
    if (validation > 0.3) components.push('comprehensive validation');
    if (commercial > 0.2) components.push('commercial readiness');

    return components.length > 0
      ? `Assessment based on: ${components.join(', ')}`
      : 'Limited evidence available for comprehensive assessment';
  }

  /**
   * Analyze market opportunities
   */
  public analyzeMarketOpportunity(
    innovation: TRLEvaluation & {
      targetMarket: string;
      competitorCount: number;
      competitiveFactor: number; // 1-10 scale
      fundingRequirements: number; // USD
      growthProjections: Record<string, number>; // Year -> Growth %
    }
  ): MarketOpportunity {

    // Calculate market maturity
    const marketMaturity = this.assessMarketMaturity(innovation.trlScore, innovation.category);

    // Estimate addressable market size
    const marketSize = this.estimateMarketSize(
      innovation.targetMarket,
      innovation.category,
      innovation.trlScore
    );

    // Calculate growth rate
    const growthRate = this.calculateGrowthRate(
      innovation.growthProjections,
      innovation.category,
      marketMaturity
    );

    // Assess competitive advantage
    const competitiveAdvantage = Math.min(innovation.competitiveFactor + (innovation.category === InnovationCategory.AI_ML ? 2 : 0), 10);

    // Determine commercialization path
    const commercializationPath = this.determineCommercializationPath(innovation.trlScore, marketMaturity, competitiveAdvantage);

    // Identify barriers to entry
    const barriersToEntry = this.identifyBarriersToEntry(
      innovation.trlScore,
      innovation.competitorCount,
      innovation.category
    );

    // Estimate funding readiness
    const fundingReadiness = this.assessFundingReadiness(
      innovation.trlScore,
      competitiveAdvantage,
      innovation.fundingRequirements
    );

    // Estimate timeframe to market
    const estimatedTimeframe = this.estimateTimeframeToMarket(innovation.trlScore, fundingReadiness);

    return {
      innovationId: innovation.innovationId,
      marketSize,
      growthRate,
      competitiveAdvantage,
      fundingReadiness,
      commercializationPath,
      barriersToEntry,
      estimatedTimeframe
    };
  }

  /**
   * Assess market maturity
   */
  private assessMarketMaturity(trl: TRL, category: InnovationCategory): MarketMaturity {
    const categoryMaturity: Record<InnovationCategory, number> = {
      [InnovationCategory.AI_ML]: 8,
      [InnovationCategory.DIGITAL_TWINS]: 7,
      [InnovationCategory.GRID_MANAGEMENT]: 6,
      [InnovationCategory.ENERGY_STORAGE]: 6,
      [InnovationCategory.RENEWABLE_ENERGY]: 7,
      [InnovationCategory.CLIMATE_TECH]: 5,
      [InnovationCategory.CARBON_CAPTURE]: 4,
      [InnovationCategory.MATERIAL_SCIENCE]: 6,
      [InnovationCategory.HYDROGEN_TECH]: 4
    };

    const baseMaturity = categoryMaturity[category];
    const trlAdjustment = (trl - 1) / 9 * 2; // TRL 9 gets +2 to maturity
    const maturityScore = baseMaturity + trlAdjustment;

    if (maturityScore >= 8) return MarketMaturity.MAINSTREAM;
    if (maturityScore >= 6) return MarketMaturity.ESTABLISHED;
    if (maturityScore >= 4) return MarketMaturity.EARLY_ADOPTION;
    return MarketMaturity.EMERGING;
  }

  /**
   * Estimate addressable market size
   */
  private estimateMarketSize(targetMarket: string, category: InnovationCategory, trl: TRL): number {
    // Base market sizes by category (USD billions)
    const baseSizes: Record<InnovationCategory, number> = {
      [InnovationCategory.AI_ML]: 500,
      [InnovationCategory.RENEWABLE_ENERGY]: 2000,
      [InnovationCategory.ENERGY_STORAGE]: 200,
      [InnovationCategory.CARBON_CAPTURE]: 50,
      [InnovationCategory.MATERIAL_SCIENCE]: 150,
      [InnovationCategory.CLIMATE_TECH]: 300,
      [InnovationCategory.DIGITAL_TWINS]: 20,
      [InnovationCategory.GRID_MANAGEMENT]: 100,
      [InnovationCategory.HYDROGEN_TECH]: 25
    };

    const baseSize = baseSizes[category] || 100;
    const trlMultiplier = 0.1 + (trl / 10); // Higher TRL = more addressable market

    return Math.round(baseSize * trlMultiplier * 1000000000);
  }

  /**
   * Calculate growth rate projections
   */
  private calculateGrowthRate(
    projections: Record<string, number>,
    category: InnovationCategory,
    maturity: MarketMaturity
  ): number {
    // Use provided projections or defaults
    if (Object.keys(projections).length > 0) {
      const latestYear = Math.max(...Object.keys(projections).map(y => parseInt(y)));
      return projections[latestYear.toString()] || 15;
    }

    // Default growth rates by maturity and category
    const maturityRates: Record<MarketMaturity, number> = {
      [MarketMaturity.EMERGING]: 25,
      [MarketMaturity.EARLY_ADOPTION]: 20,
      [MarketMaturity.ESTABLISHED]: 15,
      [MarketMaturity.MAINSTREAM]: 8
    };

    return maturityRates[maturity];
  }

  /**
   * Determine commercialization path
   */
  private determineCommercializationPath(trl: TRL, maturity: MarketMaturity, advantage: number): string {
    if (trl >= TRL.TRL8_SYSTEM_COMPLETE) {
      if (maturity === MarketMaturity.MAINSTREAM) return 'Direct market entry, competitive differentiation';
      return 'Strategic partnerships, pilot program expansion';
    }

    if (trl >= TRL.TRL6_SYSTEM_VALIDATION) {
      if (advantage >= 8) return 'First-to-market opportunity, premium pricing';
      return 'Partnerships with early adopters, proof-of-concept projects';
    }

    if (trl >= TRL.TRL4_PROOF_OF_CONCEPT) {
      return 'Facilitated development partnerships, government funding';
    }

    return 'Research partnerships, mentorship programs';
  }

  /**
   * Identify barriers to entry
   */
  private identifyBarriersToEntry(trl: TRL, competitors: number, category: InnovationCategory): string[] {
    const barriers: string[] = [];

    if (trl < TRL.TRL5_COMPONENTS_VALIDATION) {
      barriers.push('Economic viability not proven');
      barriers.push('Technology scalability concerns');
    }

    if (competitors > 10) {
      barriers.push('High competition in target market');
    }

    if ([InnovationCategory.CARBON_CAPTURE, InnovationCategory.HYDROGEN_TECH].includes(category)) {
      barriers.push('High capital intensity');
      barriers.push('Infrastructure dependencies');
    }

    if (category === InnovationCategory.AI_ML) {
      barriers.push('Data availability and quality');
      barriers.push('Regulatory compliance (privacy, bias)');
    }

    return barriers;
  }

  /**
   * Assess funding readiness
   */
  private assessFundingReadiness(trl: TRL, advantage: number, requirements: number): number {
    // Higher TRL = better funding readiness
    const trlScore = trl / 9; // Normalize 1-9 to 0-1
    const advantageScore = advantage / 10; // Normalize 1-10 to 0-1
    const requirementsScore = requirements > 50000000 ? 0.8 : Math.min(1, 50000000 / requirements);

    return Math.round((trlScore * 0.4 + advantageScore * 0.4 + requirementsScore * 0.2) * 10);
  }

  /**
   * Estimate timeframe to market
   */
  private estimateTimeframeToMarket(trl: TRL, fundingReadiness: number): string {
    const baselineMonths = 24; // 2 years base
    const trlAdjustment = (9 - trl) * 3; // Higher TRL = faster to market
    const fundingAdjustment = fundingReadiness >= 7 ? -6 : 0; // Good funding = faster

    const totalMonths = baselineMonths + trlAdjustment + fundingAdjustment;

    if (totalMonths <= 24) return '1-2 years';
    if (totalMonths <= 36) return '2-3 years';
    if (totalMonths <= 60) return '3-5 years';
    return '5+ years';
  }
}

// ========== UTILITIES ==========

export const InnovationUtils = {
  /**
   * Format TRL level as descriptive string
   */
  formatTRL: (trl: TRL): string => {
    const descriptions: Record<TRL, string> = {
      [TRL.TRL1_CONCEPTUAL]: 'TRL 1: Basic principles observed',
      [TRL.TRL2_BASIC_RESEARCH]: 'TRL 2: Technology concept formulated',
      [TRL.TRL3_APPLIED_RESEARCH]: 'TRL 3: Proof-of-concept demonstrated',
      [TRL.TRL4_PROOF_OF_CONCEPT]: 'TRL 4: Component validated in lab',
      [TRL.TRL5_COMPONENTS_VALIDATION]: 'TRL 5: System validated in lab',
      [TRL.TRL6_SYSTEM_VALIDATION]: 'TRL 6: System validated in relevant environment',
      [TRL.TRL7_SYSTEM_DEMONSTRATION]: 'TRL 7: System demonstrated in operational environment',
      [TRL.TRL8_SYSTEM_COMPLETE]: 'TRL 8: System complete and qualified',
      [TRL.TRL9_OPERATIONAL]: 'TRL 9: Actual system proven in operational environment'
    };
    return descriptions[trl];
  },

  /**
   * Get TRL color code for UI
   */
  getTRLColor: (trl: TRL): string => {
    if (trl >= TRL.TRL8_SYSTEM_COMPLETE) return 'bg-green-100 text-green-800';
    if (trl >= TRL.TRL5_COMPONENTS_VALIDATION) return 'bg-blue-100 text-blue-800';
    if (trl >= TRL.TRL3_APPLIED_RESEARCH) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  },

  /**
   * Get market maturity color
   */
  getMaturityColor: (maturity: MarketMaturity): string => {
    const colors: Record<MarketMaturity, string> = {
      [MarketMaturity.EMERGING]: 'bg-purple-100 text-purple-800',
      [MarketMaturity.EARLY_ADOPTION]: 'bg-blue-100 text-blue-800',
      [MarketMaturity.ESTABLISHED]: 'bg-green-100 text-green-800',
      [MarketMaturity.MAINSTREAM]: 'bg-gray-100 text-gray-800'
    };
    return colors[maturity];
  }
};

// Export singleton instance
export const trlEngine = new TechnologyReadinessEngine();