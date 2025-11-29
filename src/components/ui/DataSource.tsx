/**
 * DataSource Component
 * 
 * Reusable component for displaying inline data citations on dashboard tiles.
 * Addresses Gap #1: Evidence & Citations (HIGH Priority)
 * 
 * Usage:
 * <DataSource 
 *   url="https://ieso.ca/data/demand"
 *   dataset="IESO Demand Data"
 *   date="2025-11-29"
 *   version="Q3-2025"
 * />
 */

import React, { useState } from 'react';
import { ExternalLink, Info, Database, Calendar, Tag } from 'lucide-react';

export interface DataSourceProps {
  /** URL to the data source */
  url?: string;
  /** Name of the dataset */
  dataset: string;
  /** Date of the data (ISO format or display string) */
  date?: string;
  /** Version identifier */
  version?: string;
  /** Optional description */
  description?: string;
  /** Compact mode for tight spaces */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function DataSource({
  url,
  dataset,
  date,
  version,
  description,
  compact = false,
  className = ''
}: DataSourceProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Format date for display
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 cursor-help relative ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Database className="h-3 w-3" />
        <span>{dataset}</span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 min-w-48">
            <div className="text-xs text-slate-300">
              <p className="font-medium text-white mb-1">{dataset}</p>
              {formattedDate && (
                <p className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formattedDate}
                </p>
              )}
              {version && (
                <p className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {version}
                </p>
              )}
              {description && <p className="mt-1 text-slate-400">{description}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 bg-slate-800/50 border border-slate-700 rounded text-xs ${className}`}
    >
      <Info className="h-3 w-3 text-blue-400 flex-shrink-0" />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-slate-300">
          <strong className="text-slate-200">Source:</strong> {dataset}
        </span>
        {formattedDate && (
          <span className="text-slate-400 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formattedDate}
          </span>
        )}
        {version && (
          <span className="text-slate-400 flex items-center gap-1">
            <Tag className="h-3 w-3" />
            v{version}
          </span>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View source
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * DataSourceBadge - Minimal inline badge for space-constrained areas
 */
export function DataSourceBadge({
  dataset,
  url,
  className = ''
}: Pick<DataSourceProps, 'dataset' | 'url' | 'className'>) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/50 rounded text-[10px] text-slate-400 ${className}`}
    >
      <Database className="h-2.5 w-2.5" />
      {dataset}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-400"
        >
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
    </span>
  );
}

/**
 * Predefined data sources for common Canadian energy datasets
 */
export const COMMON_DATA_SOURCES = {
  IESO_DEMAND: {
    dataset: 'IESO Demand Data',
    url: 'https://www.ieso.ca/en/Power-Data',
    description: 'Independent Electricity System Operator real-time demand'
  },
  IESO_PRICE: {
    dataset: 'IESO Market Price',
    url: 'https://www.ieso.ca/en/Power-Data/Price-Overview',
    description: 'Hourly Ontario Energy Price (HOEP)'
  },
  AESO_DEMAND: {
    dataset: 'AESO Grid Data',
    url: 'https://www.aeso.ca/grid/current-supply-demand/',
    description: 'Alberta Electric System Operator real-time grid data'
  },
  ECCC_EMISSIONS: {
    dataset: 'ECCC GHG Inventory',
    url: 'https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions.html',
    description: 'Environment and Climate Change Canada emissions data'
  },
  CER_COMPLIANCE: {
    dataset: 'CER Compliance Data',
    url: 'https://www.cer-rec.gc.ca/en/safety-environment/industry-performance/',
    description: 'Canada Energy Regulator compliance records'
  },
  NPRI: {
    dataset: 'NPRI Facility Emissions',
    url: 'https://www.canada.ca/en/environment-climate-change/services/national-pollutant-release-inventory.html',
    description: 'National Pollutant Release Inventory'
  },
  NRCAN_HYDROGEN: {
    dataset: 'NRCan Hydrogen Strategy',
    url: 'https://natural-resources.canada.ca/climate-change/hydrogen-strategy',
    description: 'Natural Resources Canada hydrogen economy data'
  },
  PATHWAYS_ALLIANCE: {
    dataset: 'Pathways Alliance CCUS',
    url: 'https://pathwaysalliance.ca/',
    description: 'Pathways Alliance carbon capture data'
  },
  MSCI_ESG: {
    dataset: 'MSCI ESG Ratings',
    url: 'https://www.msci.com/our-solutions/esg-investing',
    description: 'MSCI ESG ratings and scores'
  },
  SUSTAINALYTICS: {
    dataset: 'Sustainalytics Risk',
    url: 'https://www.sustainalytics.com/',
    description: 'Sustainalytics ESG risk ratings'
  }
} as const;

export default DataSource;
