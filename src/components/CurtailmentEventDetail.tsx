/**
 * Curtailment Event Detail Component
 * 
 * Displays per-event recommendation impact:
 * - Event details with historical provenance
 * - Recommendations and their impact
 * - Avoided MWh and cost savings
 * - ROI calculation
 */

import React from 'react';
import { AlertTriangle, TrendingDown, DollarSign, CheckCircle, Clock, Download } from 'lucide-react';
import { DataQualityBadge } from './DataQualityBadge';
import { MethodologyTooltip } from './MethodologyTooltip';

interface CurtailmentEvent {
  id: string;
  occurred_at: string;
  province: string;
  total_energy_curtailed_mwh: number;
  market_price_cad_per_mwh: number;
  opportunity_cost_cad: number;
  reason: string;
  data_source: 'historical' | 'real-time' | 'validated';
  recommendations?: Recommendation[];
}

interface Recommendation {
  id: string;
  strategy: string;
  description: string;
  estimated_mwh_saved: number;
  estimated_cost_cad: number;
  implemented: boolean;
  actual_mwh_saved?: number;
  actual_cost_cad?: number;
  roi_percent?: number;
  implementation_date?: string;
}

interface CurtailmentEventDetailProps {
  event: CurtailmentEvent;
  onDownload?: () => void;
}

export const CurtailmentEventDetail: React.FC<CurtailmentEventDetailProps> = ({
  event,
  onDownload
}) => {
  const implementedRecs = event.recommendations?.filter(r => r.implemented) || [];
  const totalSaved = implementedRecs.reduce((sum, r) => sum + (r.actual_mwh_saved || 0), 0);
  const totalRevenue = implementedRecs.reduce((sum, r) => sum + (r.actual_mwh_saved || 0) * event.market_price_cad_per_mwh, 0);
  const totalCost = implementedRecs.reduce((sum, r) => sum + (r.actual_cost_cad || 0), 0);
  const netSavings = totalRevenue - totalCost;
  const avgROI = implementedRecs.length > 0 
    ? implementedRecs.reduce((sum, r) => sum + (r.roi_percent || 0), 0) / implementedRecs.length 
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b-2 border-red-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl border-2 border-red-200">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Curtailment Event</h3>
              <p className="text-sm text-gray-600">
                {new Date(event.occurred_at).toLocaleString()} • {event.province}
              </p>
            </div>
          </div>

          <DataQualityBadge
            provenance={{
              type: event.data_source === 'historical' ? 'historical_archive' : 'real_stream',
              source: 'curtailment_events',
              timestamp: event.occurred_at,
              confidence: 1,
              completeness: 1
            }}
            showDetails={true}
          />
        </div>

        {/* Event Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border-2 border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="text-red-600" size={20} />
              <span className="text-sm font-medium text-gray-700">Curtailed</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {event.total_energy_curtailed_mwh.toFixed(1)} MWh
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-orange-600" size={20} />
              <span className="text-sm font-medium text-gray-700">Opportunity Cost</span>
              <MethodologyTooltip
                title="Opportunity Cost"
                formula="Curtailed MWh × Market Price"
                source="HOEP (Ontario IESO)"
                period="Real-time pricing"
                assumptions={[
                  'Market clearing price used',
                  'No transmission constraints',
                  'Perfect dispatch assumed'
                ]}
              />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              ${event.opportunity_cost_cad.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-green-600" size={20} />
              <span className="text-sm font-medium text-gray-700">Saved</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {totalSaved.toFixed(1)} MWh
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {((totalSaved / event.total_energy_curtailed_mwh) * 100).toFixed(1)}% of curtailment
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-blue-600" size={20} />
              <span className="text-sm font-medium text-gray-700">Net Savings</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              ${netSavings.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {avgROI.toFixed(0)}% avg ROI
            </div>
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="p-6 border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Event Details</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Reason:</span>
            <span className="ml-2 font-medium text-gray-900">{event.reason}</span>
          </div>
          <div>
            <span className="text-gray-600">Market Price:</span>
            <span className="ml-2 font-medium text-gray-900">
              ${event.market_price_cad_per_mwh.toFixed(2)}/MWh
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">
            Recommendations ({event.recommendations?.length || 0})
          </h4>
          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              <Download size={16} />
              Download Report
            </button>
          )}
        </div>

        {event.recommendations && event.recommendations.length > 0 ? (
          <div className="space-y-3">
            {event.recommendations.map((rec, idx) => (
              <div
                key={rec.id}
                className={`border-2 rounded-lg p-4 ${
                  rec.implemented 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        #{idx + 1}: {rec.strategy}
                      </span>
                      {rec.implemented && (
                        <span className="px-2 py-0.5 bg-green-200 text-green-900 text-xs font-medium rounded">
                          Implemented
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{rec.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Estimated</div>
                    <div className="font-semibold text-gray-900">
                      {rec.estimated_mwh_saved.toFixed(1)} MWh
                    </div>
                  </div>
                  
                  {rec.implemented && rec.actual_mwh_saved !== undefined && (
                    <>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Actual</div>
                        <div className="font-semibold text-green-700">
                          {rec.actual_mwh_saved.toFixed(1)} MWh
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Revenue</div>
                        <div className="font-semibold text-blue-700">
                          ${(rec.actual_mwh_saved * event.market_price_cad_per_mwh).toLocaleString()}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-600 mb-1">ROI</div>
                        <div className="font-semibold text-purple-700">
                          {rec.roi_percent?.toFixed(0)}%
                        </div>
                      </div>
                    </>
                  )}
                  
                  {!rec.implemented && (
                    <div className="col-span-3">
                      <div className="text-xs text-gray-600 mb-1">Potential Revenue</div>
                      <div className="font-semibold text-gray-700">
                        ${(rec.estimated_mwh_saved * event.market_price_cad_per_mwh).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {rec.implemented && rec.implementation_date && (
                  <div className="mt-2 pt-2 border-t border-green-200 flex items-center gap-1 text-xs text-green-800">
                    <Clock size={12} />
                    <span>Implemented: {new Date(rec.implementation_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
            <p>No recommendations available for this event</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Monthly Summary Export Function
 */
export const exportMonthlySummary = (events: CurtailmentEvent[]) => {
  const totalCurtailed = events.reduce((sum, e) => sum + e.total_energy_curtailed_mwh, 0);
  const totalOpportunityCost = events.reduce((sum, e) => sum + e.opportunity_cost_cad, 0);
  
  const allRecs = events.flatMap(e => e.recommendations || []);
  const implementedRecs = allRecs.filter(r => r.implemented);
  const totalSaved = implementedRecs.reduce((sum, r) => sum + (r.actual_mwh_saved || 0), 0);
  const totalRevenue = implementedRecs.reduce((sum, r) => {
    const event = events.find(e => e.recommendations?.some(rec => rec.id === r.id));
    return sum + (r.actual_mwh_saved || 0) * (event?.market_price_cad_per_mwh || 0);
  }, 0);

  const csv = [
    ['Curtailment Monthly Summary'],
    ['Period', `${events[0]?.occurred_at || ''} to ${events[events.length - 1]?.occurred_at || ''}`],
    [''],
    ['Metric', 'Value'],
    ['Total Events', events.length],
    ['Total Curtailed (MWh)', totalCurtailed.toFixed(2)],
    ['Total Opportunity Cost (CAD)', totalOpportunityCost.toFixed(2)],
    ['Total Saved (MWh)', totalSaved.toFixed(2)],
    ['Total Revenue (CAD)', totalRevenue.toFixed(2)],
    ['Reduction %', ((totalSaved / totalCurtailed) * 100).toFixed(2)],
    [''],
    ['Event Details'],
    ['Date', 'Province', 'Curtailed (MWh)', 'Opportunity Cost (CAD)', 'Saved (MWh)', 'Recommendations'],
    ...events.map(e => [
      new Date(e.occurred_at).toLocaleDateString(),
      e.province,
      e.total_energy_curtailed_mwh.toFixed(2),
      e.opportunity_cost_cad.toFixed(2),
      (e.recommendations?.filter(r => r.implemented).reduce((sum, r) => sum + (r.actual_mwh_saved || 0), 0) || 0).toFixed(2),
      e.recommendations?.length || 0
    ])
  ];

  const csvContent = csv.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `curtailment-summary-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
