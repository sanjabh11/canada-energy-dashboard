/**
 * Wind Forecast Status Component
 * 
 * Displays current status of wind forecasting capabilities.
 * Clarifies that platform is currently focused on solar (Phase 1)
 * with wind forecasting planned for Phase 2.
 */

import React from 'react';
import { Wind, Calendar, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export const WindForecastStatus: React.FC<{
  variant?: 'banner' | 'card' | 'inline';
}> = ({ variant = 'banner' }) => {
  
  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
        <Clock size={14} />
        <span>Wind forecasting: Q1 2026</span>
      </span>
    );
  }
  
  if (variant === 'card') {
    return (
      <div className="bg-white border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Wind size={20} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">Wind Forecasting</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-1">
                <Clock size={14} className="text-blue-600" />
                <span>Phase 2 Development - Launch Q1 2026</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Currently focused on solar (70% of Ontario renewable capacity)
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Banner variant (default)
  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-white rounded-full shadow-sm">
          <Wind size={24} className="text-blue-600" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-blue-900">Wind Forecasting Status</h3>
            <span className="px-2 py-0.5 bg-blue-200 text-blue-900 text-xs font-medium rounded">
              Phase 2 Development
            </span>
          </div>
          
          <p className="text-blue-800 mb-4">
            Wind forecasting is scheduled for Q1 2026 release. Our platform currently focuses on solar forecasting,
            which represents 70% of Ontario's renewable energy capacity.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <CheckCircle size={16} className="text-green-600" />
                Current Focus
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Solar forecasting (6 horizons)</li>
                <li>• MAE &lt;6% achieved</li>
                <li>• 85% confidence</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <TrendingUp size={16} className="text-blue-600" />
                Data Collection
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Wind data pipeline: Active</li>
                <li>• Historical backfill: In progress</li>
                <li>• Quality validation: Ongoing</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="text-purple-600" />
                Launch Timeline
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Model development: Q4 2025</li>
                <li>• Beta testing: Q1 2026</li>
                <li>• Production launch: Q1 2026</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>Why solar first?</strong> Solar forecasting covers the majority of renewable capacity in Ontario
              and has more consistent patterns. Wind forecasting presents additional complexity due to turbulence and
              terrain effects, requiring specialized models. We're applying the same rigorous methodology that achieved
              our solar MAE &lt;6% target.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Wind forecasting roadmap table
 */
export const WindForecastRoadmap: React.FC = () => {
  const milestones = [
    {
      phase: 'Q4 2025',
      status: 'in_progress',
      tasks: [
        'Historical wind data collection (2019-present)',
        'Data quality validation and cleaning',
        'Baseline model development',
        'Feature engineering (NWP integration)'
      ]
    },
    {
      phase: 'Q1 2026',
      status: 'planned',
      tasks: [
        'Advanced model training (ensemble methods)',
        'Multi-horizon forecasting (1h-48h)',
        'Beta testing with stakeholders',
        'Production deployment'
      ]
    },
    {
      phase: 'Q2 2026',
      status: 'planned',
      tasks: [
        'Performance optimization',
        'Cross-validation with other provinces',
        'Real-time forecast streaming',
        'Integration with grid optimization'
      ]
    }
  ];
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Wind size={20} className="text-blue-600" />
        Wind Forecasting Roadmap
      </h3>
      
      <div className="space-y-4">
        {milestones.map((milestone, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                ${milestone.status === 'in_progress' 
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' 
                  : 'bg-gray-100 text-gray-600 border-2 border-gray-300'}
              `}>
                {idx + 1}
              </div>
              {idx < milestones.length - 1 && (
                <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
              )}
            </div>
            
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-gray-900">{milestone.phase}</h4>
                <span className={`
                  px-2 py-0.5 text-xs font-medium rounded
                  ${milestone.status === 'in_progress' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'}
                `}>
                  {milestone.status === 'in_progress' ? 'In Progress' : 'Planned'}
                </span>
              </div>
              <ul className="space-y-1">
                {milestone.tasks.map((task, taskIdx) => (
                  <li key={taskIdx} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">→</span>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
