import React, { useState } from 'react';
import { Calculator, TrendingUp, CheckCircle, BarChart3 } from 'lucide-react';
import { InteractiveContent as InteractiveContentType } from '../../lib/moduleContent';

interface InteractiveContentProps {
  content: InteractiveContentType;
  onComplete?: () => void;
  isCompleted: boolean;
}

export function InteractiveContent({ content, onComplete, isCompleted }: InteractiveContentProps) {
  // Solar ROI Calculator state (example implementation)
  const [inputs, setInputs] = useState<Record<string, any>>({
    monthlyBill: 150,
    roofArea: 400,
    systemSize: 5,
    installCost: 12500,
    province: 'AB'
  });

  const [showResults, setShowResults] = useState(false);

  const handleInputChange = (name: string, value: any) => {
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  // Calculate ROI (simplified Alberta solar example)
  const calculateResults = () => {
    const systemSize = inputs.systemSize;
    const installCost = inputs.installCost;

    // Alberta solar production: ~1200 kWh/kW/year
    const annualProduction = systemSize * 1200;

    // Alberta average rate: $0.12/kWh
    const annualSavings = annualProduction * 0.12;

    // Payback period
    const paybackPeriod = (installCost / annualSavings).toFixed(1);

    // 25-year lifetime savings
    const lifetimeSavings = (annualSavings * 25 - installCost).toFixed(0);

    // CO2 offset: ~0.5 kg CO2/kWh in Alberta
    const co2Offset = (annualProduction * 0.5).toFixed(0);

    return {
      annualProduction: annualProduction.toFixed(0),
      annualSavings: annualSavings.toFixed(0),
      paybackPeriod,
      lifetimeSavings,
      co2Offset
    };
  };

  const results = showResults ? calculateResults() : null;

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Interactive header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-600 p-2 rounded-lg">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{content.title}</h2>
              <p className="text-sm text-slate-400">{content.description}</p>
            </div>
          </div>

          {isCompleted && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Calculator interface */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input section */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              Input Parameters
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Average Monthly Bill ($)
                </label>
                <input
                  type="number"
                  value={inputs.monthlyBill}
                  onChange={(e) => handleInputChange('monthlyBill', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Available Roof Area (sq ft)
                </label>
                <input
                  type="number"
                  value={inputs.roofArea}
                  onChange={(e) => handleInputChange('roofArea', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  System Size (kW)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.systemSize}
                  onChange={(e) => handleInputChange('systemSize', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  ~80 sq ft per kW. Your roof can fit: {Math.floor(inputs.roofArea / 80)} kW
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Installation Cost ($)
                </label>
                <input
                  type="number"
                  value={inputs.installCost}
                  onChange={(e) => handleInputChange('installCost', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Typical: $2,500/kW = ${inputs.systemSize * 2500} for {inputs.systemSize}kW system
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Province
                </label>
                <select
                  value={inputs.province}
                  onChange={(e) => handleInputChange('province', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="AB">Alberta</option>
                  <option value="BC">British Columbia</option>
                  <option value="SK">Saskatchewan</option>
                  <option value="MB">Manitoba</option>
                  <option value="ON">Ontario</option>
                </select>
              </div>

              <button
                onClick={() => setShowResults(true)}
                className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <TrendingUp className="h-5 w-5" />
                Calculate ROI
              </button>
            </div>
          </div>

          {/* Results section */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Results & Analysis
            </h3>

            {!showResults ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <Calculator className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Enter your parameters and click Calculate to see results</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Annual production */}
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Annual Energy Production</div>
                  <div className="text-3xl font-bold text-cyan-400">
                    {results?.annualProduction} kWh
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {inputs.systemSize}kW × 1200 kWh/kW (Alberta avg)
                  </div>
                </div>

                {/* Annual savings */}
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Annual Cost Savings</div>
                  <div className="text-3xl font-bold text-green-400">
                    ${results?.annualSavings}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    @ $0.12/kWh (Alberta average rate)
                  </div>
                </div>

                {/* Payback period */}
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Simple Payback Period</div>
                  <div className="text-3xl font-bold text-purple-400">
                    {results?.paybackPeriod} years
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    ${inputs.installCost} ÷ ${results?.annualSavings}/year
                  </div>
                </div>

                {/* Lifetime savings */}
                <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-lg p-4 border border-green-700/50">
                  <div className="text-sm text-green-300 mb-1">25-Year Lifetime Savings</div>
                  <div className="text-3xl font-bold text-green-400">
                    ${results?.lifetimeSavings}
                  </div>
                  <div className="text-xs text-green-300/70 mt-1">
                    After installation cost recovery
                  </div>
                </div>

                {/* Environmental impact */}
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Annual CO₂ Offset</div>
                  <div className="text-3xl font-bold text-emerald-400">
                    {results?.co2Offset} kg
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Equivalent to planting {Math.round(parseFloat(results?.co2Offset || '0') / 20)} trees/year
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-cyan-300 mb-2">💡 Recommendations</h4>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {parseFloat(results?.paybackPeriod || '0') < 10 && (
                      <li>✓ Excellent payback period for Alberta!</li>
                    )}
                    {parseFloat(results?.paybackPeriod || '0') > 15 && (
                      <li>⚠ Consider waiting for installation costs to drop</li>
                    )}
                    <li>• Apply for Canada Greener Homes Grant (up to $5,000)</li>
                    <li>• Check Alberta Solar Program ($0.75/W rebate)</li>
                    <li>• Get 3 quotes from certified installers</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete button */}
      {!isCompleted && showResults && (
        <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Explored the calculator? Mark this module as complete.
            </p>
            <button
              onClick={onComplete}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Mark as Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
