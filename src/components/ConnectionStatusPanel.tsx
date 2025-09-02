/**
 * Connection Status Panel Component
 * 
 * Displays real-time connection status for all datasets
 * with detailed status information.
 */

import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import type { ConnectionStatus, DatasetType } from '../lib/dataManager';

interface ConnectionStatusPanelProps {
  statuses: ConnectionStatus[];
  activeDataset: DatasetType;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'connected':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'connecting':
      return <Loader className="h-4 w-4 text-blue-600 animate-spin" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'fallback':
      return <Database className="h-4 w-4 text-orange-600" />;
    default:
      return <WifiOff className="h-4 w-4 text-slate-400" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'connected':
      return 'Live Stream';
    case 'connecting':
      return 'Connecting';
    case 'error':
      return 'Error';
    case 'fallback':
      return 'Fallback Data';
    default:
      return 'Unknown';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'connected':
      return 'text-green-700';
    case 'connecting':
      return 'text-blue-700';
    case 'error':
      return 'text-red-700';
    case 'fallback':
      return 'text-orange-700';
    default:
      return 'text-slate-700';
  }
};

export const ConnectionStatusPanel: React.FC<ConnectionStatusPanelProps> = ({
  statuses,
  activeDataset
}) => {
  const connectedCount = statuses.filter(s => s.status === 'connected').length;
  const totalCount = statuses.length;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            <Wifi className="h-5 w-5 mr-2 text-blue-600" />
            Connection Status
          </h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${
            connectedCount > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
          }`}>
            {connectedCount > 0 && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
            <span>{connectedCount}/{totalCount} Live</span>
          </div>
        </div>
        {connectedCount > 0 && (
          <div className="mt-2 text-xs text-green-600 font-medium">
            🟢 LIVE DATA STREAMING ACTIVE
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="space-y-3">
          {statuses.map((status, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(status.status)}
                <div>
                  <div className="font-medium text-slate-800">{status.dataset}</div>
                  <div className={`text-sm ${getStatusColor(status.status)}`}>
                    {getStatusText(status.status)}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium text-slate-700">
                  {status.recordCount.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">records</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Last Update Info */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center text-sm text-slate-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        
        {/* Error Details for Active Dataset */}
        {(() => {
          const activeStatus = statuses.find(s => 
            s.dataset.toLowerCase().replace(/\s+/g, '_') === activeDataset
          );
          
          if (activeStatus?.error) {
            return (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-800 text-sm">Connection Error</div>
                    <div className="text-xs text-red-600 mt-1">{activeStatus.error}</div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
};
