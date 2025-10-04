/**
 * Household Data Manager
 * Privacy-first local storage management for household energy profiles
 */

import type {
  HouseholdProfile,
  MonthlyUsage,
  HouseholdBenchmark,
  Province,
  HomeType,
  UserPreferences,
  SavingsTracker,
  Recommendation
} from './types/household';

const STORAGE_KEYS = {
  PROFILE: 'household_profile',
  USAGE_HISTORY: 'usage_history',
  PREFERENCES: 'user_preferences',
  SAVINGS: 'savings_tracker',
  RECOMMENDATIONS: 'recommendations',
  ONBOARDING_COMPLETE: 'onboarding_complete',
} as const;

class HouseholdDataManager {
  /**
   * Save household profile to local storage
   */
  saveProfile(profile: HouseholdProfile): void {
    try {
      const dataToStore = {
        ...profile,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Failed to save household profile:', error);
      throw new Error('Unable to save profile data');
    }
  }

  /**
   * Retrieve household profile from local storage
   */
  getProfile(): HouseholdProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (!data) return null;
      return JSON.parse(data) as HouseholdProfile;
    } catch (error) {
      console.error('Failed to retrieve household profile:', error);
      return null;
    }
  }

  /**
   * Update specific fields in household profile
   */
  updateProfile(updates: Partial<HouseholdProfile>): void {
    const existingProfile = this.getProfile();
    if (!existingProfile) {
      throw new Error('No profile exists to update');
    }
    
    const updatedProfile: HouseholdProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    this.saveProfile(updatedProfile);
  }

  /**
   * Save monthly usage data
   */
  saveUsage(usage: MonthlyUsage): void {
    try {
      const history = this.getUsageHistory();
      
      // Check if month already exists
      const existingIndex = history.findIndex(u => u.month === usage.month);
      
      if (existingIndex >= 0) {
        history[existingIndex] = usage;
      } else {
        history.push(usage);
      }
      
      // Sort by month (newest first) and keep last 24 months
      history.sort((a, b) => b.month.localeCompare(a.month));
      const trimmedHistory = history.slice(0, 24);
      
      localStorage.setItem(STORAGE_KEYS.USAGE_HISTORY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Failed to save usage data:', error);
      throw new Error('Unable to save usage data');
    }
  }

  /**
   * Get usage history (default: last 12 months)
   */
  getUsageHistory(months: number = 12): MonthlyUsage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USAGE_HISTORY);
      if (!data) return [];
      
      const history = JSON.parse(data) as MonthlyUsage[];
      return history.slice(0, months);
    } catch (error) {
      console.error('Failed to retrieve usage history:', error);
      return [];
    }
  }

  /**
   * Calculate household benchmark based on profile
   * This is a simplified algorithm - in production, would query database of similar homes
   */
  calculateBenchmark(profile: HouseholdProfile): HouseholdBenchmark {
    // Base calculation: square footage × occupants × provincial factor
    const provincialFactors: Record<Province, number> = {
      'ON': 0.85,
      'AB': 0.95,
      'BC': 0.75,
      'QC': 0.80,
      'SK': 0.90,
      'MB': 0.85,
      'NS': 0.82,
      'NB': 0.83,
      'PE': 0.81,
      'NL': 0.88,
      'YT': 1.10,
      'NT': 1.15,
      'NU': 1.20,
    };

    const homeTypeFactors: Record<HomeType, number> = {
      'house': 1.2,
      'townhouse': 0.9,
      'condo': 0.7,
      'apartment': 0.6,
    };

    const heatingFactors: Record<string, number> = {
      'electric': 1.4,
      'gas': 0.3, // Gas usage not counted in electricity
      'oil': 0.3,
      'heat-pump': 0.8,
      'dual': 0.9,
      'other': 1.0,
    };

    const baseUsage = (profile.squareFootage / 100) * profile.occupants * 35;
    const provincialAdjustment = baseUsage * provincialFactors[profile.province];
    const homeTypeAdjustment = provincialAdjustment * homeTypeFactors[profile.homeType];
    const heatingAdjustment = homeTypeAdjustment * heatingFactors[profile.heatingType];
    
    let expectedUsage = heatingAdjustment;
    
    // Adjustments for special features
    if (profile.hasAC) expectedUsage += 150; // ~150 kWh/month summer avg
    if (profile.hasSolar) expectedUsage *= 0.6; // 40% reduction with solar
    if (profile.hasEV) expectedUsage += 300; // ~300 kWh/month for EV charging

    // Get current usage for comparison
    const recentUsage = this.getUsageHistory(3);
    const avgRecentUsage = recentUsage.length > 0
      ? recentUsage.reduce((sum, u) => sum + u.consumption_kwh, 0) / recentUsage.length
      : expectedUsage;

    const percentile = avgRecentUsage <= expectedUsage * 0.8 ? 20 :
                       avgRecentUsage <= expectedUsage ? 40 :
                       avgRecentUsage <= expectedUsage * 1.2 ? 60 :
                       avgRecentUsage <= expectedUsage * 1.5 ? 80 : 95;

    const diffPercent = ((avgRecentUsage - expectedUsage) / expectedUsage * 100).toFixed(0);
    const comparisonText = avgRecentUsage < expectedUsage
      ? `${Math.abs(Number(diffPercent))}% below average`
      : avgRecentUsage > expectedUsage
      ? `${diffPercent}% above average`
      : 'Right at average';

    // Provincial average pricing (cents per kWh)
    const provincialPrices: Record<Province, number> = {
      'ON': 12.5, 'AB': 18.0, 'BC': 10.0, 'QC': 7.5, 'SK': 15.0,
      'MB': 9.0, 'NS': 16.5, 'NB': 13.0, 'PE': 14.5, 'NL': 12.0,
      'YT': 13.5, 'NT': 25.0, 'NU': 28.0,
    };

    const avgCost = (expectedUsage * provincialPrices[profile.province]) / 100;

    return {
      expectedUsage: Math.round(expectedUsage),
      avgCost: Math.round(avgCost * 100) / 100,
      similarHomesAvg: Math.round(expectedUsage * 1.05), // Similar homes tend to use slightly more
      percentile,
      comparisonText,
    };
  }

  /**
   * Save user preferences
   */
  savePreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  /**
   * Get user preferences
   */
  getPreferences(): UserPreferences | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (!data) return null;
      return JSON.parse(data) as UserPreferences;
    } catch (error) {
      console.error('Failed to retrieve preferences:', error);
      return null;
    }
  }

  /**
   * Save recommendations
   */
  saveRecommendations(recommendations: Recommendation[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify(recommendations));
    } catch (error) {
      console.error('Failed to save recommendations:', error);
    }
  }

  /**
   * Get saved recommendations
   */
  getRecommendations(): Recommendation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECOMMENDATIONS);
      if (!data) return [];
      return JSON.parse(data) as Recommendation[];
    } catch (error) {
      console.error('Failed to retrieve recommendations:', error);
      return [];
    }
  }

  /**
   * Mark recommendation as implemented
   */
  markRecommendationImplemented(recommendationId: string): void {
    const recommendations = this.getRecommendations();
    const updated = recommendations.map(rec => 
      rec.id === recommendationId
        ? { ...rec, isCompleted: true, implementedAt: new Date().toISOString() }
        : rec
    );
    this.saveRecommendations(updated);
    
    // Update savings tracker
    this.updateSavingsTracker(recommendations.find(r => r.id === recommendationId));
  }

  /**
   * Update savings tracker when recommendation is implemented
   */
  private updateSavingsTracker(recommendation?: Recommendation): void {
    if (!recommendation) return;

    try {
      const profile = this.getProfile();
      if (!profile) return;

      const data = localStorage.getItem(STORAGE_KEYS.SAVINGS);
      const tracker: SavingsTracker = data ? JSON.parse(data) : {
        userId: profile.userId,
        implementedRecommendations: [],
        totalSavedKwh: 0,
        totalSavedCAD: 0,
        totalCO2Reduced: 0,
        savingsHistory: [],
        lastUpdated: new Date().toISOString(),
      };

      // Add recommendation if not already tracked
      if (!tracker.implementedRecommendations.find(r => r.id === recommendation.id)) {
        tracker.implementedRecommendations.push(recommendation);
        tracker.totalSavedKwh += recommendation.potentialSavings.kwh;
        tracker.totalSavedCAD += recommendation.potentialSavings.annual;
        tracker.totalCO2Reduced += recommendation.potentialSavings.co2Reduction;
        tracker.lastUpdated = new Date().toISOString();

        localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(tracker));
      }
    } catch (error) {
      console.error('Failed to update savings tracker:', error);
    }
  }

  /**
   * Get savings tracker
   */
  getSavingsTracker(): SavingsTracker | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SAVINGS);
      if (!data) return null;
      return JSON.parse(data) as SavingsTracker;
    } catch (error) {
      console.error('Failed to retrieve savings tracker:', error);
      return null;
    }
  }

  /**
   * Check if onboarding is complete
   */
  isOnboardingComplete(): boolean {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      return data === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Mark onboarding as complete
   */
  setOnboardingComplete(): void {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
  }

  /**
   * Clear all household data (for privacy/testing)
   */
  clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Export all data as JSON (for user download)
   */
  exportData(): string {
    const data = {
      profile: this.getProfile(),
      usageHistory: this.getUsageHistory(24),
      preferences: this.getPreferences(),
      recommendations: this.getRecommendations(),
      savings: this.getSavingsTracker(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON (for user restore)
   */
  importData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.profile) this.saveProfile(data.profile);
      if (data.usageHistory) {
        data.usageHistory.forEach((usage: MonthlyUsage) => this.saveUsage(usage));
      }
      if (data.preferences) this.savePreferences(data.preferences);
      if (data.recommendations) this.saveRecommendations(data.recommendations);
      if (data.savings) {
        localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(data.savings));
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid data format');
    }
  }
}

// Export singleton instance
export const householdDataManager = new HouseholdDataManager();
export default householdDataManager;
