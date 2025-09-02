/**
 * Data Exporter Component
 * 
 * Provides data export functionality in JSON and CSV formats.
 */

import React, { useState } from 'react';
import { Download, FileText, Database, Loader } from 'lucide-react';
import type { EnergyDataManager, DatasetType } from '../lib/dataManager';

interface DataExporterProps {
  datasetKey: DatasetType;
  dataManager: EnergyDataManager;
}

type ExportFormat = 'json' | 'csv';

export const DataExporter: React.FC<DataExporterProps> = ({
  datasetKey,
  dataManager
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setShowDropdown(false);
    
    try {
      dataManager.downloadData(datasetKey, format);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const getDataCount = () => {
    const data = dataManager.getCachedData(datasetKey);
    return data ? data.length : 0;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const estimateSize = (format: ExportFormat) => {
    const data = dataManager.getCachedData(datasetKey);
    if (!data || data.length === 0) return '0 B';
    
    try {
      const exportString = dataManager.exportData(datasetKey, format);
      return formatBytes(new Blob([exportString]).size);
    } catch {
      return '~ unknown';
    }
  };

  const dataCount = getDataCount();
  const hasData = dataCount > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={!hasData || isExporting}
        className={`
          flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
          ${hasData && !isExporting
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }
        `}
      >
        {isExporting ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && hasData && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
            <div className="p-3 border-b border-slate-200">
              <div className="text-sm font-medium text-slate-800">Export Options</div>
              <div className="text-xs text-slate-500 mt-1">
                {dataCount.toLocaleString()} records available
              </div>
            </div>
            
            <div className="p-2">
              <button
                onClick={() => handleExport('json')}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded">
                    <Database className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">JSON Format</div>
                    <div className="text-xs text-slate-500">Structured data format</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {estimateSize('json')}
                </div>
              </button>
              
              <button
                onClick={() => handleExport('csv')}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded">
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">CSV Format</div>
                    <div className="text-xs text-slate-500">Spreadsheet compatible</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {estimateSize('csv')}
                </div>
              </button>
            </div>
            
            <div className="p-3 border-t border-slate-200 text-xs text-slate-500">
              Files will be downloaded with timestamp in filename
            </div>
          </div>
        </>
      )}
    </div>
  );
};
