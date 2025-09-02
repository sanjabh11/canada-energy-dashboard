/**
 * Dataset Selector Component
 * 
 * Provides UI for selecting between different energy datasets
 * with visual status indicators.
 */

import React from 'react';
import { 
  Zap, 
  TrendingUp, 
  DollarSign, 
  Home,
  Check,
  AlertCircle,
  Loader,
  Database
} from 'lucide-react';
import type { DatasetInfo, DatasetType, ConnectionStatus } from '../lib/dataManager';

interface DatasetSelectorProps {
  datasets: DatasetInfo[];
  activeDataset: DatasetType;
  onDatasetChange: (dataset: DatasetType) => void;
  connectionStatuses: ConnectionStatus[];
}

const iconMap = {
  Zap,
  TrendingUp,
  DollarSign,
  Home,
  Database
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'connected':
      return <Check className="h-4 w-4 text-green-600" />;
    case 'connecting':
      return <Loader className="h-4 w-4 text-blue-600 animate-spin" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'fallback':
      return <Database className="h-4 w-4 text-orange-600" />;
    default:
      return <Database className="h-4 w-4 text-slate-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'connected':
      return 'border-green-200 bg-green-50';
    case 'connecting':
      return 'border-blue-200 bg-blue-50';
    case 'error':
      return 'border-red-200 bg-red-50';
    case 'fallback':
      return 'border-orange-200 bg-orange-50';
    default:
      return 'border-slate-200 bg-slate-50';
  }
};

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  datasets,
  activeDataset,
  onDatasetChange,
  connectionStatuses
}) => {
  return (
    <div className="p-4">
      <div className="space-y-3">
        {datasets.map((dataset) => {
          const Icon = iconMap[dataset.icon as keyof typeof iconMap] || Database;
          const status = connectionStatuses.find(s => s.dataset === dataset.name);
          const isActive = activeDataset === dataset.key;
          
          return (
            <button
              key={dataset.key}
              onClick={() => onDatasetChange(dataset.key)}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-all duration-200
                ${isActive 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${dataset.color}20`, color: dataset.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{dataset.name}</h4>
                    <p className="text-sm text-slate-500 capitalize">{dataset.source}</p>
                  </div>
                </div>
                <div className={`p-1 rounded-full border ${status ? getStatusColor(status.status) : 'border-slate-200 bg-slate-50'}`}>
                  {status ? getStatusIcon(status.status) : <Database className="h-4 w-4 text-slate-400" />}
                </div>
              </div>
              
              <p className="text-sm text-slate-600 mb-3">{dataset.description}</p>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  ~{dataset.estimatedRows.toLocaleString()} rows
                </span>
                {status && (
                  <span className={`
                    px-2 py-1 rounded-full font-medium
                    ${status.status === 'connected' ? 'bg-green-100 text-green-700' :
                      status.status === 'connecting' ? 'bg-blue-100 text-blue-700' :
                      status.status === 'error' ? 'bg-red-100 text-red-700' :
                      status.status === 'fallback' ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-700'
                    }
                  `}>
                    {status.recordCount.toLocaleString()} loaded
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
