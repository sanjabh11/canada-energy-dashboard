/**
 * Help Button Template
 * 
 * Reusable help content for all dashboards
 * Provides consistent help experience across the application
 */

import React from 'react';
import { HelpCircle } from 'lucide-react';

export interface HelpContent {
  title: string;
  description: string;
  dataSources: string[];
  methodology: string;
  limitations: string[];
  provenanceLegend: {
    label: string;
    description: string;
  }[];
}

export const HELP_CONTENT: Record<string, HelpContent> = {
  'dashboard.realtime': {
    title: 'Real-Time Dashboard',
    description: 'Live electricity demand, generation mix, and grid status across Canadian provinces.',
    dataSources: [
      'IESO (Independent Electricity System Operator) - Ontario demand and prices',
      'AESO (Alberta Electric System Operator) - Alberta supply and prices',
      'Analytics API - Provincial generation aggregates',
      'Open-Meteo - Weather data for correlations'
    ],
    methodology: 'Data refreshed every 5 minutes from ISO feeds. Generation mix aggregated over 2-day rolling window. CO2 calculated using NRCan emission factors.',
    limitations: [
      'Real-time data may have 5-10 minute delay',
      'Weather correlations are indicative (not causal)',
      'Generation mix shows aggregate, not instantaneous capacity'
    ],
    provenanceLegend: [
      { label: 'Real-Time 🟢', description: 'Live streaming data from grid operator' },
      { label: 'Historical 📊', description: 'Public historical data from ISO archives' },
      { label: 'Indicative 💡', description: 'Proxy values based on typical patterns' }
    ]
  },
  'dashboard.forecast': {
    title: 'Renewable Forecasts',
    description: 'Solar and wind generation forecasts with accuracy metrics and baseline comparisons.',
    dataSources: [
      'Open-Meteo - Weather forecasts (temperature, cloud cover, wind speed)',
      'ECCC (Environment Canada) - Calibration data for short horizons',
      'Forecast Performance Metrics - Historical accuracy tracking'
    ],
    methodology: 'Physics-informed forecasting using weather data. Calibrated by ECCC observations for 1-12h horizons. Baseline is persistence forecast (current value projected forward).',
    limitations: [
      'Accuracy degrades with horizon length',
      'Long horizons (24h+) have wider confidence intervals',
      'Calibration only available for provinces with ECCC stations'
    ],
    provenanceLegend: [
      { label: 'Calibrated ✅', description: 'Real data with quality calibration from ECCC' },
      { label: 'Historical 📊', description: 'Public historical performance data' },
      { label: 'Forecast 🔮', description: 'Predicted values with confidence intervals' }
    ]
  },
  'dashboard.curtailment': {
    title: 'Curtailment Analytics',
    description: 'Renewable curtailment events, AI recommendations, and avoided cost calculations.',
    dataSources: [
      'Curtailment Events DB - Detected oversupply and negative pricing events',
      'Grid Optimization API - AI-generated mitigation recommendations',
      'Province Configs - Economic parameters and thresholds'
    ],
    methodology: 'Events detected when renewable generation reduction exceeds threshold MW or prices go negative. Recommendations ranked by expected reduction and confidence. ROI calculated using provincial price profiles.',
    limitations: [
      'Detection thresholds are conservative (may miss minor events)',
      'Cost savings are estimates based on indicative prices',
      'Recommendations assume perfect implementation'
    ],
    provenanceLegend: [
      { label: 'Historical 📊', description: 'Actual curtailment events from archives' },
      { label: 'Real-Time 🟢', description: 'Live curtailment risk monitoring' },
      { label: 'Forecast 🔮', description: 'Predicted curtailment based on forecasts' }
    ]
  },
  'dashboard.storage': {
    title: 'Storage Dispatch',
    description: 'Battery storage optimization for curtailment mitigation and renewable absorption.',
    dataSources: [
      'Batteries State DB - Current SoC and capacity',
      'Storage Dispatch Logs - Historical charge/discharge decisions',
      'Storage Dispatch API - Real-time optimization engine'
    ],
    methodology: 'Rule-based dispatch: charge during oversupply/negative prices, discharge during peaks. SoC maintained between 20-80% for battery health. Alignment % measures renewable absorption.',
    limitations: [
      'Assumes single representative battery per province',
      'Revenue estimates use indicative prices',
      'Does not account for transmission constraints'
    ],
    provenanceLegend: [
      { label: 'Real-Time 🟢', description: 'Live battery state and dispatch decisions' },
      { label: 'Historical 📊', description: 'Past dispatch logs and performance' }
    ]
  },
  'dashboard.analytics': {
    title: 'Analytics & Trends',
    description: '30-day historical trends, weather correlations, and renewable penetration heatmaps.',
    dataSources: [
      'Analytics API - Aggregated 30-day trends',
      'Weather Data - Temperature, cloud cover, wind speed',
      'Provincial Generation - Historical generation by source'
    ],
    methodology: 'Rolling 30-day windows for trend analysis. Pearson correlation for weather relationships. Days with <95% completeness filtered from headline charts.',
    limitations: [
      'Correlations are not causation',
      'Heatmaps use mock data pending real-time API',
      'Weather data may have gaps in remote areas'
    ],
    provenanceLegend: [
      { label: 'Historical 📊', description: 'Public historical data from ISO archives' },
      { label: 'Calibrated ✅', description: 'Weather data calibrated by ECCC' }
    ]
  }
};

interface HelpButtonWithContentProps {
  dashboardId: keyof typeof HELP_CONTENT;
  className?: string;
}

export const HelpButtonWithContent: React.FC<HelpButtonWithContentProps> = ({
  dashboardId,
  className = ''
}) => {
  const [showHelp, setShowHelp] = React.useState(false);
  const content = HELP_CONTENT[dashboardId];

  if (!content) return null;

  return (
    <>
      <button
        onClick={() => setShowHelp(true)}
        className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
        aria-label="Show help"
      >
        <HelpCircle size={20} className="text-gray-600" />
      </button>

      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close help"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">How to Read This Page</h3>
                <p className="text-gray-700">{content.description}</p>
              </div>

              {/* Data Sources */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Sources</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {content.dataSources.map((source, i) => (
                    <li key={i}>{source}</li>
                  ))}
                </ul>
              </div>

              {/* Methodology */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Methodology</h3>
                <p className="text-gray-700">{content.methodology}</p>
              </div>

              {/* Limitations */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Limitations & Caveats</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {content.limitations.map((limitation, i) => (
                    <li key={i}>{limitation}</li>
                  ))}
                </ul>
              </div>

              {/* Provenance Legend */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Quality Legend</h3>
                <div className="space-y-2">
                  {content.provenanceLegend.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-medium text-gray-900 min-w-[140px]">{item.label}</span>
                      <span className="text-gray-700">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accessibility */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Accessibility</h3>
                <p className="text-sm text-gray-600">
                  Use Tab to navigate, Enter to activate buttons, Escape to close dialogs. 
                  All charts include ARIA labels and keyboard navigation support.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpButtonWithContent;
