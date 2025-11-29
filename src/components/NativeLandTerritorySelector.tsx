import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Loader, AlertCircle, Check, X, Globe } from 'lucide-react';
import { 
  searchTerritories, 
  getTerritoriesAtPoint, 
  getCanadianTerritories,
  type TerritorySearchResult 
} from '../lib/nativeLandApi';

interface NativeLandTerritorySelectorProps {
  onSelect: (territory: TerritorySearchResult | null) => void;
  selectedTerritory?: TerritorySearchResult | null;
  projectLocation?: { lat: number; lng: number } | null;
  className?: string;
  label?: string;
  required?: boolean;
}

/**
 * Territory selector component that integrates with Native Land Digital API
 * Allows users to search for and select traditional territories
 */
export function NativeLandTerritorySelector({
  onSelect,
  selectedTerritory,
  projectLocation,
  className = '',
  label = 'Traditional Territory',
  required = false
}: NativeLandTerritorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TerritorySearchResult[]>([]);
  const [suggestedTerritories, setSuggestedTerritories] = useState<TerritorySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Load suggested territories based on project location
  useEffect(() => {
    if (projectLocation) {
      loadSuggestedTerritories(projectLocation.lat, projectLocation.lng);
    }
  }, [projectLocation]);

  async function loadSuggestedTerritories(lat: number, lng: number) {
    setLoadingSuggestions(true);
    try {
      const territories = await getTerritoriesAtPoint(lat, lng);
      setSuggestedTerritories(territories);
      
      // Auto-select if only one territory matches
      if (territories.length === 1 && !selectedTerritory) {
        onSelect(territories[0]);
      }
    } catch (err) {
      console.error('Error loading suggested territories:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await searchTerritories(query);
      setSearchResults(results);
      
      if (results.length === 0) {
        setError('No territories found. Try a different search term.');
      }
    } catch (err) {
      setError('Failed to search territories. Please try again.');
      console.error('Territory search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  function handleSelectTerritory(territory: TerritorySearchResult) {
    onSelect(territory);
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }

  function handleClear() {
    onSelect(null);
    setSearchQuery('');
    setSearchResults([]);
  }

  return (
    <div className={`native-land-selector ${className}`}>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      {/* Selected Territory Display */}
      {selectedTerritory ? (
        <div className="flex items-center justify-between p-3 bg-emerald-900/30 border border-emerald-600 rounded-lg">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: selectedTerritory.color || '#8B4513' }}
            />
            <div>
              <div className="font-medium text-emerald-300">{selectedTerritory.name}</div>
              {selectedTerritory.frenchName && (
                <div className="text-xs text-emerald-400/70">{selectedTerritory.frenchName}</div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-emerald-400 hover:text-emerald-300 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search for a traditional territory..."
              className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {loading && (
              <Loader className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400 animate-spin" />
            )}
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-80 overflow-y-auto">
              {/* Suggested Territories (based on location) */}
              {showSuggestions && suggestedTerritories.length > 0 && !searchQuery && (
                <div className="p-2 border-b border-slate-700">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400">
                    <MapPin className="h-3 w-3" />
                    <span>Territories at project location</span>
                  </div>
                  {suggestedTerritories.map((territory) => (
                    <button
                      key={territory.id}
                      type="button"
                      onClick={() => handleSelectTerritory(territory)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700 rounded-lg transition-colors text-left"
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: territory.color || '#8B4513' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{territory.name}</div>
                        {territory.frenchName && (
                          <div className="text-xs text-slate-400 truncate">{territory.frenchName}</div>
                        )}
                      </div>
                      <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Loading Suggestions */}
              {loadingSuggestions && !searchQuery && (
                <div className="p-4 text-center text-slate-400">
                  <Loader className="h-5 w-5 animate-spin mx-auto mb-2" />
                  <span className="text-sm">Loading territories at location...</span>
                </div>
              )}

              {/* Search Results */}
              {searchQuery && searchResults.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400">
                    <Globe className="h-3 w-3" />
                    <span>Search results</span>
                  </div>
                  {searchResults.map((territory) => (
                    <button
                      key={territory.id}
                      type="button"
                      onClick={() => handleSelectTerritory(territory)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700 rounded-lg transition-colors text-left"
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: territory.color || '#8B4513' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{territory.name}</div>
                        {territory.frenchName && (
                          <div className="text-xs text-slate-400 truncate">{territory.frenchName}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="p-4 text-center">
                  <AlertCircle className="h-5 w-5 text-amber-400 mx-auto mb-2" />
                  <span className="text-sm text-amber-300">{error}</span>
                </div>
              )}

              {/* Empty State */}
              {!loading && !loadingSuggestions && !error && searchQuery && searchResults.length === 0 && (
                <div className="p-4 text-center text-slate-400">
                  <span className="text-sm">No territories found for "{searchQuery}"</span>
                </div>
              )}

              {/* Help Text */}
              {!searchQuery && suggestedTerritories.length === 0 && !loadingSuggestions && (
                <div className="p-4 text-center text-slate-400">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Start typing to search for a traditional territory
                  </p>
                  <p className="text-xs mt-1 text-slate-500">
                    Data provided by Native Land Digital
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Attribution */}
      <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
        <Globe className="h-3 w-3" />
        <span>Territory data from </span>
        <a 
          href="https://native-land.ca" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline"
        >
          Native Land Digital
        </a>
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default NativeLandTerritorySelector;
