/**
 * Landfill Methane Module - LandGEM Methane Quantification
 * 
 * Production UI for EPA Method 21 / LandGEM calculations
 * Integrates with landfillMethaneCalculations.ts engine
 * 
 * Features:
 * - Wizard-style input (facility → waste → gas capture → results)
 * - Real-time LandGEM calculations
 * - TIER credit potential display
 * - Actionable recommendations
 * - PDF export
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  TrendingDown,
  DollarSign,
  Download,
  Info,
  AlertCircle,
  CheckCircle,
  Calendar,
  MapPin,
  Zap,
  Cloud,
  BarChart3,
  FileText
} from 'lucide-react';
import {
  calculateLandGEMMethane,
  formatLandGEMResults,
  type LandfillData,
  type LandGEMCalculationResult
} from '../lib/landfillMethaneCalculations';

type WizardStep = 'facility' | 'waste' | 'climate' | 'results';

const CAPTURE_SYSTEM_TYPES = [
  { value: 'none', label: 'No Capture System', efficiency: 0 },
  { value: 'passive_venting', label: 'Passive Venting', efficiency: 0.1 },
  { value: 'horizontal_collectors', label: 'Horizontal Collectors', efficiency: 0.65 },
  { value: 'vertical_wells', label: 'Vertical Wells', efficiency: 0.85 }
] as const;

const ENERGY_RECOVERY_OPTIONS = [
  { value: 'none', label: 'No Energy Recovery' },
  { value: 'flare_only', label: 'Flare Only (Destroy Methane)' },
  { value: 'electricity_generation', label: 'Electricity Generation' },
  { value: 'heat_recovery', label: 'Heat Recovery' },
  { value: 'vehicle_fuel', label: 'Vehicle Fuel (RNG)' }
] as const;

export function LandfillMethaneModule() {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('facility');

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    closureYear?: string;
    tonnage?: Record<number, string>;
  }>({});

  // Facility data
  const [landfillName, setLandfillName] = useState('');
  const [startYear, setStartYear] = useState(1990);
  const [closureYear, setClosureYear] = useState<number | undefined>(undefined);
  const [locationCity, setLocationCity] = useState('');
  const [avgPrecipitation, setAvgPrecipitation] = useState(450); // mm (Alberta average)
  const [avgTemperature, setAvgTemperature] = useState(4); // °C (Alberta average)

  // Waste data
  const [currentYear] = useState(new Date().getFullYear());
  const [wasteHistory, setWasteHistory] = useState<Array<{ year: number, tonnesWaste: number }>>([
    { year: currentYear - 3, tonnesWaste: 48000 },
    { year: currentYear - 2, tonnesWaste: 50000 },
    { year: currentYear - 1, tonnesWaste: 52000 },
    { year: currentYear, tonnesWaste: 54000 }
  ]);
  const [organicPercent, setOrganicPercent] = useState(45);

  // Gas capture data
  const [captureSystemType, setCaptureSystemType] = useState<typeof CAPTURE_SYSTEM_TYPES[number]['value']>('none');
  const [captureEfficiency, setCaptureEfficiency] = useState(0);
  const [energyRecovery, setEnergyRecovery] = useState<typeof ENERGY_RECOVERY_OPTIONS[number]['value']>('none');

  // Results
  const [result, setResult] = useState<LandGEMCalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-update capture efficiency when system type changes
  useEffect(() => {
    const systemConfig = CAPTURE_SYSTEM_TYPES.find(s => s.value === captureSystemType);
    if (systemConfig) {
      setCaptureEfficiency(systemConfig.efficiency);
    }
  }, [captureSystemType]);

  // Run calculation when on results step
  useEffect(() => {
    if (currentStep === 'results') {
      runCalculation();
    }
  }, [currentStep]);

  const runCalculation = async () => {
    setCalculating(true);
    setError(null);

    try {
      const landfillData: LandfillData = {
        landfillName: landfillName || 'Municipal Landfill',
        startYear,
        currentYear,
        closureYear,
        wasteAcceptanceHistory: wasteHistory,
        hasCaptureSystem: captureSystemType !== 'none',
        captureEfficiency: captureEfficiency,
        captureSystemType: captureSystemType as any,
        flareOrEnergyRecovery: energyRecovery as any,
        avgPrecipitationMm: avgPrecipitation,
        avgTemperatureCelsius: avgTemperature,
        organicWastePercent: organicPercent
      };

      const calculationResult = calculateLandGEMMethane(landfillData);
      setResult(calculationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
      console.error('LandGEM calculation error:', err);
    } finally {
      setCalculating(false);
    }
  };

  const addWasteYear = () => {
    const lastYear = wasteHistory.length > 0
      ? Math.max(...wasteHistory.map(w => w.year))
      : currentYear - 1;

    setWasteHistory([...wasteHistory, { year: lastYear + 1, tonnesWaste: 50000 }]);
  };

  const updateWasteYear = (index: number, field: 'year' | 'tonnesWaste', value: number) => {
    const newHistory = [...wasteHistory];
    newHistory[index][field] = value;
    setWasteHistory(newHistory);
  };

  const removeWasteYear = (index: number) => {
    setWasteHistory(wasteHistory.filter((_, i) => i !== index));
  };

  const exportPDF = () => {
    if (!result) return;

    const reportText = formatLandGEMResults(result);
    const blob = new Blob([JSON.stringify(reportText, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Landfill_Methane_Assessment_${landfillName.replace(/\s+/g, '_')}_${currentYear}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const nextStep = () => {
    // Validate before proceeding
    let hasErrors = false;

    // Validate closure year in Step 1
    if (currentStep === 'facility' && closureYear && closureYear < startYear) {
      setValidationErrors(prev => ({
        ...prev,
        closureYear: `Closure year must be after start year (${startYear})`
      }));
      hasErrors = true;
    }

    // Validate tonnage in Step 2
    if (currentStep === 'waste') {
      const tonnageErrors: Record<number, string> = {};
      wasteHistory.forEach((entry, idx) => {
        if (entry.tonnesWaste < 0) {
          tonnageErrors[idx] = 'Tonnage must be a positive number';
          hasErrors = true;
        }
      });
      if (Object.keys(tonnageErrors).length > 0) {
        setValidationErrors(prev => ({ ...prev, tonnage: tonnageErrors }));
      }
    }

    if (hasErrors) return; // Block navigation

    // Clear errors and proceed
    setValidationErrors({});
    if (currentStep === 'facility') setCurrentStep('waste');
    else if (currentStep === 'waste') setCurrentStep('climate');
    else if (currentStep === 'climate') setCurrentStep('results');
  };

  const prevStep = () => {
    setValidationErrors({}); // Clear errors when going back
    if (currentStep === 'results') setCurrentStep('climate');
    else if (currentStep === 'climate') setCurrentStep('waste');
    else if (currentStep === 'waste') setCurrentStep('facility');
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
          <div className="p-3 bg-orange-600 rounded-lg">
            <Flame className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Landfill Methane Quantification</h1>
            <p className="text-slate-400">EPA LandGEM Model + TIER Credit Calculator</p>
          </div>
        </div>
        <p className="text-slate-300 max-w-2xl">
          Quantify methane emissions using <strong>EPA's LandGEM first-order decay model</strong>.
          Calculate TIER credit potential from gas capture systems (up to $2M+/year revenue).
        </p>
      </section>

      {/* Alert: TIER Opportunity */}
      <section className="max-w-5xl mx-auto px-6 mb-8">
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 flex items-start gap-4">
          <Info className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold text-orange-400 mb-1">Landfills = Hidden Revenue Opportunity</div>
            <p className="text-slate-300">
              Municipal landfills can generate <span className="font-bold">$500k-$2M+/year</span> in TIER credits by installing
              gas capture systems. Typical payback: <span className="font-bold">6-18 months</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Progress Steps */}
      <section className="max-w-5xl mx-auto px-6 mb-8">
        <div className="flex items-center justify-between">
          {[
            { step: 'facility', label: 'Facility' },
            { step: 'waste', label: 'Waste & Capture' },
            { step: 'climate', label: 'Climate Data' },
            { step: 'results', label: 'Results' }
          ].map((stepInfo, idx) => (
            <div key={stepInfo.step} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${currentStep === stepInfo.step ? 'text-emerald-400' :
                ['facility', 'waste', 'climate', 'results'].indexOf(currentStep) > idx ? 'text-slate-400' : 'text-slate-600'
                }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === stepInfo.step ? 'border-emerald-400 bg-emerald-400/20' :
                  ['facility', 'waste', 'climate', 'results'].indexOf(currentStep) > idx ? 'border-slate-400' : 'border-slate-600'
                  }`}>
                  {idx + 1}
                </div>
                <span className="text-sm hidden sm:inline">{stepInfo.label}</span>
              </div>
              {idx < 3 && <div className={`flex-1 h-0.5 mx-2 ${['facility', 'waste', 'climate', 'results'].indexOf(currentStep) > idx ? 'bg-slate-400' : 'bg-slate-700'
                }`} />}
            </div>
          ))}
        </div>
      </section>

      {/* Wizard Content */}
      <section className="max-w-5xl mx-auto px-6 mb-12">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">

          {/* Step 1: Facility Info */}
          {currentStep === 'facility' && (
            <div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-400" />
                Facility Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Landfill Name</label>
                  <input
                    type="text"
                    value={landfillName}
                    onChange={(e) => setLandfillName(e.target.value)}
                    placeholder="e.g., Calgary Spyhill Landfill"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Location (City)</label>
                    <input
                      type="text"
                      value={locationCity}
                      onChange={(e) => setLocationCity(e.target.value)}
                      placeholder="e.g., Calgary"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Start Year</label>
                    <input
                      type="number"
                      value={startYear}
                      onChange={(e) => setStartYear(Number(e.target.value))}
                      min="1900"
                      max={currentYear}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={closureYear !== undefined}
                      onChange={(e) => setClosureYear(e.target.checked ? currentYear : undefined)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-300">Landfill is closed</span>
                  </label>

                  {closureYear !== undefined && (
                    <>
                      <input
                        type="number"
                        value={closureYear}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setClosureYear(value);
                          // Clear error on change
                          if (value >= startYear) {
                            setValidationErrors(prev => ({ ...prev, closureYear: undefined }));
                          }
                        }}
                        min={startYear}
                        max={currentYear}
                        className={`mt-2 w-full px-4 py-2 bg-slate-900 border rounded-lg text-white focus:outline-none ${validationErrors.closureYear ? 'border-red-500' : 'border-slate-700 focus:border-emerald-500'
                          }`}
                        placeholder="Closure year"
                      />
                      {validationErrors.closureYear && (
                        <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {validationErrors.closureYear}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Waste Data */}
          {currentStep === 'waste' && (
            <div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-400" />
                Waste Acceptance History
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Organic Waste Percentage
                  </label>
                  <input
                    type="number"
                    value={organicPercent}
                    onChange={(e) => setOrganicPercent(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Typical municipal solid waste: 40-50%</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-400">
                      Year-by-Year Waste Acceptance
                    </h3>
                    <button
                      onClick={addWasteYear}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-sm transition-colors"
                    >
                      + Add Year
                    </button>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {wasteHistory.sort((a, b) => b.year - a.year).map((waste, idx) => (
                      <div key={idx}>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={waste.year}
                            onChange={(e) => updateWasteYear(idx, 'year', Number(e.target.value))}
                            placeholder="Year"
                            className="w-32 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm"
                          />
                          <input
                            type="number"
                            value={waste.tonnesWaste}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              updateWasteYear(idx, 'tonnesWaste', value);
                              // Clear error on change if valid
                              if (value >= 0) {
                                setValidationErrors(prev => ({
                                  ...prev,
                                  tonnage: { ...prev.tonnage, [idx]: undefined }
                                }));
                              }
                            }}
                            min="0"
                            placeholder="Tonnes"
                            className={`flex-1 px-3 py-2 bg-slate-900 border rounded text-sm ${validationErrors.tonnage?.[idx] ? 'border-red-500' : 'border-slate-700'
                              }`}
                          />
                          <span className="text-sm text-slate-500 w-20">tonnes/yr</span>
                          {wasteHistory.length > 1 && (
                            <button
                              onClick={() => removeWasteYear(idx)}
                              className="px-3 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 rounded text-sm transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {validationErrors.tonnage?.[idx] && (
                          <p className="text-red-400 text-xs mt-1 ml-36 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {validationErrors.tonnage[idx]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    More years = higher accuracy. Minimum 1 year required.
                  </p>
                </div>

                {/* Gas Capture System (moved from Step 3) */}
                <div className="pt-6 border-t border-slate-700">
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Gas Capture System
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-3">Capture System Type</label>
                      <div className="grid md:grid-cols-2 gap-3">
                        {CAPTURE_SYSTEM_TYPES.map((system) => (
                          <button
                            key={system.value}
                            onClick={() => setCaptureSystemType(system.value)}
                            className={`p-4 rounded-lg border-2 transition-colors text-left ${captureSystemType === system.value
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
                              }`}
                          >
                            <div className="font-bold">{system.label}</div>
                            <div className="text-sm text-slate-400">
                              {system.efficiency * 100}% capture efficiency
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {captureSystemType !== 'none' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-3">
                          Energy Recovery / Disposal Method
                        </label>
                        <select
                          value={energyRecovery}
                          onChange={(e) => setEnergyRecovery(e.target.value as typeof energyRecovery)}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                        >
                          {ENERGY_RECOVERY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Climate Data */}
          {currentStep === 'climate' && (
            <div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Cloud className="h-5 w-5 text-emerald-400" />
                Climate Data
              </h2>
              <p className="text-slate-400 mb-6">Climate parameters for LandGEM model calculations</p>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Avg Annual Precipitation (mm)
                    </label>
                    <input
                      type="number"
                      value={avgPrecipitation}
                      onChange={(e) => setAvgPrecipitation(Number(e.target.value))}
                      min="0"
                      step="10"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">Alberta avg: ~450mm</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Avg Annual Temperature (°C)
                    </label>
                    <input
                      type="number"
                      value={avgTemperature}
                      onChange={(e) => setAvgTemperature(Number(e.target.value))}
                      step="0.5"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">Alberta avg: ~4°C</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Organic Waste Content (%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={organicPercent}
                    onChange={(e) => setOrganicPercent(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-slate-500 mt-1">
                    <span>0%</span>
                    <span className="font-bold text-emerald-400">{organicPercent}%</span>
                    <span>100%</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Typical municipal waste: 40-50%</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {currentStep === 'results' && (
            <div>
              {calculating ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
                  <p className="text-slate-400">Running LandGEM calculations...</p>
                </div>
              ) : error ? (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-red-400 mb-1">Calculation Error</div>
                    <p className="text-sm text-slate-300">{error}</p>
                  </div>
                </div>
              ) : result ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-emerald-400" />
                      Methane Quantification Results
                    </h2>
                    <button
                      onClick={exportPDF}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-2 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Export Report
                    </button>
                  </div>

                  {/* Model Parameters */}
                  <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-3">LandGEM Model Parameters</h3>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-slate-500">k (generation rate)</div>
                        <div className="font-mono font-bold">{result.kValue.toFixed(4)} /year</div>
                      </div>
                      <div>
                        <div className="text-slate-500">L0 (methane potential)</div>
                        <div className="font-mono font-bold">{result.l0Value} m³ CH₄/tonne</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Confidence</div>
                        <div className={`font-bold ${result.modelConfidence === 'high' ? 'text-emerald-400' :
                          result.modelConfidence === 'medium' ? 'text-amber-400' : 'text-red-400'
                          }`}>
                          {result.modelConfidence.toUpperCase()} (±{result.uncertaintyRangePercent}%)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Methane Generation */}
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="text-slate-400 text-sm mb-1">Total Methane Generated</div>
                      <div className="text-2xl font-bold">
                        {result.totalMethaneGeneratedTonnes.toFixed(1)}
                        <span className="text-sm text-slate-500 ml-2">tonnes CH₄/yr</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="text-slate-400 text-sm mb-1">Captured</div>
                      <div className="text-2xl font-bold text-emerald-400">
                        {result.methaneCapturedTonnes.toFixed(1)}
                        <span className="text-sm text-slate-500 ml-2">tonnes CH₄</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <div className="text-slate-400 text-sm mb-1">Fugitive (to atmosphere)</div>
                      <div className="text-2xl font-bold text-orange-400">
                        {result.methaneToAtmosphereTonnes.toFixed(1)}
                        <span className="text-sm text-slate-500 ml-2">tonnes CH₄</span>
                      </div>
                    </div>
                  </div>

                  {/* GHG Emissions */}
                  <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-orange-400 mb-3">Total GHG Emissions</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-400 text-sm">Fugitive CH₄ (as CO₂e)</div>
                        <div className="text-xl font-bold text-orange-400">
                          {result.methaneCO2eTonnes.toFixed(0)} tonnes CO₂e
                        </div>
                        <div className="text-xs text-slate-500">Methane GWP = 25</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">Combustion CO₂</div>
                        <div className="text-xl font-bold">
                          {result.combustionCO2Tonnes.toFixed(0)} tonnes CO₂
                        </div>
                        <div className="text-xs text-slate-500">From flare/energy recovery</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-orange-500/30">
                      <div className="text-slate-400 text-sm">Total GHG Impact</div>
                      <div className="text-3xl font-bold text-orange-400">
                        {result.totalGHGEmissionsCO2e.toFixed(0)}
                        <span className="text-lg text-slate-500 ml-2">tonnes CO₂e/year</span>
                      </div>
                    </div>
                  </div>

                  {/* TIER Credit Potential */}
                  <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      TIER Credit Potential
                    </h3>
                    <div className="mb-3">
                      <div className="text-xs text-slate-400 mb-1">Scenario:</div>
                      <div className="text-sm text-slate-300">{result.tierBaselineScenario}</div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-400 text-sm">Emissions Reduction Potential</div>
                        <div className="text-2xl font-bold text-emerald-400">
                          {result.tierCreditPotentialTonnes.toFixed(0)}
                          <span className="text-sm text-slate-500 ml-2">tonnes CO₂e</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">Annual Revenue Potential</div>
                        <div className="text-2xl font-bold text-emerald-400">
                          ${result.tierCreditValueCAD.toLocaleString()}
                          <span className="text-sm text-slate-500 ml-2">CAD/year</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-6">
                      <h3 className="text-sm font-medium text-amber-400 mb-2">Calculation Warnings:</h3>
                      <ul className="text-sm text-slate-300 space-y-1">
                        {result.warnings.map((warning, idx) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold mb-4">Recommended Actions</h3>
                      <div className="space-y-3">
                        {result.recommendations.map((rec, idx) => (
                          <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-bold">{rec.action}</div>
                                <div className="text-sm text-slate-400">{rec.impactDescription}</div>
                              </div>
                              <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                              <div>
                                <div className="text-slate-500">Impact</div>
                                <div className="font-medium">{rec.emissionsReductionTonnesCO2e.toFixed(0)} tonnes CO₂e</div>
                              </div>
                              <div>
                                <div className="text-slate-500">Cost</div>
                                <div className="font-medium">${(rec.estimatedCostCAD / 1000).toFixed(0)}k</div>
                              </div>
                              <div>
                                <div className="text-slate-500">Revenue</div>
                                <div className="font-medium text-emerald-400">${(rec.tierRevenueCAD / 1000).toFixed(0)}k/yr</div>
                              </div>
                              <div>
                                <div className="text-slate-500">Payback</div>
                                <div className="font-medium text-emerald-400">{rec.paybackYears.toFixed(1)} years</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-700 flex items-center justify-between">
            {currentStep !== 'facility' && (
              <button
                onClick={prevStep}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>
            )}

            {currentStep !== 'results' && (
              <button
                onClick={nextStep}
                className="ml-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-2 transition-colors"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {currentStep === 'results' && result && (
              <Link
                to="/pricing"
                className="ml-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-2 transition-colors"
              >
                Get Started ($2,850/year)
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} Canada Energy Intelligence Platform. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Link to="/tier-calculator" className="hover:text-white transition-colors">
            TIER Calculator
          </Link>
          <Link to="/pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
          <a
            href="https://www.epa.gov/land-research/landfill-gas-emissions-model-landgem"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            EPA LandGEM →
          </a>
        </div>
      </footer>
    </div>
  );
}

export default LandfillMethaneModule;
