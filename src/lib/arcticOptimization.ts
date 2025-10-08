/**
 * Arctic Energy Optimization Engine
 * Diesel-to-Renewable Transition Optimization for Northern/Remote Communities
 * 
 * Uses linear programming principles to optimize energy mix
 * for cost, emissions, and reliability
 */

export interface CommunityEnergyProfile {
  community_name: string;
  current_diesel_consumption_liters_annual: number;
  diesel_price_per_liter: number;
  population: number;
  current_renewable_capacity_kw: number;
  grid_connected: boolean;
}

export interface OptimizationConstraints {
  budget_cad: number;
  diesel_reduction_target_percent: number; // e.g., 50 = 50% reduction
  min_reliability_hours: number; // backup generation hours required
  max_implementation_years: number;
}

export interface RenewableOption {
  type: 'solar' | 'wind' | 'hydro' | 'battery_storage' | 'biomass';
  capacity_kw: number;
  capital_cost_per_kw: number;
  annual_om_cost_per_kw: number;
  capacity_factor: number; // 0-1
  lifespan_years: number;
}

export interface OptimizationResult {
  success: boolean;
  feasible: boolean;
  total_cost_cad: number;
  annual_savings_cad: number;
  payback_period_years: number;
  diesel_reduction_percent: number;
  co2_reduction_tonnes_annual: number;
  recommended_mix: Array<{
    type: string;
    capacity_kw: number;
    cost_cad: number;
    annual_generation_kwh: number;
  }>;
  timeline: Array<{
    year: number;
    action: string;
    cost_cad: number;
  }>;
  reliability_score: number; // 0-100
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  assumptions: string[];
}

// Canadian Northern Energy Constants
const DIESEL_CO2_KG_PER_LITER = 2.68;
const DIESEL_KWH_PER_LITER = 10.0; // Diesel generator efficiency
const DAYS_PER_YEAR = 365;
const HOURS_PER_YEAR = 8760;

// Typical costs for Northern Canada (higher due to remote locations)
const NORTHERN_COST_MULTIPLIER = 1.5; // 50% higher costs vs southern Canada

const RENEWABLE_OPTIONS: Record<string, RenewableOption> = {
  solar: {
    type: 'solar',
    capacity_kw: 1,
    capital_cost_per_kw: 3000 * NORTHERN_COST_MULTIPLIER, // $3000/kW base
    annual_om_cost_per_kw: 30,
    capacity_factor: 0.12, // Lower in Arctic (short winter days)
    lifespan_years: 25
  },
  wind: {
    type: 'wind',
    capacity_kw: 1,
    capital_cost_per_kw: 4500 * NORTHERN_COST_MULTIPLIER,
    annual_om_cost_per_kw: 100,
    capacity_factor: 0.35, // Good wind resources in North
    lifespan_years: 20
  },
  battery_storage: {
    type: 'battery_storage',
    capacity_kw: 1,
    capital_cost_per_kw: 1500 * NORTHERN_COST_MULTIPLIER,
    annual_om_cost_per_kw: 50,
    capacity_factor: 0.85, // Availability
    lifespan_years: 10
  },
  hydro: {
    type: 'hydro',
    capacity_kw: 1,
    capital_cost_per_kw: 6000 * NORTHERN_COST_MULTIPLIER, // Run-of-river
    annual_om_cost_per_kw: 80,
    capacity_factor: 0.50,
    lifespan_years: 50
  },
  biomass: {
    type: 'biomass',
    capacity_kw: 1,
    capital_cost_per_kw: 5000 * NORTHERN_COST_MULTIPLIER,
    annual_om_cost_per_kw: 150,
    capacity_factor: 0.70,
    lifespan_years: 20
  }
};

/**
 * Simplified Linear Programming Solver
 * Optimizes renewable energy mix to minimize cost while meeting constraints
 */
class SimplexOptimizer {
  /**
   * Greedy heuristic optimization for renewable mix
   * Not true LP but provides reasonable results for demo
   */
  optimize(
    profile: CommunityEnergyProfile,
    constraints: OptimizationConstraints,
    options: RenewableOption[]
  ): OptimizationResult {
    const warnings: string[] = [];
    const assumptions: string[] = [];
    
    // Calculate current diesel consumption and costs
    const annual_diesel_liters = profile.current_diesel_consumption_liters_annual;
    const annual_diesel_cost = annual_diesel_liters * profile.diesel_price_per_liter;
    const current_diesel_kwh = annual_diesel_liters * DIESEL_KWH_PER_LITER;
    
    // Target diesel reduction
    const target_diesel_reduction_kwh = current_diesel_kwh * (constraints.diesel_reduction_target_percent / 100);
    
    // Calculate required renewable capacity
    let remaining_energy_needed = target_diesel_reduction_kwh;
    const selected_mix: Array<{
      type: string;
      capacity_kw: number;
      cost_cad: number;
      annual_generation_kwh: number;
    }> = [];
    
    let total_cost = 0;
    let total_annual_om = 0;
    
    // Greedy selection: sort by cost-effectiveness (kWh per dollar)
    const rankedOptions = options
      .map(opt => ({
        ...opt,
        annual_generation_per_kw: opt.capacity_factor * HOURS_PER_YEAR,
        cost_effectiveness: (opt.capacity_factor * HOURS_PER_YEAR) / opt.capital_cost_per_kw
      }))
      .sort((a, b) => b.cost_effectiveness - a.cost_effectiveness);
    
    // Allocate capacity greedily
    for (const option of rankedOptions) {
      if (remaining_energy_needed <= 0) break;
      if (total_cost >= constraints.budget_cad) break;
      
      // How much capacity of this type can we afford and need?
      const max_affordable_capacity = (constraints.budget_cad - total_cost) / option.capital_cost_per_kw;
      const needed_capacity = remaining_energy_needed / option.annual_generation_per_kw;
      const allocated_capacity = Math.min(max_affordable_capacity, needed_capacity);
      
      if (allocated_capacity > 0.1) { // Minimum 100W
        const item_cost = allocated_capacity * option.capital_cost_per_kw;
        const annual_generation = allocated_capacity * option.annual_generation_per_kw;
        const annual_om = allocated_capacity * option.annual_om_cost_per_kw;
        
        selected_mix.push({
          type: option.type,
          capacity_kw: Math.round(allocated_capacity * 10) / 10,
          cost_cad: Math.round(item_cost),
          annual_generation_kwh: Math.round(annual_generation)
        });
        
        total_cost += item_cost;
        total_annual_om += annual_om;
        remaining_energy_needed -= annual_generation;
      }
    }
    
    // Check feasibility
    const actual_diesel_reduction_kwh = target_diesel_reduction_kwh - remaining_energy_needed;
    const actual_diesel_reduction_percent = (actual_diesel_reduction_kwh / current_diesel_kwh) * 100;
    const feasible = actual_diesel_reduction_percent >= constraints.diesel_reduction_target_percent * 0.9; // 90% of target
    
    if (!feasible) {
      warnings.push(`Only achieved ${actual_diesel_reduction_percent.toFixed(1)}% diesel reduction (target: ${constraints.diesel_reduction_target_percent}%)`);
      warnings.push('Consider: Increase budget, reduce target, or extend timeline');
    }
    
    // Calculate savings
    const diesel_saved_liters = actual_diesel_reduction_kwh / DIESEL_KWH_PER_LITER;
    const annual_diesel_savings = diesel_saved_liters * profile.diesel_price_per_liter;
    const annual_savings = annual_diesel_savings - total_annual_om;
    const payback_period = total_cost / (annual_savings > 0 ? annual_savings : 1);
    
    // CO2 reduction
    const co2_reduction_tonnes = (diesel_saved_liters * DIESEL_CO2_KG_PER_LITER) / 1000;
    
    // Reliability score (simplified)
    const has_storage = selected_mix.some(m => m.type === 'battery_storage');
    const diversity_bonus = selected_mix.length > 1 ? 20 : 0;
    const storage_bonus = has_storage ? 20 : 0;
    const reliability_score = Math.min(100, 60 + diversity_bonus + storage_bonus);
    
    if (!has_storage && selected_mix.some(m => m.type === 'solar' || m.type === 'wind')) {
      warnings.push('Consider adding battery storage to improve reliability of intermittent renewables');
    }
    
    // Generate timeline
    const timeline: Array<{ year: number; action: string; cost_cad: number }> = [];
    const years_to_implement = Math.min(constraints.max_implementation_years, 3);
    const items_per_year = Math.ceil(selected_mix.length / years_to_implement);
    
    selected_mix.forEach((item, idx) => {
      const year = Math.floor(idx / items_per_year) + 1;
      timeline.push({
        year,
        action: `Install ${item.capacity_kw.toFixed(1)} kW ${item.type} capacity`,
        cost_cad: item.cost_cad
      });
    });
    
    // Assumptions
    assumptions.push(`Diesel generator efficiency: ${DIESEL_KWH_PER_LITER} kWh/L`);
    assumptions.push(`Northern cost multiplier: ${NORTHERN_COST_MULTIPLIER}x`);
    assumptions.push(`Current diesel price: $${profile.diesel_price_per_liter.toFixed(2)}/L`);
    assumptions.push('Costs include transportation and installation for remote location');
    assumptions.push('Capacity factors are annual averages (seasonal variation applies)');
    
    return {
      success: true,
      feasible,
      total_cost_cad: Math.round(total_cost),
      annual_savings_cad: Math.round(annual_savings),
      payback_period_years: Math.round(payback_period * 10) / 10,
      diesel_reduction_percent: Math.round(actual_diesel_reduction_percent * 10) / 10,
      co2_reduction_tonnes_annual: Math.round(co2_reduction_tonnes * 10) / 10,
      recommended_mix: selected_mix,
      timeline,
      reliability_score: Math.round(reliability_score),
      confidence: feasible && payback_period < 15 ? 'high' : payback_period < 25 ? 'medium' : 'low',
      warnings,
      assumptions
    };
  }
}

/**
 * Main optimization function
 * Public API for Arctic energy optimization
 */
export function optimizeDieselToRenewable(
  profile: CommunityEnergyProfile,
  constraints: OptimizationConstraints,
  selectedRenewableTypes?: Array<'solar' | 'wind' | 'hydro' | 'battery_storage' | 'biomass'>
): OptimizationResult {
  try {
    // Select renewable options
    const types = selectedRenewableTypes || ['solar', 'wind', 'battery_storage'];
    const options = types.map(t => RENEWABLE_OPTIONS[t]).filter(Boolean);
    
    if (options.length === 0) {
      return {
        success: false,
        feasible: false,
        total_cost_cad: 0,
        annual_savings_cad: 0,
        payback_period_years: 0,
        diesel_reduction_percent: 0,
        co2_reduction_tonnes_annual: 0,
        recommended_mix: [],
        timeline: [],
        reliability_score: 0,
        confidence: 'low',
        warnings: ['No renewable options selected'],
        assumptions: []
      };
    }
    
    const optimizer = new SimplexOptimizer();
    return optimizer.optimize(profile, constraints, options);
    
  } catch (error) {
    console.error('Arctic optimization error:', error);
    return {
      success: false,
      feasible: false,
      total_cost_cad: 0,
      annual_savings_cad: 0,
      payback_period_years: 0,
      diesel_reduction_percent: 0,
      co2_reduction_tonnes_annual: 0,
      recommended_mix: [],
      timeline: [],
      reliability_score: 0,
      confidence: 'low',
      warnings: [`Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      assumptions: []
    };
  }
}

/**
 * Preset scenarios for common use cases
 */
export const PRESET_SCENARIOS = {
  aggressive_transition: {
    name: 'Aggressive Transition',
    diesel_reduction_target_percent: 75,
    budget_cad: 5000000,
    min_reliability_hours: 48,
    max_implementation_years: 3
  },
  moderate_transition: {
    name: 'Moderate Transition',
    diesel_reduction_target_percent: 50,
    budget_cad: 2000000,
    min_reliability_hours: 72,
    max_implementation_years: 5
  },
  conservative_transition: {
    name: 'Conservative Transition',
    diesel_reduction_target_percent: 25,
    budget_cad: 1000000,
    min_reliability_hours: 96,
    max_implementation_years: 7
  },
  budget_constrained: {
    name: 'Budget Constrained',
    diesel_reduction_target_percent: 30,
    budget_cad: 500000,
    min_reliability_hours: 72,
    max_implementation_years: 5
  }
};

/**
 * Export all functions and types
 */
export default {
  optimizeDieselToRenewable,
  RENEWABLE_OPTIONS,
  PRESET_SCENARIOS
};
