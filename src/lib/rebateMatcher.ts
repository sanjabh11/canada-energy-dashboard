/**
 * Rebate Matcher
 * Match households to eligible federal, provincial, and utility rebates
 */

import type { HouseholdProfile, Rebate, Province, RebateType } from './types/household';

/**
 * Sample rebate database (in production, this would come from Supabase)
 * This will be replaced with actual database queries once schema is created
 */
const SAMPLE_REBATES: Rebate[] = [
  {
    id: 'canada-greener-homes',
    name: 'Canada Greener Homes Grant',
    provider: 'federal',
    province: 'ALL',
    amount: { min: 125, max: 5000 },
    type: 'home-retrofit',
    eligibility: {
      homeOwner: true,
      requiresAudit: true,
    },
    applicationUrl: 'https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-grant/23441',
    description: 'Get up to $5,000 to make energy-efficient retrofits to your home, plus $600 for pre- and post-retrofit EnergyGuide evaluations.',
    estimatedProcessingTime: '8-12 weeks',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'canada-oil-to-heat-pump',
    name: 'Oil to Heat Pump Affordability Grant',
    provider: 'federal',
    province: 'ALL',
    amount: { min: 10000, max: 15000 },
    type: 'heat-pump',
    eligibility: {
      homeOwner: true,
      otherCriteria: ['Currently using oil heating', 'Low to median income household'],
    },
    applicationUrl: 'https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-initiative/oil-heat-pump-affordability-program/24775',
    description: 'Up to $15,000 for low-income households switching from oil heating to a heat pump.',
    estimatedProcessingTime: '10-14 weeks',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'on-home-efficiency-rebate',
    name: 'Ontario Home Efficiency Rebate Plus',
    provider: 'provincial',
    province: 'ON',
    amount: { min: 0, max: 10000 },
    type: 'heat-pump',
    eligibility: {
      homeOwner: true,
      requiresAudit: true,
    },
    applicationUrl: 'https://www.ontario.ca/page/home-efficiency-rebate-plus',
    description: 'Ontario homeowners can get up to $10,000 in rebates for heat pumps and home insulation upgrades.',
    estimatedProcessingTime: '6-10 weeks',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'bc-home-renovation-rebate',
    name: 'CleanBC Home Renovation Rebate',
    provider: 'provincial',
    province: 'BC',
    amount: { min: 0, max: 6000 },
    type: 'heat-pump',
    eligibility: {
      homeOwner: true,
    },
    applicationUrl: 'https://betterhomesbc.ca/',
    description: 'Get up to $6,000 for installing an air-source or ground-source heat pump in BC.',
    estimatedProcessingTime: '4-8 weeks',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'qc-logis-vert',
    name: 'Rénoclimat - Logis-Vert',
    provider: 'provincial',
    province: 'QC',
    amount: { min: 0, max: 9000 },
    type: 'home-retrofit',
    eligibility: {
      homeOwner: true,
      requiresAudit: true,
    },
    applicationUrl: 'https://www.transitionenergetique.gouv.qc.ca/residentiel/programmes/renoclimat',
    description: 'Quebec homeowners can get up to $9,000 for energy efficiency improvements.',
    estimatedProcessingTime: '8-12 weeks',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ab-residential-solar-rebate',
    name: 'Alberta Residential Solar Program',
    provider: 'provincial',
    province: 'AB',
    amount: { min: 0, max: 5000 },
    type: 'solar',
    eligibility: {
      homeOwner: true,
      otherCriteria: ['Residential property', 'Grid-connected system'],
    },
    applicationUrl: 'https://www.alberta.ca/residential-solar-program',
    description: 'Get up to $5,000 for installing residential solar panels in Alberta.',
    estimatedProcessingTime: '6-10 weeks',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'smart-thermostat-generic',
    name: 'Smart Thermostat Rebate',
    provider: 'utility',
    province: 'ALL',
    amount: { min: 50, max: 150 },
    type: 'smart-thermostat',
    eligibility: {},
    applicationUrl: 'https://www.nrcan.gc.ca/energy-efficiency/homes/make-your-home-more-energy-efficient/20546',
    description: 'Many utilities offer $50-150 rebates for smart thermostats. Check with your local utility.',
    estimatedProcessingTime: '2-4 weeks',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ev-charger-rebate',
    name: 'Zero-Emission Vehicle Charger Rebate',
    provider: 'federal',
    province: 'ALL',
    amount: { min: 0, max: 5000 },
    type: 'EV-charger',
    eligibility: {
      homeOwner: true,
      otherCriteria: ['Level 2 charger installation'],
    },
    applicationUrl: 'https://natural-resources.canada.ca/energy-efficiency/transportation-alternative-fuels/zero-emission-vehicle-infrastructure-program/21876',
    description: 'Get up to $5,000 for installing a Level 2 EV charger at home.',
    estimatedProcessingTime: '6-8 weeks',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'on-save-on-energy-appliances',
    name: 'Save on Energy - Appliance Rebates',
    provider: 'utility',
    province: 'ON',
    amount: { min: 25, max: 200 },
    type: 'appliance',
    eligibility: {},
    applicationUrl: 'https://saveonenergy.ca/For-Your-Home/Offers-and-Programs',
    description: 'Get rebates on ENERGY STAR certified appliances including refrigerators, washers, and dryers.',
    estimatedProcessingTime: '4-6 weeks',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'bc-efficient-appliance-rebate',
    name: 'BC Hydro - Power Smart Appliance Rebates',
    provider: 'utility',
    province: 'BC',
    amount: { min: 30, max: 300 },
    type: 'appliance',
    eligibility: {},
    applicationUrl: 'https://www.bchydro.com/powersmart/residential/savings-and-rebates.html',
    description: 'Get rebates on energy-efficient heat pump water heaters, washers, and other appliances.',
    estimatedProcessingTime: '3-5 weeks',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

class RebateMatcher {
  private rebates: Rebate[];

  constructor(rebates: Rebate[] = SAMPLE_REBATES) {
    this.rebates = rebates;
  }

  /**
   * Find rebates that a household is eligible for
   */
  async findEligibleRebates(profile: HouseholdProfile): Promise<Rebate[]> {
    const eligible: Rebate[] = [];

    for (const rebate of this.rebates) {
      if (!rebate.isActive) continue;

      // Check province match
      if (rebate.province !== 'ALL' && rebate.province !== profile.province) {
        continue;
      }

      // Check eligibility criteria
      if (rebate.eligibility.homeOwner && profile.homeType === 'apartment') {
        // Apartment dwellers typically aren't homeowners, skip owner-only rebates
        continue;
      }

      // Type-specific eligibility
      if (rebate.type === 'heat-pump') {
        // Heat pump rebates relevant if not already using heat pump
        if (profile.heatingType !== 'heat-pump') {
          eligible.push(rebate);
        }
      } else if (rebate.type === 'solar') {
        // Solar rebates relevant if no solar
        if (!profile.hasSolar) {
          eligible.push(rebate);
        }
      } else if (rebate.type === 'EV-charger') {
        // EV charger rebates only if has EV
        if (profile.hasEV) {
          eligible.push(rebate);
        }
      } else {
        // General rebates always eligible
        eligible.push(rebate);
      }
    }

    return eligible;
  }

  /**
   * Calculate maximum potential rebates for a household
   */
  calculateMaxRebates(rebates: Rebate[]): number {
    return rebates.reduce((total, rebate) => total + rebate.amount.max, 0);
  }

  /**
   * Calculate realistic rebates (using mid-range values)
   */
  calculateRealisticRebates(rebates: Rebate[]): number {
    return rebates.reduce((total, rebate) => {
      const midpoint = (rebate.amount.min + rebate.amount.max) / 2;
      return total + midpoint;
    }, 0);
  }

  /**
   * Rank rebates by value (highest first)
   */
  rankByValue(rebates: Rebate[]): Rebate[] {
    return [...rebates].sort((a, b) => b.amount.max - a.amount.max);
  }

  /**
   * Rank rebates by ease of application
   * Prioritizes: no audit required, shorter processing time, utility rebates
   */
  rankByEase(rebates: Rebate[]): Rebate[] {
    return [...rebates].sort((a, b) => {
      // Utility rebates are typically easiest
      if (a.provider === 'utility' && b.provider !== 'utility') return -1;
      if (b.provider === 'utility' && a.provider !== 'utility') return 1;

      // No audit required is easier
      const aNoAudit = !a.eligibility.requiresAudit ? 1 : 0;
      const bNoAudit = !b.eligibility.requiresAudit ? 1 : 0;
      if (aNoAudit !== bNoAudit) return bNoAudit - aNoAudit;

      // Fallback to value
      return b.amount.max - a.amount.max;
    });
  }

  /**
   * Get top priority rebates (high value + reasonable effort)
   */
  getTopPriority(rebates: Rebate[], count: number = 3): Rebate[] {
    const ranked = this.rankByValue(rebates);
    return ranked.slice(0, count);
  }

  /**
   * Filter rebates by type
   */
  filterByType(rebates: Rebate[], type: RebateType): Rebate[] {
    return rebates.filter(r => r.type === type);
  }

  /**
   * Filter rebates by provider
   */
  filterByProvider(rebates: Rebate[], provider: Rebate['provider']): Rebate[] {
    return rebates.filter(r => r.provider === provider);
  }

  /**
   * Get rebates expiring soon (within 90 days)
   */
  getExpiringSoon(rebates: Rebate[]): Rebate[] {
    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    return rebates.filter(rebate => {
      if (!rebate.deadline) return false;
      const deadline = new Date(rebate.deadline);
      return deadline <= ninetyDaysFromNow && deadline > now;
    });
  }

  /**
   * Search rebates by keyword
   */
  searchRebates(query: string): Rebate[] {
    const lowerQuery = query.toLowerCase();
    return this.rebates.filter(rebate =>
      rebate.name.toLowerCase().includes(lowerQuery) ||
      rebate.description.toLowerCase().includes(lowerQuery) ||
      rebate.type.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get rebate by ID
   */
  getRebateById(id: string): Rebate | undefined {
    return this.rebates.find(r => r.id === id);
  }

  /**
   * Get rebate summary for a household
   */
  async getRebateSummary(profile: HouseholdProfile): Promise<{
    totalEligible: number;
    maxAmount: number;
    realisticAmount: number;
    topRebates: Rebate[];
    byProvider: Record<string, number>;
  }> {
    const eligible = await this.findEligibleRebates(profile);
    const topRebates = this.getTopPriority(eligible, 5);

    const byProvider = eligible.reduce((acc, rebate) => {
      acc[rebate.provider] = (acc[rebate.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEligible: eligible.length,
      maxAmount: this.calculateMaxRebates(eligible),
      realisticAmount: this.calculateRealisticRebates(eligible),
      topRebates,
      byProvider,
    };
  }

  /**
   * Generate rebate recommendations based on household profile
   */
  async getRecommendedRebates(profile: HouseholdProfile): Promise<{
    highPriority: Rebate[];
    quickWins: Rebate[];
    longTerm: Rebate[];
  }> {
    const eligible = await this.findEligibleRebates(profile);

    // High priority: high value + matches current needs
    const highPriority = eligible.filter(
      r => r.amount.max >= 1000 && ['heat-pump', 'solar', 'home-retrofit'].includes(r.type)
    );

    // Quick wins: easy to claim, lower value but fast
    const quickWins = eligible.filter(
      r => r.amount.max < 500 && r.provider === 'utility' && !r.eligibility.requiresAudit
    );

    // Long term: major investments
    const longTerm = eligible.filter(
      r => r.amount.max >= 5000
    );

    return {
      highPriority: this.rankByValue(highPriority).slice(0, 3),
      quickWins: this.rankByEase(quickWins).slice(0, 3),
      longTerm: this.rankByValue(longTerm).slice(0, 3),
    };
  }
}

// Export singleton instance
export const rebateMatcher = new RebateMatcher();
export default rebateMatcher;

// Export class for testing with custom rebate lists
export { RebateMatcher };
