/**
 * Data Filters Component
 * 
 * Provides filtering and search functionality for energy datasets.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Filter, X } from 'lucide-react';
import type { DatasetType } from '../lib/dataManager';

interface FilterOptions {
  dateRange?: { start: string; end: string };
  searchQuery?: string;
  selectedFields?: Record<string, string[]>;
}

interface DataFiltersProps {
  data: any[];
  datasetType: DatasetType;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

export const DataFilters: React.FC<DataFiltersProps> = ({
  data,
  datasetType,
  filters,
  onFilterChange
}) => {
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');
  const [dateRange, setDateRange] = useState(filters.dateRange || { start: '', end: '' });
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>(filters.selectedFields || {});

  // Get filterable fields based on dataset type
  const filterableFields = useMemo(() => {
    if (data.length === 0) return {};
    
    const sample = data[0];
    const fields: Record<string, string[]> = {};
    
    switch (datasetType) {
      case 'provincial_generation':
        fields.province = [...new Set(data.map(row => row.province).filter(Boolean))];
        fields.producer = [...new Set(data.map(row => row.producer).filter(Boolean))];
        fields.generation_type = [...new Set(data.map(row => row.generation_type).filter(Boolean))];
        break;
      case 'ontario_demand':
        // Ontario demand doesn't have many categorical fields, focus on date range
        break;
      case 'ontario_prices':
        fields.zone = [...new Set(data.map(row => row.zone).filter(Boolean))];
        fields.node_name = [...new Set(data.map(row => row.node_name).filter(Boolean))].slice(0, 20); // Limit for UI
        break;
      case 'hf_electricity_demand':
        fields.location = [...new Set(data.map(row => row.location).filter(Boolean))];
        fields.household_id = [...new Set(data.map(row => row.household_id).filter(Boolean))].slice(0, 20); // Limit for UI
        break;
    }
    
    return fields;
  }, [data, datasetType]);

  // Get date range from data
  const dataDateRange = useMemo(() => {
    if (data.length === 0) return { min: '', max: '' };
    
    const dates = data.map(row => {
      const dateField = row.date || row.datetime || row.market_date;
      return dateField ? new Date(dateField).toISOString().split('T')[0] : null;
    }).filter(Boolean) as string[];
    
    if (dates.length === 0) return { min: '', max: '' };
    
    dates.sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [data]);

  // Update filters when local state changes
  useEffect(() => {
    const newFilters: FilterOptions = {};
    
    if (searchQuery.trim()) {
      newFilters.searchQuery = searchQuery.trim();
    }
    
    if (dateRange.start || dateRange.end) {
      newFilters.dateRange = dateRange;
    }
    
    if (Object.keys(selectedFields).length > 0) {
      const nonEmptyFields = Object.fromEntries(
        Object.entries(selectedFields).filter(([_, values]) => values.length > 0)
      );
      if (Object.keys(nonEmptyFields).length > 0) {
        newFilters.selectedFields = nonEmptyFields;
      }
    }
    
    onFilterChange(newFilters);
  }, [searchQuery, dateRange, selectedFields, onFilterChange]);

  const handleFieldChange = (field: string, value: string, checked: boolean) => {
    setSelectedFields(prev => {
      const current = prev[field] || [];
      if (checked) {
        return { ...prev, [field]: [...current, value] };
      } else {
        return { ...prev, [field]: current.filter(v => v !== value) };
      }
    });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setDateRange({ start: '', end: '' });
    setSelectedFields({});
  };

  const hasActiveFilters = searchQuery.trim() || dateRange.start || dateRange.end || 
    Object.values(selectedFields).some(values => values.length > 0);

  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search data..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Date Range */}
      {dataDateRange.min && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Date Range</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                min={dataDateRange.min}
                max={dataDateRange.max}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                min={dataDateRange.min}
                max={dataDateRange.max}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Field Filters */}
      {Object.entries(filterableFields).map(([field, values]) => (
        <div key={field} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700 capitalize">
                {field.replace('_', ' ')}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {selectedFields[field]?.length || 0} / {values.length}
            </span>
          </div>
          
          <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-50 rounded p-2">
            {values.slice(0, 50).map(value => (
              <label key={value} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={(selectedFields[field] || []).includes(value)}
                  onChange={(e) => handleFieldChange(field, value, e.target.checked)}
                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <span className="text-slate-700 truncate flex-1" title={value}>
                  {value}
                </span>
              </label>
            ))}
            {values.length > 50 && (
              <div className="text-xs text-slate-500 pt-1 border-t border-slate-200">
                ... and {values.length - 50} more
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
          <span>Clear All Filters</span>
        </button>
      )}

      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="text-xs text-slate-500 space-y-1">
          <div>Active filters:</div>
          {searchQuery.trim() && (
            <div>• Search: "{searchQuery}"</div>
          )}
          {(dateRange.start || dateRange.end) && (
            <div>• Date: {dateRange.start || '...'} to {dateRange.end || '...'}</div>
          )}
          {Object.entries(selectedFields).map(([field, values]) => (
            values.length > 0 && (
              <div key={field}>• {field}: {values.length} selected</div>
            )
          ))}
        </div>
      )}
    </div>
  );
};
