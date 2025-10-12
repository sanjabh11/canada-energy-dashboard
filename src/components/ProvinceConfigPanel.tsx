/**
 * Province Configuration Panel
 * 
 * Displays province-specific configuration and economics:
 * - Reserve margin %
 * - Indicative price profiles
 * - Curtailment detection thresholds
 * - Methods tooltip
 */

import React from 'react';
import { MapPin, DollarSign, AlertTriangle, Info } from 'lucide-react';

interface ProvinceConfig {
  code: string;
  name: string;
  reserve_margin_pct: number;
  price_profile: {
    off_peak: number;
    mid_peak: number;
    on_peak: number;
  };
  curtailment_threshold_mw: number;
  negative_price_threshold: number;
}

const PROVINCE_CONFIGS: Record<string, ProvinceConfig> = {
  'ON': {
    code: 'ON',
    name: 'Ontario',
    reserve_margin_pct: 18.5,
    price_profile: { off_peak: 8.2, mid_peak: 11.3, on_peak: 15.1 },
    curtailment_threshold_mw: 500,
    negative_price_threshold: -5
  },
  'AB': {
    code: 'AB',
    name: 'Alberta',
    reserve_margin_pct: 22.3,
    price_profile: { off_peak: 45, mid_peak: 75, on_peak: 120 },
    curtailment_threshold_mw: 400,
    negative_price_threshold: 0
  },
  'BC': {
    code: 'BC',
    name: 'British Columbia',
    reserve_margin_pct: 25.1,
    price_profile: { off_peak: 6.5, mid_peak: 8.0, on_peak: 10.5 },
    curtailment_threshold_mw: 300,
    negative_price_threshold: -10
  },
  'QC': {
    code: 'QC',
    name: 'Quebec',
    reserve_margin_pct: 28.7,
    price_profile: { off_peak: 5.8, mid_peak: 7.2, on_peak: 9.3 },
    curtailment_threshold_mw: 600,
    negative_price_threshold: -8
  }
};

interface ProvinceConfigPanelProps {
  province?: string;
  showMethods?: boolean;
}

export const ProvinceConfigPanel: React.FC<ProvinceConfigPanelProps> = ({
  province = 'ON',
  showMethods = true
}) => {
  const config = PROVINCE_CONFIGS[province] || PROVINCE_CONFIGS['ON'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <MapPin className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {config.name} Configuration
              </h2>
              <p className="text-sm text-gray-500">Economics & curtailment parameters</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Reserve Margin */}
        <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-green-600" size={20} />
            <span className="font-semibold text-gray-900">Reserve Margin</span>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-1">
            {config.reserve_margin_pct.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">
            Excess capacity above peak demand
          </div>
        </div>

        {/* Price Profile */}
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="text-blue-600" size={20} />
            <span className="font-semibold text-gray-900">Indicative Price Profile</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-gray-600 mb-1">Off-Peak</div>
              <div className="font-bold text-blue-600">
                ${config.price_profile.off_peak.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">¢/kWh</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Mid-Peak</div>
              <div className="font-bold text-blue-600">
                ${config.price_profile.mid_peak.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">¢/kWh</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">On-Peak</div>
              <div className="font-bold text-blue-600">
                ${config.price_profile.on_peak.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">¢/kWh</div>
            </div>
          </div>
        </div>

        {/* Curtailment Thresholds */}
        <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-orange-600" size={20} />
            <span className="font-semibold text-gray-900">Detection Thresholds</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Curtailment (MW):</span>
              <span className="font-semibold text-gray-900">
                {config.curtailment_threshold_mw} MW
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Negative Price:</span>
              <span className="font-semibold text-gray-900">
                ${config.negative_price_threshold}/MWh
              </span>
            </div>
          </div>
        </div>

        {/* Methods Explanation */}
        {showMethods && (
          <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="text-indigo-600 mt-0.5 flex-shrink-0" size={16} />
              <div className="text-xs text-indigo-800">
                <div className="font-semibold mb-2">Curtailment Economics</div>
                <p className="mb-2">
                  <strong>Reserve Margin:</strong> When surplus exceeds this threshold, curtailment risk increases. 
                  Higher margins indicate better grid reliability but potential renewable curtailment.
                </p>
                <p className="mb-2">
                  <strong>Price Profiles:</strong> Indicative time-of-use pricing used to calculate curtailment costs 
                  and storage arbitrage opportunities. Based on provincial rate structures.
                </p>
                <p>
                  <strong>Detection Thresholds:</strong> Curtailment events flagged when renewable generation reduction 
                  exceeds threshold MW or prices go negative below threshold. Conservative values avoid false positives.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Time Zone Notice */}
      <div className="border-t border-gray-200 p-3 bg-gray-50 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Time Zone:</span>
          <span className="font-medium">
            {config.code === 'ON' || config.code === 'QC' ? 'EST/EDT' : 
             config.code === 'AB' ? 'MST/MDT' : 
             config.code === 'BC' ? 'PST/PDT' : 'Local'}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          All timestamps displayed in {config.code === 'ON' || config.code === 'QC' ? 'Eastern' : 
                                       config.code === 'AB' ? 'Mountain' : 
                                       config.code === 'BC' ? 'Pacific' : 'local'} time
        </div>
      </div>
    </div>
  );
};

export default ProvinceConfigPanel;
