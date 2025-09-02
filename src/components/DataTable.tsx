/**
 * Data Table Component
 * 
 * Displays data in a sortable, paginated table format.
 */

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DatasetType } from '../lib/dataManager';

interface DataTableProps {
  data: any[];
  datasetType: DatasetType;
  maxRows?: number;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

const ROWS_PER_PAGE = 25;

export const DataTable: React.FC<DataTableProps> = ({
  data,
  datasetType,
  maxRows = 1000
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const [currentPage, setCurrentPage] = useState(1);

  // Get column definitions based on dataset type
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    
    const sample = data[0];
    const allKeys = Object.keys(sample);
    
    // Define column order and display names for each dataset
    switch (datasetType) {
      case 'provincial_generation':
        return [
          { key: 'date', label: 'Date', type: 'string' },
          { key: 'province', label: 'Province', type: 'string' },
          { key: 'producer', label: 'Producer', type: 'string' },
          { key: 'generation_type', label: 'Generation Type', type: 'string' },
          { key: 'megawatt_hours', label: 'MWh', type: 'number' },
          { key: 'source', label: 'Source', type: 'string' }
        ].filter(col => allKeys.includes(col.key));
      
      case 'ontario_demand':
        return [
          { key: 'datetime', label: 'Date & Time', type: 'datetime' },
          { key: 'hour_ending', label: 'Hour', type: 'number' },
          { key: 'total_demand_mw', label: 'Demand (MW)', type: 'number' },
          { key: 'hourly_demand_gwh', label: 'Demand (GWh)', type: 'number' },
          { key: 'source', label: 'Source', type: 'string' }
        ].filter(col => allKeys.includes(col.key));
      
      case 'ontario_prices':
        return [
          { key: 'datetime', label: 'Date & Time', type: 'datetime' },
          { key: 'node_name', label: 'Node', type: 'string' },
          { key: 'zone', label: 'Zone', type: 'string' },
          { key: 'lmp_price', label: 'LMP Price ($)', type: 'currency' },
          { key: 'energy_price', label: 'Energy Price ($)', type: 'currency' },
          { key: 'congestion_price', label: 'Congestion ($)', type: 'currency' },
          { key: 'source', label: 'Source', type: 'string' }
        ].filter(col => allKeys.includes(col.key));
      
      case 'hf_electricity_demand':
        return [
          { key: 'datetime', label: 'Date & Time', type: 'datetime' },
          { key: 'household_id', label: 'Household', type: 'string' },
          { key: 'electricity_demand', label: 'Demand (kWh)', type: 'number' },
          { key: 'temperature', label: 'Temperature (°C)', type: 'number' },
          { key: 'humidity', label: 'Humidity (%)', type: 'number' },
          { key: 'location', label: 'Location', type: 'string' },
          { key: 'source', label: 'Source', type: 'string' }
        ].filter(col => allKeys.includes(col.key));
      
      default:
        return allKeys.slice(0, 10).map(key => ({ key, label: key, type: 'string' }));
    }
  }, [data, datasetType]);

  // Sort and paginate data
  const { sortedData, totalPages } = useMemo(() => {
    let sorted = [...data].slice(0, maxRows);
    
    // Apply sorting
    if (sortConfig.key && sortConfig.direction) {
      sorted.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        let result = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          result = aVal - bVal;
        } else {
          result = String(aVal).localeCompare(String(bVal));
        }
        
        return sortConfig.direction === 'desc' ? -result : result;
      });
    }
    
    const totalPages = Math.ceil(sorted.length / ROWS_PER_PAGE);
    
    return { sortedData: sorted, totalPages };
  }, [data, maxRows, sortConfig]);

  // Get current page data
  const currentPageData = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [sortedData, currentPage]);

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prevConfig.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key: '', direction: null };
    });
    setCurrentPage(1); // Reset to first page when sorting
  };

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value;
      case 'currency':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : value;
      case 'datetime':
        return new Date(value).toLocaleString();
      default:
        return String(value);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronUp className="h-4 w-4 text-slate-300" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-blue-600" />
      : <ChevronDown className="h-4 w-4 text-blue-600" />;
  };

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div>No data available to display</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map(column => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentPageData.map((row, index) => (
              <tr
                key={index}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                {columns.map(column => (
                  <td key={column.key} className="px-4 py-3 text-slate-700">
                    <div className="max-w-xs truncate" title={String(row[column.key] || '')}>
                      {formatValue(row[column.key], column.type)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg">
          <div className="text-sm text-slate-600">
            Showing {((currentPage - 1) * ROWS_PER_PAGE) + 1} to {Math.min(currentPage * ROWS_PER_PAGE, sortedData.length)} of {sortedData.length} rows
            {maxRows < data.length && (
              <span className="text-slate-500"> (limited from {data.length.toLocaleString()} total)</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`
                      px-3 py-1 text-sm rounded transition-colors
                      ${currentPage === pageNum 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                      }
                    `}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
