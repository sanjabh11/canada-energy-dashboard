/**
 * PolicyDependencyMap Component
 * 
 * Interactive visualization of policy dependencies and contingencies.
 * Addresses Gap #5: Policy Dependency Maps (HIGH Priority)
 * 
 * Shows relationships between:
 * - CCUS projects and carbon pricing
 * - Pipeline projects and interties
 * - Federal/provincial policy alignment
 * - MOU contingencies
 * 
 * Usage:
 * <PolicyDependencyMap />
 * <PolicyDependencyMap selectedNode="pathways" onNodeClick={handleNodeClick} />
 */

import React, { useState, useCallback } from 'react';
import {
  GitBranch,
  ArrowRight,
  ExternalLink,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Building2,
  Leaf,
  DollarSign,
  Globe
} from 'lucide-react';

// Node types for the dependency map
export interface PolicyNode {
  id: string;
  name: string;
  type: 'policy' | 'project' | 'infrastructure' | 'pricing' | 'target';
  description: string;
  status: 'active' | 'pending' | 'planned' | 'contingent';
  dependencies: string[];
  contingencies: string[];
  sources: { name: string; url: string }[];
  metrics?: {
    label: string;
    value: string;
  }[];
  province?: string;
}

// Predefined policy nodes for Canadian energy landscape
const POLICY_NODES: PolicyNode[] = [
  {
    id: 'pathways',
    name: 'Pathways Alliance',
    type: 'project',
    description:
      'Industry consortium of six major oil sands producers committed to achieving net-zero emissions by 2050 through CCUS.',
    status: 'active',
    dependencies: ['ccus_tax_credit', 'carbon_pricing'],
    contingencies: ['tmx_expansion', 'egress_capacity'],
    sources: [
      { name: 'Pathways Alliance', url: 'https://pathwaysalliance.ca/' },
      { name: 'Alberta Government', url: 'https://www.alberta.ca/ccus-hub' }
    ],
    metrics: [
      { label: 'Investment', value: '$16.5B' },
      { label: 'CO2 Capture Target', value: '22 Mt/year' },
      { label: 'Phase 1 Timeline', value: '2030' }
    ],
    province: 'AB'
  },
  {
    id: 'ccus_tax_credit',
    name: 'CCUS Investment Tax Credit',
    type: 'policy',
    description:
      'Federal tax credit providing 37.5-60% credit for carbon capture equipment and infrastructure investments.',
    status: 'active',
    dependencies: ['federal_climate_plan'],
    contingencies: [],
    sources: [
      { name: 'Budget 2022', url: 'https://www.canada.ca/en/department-finance/news/2022/04/budget-2022-a-plan-to-grow-our-economy-and-make-life-more-affordable.html' }
    ],
    metrics: [
      { label: 'Credit Rate (DAC)', value: '60%' },
      { label: 'Credit Rate (Other)', value: '37.5-50%' },
      { label: 'Available Until', value: '2040' }
    ]
  },
  {
    id: 'carbon_pricing',
    name: 'Federal Carbon Pricing',
    type: 'pricing',
    description:
      'Federal carbon pricing system with escalating prices reaching $170/tonne by 2030.',
    status: 'active',
    dependencies: [],
    contingencies: ['provincial_equivalency'],
    sources: [
      { name: 'ECCC', url: 'https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work.html' }
    ],
    metrics: [
      { label: '2024 Price', value: '$80/tonne' },
      { label: '2030 Target', value: '$170/tonne' },
      { label: 'Annual Increase', value: '$15/tonne' }
    ]
  },
  {
    id: 'tmx_expansion',
    name: 'Trans Mountain Expansion',
    type: 'infrastructure',
    description:
      'Pipeline expansion tripling capacity to 890,000 barrels/day, enabling increased oil exports.',
    status: 'active',
    dependencies: ['neb_approval'],
    contingencies: ['egress_capacity'],
    sources: [
      { name: 'Trans Mountain', url: 'https://www.transmountain.com/' },
      { name: 'CER', url: 'https://www.cer-rec.gc.ca/en/applications-hearings/view-applications-projects/trans-mountain-expansion/' }
    ],
    metrics: [
      { label: 'Capacity', value: '890K bbl/day' },
      { label: 'Length', value: '1,150 km' },
      { label: 'In-Service', value: '2024' }
    ],
    province: 'BC/AB'
  },
  {
    id: 'net_zero_2050',
    name: 'Net-Zero by 2050',
    type: 'target',
    description:
      "Canada's legislated commitment to achieve net-zero greenhouse gas emissions by 2050.",
    status: 'active',
    dependencies: ['clean_electricity_standard', 'oil_gas_emissions_cap'],
    contingencies: [],
    sources: [
      { name: 'Net-Zero Act', url: 'https://laws-lois.justice.gc.ca/eng/acts/C-19.3/' }
    ],
    metrics: [
      { label: '2030 Target', value: '-40-45% vs 2005' },
      { label: '2050 Target', value: 'Net-Zero' }
    ]
  },
  {
    id: 'clean_electricity_standard',
    name: 'Clean Electricity Regulations',
    type: 'policy',
    description:
      'Federal regulations requiring net-zero electricity generation by 2035.',
    status: 'pending',
    dependencies: ['federal_climate_plan'],
    contingencies: ['provincial_grid_capacity', 'smr_deployment'],
    sources: [
      { name: 'ECCC', url: 'https://www.canada.ca/en/services/environment/weather/climatechange/climate-plan/clean-electricity-regulation.html' }
    ],
    metrics: [
      { label: 'Target Year', value: '2035' },
      { label: 'Emissions Limit', value: '30 t/GWh' }
    ]
  },
  {
    id: 'oil_gas_emissions_cap',
    name: 'Oil & Gas Emissions Cap',
    type: 'policy',
    description:
      'Proposed federal cap on emissions from the oil and gas sector, declining to net-zero by 2050.',
    status: 'planned',
    dependencies: ['federal_climate_plan'],
    contingencies: ['ccus_deployment', 'pathways'],
    sources: [
      { name: 'ECCC', url: 'https://www.canada.ca/en/services/environment/weather/climatechange/climate-plan/oil-gas-emissions-cap.html' }
    ],
    metrics: [
      { label: '2030 Cap', value: '~35% below 2019' },
      { label: 'Final Year', value: '2050' }
    ]
  },
  {
    id: 'federal_climate_plan',
    name: 'Pan-Canadian Framework',
    type: 'policy',
    description:
      "Canada's comprehensive climate plan including carbon pricing, clean fuel standard, and sector regulations.",
    status: 'active',
    dependencies: [],
    contingencies: ['provincial_cooperation'],
    sources: [
      { name: 'ECCC', url: 'https://www.canada.ca/en/services/environment/weather/climatechange/pan-canadian-framework.html' }
    ]
  },
  {
    id: 'hydrogen_strategy',
    name: 'Hydrogen Strategy',
    type: 'policy',
    description:
      'National strategy to position Canada as a global hydrogen leader with production hubs.',
    status: 'active',
    dependencies: ['clean_electricity_standard'],
    contingencies: ['electrolyzer_deployment', 'export_infrastructure'],
    sources: [
      { name: 'NRCan', url: 'https://natural-resources.canada.ca/climate-change/hydrogen-strategy' }
    ],
    metrics: [
      { label: 'Production Target', value: '30% clean H2' },
      { label: 'Jobs Potential', value: '350,000' }
    ]
  },
  {
    id: 'smr_deployment',
    name: 'SMR Action Plan',
    type: 'project',
    description:
      'Deployment of small modular reactors for clean baseload power and industrial heat.',
    status: 'planned',
    dependencies: ['cnsc_licensing', 'federal_funding'],
    contingencies: ['clean_electricity_standard'],
    sources: [
      { name: 'SMR Roadmap', url: 'https://smrroadmap.ca/' },
      { name: 'NRCan', url: 'https://natural-resources.canada.ca/energy/energy-sources-distribution/nuclear-energy-uranium/small-modular-reactors' }
    ],
    metrics: [
      { label: 'First Grid SMR', value: '2028 (OPG)' },
      { label: 'Capacity Potential', value: '5 GW by 2035' }
    ],
    province: 'ON/NB/SK'
  }
];

interface PolicyDependencyMapProps {
  /** Initially selected node */
  selectedNode?: string;
  /** Callback when a node is clicked */
  onNodeClick?: (node: PolicyNode) => void;
  /** Additional CSS classes */
  className?: string;
}

export function PolicyDependencyMap({
  selectedNode: initialSelected,
  onNodeClick,
  className = ''
}: PolicyDependencyMapProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(initialSelected || null);
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);
  const [filter, setFilter] = useState<PolicyNode['type'] | 'all'>('all');

  const handleNodeClick = useCallback(
    (node: PolicyNode) => {
      setSelectedNode(node.id);
      setExpandedInfo(node.id);
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  const getNodeColor = (type: PolicyNode['type'], status: PolicyNode['status']) => {
    const colors = {
      policy: { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-400' },
      project: { bg: 'bg-emerald-600', border: 'border-emerald-500', text: 'text-emerald-400' },
      infrastructure: { bg: 'bg-amber-600', border: 'border-amber-500', text: 'text-amber-400' },
      pricing: { bg: 'bg-purple-600', border: 'border-purple-500', text: 'text-purple-400' },
      target: { bg: 'bg-red-600', border: 'border-red-500', text: 'text-red-400' }
    };
    const opacity = status === 'active' ? '' : status === 'pending' ? 'opacity-80' : 'opacity-60';
    return { ...colors[type], opacity };
  };

  const getNodeIcon = (type: PolicyNode['type']) => {
    switch (type) {
      case 'policy':
        return Globe;
      case 'project':
        return Building2;
      case 'infrastructure':
        return GitBranch;
      case 'pricing':
        return DollarSign;
      case 'target':
        return Leaf;
      default:
        return Zap;
    }
  };

  const filteredNodes =
    filter === 'all' ? POLICY_NODES : POLICY_NODES.filter((n) => n.type === filter);

  const selected = POLICY_NODES.find((n) => n.id === selectedNode);

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <GitBranch className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Policy Dependency Map</h3>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as PolicyNode['type'] | 'all')}
            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200"
          >
            <option value="all">All</option>
            <option value="policy">Policies</option>
            <option value="project">Projects</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="pricing">Pricing</option>
            <option value="target">Targets</option>
          </select>
        </div>
      </div>

      <div className="flex">
        {/* Node List */}
        <div className="w-1/2 border-r border-slate-700 max-h-[500px] overflow-y-auto">
          <div className="p-4 space-y-2">
            {filteredNodes.map((node) => {
              const colors = getNodeColor(node.type, node.status);
              const Icon = getNodeIcon(node.type);
              const isSelected = selectedNode === node.id;

              return (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? `${colors.border} bg-slate-700/50`
                      : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
                  } ${colors.opacity}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded ${colors.bg}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200 truncate">{node.name}</span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] uppercase font-medium rounded ${
                            node.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : node.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {node.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{node.description}</p>

                      {/* Dependencies indicator */}
                      {node.dependencies.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                          <ArrowRight className="h-3 w-3" />
                          Depends on {node.dependencies.length} items
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="w-1/2 max-h-[500px] overflow-y-auto">
          {selected ? (
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-white">{selected.name}</h4>
                  <p className="text-sm text-slate-400 mt-1">{selected.description}</p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              {/* Metrics */}
              {selected.metrics && (
                <div className="grid grid-cols-2 gap-2">
                  {selected.metrics.map((metric, i) => (
                    <div key={i} className="p-2 bg-slate-700/50 rounded-lg">
                      <p className="text-xs text-slate-400">{metric.label}</p>
                      <p className="text-sm font-medium text-white">{metric.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Dependencies */}
              {selected.dependencies.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Dependencies
                  </h5>
                  <div className="space-y-1">
                    {selected.dependencies.map((depId) => {
                      const dep = POLICY_NODES.find((n) => n.id === depId);
                      if (!dep) return null;
                      return (
                        <button
                          key={depId}
                          onClick={() => handleNodeClick(dep)}
                          className="w-full text-left px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 rounded text-sm text-slate-300"
                        >
                          {dep.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contingencies */}
              {selected.contingencies.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-amber-300 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Contingencies
                  </h5>
                  <div className="space-y-1">
                    {selected.contingencies.map((contId) => {
                      const cont = POLICY_NODES.find((n) => n.id === contId);
                      return (
                        <div
                          key={contId}
                          className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded text-sm text-amber-200"
                        >
                          {cont ? cont.name : contId}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sources */}
              {selected.sources.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-slate-300 mb-2">Sources</h5>
                  <div className="space-y-1">
                    {selected.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 rounded text-sm text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {source.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-8 text-slate-500">
              <div className="text-center">
                <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a policy or project to view dependencies</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 px-6 py-3 border-t border-slate-700 bg-slate-900/50">
        {[
          { type: 'policy' as const, label: 'Policy' },
          { type: 'project' as const, label: 'Project' },
          { type: 'infrastructure' as const, label: 'Infrastructure' },
          { type: 'pricing' as const, label: 'Pricing' },
          { type: 'target' as const, label: 'Target' }
        ].map(({ type, label }) => {
          const colors = getNodeColor(type, 'active');
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className={`w-3 h-3 rounded ${colors.bg}`} />
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PolicyDependencyMap;
