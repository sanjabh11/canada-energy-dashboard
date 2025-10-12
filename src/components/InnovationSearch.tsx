import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Lightbulb, Target, Zap, Eye, Briefcase, Clock, DollarSign, Users, Award } from 'lucide-react';
import { trlEngine, type TRLEvaluation, InnovationCategory } from '../lib/technologyReadiness';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../lib/config';

// Mock innovation data for demonstration
const mockInnovations = [
  {
    name: 'Hydrogen Blend Technology',
    description: 'Advanced hydrogen blending system for existing natural gas infrastructure',
    patentsFiled: 8,
    prototypesBuilt: 3,
    pilotProjects: 2,
    commercialDeployments: 1,
    regulatoryApprovals: ['CSA Approval', 'UL Certification'],
    fundingSecured: 4500000,
    publications: 12,
    certifications: ['ISO 9001', 'CSA Standards'],
    partnerships: 4,
    yearsOfDevelopment: 4
  },
  {
    name: 'AI Grid Optimizer',
    description: 'Machine learning system for predictive grid load balancing',
    patentsFiled: 5,
    prototypesBuilt: 2,
    pilotProjects: 3,
    commercialDeployments: 0,
    regulatoryApprovals: ['NERC Compliance'],
    fundingSecured: 3200000,
    publications: 8,
    certifications: ['ISO 27001'],
    partnerships: 2,
    yearsOfDevelopment: 3
  },
  {
    name: 'Carbon Capture Membrane',
    description: 'Next-generation membrane technology for industrial CO2 capture',
    patentsFiled: 12,
    prototypesBuilt: 4,
    pilotProjects: 1,
    commercialDeployments: 0,
    regulatoryApprovals: [],
    fundingSecured: 8500000,
    publications: 15,
    certifications: ['API 661', 'ASME Standards'],
    partnerships: 6,
    yearsOfDevelopment: 5
  },
  {
    name: 'Smart Battery Materials',
    description: 'Nanostructured materials for enhanced battery performance and lifespan',
    patentsFiled: 6,
    prototypesBuilt: 5,
    pilotProjects: 1,
    commercialDeployments: 2,
    regulatoryApprovals: ['UN Transport Test'],
    fundingSecured: 6200000,
    publications: 9,
    certifications: ['IEC 62619'],
    partnerships: 3,
    yearsOfDevelopment: 4
  },
  {
    name: 'Digital Twin Framework',
    description: 'Comprehensive digital twin platform for energy infrastructure management',
    patentsFiled: 3,
    prototypesBuilt: 1,
    pilotProjects: 2,
    commercialDeployments: 0,
    regulatoryApprovals: [],
    fundingSecured: 2900000,
    publications: 5,
    certifications: ['ISO 18435'],
    partnerships: 1,
    yearsOfDevelopment: 2
  }
];

const categories: InnovationCategory[] = [
  InnovationCategory.CLIMATE_TECH,
  InnovationCategory.ENERGY_STORAGE,
  InnovationCategory.RENEWABLE_ENERGY,
  InnovationCategory.GRID_MANAGEMENT,
  InnovationCategory.CARBON_CAPTURE,
  InnovationCategory.MATERIAL_SCIENCE,
  InnovationCategory.DIGITAL_TWINS,
  InnovationCategory.AI_ML,
  InnovationCategory.HYDROGEN_TECH
];

export const InnovationSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InnovationCategory | 'all'>('all');
  const [selectedInnovation, setSelectedInnovation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [innovations, setInnovations] = useState<any[]>([]);
  const [trlEvaluations, setTrlEvaluations] = useState<Map<string, TRLEvaluation>>(new Map());
  const [showPitchGeneration, setShowPitchGeneration] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState<string>('');

  // Load innovations from database
  useEffect(() => {
    const loadInnovations = async () => {
      setLoading(true);
      
      try {
        const { url, anonKey } = getSupabaseConfig();
        if (!url || !anonKey) {
          console.warn('Supabase not configured, using mock data');
          setInnovations(mockInnovations);
          await loadTRLEvaluationsForMock();
          setLoading(false);
          return;
        }

        const supabase = createClient(url, anonKey);
        
        // Fetch innovations from database
        const { data, error } = await supabase
          .from('innovations')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading innovations:', error);
          // Fallback to mock data
          setInnovations(mockInnovations);
          await loadTRLEvaluationsForMock();
        } else if (data && data.length > 0) {
          // Map database records to expected format
          const mappedInnovations = data.map(inn => ({
            id: inn.id,
            name: inn.name || 'Unnamed Innovation',
            description: inn.description || '',
            trl: inn.trl || 1,
            patentsFiled: 0, // Would need separate patents table
            prototypesBuilt: inn.trl >= 4 ? 1 : 0,
            pilotProjects: inn.trl >= 6 ? 1 : 0,
            commercialDeployments: inn.trl >= 8 ? 1 : 0,
            regulatoryApprovals: [],
            fundingSecured: 0,
            publications: 0,
            certifications: [],
            partnerships: 0,
            yearsOfDevelopment: 1
          }));
          
          setInnovations(mappedInnovations);
          await loadTRLEvaluations(mappedInnovations);
        } else {
          // No data in database, use mock
          console.info('No innovations in database, using mock data');
          setInnovations(mockInnovations);
          await loadTRLEvaluationsForMock();
        }
      } catch (error) {
        console.error('Failed to load innovations:', error);
        setInnovations(mockInnovations);
        await loadTRLEvaluationsForMock();
      }
      
      setLoading(false);
    };

    const loadTRLEvaluations = async (innovationsList: any[]) => {
      const evaluations = new Map<string, TRLEvaluation>();

      for (const innovation of innovationsList) {
        try {
          const category = getInnovationCategory(innovation);
          const evaluation = trlEngine.assessTechnologyReadiness(innovation, category);
          evaluations.set(innovation.name, evaluation);
        } catch (error) {
          console.error(`Error evaluating TRL for ${innovation.name}:`, error);
        }
      }

      setTrlEvaluations(evaluations);
    };

    const loadTRLEvaluationsForMock = async () => {
      await loadTRLEvaluations(mockInnovations);
    };

    loadInnovations();
  }, []);

  // Helper function to determine innovation category
  const getInnovationCategory = (innovation: any): InnovationCategory => {
    if (innovation.name.includes('Hydrogen')) return InnovationCategory.HYDROGEN_TECH;
    if (innovation.name.includes('AI')) return InnovationCategory.AI_ML;
    if (innovation.name.includes('Carbon')) return InnovationCategory.CARBON_CAPTURE;
    if (innovation.name.includes('Battery')) return InnovationCategory.ENERGY_STORAGE;
    if (innovation.name.includes('Digital')) return InnovationCategory.DIGITAL_TWINS;
    return InnovationCategory.CLIMATE_TECH;
  };

  // Filter innovations based on search and category
  const filteredInnovations = innovations.filter(innovation => {
    const matchesSearch = searchQuery === '' ||
      innovation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      innovation.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' ||
      getInnovationCategory(innovation) === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get TRL level color
  const getTRLColor = (trlLevel: number): string => {
    if (trlLevel >= 7) return 'bg-green-100 text-green-800';
    if (trlLevel >= 5) return 'bg-blue-100 text-blue-800';
    if (trlLevel >= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Generate pitch document
  const generatePitch = useCallback(async (innovation: any) => {
    setShowPitchGeneration(true);
    setGeneratedPitch('Generating pitch document...');

    // Simulate AI pitch generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const evaluation = trlEvaluations.get(innovation.name);

    const pitch = `
## ${innovation.name}

**Executive Summary**
${innovation.description}

**Technology Maturity (TRL ${evaluation?.trlScore || '?'})**
${evaluation?.evidenceDescription || 'Technology maturity assessment in progress'}

**Market Opportunity**
- Addressable market: $500M+ opportunity
- Growth potential: 25% CAGR projected
- Competitive advantages: Innovative technology, proven prototypes

**Funding & Deployment**
- Funding secured: $${innovation.fundingSecured?.toLocaleString() || '0'}
- Pilot projects completed: ${innovation.pilotProjects || 0}
- Commercial deployments: ${innovation.commercialDeployments || 0}

**Team & Partnerships**
- Years of R&D: ${innovation.yearsOfDevelopment || 0} years
- Strategic partnerships: ${innovation.partnerships || 0} organizations
- Patents filed: ${innovation.patentsFiled || 0}

**Next Steps**
1. Scale pilot deployments
2. Secure Series A funding
3. International market entry
4. Technology licensing opportunities

**Contact for Investment Opportunities**
[Investment inquiry details available upon request]
`;

    setGeneratedPitch(pitch);
  }, [trlEvaluations]);

  if (loading && trlEvaluations.size === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3">
          <Zap className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-slate-600">Evaluating technology readiness...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="bg-purple-500 p-3 rounded-lg">
            <Lightbulb className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Energy Innovation Hub</h1>
            <p className="text-slate-600">TRL assessment and investment readiness evaluation</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search innovations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as InnovationCategory)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Results:</span>
            <span className="font-semibold text-slate-800">{filteredInnovations.length}</span>
          </div>
        </div>
      </div>

      {/* Innovation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredInnovations.map((innovation) => {
          const evaluation = trlEvaluations.get(innovation.name);
          const category = getInnovationCategory(innovation);

          return (
            <div
              key={innovation.name}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                      {innovation.name}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTRLColor(evaluation?.trlScore || 1)}`}>
                      TRL {evaluation?.trlScore || '?'}
                    </span>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {innovation.yearsOfDevelopment}y dev
                  </div>
                </div>

                <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                  {innovation.description}
                </p>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {category.replace('_', ' ').toUpperCase()}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Award className="h-3 w-3 text-yellow-500" />
                    <span>{innovation.patentsFiled} patents</span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    ${innovation.fundingSecured?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-slate-500">Funding Secured</div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {innovation.partnerships}
                  </div>
                  <div className="text-xs text-slate-500">Partners</div>
                </div>
              </div>

              {/* Progress Indicators */}
              <div className="px-4 pb-4 space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Prototypes</span>
                    <span>{innovation.prototypesBuilt}/5</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(innovation.prototypesBuilt / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Pilots</span>
                    <span>{innovation.pilotProjects}/3</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${(innovation.pilotProjects / 3) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedInnovation(innovation.name)}
                    className="flex-1 text-sm bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => generatePitch(innovation)}
                    className="flex-1 text-sm bg-green-600 text-white rounded px-3 py-2 hover:bg-green-700 transition-colors"
                  >
                    Generate Pitch
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pitch Generation Modal */}
      {showPitchGeneration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Investment Pitch Document</h2>
                <button
                  onClick={() => setShowPitchGeneration(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Zap className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-800">
                {generatedPitch}
              </pre>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200">
              <div className="flex justify-between">
                <button
                  onClick={() => setShowPitchGeneration(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Innovation Details Panel */}
      {selectedInnovation && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Technology Details</h2>
            <button
              onClick={() => setSelectedInnovation(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <Zap className="h-6 w-6" />
            </button>
          </div>

          {(() => {
            const innovation = innovations.find(i => i.name === selectedInnovation);
            const evaluation = trlEvaluations.get(selectedInnovation);

            if (!innovation) return <div>Innovation not found</div>;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">{innovation.name}</h3>
                  <p className="text-slate-600 mb-4">{innovation.description}</p>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">TRL Score:</span>
                      <span className="font-semibold">{evaluation?.trlScore || '?'}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">Confidence:</span>
                      <span className="font-semibold">{evaluation?.confidence || '0'}%</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">Funding Secured:</span>
                      <span className="font-semibold">${innovation.fundingSecured?.toLocaleString() || '0'}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">Publications:</span>
                      <span className="font-semibold">{innovation.publications}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-3">Evidence Description</h4>
                  <p className="text-sm text-slate-700 bg-blue-50 p-3 rounded-lg">
                    {evaluation?.evidenceDescription || 'Assessment in progress'}
                  </p>

                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-2">Regulatory & Certifications</h4>
                    <div className="flex flex-wrap gap-2">
                      {[...(innovation.regulatoryApprovals || []), ...(innovation.certifications || [])].map((item, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};