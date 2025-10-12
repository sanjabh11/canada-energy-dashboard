/**
 * Methodology Tooltip Component
 * 
 * Displays calculation methodology for financial and performance metrics.
 * Provides transparency on:
 * - Formulas used
 * - Data sources
 * - Assumptions made
 * - Sensitivity ranges
 */

import React, { useState } from 'react';
import { Info, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface MethodologyTooltipProps {
  title: string;
  formula: string;
  source: string;
  period: string;
  assumptions: string[];
  sensitivity?: {
    low: number;
    median: number;
    high: number;
    unit?: string;
  };
  className?: string;
}

export const MethodologyTooltip: React.FC<MethodologyTooltipProps> = ({
  title,
  formula,
  source,
  period,
  assumptions,
  sensitivity,
  className = ''
}) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className={`relative inline-block ${className}`}>
      <button
        className="text-blue-600 hover:text-blue-800 transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
        aria-label={`Show methodology for ${title}`}
      >
        <Info size={16} />
      </button>
      
      {show && (
        <div className="absolute z-50 w-96 p-4 bg-white border border-gray-300 rounded-lg shadow-2xl left-0 top-6 transform transition-all">
          <div className="font-semibold text-lg mb-3 text-gray-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" />
            {title}
          </div>
          
          <div className="space-y-3 text-sm">
            {/* Formula */}
            <div>
              <div className="font-medium text-gray-700 mb-1">Formula:</div>
              <div className="font-mono text-xs bg-gray-100 p-2 rounded border border-gray-200">
                {formula}
              </div>
            </div>
            
            {/* Data Source */}
            <div>
              <div className="font-medium text-gray-700 mb-1">Data Source:</div>
              <div className="text-gray-600">{source}</div>
            </div>
            
            {/* Time Period */}
            <div>
              <div className="font-medium text-gray-700 mb-1">Period:</div>
              <div className="text-gray-600">{period}</div>
            </div>
            
            {/* Assumptions */}
            <div>
              <div className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                <AlertCircle size={14} />
                Assumptions:
              </div>
              <ul className="list-disc ml-5 space-y-1 text-gray-600">
                {assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            
            {/* Sensitivity Range */}
            {sensitivity && (
              <div className="pt-2 border-t border-gray-200">
                <div className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <DollarSign size={14} />
                  Sensitivity Range:
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-red-50 p-2 rounded text-center">
                    <div className="text-gray-600">Low (-20%)</div>
                    <div className="font-semibold text-red-700">
                      {sensitivity.unit === '$' ? '$' : ''}
                      {sensitivity.low.toLocaleString()}
                      {sensitivity.unit && sensitivity.unit !== '$' ? sensitivity.unit : ''}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-center">
                    <div className="text-gray-600">Median</div>
                    <div className="font-semibold text-blue-700">
                      {sensitivity.unit === '$' ? '$' : ''}
                      {sensitivity.median.toLocaleString()}
                      {sensitivity.unit && sensitivity.unit !== '$' ? sensitivity.unit : ''}
                    </div>
                  </div>
                  <div className="bg-green-50 p-2 rounded text-center">
                    <div className="text-gray-600">High (+20%)</div>
                    <div className="font-semibold text-green-700">
                      {sensitivity.unit === '$' ? '$' : ''}
                      {sensitivity.high.toLocaleString()}
                      {sensitivity.unit && sensitivity.unit !== '$' ? sensitivity.unit : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Common methodology configurations for reuse
 */
export const commonMethodologies = {
  opportunityCost: {
    title: "Opportunity Cost Calculation",
    formula: "Opportunity Cost = Curtailed MWh × Average HOEP",
    source: "HOEP Indicative Curve (Ontario IESO)",
    period: "30-day rolling average",
    assumptions: [
      "Reserve margin: 15%",
      "Dispatch efficiency: 95%",
      "Transmission losses: 5%",
      "Market clearing price used as proxy"
    ]
  },
  
  forecastMAE: {
    title: "Forecast Accuracy (MAE)",
    formula: "MAE = (1/n) × Σ|Actual - Predicted|",
    source: "Real-time generation data + forecast models",
    period: "30-day rolling window",
    assumptions: [
      "Hour-ahead predictions",
      "Weather data from Environment Canada",
      "Persistence baseline for comparison",
      "Sample size n ≥ 720 (30 days × 24 hours)"
    ]
  },
  
  storageRevenue: {
    title: "Storage Arbitrage Revenue",
    formula: "Revenue = Σ(Discharge MWh × Peak Price - Charge MWh × Off-Peak Price)",
    source: "HOEP real-time pricing + dispatch logs",
    period: "Monthly aggregation",
    assumptions: [
      "Round-trip efficiency: 85%",
      "Degradation factor: 0.05% per cycle",
      "O&M costs excluded",
      "Perfect foresight not assumed"
    ]
  },
  
  curtailmentReduction: {
    title: "Curtailment Reduction",
    formula: "Reduction % = (MWh Saved / Total MWh Curtailed) × 100",
    source: "Curtailment events + implemented recommendations",
    period: "Monthly tracking",
    assumptions: [
      "Only implemented recommendations counted",
      "Baseline = no intervention scenario",
      "Weather-normalized where applicable",
      "Grid constraints considered"
    ]
  }
};

/**
 * Quick methodology badge for inline display
 */
export const MethodologyBadge: React.FC<{
  methodologyKey: keyof typeof commonMethodologies;
  value: number;
  unit?: string;
}> = ({ methodologyKey, value, unit = '' }) => {
  const config = commonMethodologies[methodologyKey];
  
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-semibold">
        {unit === '$' ? '$' : ''}
        {value.toLocaleString()}
        {unit && unit !== '$' ? unit : ''}
      </span>
      <MethodologyTooltip
        {...config}
        sensitivity={
          unit === '$' ? {
            low: Math.round(value * 0.8),
            median: Math.round(value),
            high: Math.round(value * 1.2),
            unit: '$'
          } : undefined
        }
      />
    </span>
  );
};
