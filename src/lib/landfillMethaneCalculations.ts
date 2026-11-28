/**
 * Landfill Methane Calculations Library
 * Implements LandGEM and IPCC methodologies for methane emission calculations
 *
 * Boundary: Canada's federal landfill-methane regulations and the required
 * ECCC assessment model mean every output of this module is a *screening
 * estimate* only. Nothing here is a compliance assessment, a regulatory
 * conformance determination, or a credit-issuance assessment, and no issued
 * credits or revenue figures are produced.
 */

/** Mandatory label carried by every screening output of this module. */
export const LANDGEM_SCREENING_LABEL =
  'screening estimate — not a compliance or credit-issuance assessment';

export interface Recommendation {
  action: string;
  impactDescription: string;
  emissionsReductionTonnesCO2e: number | null;
  estimatedCostCAD: number | null;
  tierRevenueCAD: number | null;
  paybackYears: number | null;
}

export interface LandfillData {
  landfillName?: string;
  facilityName?: string;
  location?: string;
  wasteInPlace?: number; // tonnes
  annualAcceptanceRate?: number; // tonnes/year
  openYear?: number;
  startYear?: number;
  currentYear?: number;
  closeYear?: number;
  closureYear?: number;
  captureEfficiency: number; // 0-1 - this is the main one we need
  [key: string]: any; // Allow all other properties
}

export interface LandGEMCalculationResult {
  /** Always LANDGEM_SCREENING_LABEL — every output is screening-level only. */
  screeningLabel: string;
  totalMethane: number; // m³/year
  totalCO2e: number; // tonnes CO2e/year
  capturedMethane: number; // m³/year
  escapedMethane: number; // m³/year
  potentialRevenue: number | null; // CAD/year; withheld until a buyer-specific offtake price is supplied
  yearlyEmissions: Array<{
    year: number;
    methane: number;
    co2e: number;
  }>;

  // Model parameters
  kValue: number; // generation rate constant
  l0Value: number; // methane potential
  modelConfidence: 'high' | 'medium' | 'low';
  uncertaintyRangePercent: number;

  // Methane generation (in tonnes)
  totalMethaneGeneratedTonnes: number;
  methaneCapturedTonnes: number;
  methaneToAtmosphereTonnes: number;

  // GHG emissions
  methaneCO2eTonnes: number; // Fugitive methane as CO2e
  combustionCO2Tonnes: number; // CO2 from flare/combustion
  totalGHGEmissionsCO2e: number;

  // TIER credit potential
  tierBaselineScenario: string;
  tierCreditPotentialTonnes: number | null;
  tierCreditValueCAD: number | null;

  // Warnings and recommendations
  warnings: string[];
  recommendations: Recommendation[];
}

/**
 * Calculate methane emissions using LandGEM methodology
 * LandGEM (Landfill Gas Emissions Model) - EPA methodology
 */
export function calculateLandGEMMethane(data: LandfillData): LandGEMCalculationResult {
  const kValue = 0.05; // Methane generation rate constant (1/year)
  const L0 = 170; // Methane generation potential (m³/Mg)
  const currentYear = data.currentYear || new Date().getFullYear();
  const startYear = data.startYear || data.openYear || currentYear - 10;
  const closeYear = data.closeYear || data.closureYear || currentYear;
  const wasteInPlace = data.wasteInPlace || 100000; // Default 100k tonnes
  const annualAcceptanceRate = data.annualAcceptanceRate || 10000; // Default 10k tonnes/year

  let totalMethane = 0;
  const yearlyEmissions = [];

  // Calculate emissions for each year
  for (let year = startYear; year <= currentYear; year++) {
    const age = currentYear - year;
    const waste = year <= closeYear ? annualAcceptanceRate : 0;

    // LandGEM equation: Q = L0 * R * k * e^(-k*t)
    const methaneForYear = L0 * waste * kValue * Math.exp(-kValue * age);
    totalMethane += methaneForYear;

    // Convert to CO2e (methane GWP = 25)
    const co2e = methaneForYear * 0.0007168 * 25; // Convert m³ to tonnes, then to CO2e

    yearlyEmissions.push({
      year,
      methane: methaneForYear,
      co2e,
    });
  }

  // Calculate captured and escaped methane
  const capturedMethane = totalMethane * data.captureEfficiency;
  const escapedMethane = totalMethane * (1 - data.captureEfficiency);

  // Total CO2e from all generated methane
  const totalCO2e = totalMethane * 0.0007168 * 25;

  // Convert to tonnes
  const methaneConversionFactor = 0.0007168; // m³ to tonnes
  const totalMethaneGeneratedTonnes = totalMethane * methaneConversionFactor;
  const methaneCapturedTonnes = capturedMethane * methaneConversionFactor;
  const methaneToAtmosphereTonnes = escapedMethane * methaneConversionFactor;

  // GHG emissions calculations
  const methaneCO2eTonnes = methaneToAtmosphereTonnes * 25; // GWP of methane
  const combustionCO2Tonnes = methaneCapturedTonnes * 2.75; // Approx CO2 from combustion
  const totalGHGEmissionsCO2e = methaneCO2eTonnes + combustionCO2Tonnes;

  // Modelled methane quantities do not establish TIER-eligible reductions,
  // credits, or financial value. Keep these unavailable until project-specific
  // quantification and current regulatory/market evidence are supplied.
  const tierCreditPotentialTonnes: number | null = null;
  const tierCreditValueCAD: number | null = null;

  // Model confidence based on data quality
  let modelConfidence: 'high' | 'medium' | 'low' = 'medium';
  let uncertaintyRangePercent = 30;

  if (wasteInPlace > 100000 && currentYear - startYear > 5) {
    modelConfidence = 'high';
    uncertaintyRangePercent = 20;
  } else if (wasteInPlace < 10000 || currentYear - startYear < 2) {
    modelConfidence = 'low';
    uncertaintyRangePercent = 50;
  }

  // Warnings
  const warnings: string[] = [];
  if (data.captureEfficiency < 0.5) {
    warnings.push('Low capture efficiency detected - consider upgrading capture system');
  }
  if (methaneCO2eTonnes > 10000) {
    warnings.push('High fugitive emissions - significant climate impact');
  }
  if (!data.closeYear) {
    warnings.push('No closure year specified - using current year as estimate');
  }

  // Recommendations with full metrics
  const recommendations: Recommendation[] = [];

  if (data.captureEfficiency < 0.7) {
    recommendations.push({
      action: 'Assess capture-efficiency upgrade options',
      impactDescription:
        'Screening prompt only. Quantify project-specific reductions and obtain engineering and commercial evidence before estimating cost or value.',
      emissionsReductionTonnesCO2e: null,
      estimatedCostCAD: null,
      tierRevenueCAD: null,
      paybackYears: null,
    });
  }

  if (totalMethaneGeneratedTonnes > 500 && data.captureEfficiency > 0.6) {
    recommendations.push({
      action: 'Assess landfill-gas energy recovery feasibility',
      impactDescription:
        'Screening prompt only. Engineering, interconnection, offtake pricing, and project-specific emissions quantification are not assessed here.',
      emissionsReductionTonnesCO2e: null,
      estimatedCostCAD: null,
      tierRevenueCAD: null,
      paybackYears: null,
    });
  }

  // No offtake tariff or buyer-specific use value is configured.
  const potentialRevenue: number | null = null;

  return {
    screeningLabel: LANDGEM_SCREENING_LABEL,
    totalMethane,
    totalCO2e,
    capturedMethane,
    escapedMethane,
    potentialRevenue,
    yearlyEmissions: yearlyEmissions.slice(-10), // Last 10 years
    kValue,
    l0Value: L0,
    modelConfidence,
    uncertaintyRangePercent,
    totalMethaneGeneratedTonnes,
    methaneCapturedTonnes,
    methaneToAtmosphereTonnes,
    methaneCO2eTonnes,
    combustionCO2Tonnes,
    totalGHGEmissionsCO2e,
    tierBaselineScenario: 'No capture system baseline - all methane to atmosphere',
    tierCreditPotentialTonnes,
    tierCreditValueCAD,
    warnings,
    recommendations,
  };
}

/**
 * Format LandGEM results for display
 */
export function formatLandGEMResults(results: LandGEMCalculationResult): Record<string, string> {
  return {
    // The screening label must travel with every exported/formatted output.
    screeningLabel: LANDGEM_SCREENING_LABEL,
    totalMethane: `${results.totalMethane.toLocaleString('en-CA', { maximumFractionDigits: 0 })} m³/year`,
    totalCO2e: `${results.totalCO2e.toLocaleString('en-CA', { maximumFractionDigits: 0 })} tonnes CO2e/year`,
    capturedMethane: `${results.capturedMethane.toLocaleString('en-CA', { maximumFractionDigits: 0 })} m³/year`,
    escapedMethane: `${results.escapedMethane.toLocaleString('en-CA', { maximumFractionDigits: 0 })} m³/year`,
    potentialRevenue:
      results.potentialRevenue === null
        ? 'Not calculated; buyer-specific offtake price required'
        : `CAD ${results.potentialRevenue.toLocaleString('en-CA', { maximumFractionDigits: 0 })}/year`,
    captureRate: `${((results.capturedMethane / results.totalMethane) * 100).toFixed(1)}%`,
  };
}
