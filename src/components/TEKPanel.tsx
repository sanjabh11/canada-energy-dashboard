import React, { useState, useEffect } from 'react';
import { tekRepositoryService, TEKEntry, TEKDashboardData } from '../lib/tekRepository';
import { MapPin, Users, Globe, Calendar, Leaf, Filter } from 'lucide-react';

interface TEKPanelProps {
  territory?: string;
  nation?: string;
  compact?: boolean;
  onTEKSelect?: (tekEntry: TEKEntry) => void;
}

export const TEKPanel: React.FC<TEKPanelProps> = ({
  territory,
  nation,
  compact = false,
  onTEKSelect
}) => {
  const [tekData, setTEkData] = useState<TEKDashboardData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTEKData();
  }, []);

  const loadTEKData = async () => {
    try {
      setLoading(true);
      const data = tekRepositoryService.getDashboardData();
      setTEkData(data);
    } catch (error) {
      console.error('Error loading TEK data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSeason = (season: string) => {
    return season.charAt(0).toUpperCase() + season.slice(1);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vegetation': return '🌱';
      case 'wildlife': return '🦌';
      case 'water': return '💧';
      case 'weather': return '⛅';
      case 'seasons': return '🍁';
      case 'healing': return '🌿';
      case 'food': return '🍓';
      case 'materials': return '🪵';
      default: return '📚';
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'restricted': return 'bg-yellow-100 text-yellow-800';
      case 'sacred': return 'bg-purple-100 text-purple-800';
      case 'confidential': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!tekData) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <Leaf className="h-8 w-8 mr-2" />
        <span>Traditional Ecological Knowledge data is loading...</span>
      </div>
    );
  }

  // Get filtered entries based on territory or nation filters
  let displayEntries = tekRepositoryService.getAllTEKEntries();

  if (territory) {
    displayEntries = tekRepositoryService.getTEKEntriesByTerritory(territory);
  } else if (nation) {
    displayEntries = tekRepositoryService.getTEKEntriesByNation(nation);
  }

  // Apply category filter if selected
  if (selectedCategory !== 'all') {
    displayEntries = displayEntries.filter(entry => entry.category === selectedCategory);
  }

  // Apply search query filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    displayEntries = displayEntries.filter(entry =>
      entry.title.toLowerCase().includes(query) ||
      entry.description.toLowerCase().includes(query) ||
      entry.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-green-900">
            Traditional Knowledge
          </h3>
          <div className="flex items-center space-x-2">
            <Leaf className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">
              {displayEntries.length} entries
            </span>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-xl font-bold text-green-600">
              {tekData.seasonalInsights.currentSeason === 'summer' ? '❄️' :
               tekData.seasonalInsights.currentSeason === 'fall' ? '🍁' :
               tekData.seasonalInsights.currentSeason === 'winter' ? '🌽' : '🌸'}
            </div>
            <div className="text-sm text-gray-600">
              {formatSeason(tekData.seasonalInsights.currentSeason)}
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl mb-1">
              {tekData.seasonalInsights.relevantKnowledge.length > 0 ? '✅' : '⚠️'}
            </div>
            <div className="text-sm text-gray-600">
              Seasonal Knowledge
            </div>
          </div>
        </div>

        {/* Recent entries preview */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Recent Knowledge</h4>
          {displayEntries.slice(0, 3).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => onTEKSelect?.(entry)}
            >
              <div className="flex items-center space-x-2">
                <span>{getCategoryIcon(entry.category)}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900 truncate max-w-32">
                    {entry.title}
                  </div>
                  <div className="text-xs text-gray-600">
                    {entry.indigenousNation}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(entry.recordedDate).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-3 rounded-xl">
              <Leaf className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-green-900">
                Traditional Ecological Knowledge
              </h2>
              <p className="text-sm text-green-700">
                Indigenous ecological knowledge and seasonal wisdom
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {tekData.summary.totalEntries}
            </div>
            <div className="text-sm text-gray-600">
              Total Knowledge Entries
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Dashboard Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Nations</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {tekData.summary.nationsRepresented}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Leaf className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Categories</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {Object.keys(tekData.summary.categories).length}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">Territories</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {tekData.territorialDistribution.length}
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-900">Current Season</span>
            </div>
            <div className="text-xl font-bold text-orange-600">
              {formatSeason(tekData.seasonalInsights.currentSeason)}
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search traditional knowledge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Categories</option>
            {Object.keys(tekData.summary.categories).map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)} ({tekData.summary.categories[category]})
              </option>
            ))}
          </select>
        </div>

        {/* Seasonal Insights */}
        {tekData.seasonalInsights.relevantKnowledge.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-900 mb-3 flex items-center">
              <span className="mr-2">🌟</span>
              Current Season Knowledge ({formatSeason(tekData.seasonalInsights.currentSeason)})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-yellow-800 mb-2">Relevant Traditional Knowledge</h4>
                {tekData.seasonalInsights.relevantKnowledge.map((entry) => (
                  <div key={entry.id} className="mb-2 p-2 bg-white rounded-md">
                    <div className="flex items-center space-x-2 mb-1">
                      <span>{getCategoryIcon(entry.category)}</span>
                      <span className="font-medium text-gray-900">{entry.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{entry.description}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-medium text-yellow-800 mb-2">Community Recommendations</h4>
                <ul className="space-y-1">
                  {tekData.seasonalInsights.communityRecommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Entries Grid */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">
            Knowledge Entries ({displayEntries.length})
          </h3>

          {displayEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Leaf className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No traditional knowledge entries found matching your criteria.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => onTEKSelect?.(entry)}
                >
                  {/* Header */}
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">{getCategoryIcon(entry.category)}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{entry.title}</h4>
                      <p className="text-sm text-gray-600">{entry.indigenousNation}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getAccessLevelColor(entry.accessLevel)}`}>
                      {entry.accessLevel}
                    </span>
                  </div>

                  {/* Traditional Name */}
                  <p className="text-green-700 font-medium itic text-sm mb-2">
                    "{entry.traditionalName}"
                  </p>

                  {/* Description */}
                  <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                    {entry.description}
                  </p>

                  {/* Territory */}
                  <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                    <MapPin className="h-3 w-3" />
                    <span>{entry.territory}</span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {entry.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                    {entry.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{entry.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Recording Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{entry.knowledgeTransmission?.replace('_', ' ')}</span>
                    <span>{new Date(entry.recordedDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};