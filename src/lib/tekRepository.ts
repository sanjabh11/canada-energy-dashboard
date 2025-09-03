/**
 * Traditional Ecological Knowledge (TEK) Repository
 *
 * Comprehensive system for managing and displaying Indigenous traditional ecological knowledge
 * alongside scientific data for comprehensive environmental understanding.
 */

export interface TEKEntry {
  id: string;
  title: string;
  traditionalName: string;
  category: 'vegetation' | 'wildlife' | 'water' | 'weather' | 'seasons' | 'healing' | 'food' | 'materials';
  indigenousNation: string;
  territory: string;
  geographicCoordinates?: {
    latitude: number;
    longitude: number;
    radius_km: number;
  };

  // Knowledge content
  description: string;
  traditionalNotes: string;
  seasonalTiming: {
    optimal: string[];
    caution: string[];
    forbidden: string[];
  };

  // Cultural context
  significance: {
    cultural: string;
    spiritual: string;
    economic: string;
    ecological: string;
  };

  // Custodians and transmission
  primaryCustodians: string[];
  knowledgeTransmission: 'oral_tradition' | 'ceremony' | 'apprenticeship' | 'documentation';
  accessLevel: 'open' | 'restricted' | 'sacred' | 'confidential';

  // Scientific correlation
  scientificCorrelations: {
    species?: string[];
    ecologicalIndicators?: string[];
    climatePatterns?: string[];
    scientificNotes?: string;
  };

  // Media and references
  media: {
    images?: string[];
    audioRecordings?: string[];
    videos?: string[];
  };

  // Metadata
  recordedBy: string;
  recordedDate: string;
  recordedMethod: string;
  consentStatus: 'pending' | 'granted' | 'partial' | 'denied';
  lastVerified: string;
  tags: string[];
}

export interface TEKRepository {
  id: string;
  indigenousNation: string;
  territories: string[];
  custodian: string;
  contactInfo: {
    email: string;
    phone: string;
    alternate_contacts: string[];
  };
  totalEntries: number;
  categoriesCovered: string[];
  consentFramework: string;
  lastUpdated: string;
  accessPolicy: 'open' | 'limited' | 'closed';
}

export interface TEKStudyCorrelation {
  tekEntryId: string;
  scientificStudyId: string;
  correlationType: 'confirmation' | 'expansion' | 'contradiction' | 'complementary';
  scientificFindings: string;
  traditionalInsights: string;
  mashupDescription: string;
  validationStatus: 'proposed' | 'verified' | 'debatable';
}

export interface TEKDashboardData {
  summary: {
    totalEntries: number;
    nationsRepresented: number;
    categories: { [key: string]: number };
    accessLevels: { [key: string]: number };
  };
  recentAdditions: TEKEntry[];
  seasonalInsights: {
    currentSeason: string;
    relevantKnowledge: TEKEntry[];
    communityRecommendations: string[];
  };
  scientificCorrelations: TEKStudyCorrelation[];
  territorialDistribution: {
    territory: string;
    entries: number;
    uniqueCategories: string[];
  }[];
}

export class TEKRepositoryService {
  private static instance: TEKRepositoryService;
  private tekEntries = new Map<string, TEKEntry>();
  private repositoriesMap = new Map<string, TEKRepository>();
  private correlations = new Map<string, TEKStudyCorrelation>();

  private constructor() {
    this.initializeSampleData();
  }

  public static getInstance(): TEKRepositoryService {
    if (!TEKRepositoryService.instance) {
      TEKRepositoryService.instance = new TEKRepositoryService();
    }
    return TEKRepositoryService.instance;
  }

  /**
   * Add a new TEK entry to the repository
   */
  addTEKEntry(entry: TEKEntry): TEKEntry {
    const newEntry: TEKEntry = {
      ...entry,
      id: `tek_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.tekEntries.set(newEntry.id, newEntry);
    return newEntry;
  }

  /**
   * Get TEK entry by ID
   */
  getTEKEntry(id: string): TEKEntry | undefined {
    return this.tekEntries.get(id);
  }

  /**
   * Get TEK entries by category
   */
  getTEKEntriesByCategory(category: TEKEntry['category']): TEKEntry[] {
    return Array.from(this.tekEntries.values())
      .filter(entry => entry.category === category);
  }

  /**
   * Get TEK entries by Indigenous nation
   */
  getTEKEntriesByNation(nation: string): TEKEntry[] {
    return Array.from(this.tekEntries.values())
      .filter(entry => entry.indigenousNation === nation);
  }

  /**
   * Get TEK entries by territory
   */
  getTEKEntriesByTerritory(territory: string): TEKEntry[] {
    return Array.from(this.tekEntries.values())
      .filter(entry => entry.territory === territory);
  }

  /**
   * Get current seasonal TEK insights
   */
  getSeasonalInsights(): TEKEntry[] {
    const currentMonth = new Date().getMonth(); // 0-11

    // Define seasonal mappings (Northern Hemisphere)
    const seasonalMappings = {
      winter: [11, 0, 1, 2],      // Dec-Feb
      spring: [2, 3, 4, 5],       // Mar-May
      summer: [5, 6, 7, 8],       // Jun-Aug
      fall: [8, 9, 10, 11]        // Sep-Nov
    };

    const currentSeason = Object.entries(seasonalMappings).find(([_, months]) =>
      months.includes(currentMonth)
    )?.[0] || 'unknown';

    return Array.from(this.tekEntries.values())
      .filter(entry =>
        entry.seasonalTiming.optimal.includes(currentSeason) ||
        entry.seasonalTiming.caution.includes(currentSeason)
      )
      .slice(0, 5); // Return top 5 relevant entries
  }

  /**
   * Get TEK dashboard summary data
   */
  getDashboardData(): TEKDashboardData {
    const entries = Array.from(this.tekEntries.values());

    // Summary statistics
    const summary = {
      totalEntries: entries.length,
      nationsRepresented: new Set(entries.map(e => e.indigenousNation)).size,
      categories: entries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }),
      accessLevels: entries.reduce((acc, entry) => {
        acc[entry.accessLevel] = (acc[entry.accessLevel] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number })
    };

    // Territorial distribution
    const territorialDistribution = entries.reduce((acc, entry) => {
      const existing = acc.find(t => t.territory === entry.territory);
      if (existing) {
        existing.entries += 1;
        const categorySet = new Set(existing.uniqueCategories);
        categorySet.add(entry.category);
        existing.uniqueCategories = Array.from(categorySet);
      } else {
        acc.push({
          territory: entry.territory,
          entries: 1,
          uniqueCategories: [entry.category]
        });
      }
      return acc;
    }, [] as NonNullable<TEKDashboardData['territorialDistribution']>);

    const currentMonth = new Date().getMonth();
    const seasonalMappings = {
      winter: [11, 0, 1, 2],
      spring: [2, 3, 4, 5],
      summer: [5, 6, 7, 8],
      fall: [8, 9, 10, 11]
    };

    const currentSeason = Object.entries(seasonalMappings).find(([_, months]) =>
      months.includes(currentMonth)
    )?.[0] || 'unknown';

    const seasonalInsights = {
      currentSeason,
      relevantKnowledge: this.getSeasonalInsights(),
      communityRecommendations: [
        'Consult with elders about seasonal conditions',
        'Plan community activities according to traditional seasonal timing',
        'Respect seasonal restrictions for traditional territory access',
        'Share seasonal knowledge with youth and community members'
      ]
    };

    const recentAdditions = entries
      .sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime())
      .slice(0, 5);

    return {
      summary,
      recentAdditions,
      seasonalInsights,
      scientificCorrelations: Array.from(this.correlations.values()),
      territorialDistribution
    };
  }

  /**
   * Add scientific correlation
   */
  addScientificCorrelation(correlation: TEKStudyCorrelation): void {
    this.correlations.set(`${correlation.tekEntryId}_${correlation.scientificStudyId}`, correlation);
  }

  /**
   * Get TEK entries for geographic region
   */
  getTEKEntriesForRegion(latitude: number, longitude: number, radiusKm: number = 50): TEKEntry[] {
    return Array.from(this.tekEntries.values())
      .filter(entry => {
        if (!entry.geographicCoordinates) return false;

        // Calculate distance using Haversine formula (simplified)
        const { latitude: entryLat, longitude: entryLng, radius_km } = entry.geographicCoordinates;
        const latDiff = latitude - entryLat;
        const lngDiff = longitude - entryLng;
        const distance = Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111; // Rough km conversion

        return distance <= (radiusKm + radius_km);
      });
  }

  /**
   * Search TEK entries
   */
  searchTEKEntries(query: string, filters?: {
    category?: TEKEntry['category'][];
    nation?: string[];
    territory?: string[];
    accessLevel?: TEKEntry['accessLevel'][];
  }): TEKEntry[] {
    let results = Array.from(this.tekEntries.values());

    // Apply text search
    if (query.trim()) {
      const searchTerms = query.toLowerCase().split(' ');
      results = results.filter(entry =>
        searchTerms.some(term =>
          entry.title.toLowerCase().includes(term) ||
          entry.description.toLowerCase().includes(term) ||
          entry.traditionalNotes.toLowerCase().includes(term) ||
          entry.tags.some(tag => tag.toLowerCase().includes(term))
        )
      );
    }

    // Apply filters
    if (filters) {
      if (filters.category && filters.category.length > 0) {
        results = results.filter(entry => filters.category!.includes(entry.category));
      }
      if (filters.nation && filters.nation.length > 0) {
        results = results.filter(entry => filters.nation!.includes(entry.indigenousNation));
      }
      if (filters.territory && filters.territory.length > 0) {
        results = results.filter(entry => filters.territory!.includes(entry.territory));
      }
      if (filters.accessLevel && filters.accessLevel.length > 0) {
        results = results.filter(entry => filters.accessLevel!.includes(entry.accessLevel));
      }
    }

    return results;
  }

  /**
   * Export TEK data (with consent management)
   */
  exportTEKData(filters?: {
    categories?: TEKEntry['category'][];
    nations?: string[];
    territories?: string[];
  }): TEKEntry[] {
    let data = Array.from(this.tekEntries.values());

    // Only include entries with open access or granted consent
    data = data.filter(entry =>
      entry.accessLevel === 'open' &&
      (entry.consentStatus === 'granted' || entry.consentStatus === 'partial')
    );

    // Apply filters if provided
    if (filters) {
      if (filters.categories) {
        data = data.filter(entry => filters.categories!.includes(entry.category));
      }
      if (filters.nations) {
        data = data.filter(entry => filters.nations!.includes(entry.indigenousNation));
      }
      if (filters.territories) {
        data = data.filter(entry => filters.territories!.includes(entry.territory));
      }
    }

    return data;
  }

  /**
   * Initialize sample TEK data
   */
  private initializeSampleData(): void {
    const sampleTEKEntries: TEKEntry[] = [
      {
        id: 'tek_cree_berry_harvesting',
        title: 'Cree Berry Harvesting Knowledge',
        traditionalName: 'Kisâpâk winters',
        category: 'food',
        indigenousNation: 'Cree',
        territory: 'James Bay Territories',
        geographicCoordinates: {
          latitude: 53.2,
          longitude: -80.5,
          radius_km: 200
        },
        description: 'Traditional knowledge of blueberry harvesting patterns and medicinal uses of crowberries in Cree territories.',
        traditionalNotes: 'When the wildfires have passed and new green appears, the berries become ready. Always harvest with gratitude and leave some for wildlife.',
        seasonalTiming: {
          optimal: ['summer'],
          caution: ['spring', 'fall'],
          forbidden: ['winter']
        },
        significance: {
          cultural: 'Berries are central to Cree cultural ceremonies and daily life',
          spiritual: 'Berries represent the gifts of the Creator and connection to ancestors',
          economic: 'Traditional berry harvesting supported seasonal nomadic lifestyle',
          ecological: 'Berries indicate healthy forest ecosystems and clean water sources'
        },
        primaryCustodians: ['Elder Mary Johnson', 'Knowledge Keeper Thomas Bear'],
        knowledgeTransmission: 'oral_tradition',
        accessLevel: 'open',
        scientificCorrelations: {
          species: ['Vaccinium uliginosum', 'Empetrum nigrum'],
          ecologicalIndicators: ['Forest health', 'Air quality'],
          climatePatterns: ['Summer temperature trends'],
          scientificNotes: 'Cree observations confirm scientific data on berry phenology and climate change impacts'
        },
        media: {
          images: ['crowberries_01.jpg', 'harvesting_ceremony.jpg'],
          audioRecordings: ['elder_interview_berries.mp3']
        },
        recordedBy: 'Research Assistant Sarah Wilson',
        recordedDate: '2024-07-15',
        recordedMethod: 'Community interview with cultural consent protocol',
        consentStatus: 'granted',
        lastVerified: '2024-08-01',
        tags: ['berries', 'harvesting', 'traditional_food', 'mediciné', 'seasonal_indicators']
      },
      {
        id: 'tek_dene_caribou_migration',
        title: 'Dene Caribou Migration Patterns',
        traditionalName: 'Mọdzâ',
        category: 'wildlife',
        indigenousNation: 'Dene',
        territory: 'Northwest Territories',
        geographicCoordinates: {
          latitude: 63.0,
          longitude: -115.0,
          radius_km: 300
        },
        description: 'Ancient knowledge of barren-ground caribou migration routes, calving grounds, and hunting grounds in Dene territories.',
        traditionalNotes: 'When the moose start to gather bark in preparation for winter, the caribou are getting ready to return from giving birth.',
        seasonalTiming: {
          optimal: ['spring', 'summer'],
          caution: ['fall'],
          forbidden: []
        },
        significance: {
          cultural: 'Caribou are central to Dene identity and ceremonial life',
          spiritual: 'Caribou represent renewal and the life cycle',
          economic: 'Caribou provided food, hides, tools, and trade items',
          ecological: 'Migration patterns serve as climate and ecosystem health indicators'
        },
        primaryCustodians: ['Chief Daniel Dease', 'Elder Louise Norwegian'],
        knowledgeTransmission: 'ceremony',
        accessLevel: 'restricted',
        scientificCorrelations: {
          species: ['Rangifer tarandus groenlandicus'],
          ecologicalIndicators: ['Winter severity', 'Predator-prey relationships'],
          climatePatterns: ['Late spring weather patterns'],
          scientificNotes: 'Dene observations of migration timing changes align with climate warming trends'
        },
        media: {
          images: ['caribou_migration.jpg', 'traditional_hunting.jpg'],
          videos: ['migration_patterns_2023.mp4']
        },
        recordedBy: 'Dr. Indigenous Studies Program',
        recordedDate: '2024-06-10',
        recordedMethod: 'Community-led recording with feast and tobacco offerings',
        consentStatus: 'partial',
        lastVerified: '2024-07-20',
        tags: ['caribou', 'migration', 'hunting', 'climate_indicators', 'traditional_ecology']
      },
      {
        id: 'tek_inuit_sea_ice_knowledge',
        title: 'Inuit Sea Ice Observation and Safety',
        traditionalName: 'Siku',
        category: 'water',
        indigenousNation: 'Inuit',
        territory: 'Nunavut',
        geographicCoordinates: {
          latitude: 63.0,
          longitude: -95.0,
          radius_km: 500
        },
        description: 'Comprehensive knowledge of sea ice formation, travel safety, weather prediction, and hunting conditions.',
        traditionalNotes: 'When the ice turns black, it is dangerous to travel. Children are taught to look for the patterns in the ice from the beach.',
        seasonalTiming: {
          optimal: ['spring', 'fall'],
          caution: ['winter'],
          forbidden: ['summer']
        },
        significance: {
          cultural: 'Sea ice knowledge is essential for Inuit cultural survival and identity',
          spiritual: 'Ice is alive and sacred, with spirits that must be respected',
          economic: 'Safe ice travel enables hunting and gathering',
          ecological: 'Sea ice serves as early warning system for climate change'
        },
        primaryCustodians: ['Community Elder Joanasie Sioris', 'Inuit Knowledge Holder'],
        knowledgeTransmission: 'apprenticeship',
        accessLevel: 'sacred',
        scientificCorrelations: {
          ecologicalIndicators: ['Ocean warming', 'Storm frequency', 'Animal migration timing'],
          climatePatterns: ['Temperature trends', 'Wind patterns'],
          scientificNotes: 'Inuit observations of "black ice" correspond to scientific measurements of methane release from warming permafrost'
        },
        media: {
          images: ['sea_ice_patterns.jpg', 'travel_safety.jpg'],
          audioRecordings: ['ice_travel_observations.mp3']
        },
        recordedBy: 'Arctic Institute Research Team',
        recordedDate: '2024-05-08',
        recordedMethod: 'Qaujimajatuqanginnut (oral tradition sharing) with community consent',
        consentStatus: 'granted',
        lastVerified: '2024-06-15',
        tags: ['sea_ice', 'travel_safety', 'climate_change', 'hunting', 'weather_patterns']
      },
      {
        id: 'tek_métis_medicine_knowledge',
        title: 'Métis Medicinal Plant Knowledge',
        traditionalName: 'Plantes médicinales',
        category: 'healing',
        indigenousNation: 'Métis',
        territory: 'Manitoba',
        geographicCoordinates: {
          latitude: 51.0,
          longitude: -98.0,
          radius_km: 150
        },
        description: 'Knowledge of medicinal plants, their preparation methods, and traditional healing practices in Métis communities.',
        traditionalNotes: 'For healing the lungs, gather labrador tea when the flowers are blooming. Always give tobacco offering before harvesting.',
        seasonalTiming: {
          optimal: ['summer', 'fall'],
          caution: ['spring'],
          forbidden: []
        },
        significance: {
          cultural: 'Medicinal knowledge is central to Métis cultural identity and community health',
          spiritual: 'Plants have spirits and must be treated with respect and gratitude',
          economic: 'Traditional medicine practices support community health and wellness',
          ecological: 'Plant knowledge indicates ecological health and biodiversity'
        },
        primaryCustodians: ['Métis Elder Louise Campeau', 'Traditional Healer'],
        knowledgeTransmission: 'oral_tradition',
        accessLevel: 'open',
        scientificCorrelations: {
          species: ['Rhododendron groenlandicum', 'Achillea millefolium'],
          ecologicalIndicators: ['Biodiversity', 'Soil health'],
          scientificNotes: 'Métis plant knowledge includes pharmacological properties confirmed by modern medical research'
        },
        media: {
          images: ['medicinal_plants.jpg', 'medicine_gathering.jpg'],
          videos: ['healing_practices.mp4']
        },
        recordedBy: 'Métis Museum Research Department',
        recordedDate: '2024-08-20',
        recordedMethod: 'Community workshops with cultural protocol observance',
        consentStatus: 'granted',
        lastVerified: '2024-09-01',
        tags: ['medicinal_plants', 'traditional_medicine', 'healing', 'plant_knowledge', 'cultural_identity']
      },
      {
        id: 'tek_anisinaabe_fish_weirs',
        title: 'Anishinaabe Fish Weir Construction and Management',
        traditionalName: 'Giigidowewewin',
        category: 'food',
        indigenousNation: 'Anishinaabe',
        territory: 'Ontario Northwest',
        geographicCoordinates: {
          latitude: 48.0,
          longitude: -89.0,
          radius_km: 100
        },
        description: 'Traditional knowledge of fish weir construction using white spruce, placement along river systems, and sustainable harvesting practices.',
        traditionalNotes: 'Fish weirs are built in the fall when leaves turn color, placed where the current is strong but the water is deep. Always harvest respectfully.',
        seasonalTiming: {
          optimal: ['fall'],
          caution: ['summer'],
          forbidden: []
        },
        significance: {
          cultural: 'Fish weirs represent sophisticated engineering and community coordination',
          spiritual: 'Fish are relatives who must be treated with respect and gratitude',
          economic: 'Sustainable fishing sustains communities through lean times',
          ecological: 'Fish population health and water quality indicators'
        },
        primaryCustodians: ['Community Knowledge Keeper', 'Brandon Whitesky'],
        knowledgeTransmission: 'apprenticeship',
        accessLevel: 'open',
        scientificCorrelations: {
          species: ['Lake Whitefish', 'Lake Trout'],
          ecologicalIndicators: ['Water quality', 'Fish population health'],
          scientificNotes: 'Anishinaabe fish weir locations correspond to optimal fish migration routes documented in scientific studies'
        },
        media: {
          images: ['fish_weir_construction.jpg', 'traditional_fishing.jpg'],
          audioRecordings: ['weir_construction_song.mp3']
        },
        recordedBy: 'Onigaming First Nation Research Department',
        recordedDate: '2024-04-12',
        recordedMethod: 'Traditional apprenticeship documentation with protocol observance',
        consentStatus: 'granted',
        lastVerified: '2024-05-30',
        tags: ['fish_weirs', 'traditional_fishing', 'fish_management', 'sustainable_harvesting']
      }
    ];

    // Initialize TEK repositories
    const repositories: TEKRepository[] = [
      {
        id: 'ccla_tek',
        indigenousNation: 'Canadian Indigenous Knowledge Collective',
        territories: ['Ontario', 'Quebec', 'Manitoba', 'Saskatchewan'],
        custodian: 'Dr. Indigenous Knowledge Preservation Institute',
        contactInfo: {
          email: 'tek@ccla.ca',
          phone: '+1-800-TEK-KEEP',
          alternate_contacts: ['research@cloa.ca']
        },
        totalEntries: 5,
        categoriesCovered: ['food', 'wildlife', 'water', 'healing'],
        consentFramework: 'Standard Indigenous Data Sovereignty Framework v2.1',
        lastUpdated: '2024-09-01T10:00:00Z',
        accessPolicy: 'limited'
      }
    ];

    // Add sample data
    sampleTEKEntries.forEach(entry => this.tekEntries.set(entry.id, entry));
    repositories.forEach(repo => this.repositoriesMap.set(repo.id, repo));

    // Add sample correlations
    const correlations: TEKStudyCorrelation[] = [
      {
        tekEntryId: 'tek_inuit_sea_ice_knowledge',
        scientificStudyId: 'arctic_climate_2023_arctic_institute',
        correlationType: 'confirmation',
        scientificFindings: 'Rapid decline of multiyear sea ice threatens Inuit hunting and travel',
        traditionalInsights: 'Inuit observations of black ice conditions confirmed by satellite observations',
        mashupDescription: 'Combining Inuit Qaujimajatuqanginnut with NASA satellite data provides comprehensive picture of Arctic ice conditions',
        validationStatus: 'verified'
      }
    ];

    correlations.forEach(corr => this.addScientificCorrelation(corr));
  }

  /**
   * Get all TEK entries
   */
  getAllTEKEntries(): TEKEntry[] {
    return Array.from(this.tekEntries.values());
  }

  /**
   * Get TEK repositories
   */
  getRepositories(): TEKRepository[] {
    return Array.from(this.repositoriesMap.values());
  }
}

// Export singleton instance
export const tekRepositoryService = TEKRepositoryService.getInstance();