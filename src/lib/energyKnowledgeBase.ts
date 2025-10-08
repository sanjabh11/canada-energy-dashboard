/**
 * Canadian Energy Knowledge Base
 * Comprehensive reference data for Canadian energy context injection into LLM prompts
 */

export interface ProvincialContext {
  code: string;
  name: string;
  regulator: string;
  grid_operator: string;
  current_mix: Record<string, number>;
  peak_demand_mw: number;
  avg_residential_rate_cents_kwh: number;
  time_of_use: boolean;
  tou_rates?: {
    off_peak: number;
    mid_peak: number;
    on_peak: number;
    off_peak_hours: string;
    mid_peak_hours?: string;
    on_peak_hours: string;
  };
  major_utilities: string[];
  renewable_target: string;
  key_programs: string[];
}

export interface FederalPolicy {
  name: string;
  effective_date: string;
  target: string;
  milestones: string[];
  enforcement: string;
  relevance: string;
  url?: string;
}

export interface IndigenousProtocol {
  principle: string;
  requirement: string;
  application: string;
}

/**
 * Complete Canadian Energy Knowledge Base
 */
export const CanadianEnergyContext = {
  /**
   * Federal Policies and Regulations
   */
  federal_policies: {
    net_zero_act: {
      name: "Canadian Net-Zero Emissions Accountability Act",
      effective_date: "2021-06-29",
      target: "Net-zero greenhouse gas emissions by 2050",
      milestones: [
        "40-45% reduction below 2005 levels by 2030",
        "Net-zero emissions by 2050"
      ],
      enforcement: "5-year emissions reduction targets",
      relevance: "Drives decarbonization of electricity sector",
      url: "https://laws-lois.justice.gc.ca/eng/acts/C-19.3/"
    },
    
    clean_fuel_regs: {
      name: "Clean Fuel Regulations",
      effective_date: "2023-07-01",
      target: "Reduce lifecycle GHG intensity of fuels",
      milestones: [
        "14-16 million tonnes CO2e reduction by 2030"
      ],
      enforcement: "Compliance credits system",
      relevance: "Affects fuel costs, incentivizes electrification",
      url: "https://www.canada.ca/en/environment-climate-change/services/managing-pollution/energy-production/fuel-regulations.html"
    },
    
    carbon_pricing: {
      name: "Federal Carbon Pricing (Greenhouse Gas Pollution Pricing Act)",
      effective_date: "2019-01-01",
      target: "$170/tonne CO2e by 2030",
      milestones: [
        "$50/tonne by 2022",
        "$65/tonne by 2023",
        "$80/tonne by 2024",
        "$170/tonne by 2030"
      ],
      enforcement: "Federal backstop in provinces without equivalent system",
      relevance: "Increases fossil fuel costs, makes renewables competitive"
    },
    
    greener_homes: {
      name: "Canada Greener Homes Grant",
      effective_date: "2020-12-01",
      target: "Retrofit 1+ million homes",
      milestones: [
        "Up to $5,000 per home",
        "$600 for EnergyGuide evaluation"
      ],
      enforcement: "Application-based grants",
      relevance: "Incentivizes home energy efficiency upgrades"
    },
    
    clean_electricity_regs: {
      name: "Clean Electricity Regulations",
      effective_date: "2023 (proposed, finalized 2024)",
      target: "Net-zero electricity grid by 2035",
      milestones: [
        "New natural gas units: net-zero by 2035",
        "Existing units: phase out or retrofit by 2035"
      ],
      enforcement: "Federal emissions performance standards",
      relevance: "Major driver of coal-to-renewables transition"
    }
  },

  /**
   * Provincial Energy Context (All 10 Provinces + 3 Territories)
   */
  provincial_context: {
    ON: {
      code: "ON",
      name: "Ontario",
      regulator: "Ontario Energy Board (OEB)",
      grid_operator: "Independent Electricity System Operator (IESO)",
      current_mix: {
        nuclear: 0.56,
        hydro: 0.24,
        gas: 0.06,
        wind: 0.09,
        solar: 0.02,
        bioenergy: 0.01,
        imports: 0.02
      },
      peak_demand_mw: 22000,
      avg_residential_rate_cents_kwh: 13.5,
      time_of_use: true,
      tou_rates: {
        off_peak: 8.7,
        mid_peak: 12.2,
        on_peak: 15.1,
        off_peak_hours: "7pm-7am weekdays, all weekend",
        mid_peak_hours: "7am-11am, 5pm-7pm weekdays",
        on_peak_hours: "11am-5pm weekdays"
      },
      major_utilities: ["Toronto Hydro", "Hydro One", "Alectra", "Enersource"],
      renewable_target: "Net-zero grid by 2050",
      key_programs: [
        "Save on Energy",
        "Home Energy Efficiency Program",
        "Industrial Accelerator Program"
      ]
    },
    
    QC: {
      code: "QC",
      name: "Quebec",
      regulator: "Régie de l'énergie du Québec",
      grid_operator: "Hydro-Québec",
      current_mix: {
        hydro: 0.94,
        wind: 0.04,
        biomass: 0.01,
        other: 0.01
      },
      peak_demand_mw: 39000,
      avg_residential_rate_cents_kwh: 7.3, // Lowest in North America
      time_of_use: false,
      major_utilities: ["Hydro-Québec"],
      renewable_target: "100% renewable by 2030 (already ~99%)",
      key_programs: [
        "Rénoclimat",
        "LogiVert",
        "Roulez électrique (EV rebates)"
      ]
    },
    
    BC: {
      code: "BC",
      name: "British Columbia",
      regulator: "BC Utilities Commission",
      grid_operator: "BC Hydro",
      current_mix: {
        hydro: 0.87,
        biomass: 0.04,
        wind: 0.03,
        solar: 0.01,
        gas: 0.05
      },
      peak_demand_mw: 10500,
      avg_residential_rate_cents_kwh: 10.1,
      time_of_use: false,
      major_utilities: ["BC Hydro", "FortisBC"],
      renewable_target: "100% clean electricity by 2030",
      key_programs: [
        "CleanBC Better Homes",
        "CleanBC Go Electric",
        "BC Hydro Power Smart"
      ]
    },
    
    AB: {
      code: "AB",
      name: "Alberta",
      regulator: "Alberta Utilities Commission",
      grid_operator: "Alberta Electric System Operator (AESO)",
      current_mix: {
        gas: 0.53,
        coal: 0.06, // Declining rapidly
        wind: 0.19,
        hydro: 0.04,
        solar: 0.04,
        bioenergy: 0.02,
        cogeneration: 0.12
      },
      peak_demand_mw: 12000,
      avg_residential_rate_cents_kwh: 12.8, // Variable (wholesale market)
      time_of_use: false, // Wholesale market pricing
      major_utilities: ["ENMAX", "EPCOR", "ATCO", "Direct Energy"],
      renewable_target: "Net-zero grid by 2035",
      key_programs: [
        "Residential and Commercial Solar Program",
        "Municipal Climate Change Action Centre",
        "Energy Efficiency Alberta"
      ]
    },
    
    MB: {
      code: "MB",
      name: "Manitoba",
      regulator: "Public Utilities Board",
      grid_operator: "Manitoba Hydro",
      current_mix: {
        hydro: 0.97,
        wind: 0.02,
        other: 0.01
      },
      peak_demand_mw: 5600,
      avg_residential_rate_cents_kwh: 9.7,
      time_of_use: false,
      major_utilities: ["Manitoba Hydro"],
      renewable_target: "100% renewable (already achieved)",
      key_programs: [
        "Manitoba Hydro Power Smart",
        "Residential Energy Efficiency Loan",
        "Indigenous Communities Efficiency Fund"
      ]
    },
    
    SK: {
      code: "SK",
      name: "Saskatchewan",
      regulator: "Saskatchewan Rate Review Panel",
      grid_operator: "SaskPower",
      current_mix: {
        gas: 0.45,
        coal: 0.12, // Declining
        wind: 0.20,
        hydro: 0.19,
        solar: 0.02,
        other: 0.02
      },
      peak_demand_mw: 3800,
      avg_residential_rate_cents_kwh: 14.6,
      time_of_use: false,
      major_utilities: ["SaskPower"],
      renewable_target: "50% renewable by 2030",
      key_programs: [
        "SaskPower Save Program",
        "Net Metering Program",
        "Home Efficiency Program"
      ]
    },
    
    NS: {
      code: "NS",
      name: "Nova Scotia",
      regulator: "Nova Scotia Utility and Review Board",
      grid_operator: "Nova Scotia Power",
      current_mix: {
        renewable: 0.42,
        coal: 0.35,
        gas: 0.20,
        imports: 0.03
      },
      peak_demand_mw: 2300,
      avg_residential_rate_cents_kwh: 17.8,
      time_of_use: false,
      major_utilities: ["Nova Scotia Power"],
      renewable_target: "80% renewable by 2030",
      key_programs: [
        "HomeWarming Program",
        "SolarHomes Program",
        "Efficiency Nova Scotia"
      ]
    },
    
    NB: {
      code: "NB",
      name: "New Brunswick",
      regulator: "Energy and Utilities Board",
      grid_operator: "NB Power",
      current_mix: {
        nuclear: 0.32,
        hydro: 0.20,
        wind: 0.12,
        coal: 0.13,
        petroleum: 0.10,
        gas: 0.10,
        biomass: 0.03
      },
      peak_demand_mw: 3200,
      avg_residential_rate_cents_kwh: 12.4,
      time_of_use: false,
      major_utilities: ["NB Power"],
      renewable_target: "50% renewable by 2030",
      key_programs: [
        "Total Home Energy Savings Program",
        "Energy Efficiency NB",
        "Home Energy Loan"
      ]
    },
    
    PE: {
      code: "PE",
      name: "Prince Edward Island",
      regulator: "Island Regulatory and Appeals Commission",
      grid_operator: "Maritime Electric",
      current_mix: {
        wind: 0.32,
        imports: 0.65, // From NB
        solar: 0.02,
        biofuel: 0.01
      },
      peak_demand_mw: 260,
      avg_residential_rate_cents_kwh: 16.5,
      time_of_use: false,
      major_utilities: ["Maritime Electric"],
      renewable_target: "100% renewable by 2030",
      key_programs: [
        "Home Energy Efficiency Program",
        "Instant Savings Program",
        "EfficiencyPEI"
      ]
    },
    
    NL: {
      code: "NL",
      name: "Newfoundland and Labrador",
      regulator: "Public Utilities Board",
      grid_operator: "Newfoundland and Labrador Hydro",
      current_mix: {
        hydro: 0.96,
        wind: 0.03,
        thermal: 0.01
      },
      peak_demand_mw: 1800,
      avg_residential_rate_cents_kwh: 13.3,
      time_of_use: false,
      major_utilities: ["Newfoundland Power", "NL Hydro"],
      renewable_target: "98% renewable (largely achieved)",
      key_programs: [
        "Take Charge Program",
        "Energy Efficiency Rebates",
        "Home Energy Savings Program"
      ]
    },
    
    YT: {
      code: "YT",
      name: "Yukon",
      regulator: "Yukon Utilities Board",
      grid_operator: "Yukon Energy",
      current_mix: {
        hydro: 0.95,
        diesel: 0.04,
        wind: 0.01
      },
      peak_demand_mw: 85,
      avg_residential_rate_cents_kwh: 14.8,
      time_of_use: false,
      major_utilities: ["Yukon Energy", "ATCO Electric Yukon"],
      renewable_target: "97% renewable (largely achieved)",
      key_programs: [
        "Good Energy Program",
        "Yukon Energy Rebates",
        "Microgeneration Program"
      ]
    },
    
    NT: {
      code: "NT",
      name: "Northwest Territories",
      regulator: "Public Utilities Board",
      grid_operator: "Northwest Territories Power Corporation",
      current_mix: {
        hydro: 0.35,
        diesel: 0.60,
        wind: 0.02,
        solar: 0.03
      },
      peak_demand_mw: 80,
      avg_residential_rate_cents_kwh: 38.5, // Highest in Canada (remote diesel)
      time_of_use: false,
      major_utilities: ["NT Power Corp", "Northland Utilities"],
      renewable_target: "Reduce diesel dependence by 25% by 2030",
      key_programs: [
        "Arctic Energy Alliance",
        "Alternative Energy Technologies Program",
        "GNWT Energy Programs"
      ]
    },
    
    NU: {
      code: "NU",
      name: "Nunavut",
      regulator: "Qulliq Energy Corporation",
      grid_operator: "Qulliq Energy Corporation",
      current_mix: {
        diesel: 0.98, // Nearly all diesel - most isolated
        solar: 0.02
      },
      peak_demand_mw: 40,
      avg_residential_rate_cents_kwh: 42.0, // Highest rates, heavily subsidized
      time_of_use: false,
      major_utilities: ["Qulliq Energy Corporation"],
      renewable_target: "Pilot solar and wind projects in 10 communities by 2030",
      key_programs: [
        "Energy Efficiency Rebate Program",
        "Nunavut Housing Trust",
        "Community Solar Projects"
      ]
    }
  },

  /**
   * Indigenous Energy Protocols (UNDRIP Compliance)
   */
  indigenous_protocols: {
    undrip: {
      principle: "United Nations Declaration on the Rights of Indigenous Peoples (UNDRIP)",
      requirement: "Federal government committed to full implementation (2021)",
      application: "All energy projects on Indigenous lands require FPIC"
    },
    
    fpic: {
      principle: "Free, Prior, and Informed Consent",
      requirement: "Indigenous communities must consent before projects proceed",
      application: "Four-stage process: information, consultation, negotiation, agreement"
    },
    
    data_sovereignty: {
      principle: "Indigenous Data Sovereignty",
      requirement: "Indigenous data owned and governed by Indigenous peoples",
      application: "No data extraction without community governance approval"
    },
    
    tek_integration: {
      principle: "Traditional Ecological Knowledge (TEK) Integration",
      requirement: "TEK recognized as equal to scientific knowledge",
      application: "Energy planning must incorporate Traditional Knowledge"
    },
    
    benefit_sharing: {
      principle: "Equitable Benefit Sharing",
      requirement: "Indigenous communities share in economic benefits",
      application: "Revenue sharing, employment, capacity building"
    }
  },

  /**
   * Technical Standards and Metrics
   */
  technical_standards: {
    capacity_factors: {
      nuclear: 0.90,
      hydro_run_of_river: 0.50,
      hydro_storage: 0.40,
      wind_onshore: 0.30,
      wind_offshore: 0.40,
      solar_utility: 0.18,
      solar_residential: 0.15,
      natural_gas_combined_cycle: 0.55,
      natural_gas_simple_cycle: 0.30,
      coal: 0.60
    },
    
    emissions_factors_g_co2_per_kwh: {
      coal: 820,
      natural_gas: 490,
      oil: 650,
      nuclear: 12,
      hydro: 24,
      wind: 11,
      solar: 45,
      biomass: 230
    },
    
    typical_home_usage_kwh_per_month: {
      apartment: 600,
      townhouse: 800,
      small_house: 1000,
      medium_house: 1500,
      large_house: 2200,
      electric_heat_addon: 800, // Additional winter usage
      ac_addon: 400 // Additional summer usage
    }
  },

  /**
   * Rebate Programs Quick Reference
   */
  rebate_programs: {
    federal: [
      {
        name: "Canada Greener Homes Grant",
        amount: "Up to $5,000",
        eligible: "Home energy retrofits (insulation, windows, heat pumps)",
        url: "https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-initiative/23441"
      },
      {
        name: "Federal EV Rebate (iZEV)",
        amount: "Up to $5,000",
        eligible: "Battery-electric, plug-in hybrid vehicles under $55,000",
        url: "https://tc.canada.ca/en/road-transportation/innovative-technologies/zero-emission-vehicles/light-duty-zero-emission-vehicles"
      },
      {
        name: "Greener Homes Loan",
        amount: "Up to $40,000 interest-free",
        eligible: "Home energy retrofits (supplement to grant)",
        url: "https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-initiative/canada-greener-homes-loan/24286"
      }
    ],
    ontario: [
      {
        name: "Save on Energy",
        amount: "Varies by retrofit",
        eligible: "LED bulbs, smart thermostats, HVAC upgrades"
      },
      {
        name: "Enbridge Gas Home Efficiency Rebate",
        amount: "Up to $5,000 + $25/GJ saved",
        eligible: "Furnace, insulation, windows (gas heated homes)"
      }
    ]
  },

  /**
   * Seasonal Patterns
   */
  seasonal_patterns: {
    winter_canada: {
      heating_demand: "Peaks in January/February",
      solar_output: "Reduced ~60% (shorter days, low sun angle)",
      wind_output: "Typically higher (winter storms)",
      grid_stress: "Peak demand periods 6-9 AM, 5-8 PM"
    },
    
    summer_canada: {
      cooling_demand: "Peaks in July/August",
      solar_output: "Maximum (long days, high sun angle)",
      wind_output: "Typically lower (high-pressure systems)",
      grid_stress: "Peak demand periods 2-7 PM (AC load)"
    }
  }
};

/**
 * Get provincial context by code
 */
export function getProvincialContext(provinceCode: string): ProvincialContext | null {
  const province = provinceCode?.toUpperCase();
  return CanadianEnergyContext.provincial_context[province as keyof typeof CanadianEnergyContext.provincial_context] || null;
}

/**
 * Format context for prompt injection
 */
export function formatContextForPrompt(provinceCode?: string): string {
  if (!provinceCode) {
    return "Canadian Federal Context:\n" + JSON.stringify(CanadianEnergyContext.federal_policies, null, 2);
  }
  
  const context = getProvincialContext(provinceCode);
  if (!context) {
    return "Unknown province - using federal context only";
  }
  
  return `${context.name} Energy Context:
- Grid Operator: ${context.grid_operator}
- Current Mix: ${Object.entries(context.current_mix).map(([k, v]) => `${k}: ${(v*100).toFixed(0)}%`).join(', ')}
- Avg Residential Rate: ${context.avg_residential_rate_cents_kwh}¢/kWh
- Time-of-Use: ${context.time_of_use ? 'Yes' : 'No'}
${context.tou_rates ? `- TOU Rates: Off-peak ${context.tou_rates.off_peak}¢, On-peak ${context.tou_rates.on_peak}¢` : ''}
- Renewable Target: ${context.renewable_target}
- Key Programs: ${context.key_programs.join(', ')}`;
}

export default CanadianEnergyContext;
