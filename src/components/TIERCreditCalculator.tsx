/**
 * Production TIER Credit Calculator - Real FSB/HPB Calculations
 * 
 * Replaces mock data with actual tierCalculations.ts engine
 * 
 * Features:
 * - Historical data input (for FSB calculation)
 * - Real HPB lookup from database
 * - Production EPC credit calculation @ $95/tonne
 * - Export PDF compliance report
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  Calculator,
  Download,
  Info,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  FileText,
  HelpCircle
} from 'lucide-react';
import {
  calculateTIERCompliance,
  type TIERFacilityData,
  type TIERCalculationResult,
  formatTIERResults
} from '../lib/tierCalculations';

// Facility type options
const FACILITY_TYPES = [
  { value: 'landfill', label: 'Landfill', sector: 'waste_management' },
  { value: 'arena', label: 'Arena / Recreation Center', sector: 'recreation' },
  { value: 'water_treatment', label: 'Water Treatment Plant', sector: 'water_utilities' },
  { value: 'wastewater_treatment', label: 'Wastewater Treatment', sector: 'water_utilities' },
  { value: 'industrial', label: 'Industrial Facility', sector: 'industrial' },
] as const;

// Production unit mappings
const PRODUCTION_UNITS: Record<string, string> = {
  landfill: 'tonnes_waste',
  arena: 'MWh',
  water_treatment: 'm3_water',
  wastewater_treatment: 'm3_water',
  industrial: 'units'
};

export function TIERCreditCalculator() {
  // Form state
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<typeof FACILITY_TYPES[number]['value']>('arena');
  const [reportingYear, setReportingYear] = useState(2024);
  const [productionQuantity, setProductionQuantity] = useState(5000);
  const [totalEmissions, setTotalEmissions] = useState(500);
  const [tierStatus, setTierStatus] = useState<'opt_in' | 'mandatory' | 'considering'>('considering');

  // Historical data for FSB calculation
  const [useHistorical, setUseHistorical] = useState(false);
  const [historicalData, setHistoricalData] = useState<Array<{ year: number, production: number, emissions: number }>>([
    { year: 2021, production: 4800, emissions: 520 },
    { year: 2022, production: 4900, emissions: 510 },
    { year: 2023, production: 5000, emissions: 505 }
  ]);

  // Calculation results
  const [result, setResult] = useState<TIERCalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  // Get sector from facility type
  const sector = FACILITY_TYPES.find(f => f.value === facilityType)?.sector || 'industrial';
  const productionUnit = PRODUCTION_UNITS[facilityType];

  // Calculate TIER compliance
  const runCalculation = async () => {
    setCalculating(true);
    setError(null);

    try {
      const facilityData: TIERFacilityData = {
        facilityName: facilityName || `${facilityType} Facility`,
        facilityType,
        sector,
        productionQuantity,
        productionUnit,
        reportingYear,
        totalEmissionsTonnesCO2e: totalEmissions,
        tierStatus,
        benchmarkType: useHistorical ? 'auto' : 'HPB', // auto = use lower of FSB/HPB
        historicalEmissionsData: useHistorical ? historicalData : undefined
      };

      const calculationResult = await calculateTIERCompliance(facilityData);
      setResult(calculationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
      console.error('TIER calculation error:', err);
    } finally {
      setCalculating(false);
    }
  };

  // Auto-calculate on input change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (productionQuantity > 0 && totalEmissions >= 0) {
        runCalculation();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [facilityType, productionQuantity, totalEmissions, useHistorical, historicalData, tierStatus, reportingYear]);

  // Export PDF report
  const exportPDF = () => {
    if (!result) return;

    const reportText = formatTIERResults(result);
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TIER_Compliance_Report_${facilityName.replace(/\s+/g, '_')}_${reportingYear}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Platform
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-600 rounded-lg">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">TIER Credit Calculator</h1>
            <p className="text-slate-400">Production EPC Revenue Estimator (Real FSB/HPB Math)</p>
          </div>
        </div>
        <p className="text-slate-300 max-w-2xl">
          Calculate Emission Performance Credits (EPCs) using <strong>official Alberta TIER regulation formulas</strong>.
          As of April 1, 2025, with federal fuel charge at $0, TIER generates revenue at $95/tonne CO2e.
        </p>
      </section>

      {/* 2025 Pivot Alert */}
      <section className="max-w-5xl mx-auto px-6 mb-8">
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-4">
          <Info className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold text-emerald-400 mb-1">2025 Regulatory Pivot: From Tax Shield to Credit Factory</div>
            <p className="text-slate-300">
              Federal fuel charge = <span className="font-bold">$0</span>. TIER credits tradable at <span className="font-bold">$95/tonne CO2e</span>.
              Facilities performing better than benchmarks can <strong>monetize efficiency</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* Calculator Form */}
      <section className="max-w-5xl mx-auto px-6 mb-12">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-400" />
            Facility Information
          </h2>

          <div className="space-y-6">
            {/* Facility Name */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Facility Name (Optional)
              </label>
              <input
                type="text"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="e.g., Nicholas Sheran Arena"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Facility Type */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Facility Type
              </label>
              <div className="grid md:grid-cols-3 gap-3">
                {FACILITY_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFacilityType(type.value)}
                    className={`p-4 rounded-lg border-2 transition-colors text-left ${facilityType === type.value
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
                      }`}
                  >
                    <div className="font-bold">{type.label}</div>
                    <div className="text-sm text-slate-400">{type.sector.replace('_', ' ')}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Production & Emissions */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Reporting Year
                </label>
                <input
                  type="number"
                  value={reportingYear}
                  onChange={(e) => setReportingYear(Number(e.target.value))}
                  min="2020"
                  max="2030"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Annual Production
                  <span className="text-xs ml-1">({productionUnit})</span>
                </label>
                <input
                  type="number"
                  value={productionQuantity}
                  onChange={(e) => setProductionQuantity(Number(e.target.value))}
                  min="1"
                  step="100"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Annual Emissions (tCO₂e)
                </label>
                <input
                  type="number"
                  value={totalEmissions}
                  onChange={(e) => setTotalEmissions(Number(e.target.value))}
                  min="0"
                  step="10"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* TIER Status */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                TIER Status
              </label>
              <select
                value={tierStatus}
                onChange={(e) => setTierStatus(e.target.value as typeof tierStatus)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="considering">Considering Opt-In</option>
                <option value="opt_in">Voluntarily Opted In</option>
                <option value="mandatory">Mandatory (>100k tonnes)</option>
              </select>
            </div>

            {/* Historical Data Toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useHistorical}
                  onChange={(e) => setUseHistorical(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-300">
                  Use historical data for FSB calculation (3-year average)
                </span>
                <HelpCircle className="h-4 w-4 text-slate-500" title="FSB = Facility-Specific Benchmark from 3-year historical emissions" />
              </label>

              {useHistorical && (
                <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-sm font-medium text-slate-400 mb-3">Historical Emissions (Last 3 Years)</div>
                  <div className="space-y-2">
                    {historicalData.map((data, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          value={data.year}
                          onChange={(e) => {
                            const newData = [...historicalData];
                            newData[idx].year = Number(e.target.value);
                            setHistoricalData(newData);
                          }}
                          placeholder="Year"
                          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm"
                        />
                        <input
                          type="number"
                          value={data.production}
                          onChange={(e) => {
                            const newData = [...historicalData];
                            newData[idx].production = Number(e.target.value);
                            setHistoricalData(newData);
                          }}
                          placeholder="Production"
                          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm"
                        />
                        <input
                          type="number"
                          value={data.emissions}
                          onChange={(e) => {
                            const newData = [...historicalData];
                            newData[idx].emissions = Number(e.target.value);
                            setHistoricalData(newData);
                          }}
                          placeholder="Emissions (tCO₂e)"
                          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      {result && !error && (
        <section className="max-w-5xl mx-auto px-6 mb-12">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                TIER Compliance Results
              </span>
              <button
                onClick={exportPDF}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export Report
              </button>
            </h2>

            {/* Benchmarks */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {result.facilitySpecificBenchmark && (
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-1">FSB (Historical)</div>
                  <div className="text-2xl font-bold text-amber-400">
                    {result.facilitySpecificBenchmark.toFixed(4)}
                    <span className="text-sm text-slate-500 ml-2">tCO₂e/unit</span>
                  </div>
                </div>
              )}

              {result.highPerformanceBenchmark && (
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-1">HPB (Regulation)</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {result.highPerformanceBenchmark.toFixed(4)}
                    <span className="text-sm text-slate-500 ml-2">tCO₂e/unit</span>
                  </div>
                </div>
              )}

              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">
                  Applied Benchmark
                  <span className="text-xs ml-1">({result.benchmarkSource})</span>
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  {result.applicableBenchmark.toFixed(4)}
                  <span className="text-sm text-slate-500 ml-2">tCO₂e/unit</span>
                </div>
              </div>
            </div>

            {/* Compliance Status */}
            <div className="border-t border-slate-700 pt-6">
              {result.complianceStatus === 'surplus' ? (
                <>
                  <div className="flex items-center gap-2 text-emerald-400 mb-4">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-bold">Eligible for TIER Credits</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-500/30">
                      <div className="text-slate-400 text-sm mb-1">Credits Generated (Annual)</div>
                      <div className="text-3xl font-bold text-emerald-400">
                        {result.epcCreditsGenerated.toFixed(1)}
                        <span className="text-sm text-slate-400 ml-2">tonnes CO₂e</span>
                      </div>
                    </div>

                    <div className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-500/30">
                      <div className="text-slate-400 text-sm mb-1">Potential Revenue (@ $95/tonne)</div>
                      <div className="text-3xl font-bold text-emerald-400">
                        ${result.epcCreditsValueCAD.toLocaleString()}
                        <span className="text-sm text-slate-400 ml-2">CAD/year</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : result.complianceStatus === 'deficit' ? (
                <>
                  <div className="flex items-center gap-2 text-amber-400 mb-4">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-bold">Compliance Obligation Required</span>
                  </div>

                  <div className="bg-amber-900/20 rounded-lg p-4 border border-amber-500/30 mb-4">
                    <div className="text-slate-400 text-sm mb-1">Payment Required (@ $95/tonne)</div>
                    <div className="text-3xl font-bold text-amber-400">
                      ${result.complianceObligationCAD.toLocaleString()}
                      <span className="text-sm text-slate-400 ml-2">CAD</span>
                    </div>

                    {result.trueUpDeadline && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                        <Clock className="h-4 w-4" />
                        True-up Deadline: {new Date(result.trueUpDeadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-slate-400">
                    Your emissions ({result.actualEmissionsTonnes.toFixed(0)} tCO₂e) exceed the benchmark limit
                    ({result.emissionsLimitTonnes.toFixed(0)} tCO₂e). Consider efficiency upgrades to generate credits instead.
                  </p>
                </>
              ) : (
                <div className="text-slate-300'>
                  Emissions are exactly at benchmark limit (neutral compliance).
                </div>
              )}
              
              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-amber-900 /10 border border-amber-500/20 rounded-lg">
              <div className="text-sm font-medium text-amber-400 mb-2">Calculation Warnings:</div>
              <ul className="text-sm text-slate-400 space-y-1">
                {result.warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
              )}
          </div>

          {/* Methodology Toggle */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="text-sm text-cyan-400 hover:underline flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              {showMethodology ? 'Hide' : 'Show'} Calculation Methodology →
            </button>

            {showMethodology && (
              <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-sm text-slate-300">
                <h3 className="font-bold mb-3">TIER Regulation Calculation (Official Formula)</h3>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Emissions Intensity:</strong> {result.productionWeightedAvgEmissions.toFixed(4)} tCO₂e/unit
                    <div className="ml-6 text-xs text-slate-500">
                      = {result.actualEmissionsTonnes.toFixed(0)} tCO₂e ÷ {productionQuantity} {productionUnit}
                    </div>
                  </li>

                  <li>
                    <strong>Benchmark Selection:</strong> {result.benchmarkSource}
                    <div className="ml-6 text-xs text-slate-500">
                      {result.facilitySpecificBenchmark && result.highPerformanceBenchmark
                        ? `Regulation uses lower of FSB (${result.facilitySpecificBenchmark.toFixed(4)}) vs HPB (${result.highPerformanceBenchmark.toFixed(4)})`
                        : result.benchmarkSource === 'HPB_only'
                          ? `No historical data available for FSB, using HPB from regulation tables`
                          : `Using ${result.benchmarkSource} as calculated`}
                    </div>
                  </li>

                  <li>
                    <strong>Emissions Limit:</strong> {result.emissionsLimitTonnes.toFixed(1)} tCO₂e
                    <div className="ml-6 text-xs text-slate-500">
                      = {result.applicableBenchmark.toFixed(4)} tCO₂e/unit × {productionQuantity} {productionUnit}
                    </div>
                  </li>

                  <li>
                    <strong>Variance:</strong> {result.emissionsVarianceTonnes >= 0 ? '+' : ''}{result.emissionsVarianceTonnes.toFixed(1)} tCO₂e
                    <div className="ml-6 text-xs text-slate-500">
                      = {result.emissionsLimitTonnes.toFixed(1)} (limit) - {result.actualEmissionsTonnes.toFixed(1)} (actual)
                    </div>
                  </li>

                  <li>
                    <strong>EPC Value / Obligation:</strong> ${(result.epcCreditsValueCAD || result.complianceObligationCAD).toLocaleString()} CAD
                    <div className="ml-6 text-xs text-slate-500">
                      = {Math.abs(result.emissionsVarianceTonnes).toFixed(1)} tCO₂e × $95/tonne
                    </div>
                  </li>
                </ol>

                <div className="mt-4 p-3 bg-slate-800/50 rounded border border-slate-700">
                  <div className="text-xs text-slate-400">
                    <strong>Calculation Confidence:</strong> {result.calculationConfidence.toUpperCase()}
                    <br />
                    <strong>Regulation Year:</strong> {result.tierRegulationYear}
                    <br />
                    <strong>Calculation Date:</strong> {new Date(result.calculationDate).toLocaleString()}
                  </div>
                </div>

                <p className="mt-4 text-slate-400 text-xs">
                  <strong>Note:</strong> This calculator implements official Alberta TIER regulation formulas.
                  For regulatory filing, consult the official TIER directives at alberta.ca/tier
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-slate-800 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-6">
          <span>© {new Date().getFullYear()} Canada Energy Intelligence Platform</span>
          <a
            href="https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            TIER Regulation →
          </a>
        </div>
      </footer>
    </div>
  );
}

export default TIERCreditCalculator;
