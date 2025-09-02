/**
 * Provincial Generation Data Manager Component
 * 
 * This component provides a UI for managing provincial generation data
 * with streaming capabilities and fallback handling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { provincialGenerationRepo, type ProvincialGenerationRecord } from '../lib/provincialGenerationStreamer';

interface DataManagerProps {
  onDataLoaded?: (data: ProvincialGenerationRecord[]) => void;
  className?: string;
}

interface LoadingState {
  isLoading: boolean;
  progress: number;
  stage: string;
  error: string | null;
}

export const ProvincialGenerationDataManager: React.FC<DataManagerProps> = ({
  onDataLoaded,
  className = ''
}) => {
  const [data, setData] = useState<ProvincialGenerationRecord[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    stage: '',
    error: null
  });

  const [stats, setStats] = useState({
    totalRecords: 0,
    dateRange: '',
    provinces: [] as string[],
    generationTypes: [] as string[],
    source: '' as 'kaggle' | 'fallback' | '',
    lastUpdated: null as Date | null
  });

  // Calculate stats from data
  const calculateStats = useCallback((records: ProvincialGenerationRecord[]) => {
    if (records.length === 0) return;

    const dates = records.map(r => r.date).sort();
    const provinces = [...new Set(records.map(r => r.province))].sort();
    const generationTypes = [...new Set(records.map(r => r.generation_type))].sort();
    const source = records[0]?.source || '';
    const lastUpdated = records[0]?.ingested_at || null;

    setStats({
      totalRecords: records.length,
      dateRange: `${dates[0]} to ${dates[dates.length - 1]}`,
      provinces,
      generationTypes,
      source,
      lastUpdated
    });
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (forceStream = false) => {
    setLoadingState({
      isLoading: true,
      progress: 0,
      stage: 'Initializing...',
      error: null
    });

    try {
      const records = await provincialGenerationRepo.loadData({
        forceStream,
        maxRows: 5000,
        onProgress: ({ loaded, total, percentage }) => {
          setLoadingState(prev => ({
            ...prev,
            progress: percentage,
            stage: `Loading data: ${loaded.toLocaleString()} / ${total.toLocaleString()} rows`
          }));
        }
      });

      setData(records);
      calculateStats(records);
      onDataLoaded?.(records);

      setLoadingState({
        isLoading: false,
        progress: 100,
        stage: 'Complete',
        error: null
      });

    } catch (error) {
      console.error('Failed to load provincial generation data:', error);
      setLoadingState({
        isLoading: false,
        progress: 0,
        stage: 'Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const refreshData = () => {
    provincialGenerationRepo.refresh({ forceStream: true })
      .then(records => {
        setData(records);
        calculateStats(records);
        onDataLoaded?.(records);
      })
      .catch(error => {
        console.error('Failed to refresh data:', error);
        setLoadingState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Refresh failed'
        }));
      });
  };

  const clearCache = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ceipDb) {
        await (window as any).ceipDb.provincial_generation.clear();
        setData([]);
        setStats({
          totalRecords: 0,
          dateRange: '',
          provinces: [],
          generationTypes: [],
          source: '',
          lastUpdated: null
        });
        console.log('Cache cleared');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  return (
    <div className={`provincial-generation-manager ${className}`}>
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h3 className="text-lg font-semibold mb-4">Provincial Generation Data</h3>
        
        {/* Stats Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 rounded p-3">
            <div className="text-sm text-blue-600 font-medium">Total Records</div>
            <div className="text-xl font-bold text-blue-800">
              {stats.totalRecords.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-green-50 rounded p-3">
            <div className="text-sm text-green-600 font-medium">Date Range</div>
            <div className="text-sm font-bold text-green-800">
              {stats.dateRange || 'N/A'}
            </div>
          </div>
          
          <div className="bg-purple-50 rounded p-3">
            <div className="text-sm text-purple-600 font-medium">Provinces</div>
            <div className="text-xl font-bold text-purple-800">
              {stats.provinces.length}
            </div>
          </div>
          
          <div className="bg-orange-50 rounded p-3">
            <div className="text-sm text-orange-600 font-medium">Generation Types</div>
            <div className="text-xl font-bold text-orange-800">
              {stats.generationTypes.length}
            </div>
          </div>
        </div>

        {/* Source and Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              stats.source === 'kaggle' 
                ? 'bg-green-100 text-green-800' 
                : stats.source === 'fallback'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {stats.source === 'kaggle' && '🌊 Live Stream'}
              {stats.source === 'fallback' && '📁 Fallback Data'}
              {!stats.source && '❓ No Data'}
            </span>
            
            {stats.lastUpdated && (
              <span className="text-xs text-gray-500">
                Updated: {stats.lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Loading Progress */}
        {loadingState.isLoading && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{loadingState.stage}</span>
              <span>{loadingState.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingState.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {loadingState.error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <div className="text-red-800 text-sm">
              <strong>Error:</strong> {loadingState.error}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadData(false)}
            disabled={loadingState.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingState.isLoading ? 'Loading...' : 'Load Data'}
          </button>
          
          <button
            onClick={() => loadData(true)}
            disabled={loadingState.isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Force Stream
          </button>
          
          <button
            onClick={refreshData}
            disabled={loadingState.isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refresh
          </button>
          
          <button
            onClick={clearCache}
            disabled={loadingState.isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Cache
          </button>
        </div>

        {/* Quick Preview */}
        {data.length > 0 && (
          <div className="mt-4">
            <details className="cursor-pointer">
              <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                Preview Data ({data.length} records)
              </summary>
              <div className="mt-2 text-xs bg-gray-50 rounded p-2 overflow-auto max-h-40">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-1">Date</th>
                      <th className="text-left p-1">Province</th>
                      <th className="text-left p-1">Type</th>
                      <th className="text-left p-1">MWh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 5).map((record, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1">{record.date}</td>
                        <td className="p-1">{record.province}</td>
                        <td className="p-1">{record.generation_type}</td>
                        <td className="p-1">{record.megawatt_hours.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.length > 5 && (
                  <div className="text-center mt-2 text-gray-500">
                    ... and {data.length - 5} more records
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProvincialGenerationDataManager;
