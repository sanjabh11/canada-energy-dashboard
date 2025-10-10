/**
 * Province-Specific Configuration
 * 
 * Includes reserve margins, grid characteristics, and indicative price curves
 * for award evidence calculations without paid market data feeds.
 */

export interface ProvinceConfig {
  code: string;
  name: string;
  grid: {
    reserve_margin_percent: number;
    typical_demand_mw: {
      peak: number;
      valley: number;
      average: number;
    };
    intertie_capacity_mw?: {
      import: number;
      export: number;
    };
  };
  renewables: {
    solar_capacity_mw: number;
    wind_capacity_mw: number;
    hydro_capacity_mw: number;
    typical_capacity_factors: {
      solar: number;
      wind: number;
      hydro: number;
    };
  };
  pricing: {
    // Indicative price curves (CAD/MWh) - proxies for real-time pricing
    base_price: number;
    peak_price: number;
    valley_price: number;
    // Time-of-use patterns
    peak_hours: number[]; // Hours of day (0-23)
    shoulder_hours: number[];
    // Price volatility indicators
    negative_price_threshold: number;
    curtailment_price_threshold: number;
  };
  storage: {
    deployed_capacity_mwh: number;
    deployed_power_mw: number;
    round_trip_efficiency: number;
  };
}

export const PROVINCE_CONFIGS: Record<string, ProvinceConfig> = {
  ON: {
    code: 'ON',
    name: 'Ontario',
    grid: {
      reserve_margin_percent: 18,
      typical_demand_mw: {
        peak: 22500,
        valley: 12000,
        average: 16500,
      },
      intertie_capacity_mw: {
        import: 3500,
        export: 2500,
      },
    },
    renewables: {
      solar_capacity_mw: 4500,
      wind_capacity_mw: 5500,
      hydro_capacity_mw: 9000,
      typical_capacity_factors: {
        solar: 0.16,
        wind: 0.32,
        hydro: 0.52,
      },
    },
    pricing: {
      base_price: 45,
      peak_price: 120,
      valley_price: 18,
      peak_hours: [7, 8, 9, 10, 11, 16, 17, 18, 19, 20],
      shoulder_hours: [6, 12, 13, 14, 15, 21],
      negative_price_threshold: -5,
      curtailment_price_threshold: 25,
    },
    storage: {
      deployed_capacity_mwh: 250,
      deployed_power_mw: 100,
      round_trip_efficiency: 0.88,
    },
  },
  AB: {
    code: 'AB',
    name: 'Alberta',
    grid: {
      reserve_margin_percent: 15,
      typical_demand_mw: {
        peak: 11500,
        valley: 7000,
        average: 9000,
      },
      intertie_capacity_mw: {
        import: 1200,
        export: 1000,
      },
    },
    renewables: {
      solar_capacity_mw: 1800,
      wind_capacity_mw: 4300,
      hydro_capacity_mw: 900,
      typical_capacity_factors: {
        solar: 0.18,
        wind: 0.35,
        hydro: 0.48,
      },
    },
    pricing: {
      base_price: 55,
      peak_price: 180,
      valley_price: 22,
      peak_hours: [7, 8, 9, 10, 11, 16, 17, 18, 19, 20, 21],
      shoulder_hours: [6, 12, 13, 14, 15, 22],
      negative_price_threshold: -8,
      curtailment_price_threshold: 30,
    },
    storage: {
      deployed_capacity_mwh: 120,
      deployed_power_mw: 60,
      round_trip_efficiency: 0.87,
    },
  },
  BC: {
    code: 'BC',
    name: 'British Columbia',
    grid: {
      reserve_margin_percent: 22,
      typical_demand_mw: {
        peak: 10500,
        valley: 5500,
        average: 7500,
      },
      intertie_capacity_mw: {
        import: 2800,
        export: 3200,
      },
    },
    renewables: {
      solar_capacity_mw: 450,
      wind_capacity_mw: 800,
      hydro_capacity_mw: 14000,
      typical_capacity_factors: {
        solar: 0.13,
        wind: 0.28,
        hydro: 0.62,
      },
    },
    pricing: {
      base_price: 35,
      peak_price: 95,
      valley_price: 15,
      peak_hours: [6, 7, 8, 9, 17, 18, 19, 20],
      shoulder_hours: [10, 11, 12, 16, 21],
      negative_price_threshold: -3,
      curtailment_price_threshold: 20,
    },
    storage: {
      deployed_capacity_mwh: 80,
      deployed_power_mw: 40,
      round_trip_efficiency: 0.89,
    },
  },
  QC: {
    code: 'QC',
    name: 'Quebec',
    grid: {
      reserve_margin_percent: 25,
      typical_demand_mw: {
        peak: 38000,
        valley: 18000,
        average: 26000,
      },
      intertie_capacity_mw: {
        import: 2500,
        export: 4500,
      },
    },
    renewables: {
      solar_capacity_mw: 350,
      wind_capacity_mw: 4000,
      hydro_capacity_mw: 37000,
      typical_capacity_factors: {
        solar: 0.14,
        wind: 0.30,
        hydro: 0.58,
      },
    },
    pricing: {
      base_price: 32,
      peak_price: 85,
      valley_price: 12,
      peak_hours: [6, 7, 8, 9, 17, 18, 19, 20],
      shoulder_hours: [10, 11, 12, 16, 21],
      negative_price_threshold: -2,
      curtailment_price_threshold: 18,
    },
    storage: {
      deployed_capacity_mwh: 60,
      deployed_power_mw: 30,
      round_trip_efficiency: 0.88,
    },
  },
};

/**
 * Get indicative price for a given province and hour
 * Returns proxy price (CAD/MWh) based on time-of-use patterns
 */
export function getIndicativePrice(
  province: string,
  hour: number,
  demand?: number,
  isOversupply?: boolean
): number {
  const config = PROVINCE_CONFIGS[province];
  if (!config) return 50; // Default fallback

  const { pricing, grid } = config;

  // Check for oversupply conditions
  if (isOversupply) {
    return pricing.negative_price_threshold + Math.random() * 10 - 5;
  }

  // Time-of-use based pricing
  if (pricing.peak_hours.includes(hour)) {
    // Add volatility during peak
    const volatility = (Math.random() - 0.5) * 20;
    return pricing.peak_price + volatility;
  } else if (pricing.shoulder_hours.includes(hour)) {
    const volatility = (Math.random() - 0.5) * 10;
    return pricing.base_price + volatility;
  } else {
    // Valley hours
    const volatility = (Math.random() - 0.5) * 5;
    return pricing.valley_price + volatility;
  }
}

/**
 * Calculate reserve margin requirement for a province
 */
export function getReserveMarginMW(province: string, currentDemand?: number): number {
  const config = PROVINCE_CONFIGS[province];
  if (!config) return 0;

  const demand = currentDemand || config.grid.typical_demand_mw.average;
  return demand * (config.grid.reserve_margin_percent / 100);
}

/**
 * Detect if grid is in oversupply condition
 */
export function isOversupply(
  province: string,
  renewableGeneration: number,
  demand: number
): boolean {
  const config = PROVINCE_CONFIGS[province];
  if (!config) return false;

  const reserveMargin = getReserveMarginMW(province, demand);
  const threshold = demand + reserveMargin;

  return renewableGeneration > threshold * 1.1; // 10% buffer
}

/**
 * Get storage capacity for province
 */
export function getStorageConfig(province: string) {
  const config = PROVINCE_CONFIGS[province];
  return config?.storage || {
    deployed_capacity_mwh: 0,
    deployed_power_mw: 0,
    round_trip_efficiency: 0.85,
  };
}

/**
 * Export province codes for dropdowns
 */
export const PROVINCE_CODES = Object.keys(PROVINCE_CONFIGS);

/**
 * Get province name from code
 */
export function getProvinceName(code: string): string {
  return PROVINCE_CONFIGS[code]?.name || code;
}
