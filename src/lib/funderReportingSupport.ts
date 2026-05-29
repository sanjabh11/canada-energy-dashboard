export type FunderReportTemplate = 'wah-ila-toos' | 'cerrc' | 'northern-reache' | 'custom';
export type FunderExportFormat = 'pdf' | 'excel' | 'word' | 'json';
export type FunderSourceMode = 'live_projects' | 'starter_projects' | 'constructed_commercial_scenario' | 'uploaded_projects';

export interface FunderProjectData {
  id: string;
  name: string;
  community: string;
  territory_name: string;
  energy_type: string;
  capacity_kw?: number;
  project_status: string;
  start_date?: string;
  operational_date?: string;
  total_budget?: number;
  actual_cost?: number;
  funding_sources?: { source: string; amount: number }[];
  fpic_status: string;
  jobs_created?: number;
  emissions_avoided_tonnes_co2?: number;
  households_served?: number;
  milestones?: { name: string; date: string; completed: boolean }[];
  challenges?: string[];
  next_quarter_plans?: string[];
}

export interface FunderReportSection {
  id: string;
  title: string;
  enabled: boolean;
  content?: string;
}

export const FUND_REPORT_TEMPLATES: Record<FunderReportTemplate, { name: string; description: string; sections: string[]; maturity: 'primary' | 'secondary' }> = {
  'wah-ila-toos': {
    name: 'Wah-ila-toos Quarterly Report',
    description: 'Standard quarterly report for Wah-ila-toos Clean Energy Program funding',
    sections: ['project_overview', 'financial_summary', 'progress_this_quarter', 'impact_metrics', 'challenges_risks', 'next_quarter_plans'],
    maturity: 'primary',
  },
  'cerrc': {
    name: 'CERRC Progress Report',
    description: 'Clean Energy for Rural and Remote Communities program report',
    sections: ['project_overview', 'financial_summary', 'technical_progress', 'community_engagement', 'environmental_impact'],
    maturity: 'secondary',
  },
  'northern-reache': {
    name: 'Northern REACHE Report',
    description: 'Northern Responsible Energy Approach for Community Heat and Electricity',
    sections: ['project_overview', 'financial_summary', 'capacity_building', 'energy_security', 'sustainability_plan'],
    maturity: 'secondary',
  },
  'custom': {
    name: 'Custom Report',
    description: 'Build your own report with selected sections',
    sections: ['project_overview', 'financial_summary', 'progress_this_quarter', 'impact_metrics', 'challenges_risks', 'next_quarter_plans', 'community_engagement', 'environmental_impact'],
    maturity: 'secondary',
  },
};

export const FUND_SECTION_LABELS: Record<string, string> = {
  project_overview: 'Project Overview',
  financial_summary: 'Financial Summary',
  progress_this_quarter: 'Progress This Quarter',
  impact_metrics: 'Impact Metrics',
  challenges_risks: 'Challenges & Risks',
  next_quarter_plans: 'Next Quarter Plans',
  technical_progress: 'Technical Progress',
  community_engagement: 'Community Engagement',
  environmental_impact: 'Environmental Impact',
  capacity_building: 'Capacity Building',
  energy_security: 'Energy Security',
  sustainability_plan: 'Sustainability Plan',
};

export function buildStarterProjects(): FunderProjectData[] {
  return [
    {
      id: 'demo-1',
      name: 'Northern Grid Microgeneration',
      community: 'Cree, Ojibwe, Dene',
      territory_name: 'Treaty 5 Territory',
      energy_type: 'solar',
      capacity_kw: 500,
      project_status: 'construction',
      fpic_status: 'obtained',
      jobs_created: 25,
      emissions_avoided_tonnes_co2: 2500,
      households_served: 150,
      total_budget: 1500000,
      actual_cost: 1200000,
      funding_sources: [
        { source: 'Wah-ila-toos', amount: 750000 },
        { source: 'Community Investment', amount: 450000 },
      ],
      milestones: [
        { name: 'Site Assessment', date: '2025-01-15', completed: true },
        { name: 'FPIC Obtained', date: '2025-03-01', completed: true },
        { name: 'Construction Start', date: '2025-06-01', completed: true },
        { name: 'Grid Connection', date: '2025-12-01', completed: false },
      ],
      challenges: ['Supply chain delays for solar panels', 'Winter construction limitations'],
      next_quarter_plans: ['Complete electrical infrastructure', 'Begin grid connection testing'],
    },
    {
      id: 'demo-2',
      name: 'James Bay Storage Upgrade',
      community: 'Ojibwe, Cree, Oji-Cree',
      territory_name: 'Treaty 9 Territory',
      energy_type: 'hydro',
      capacity_kw: 2000,
      project_status: 'planning',
      fpic_status: 'in_progress',
      jobs_created: 45,
      emissions_avoided_tonnes_co2: 8000,
      households_served: 500,
      total_budget: 5000000,
      actual_cost: 800000,
      funding_sources: [
        { source: 'CERRC', amount: 2500000 },
        { source: 'Provincial Grant', amount: 1500000 },
      ],
    },
  ];
}

export function mapApiProjectToFunderProjectData(project: Record<string, any>): FunderProjectData {
  const capacity = project.capacity_kw || 100;
  return {
    id: project.id,
    name: project.name || 'Unnamed Project',
    community: project.community || '',
    territory_name: project.territory_id || '',
    energy_type: project.energy_type || 'renewable',
    capacity_kw: capacity,
    project_status: project.stage || 'planning',
    fpic_status: project.fpic_status || 'unknown',
    jobs_created: project.jobs_created ?? Math.round(capacity * 0.05),
    emissions_avoided_tonnes_co2: project.emissions_avoided_tonnes_co2 ?? Math.round(capacity * 5),
    households_served: project.households_served ?? Math.round(capacity * 0.4),
    total_budget: project.total_budget ?? capacity * 3000,
    actual_cost: project.actual_cost ?? capacity * 2400,
  };
}

export function buildFunderSourceLabel(sourceMode: FunderSourceMode): string {
  if (sourceMode === 'live_projects') return 'Live project feed';
  if (sourceMode === 'constructed_commercial_scenario') return 'Constructed Wah-ila-toos project set';
  if (sourceMode === 'uploaded_projects') return 'Uploaded project file';
  return 'Starter project set';
}

export function buildFunderSectionContent(project: FunderProjectData, sectionId: string): string {
  switch (sectionId) {
    case 'project_overview':
      return `**Project Name:** ${project.name}
**Community:** ${project.community}
**Territory:** ${project.territory_name}
**Technology:** ${project.energy_type}
**Capacity:** ${project.capacity_kw ? `${project.capacity_kw} kW` : 'TBD'}
**Status:** ${project.project_status}
**FPIC Status:** ${project.fpic_status}`;
    case 'financial_summary': {
      const budgetUsed = project.total_budget && project.actual_cost
        ? ((project.actual_cost / project.total_budget) * 100).toFixed(1)
        : 'N/A';
      return `**Total Budget:** $${(project.total_budget || 0).toLocaleString()}
**Actual Cost to Date:** $${(project.actual_cost || 0).toLocaleString()}
**Budget Utilization:** ${budgetUsed}%
**Funding Sources:**
${(project.funding_sources || []).map((item) => `- ${item.source}: $${item.amount.toLocaleString()}`).join('\n') || '- Not specified'}`;
    }
    case 'impact_metrics':
      return `**Jobs Created:** ${project.jobs_created || 0}
**Emissions Avoided:** ${(project.emissions_avoided_tonnes_co2 || 0).toLocaleString()} tonnes CO2
**Households Served:** ${project.households_served || 0}`;
    case 'progress_this_quarter': {
      const completedMilestones = (project.milestones || []).filter((milestone) => milestone.completed);
      return `**Milestones Achieved:**
${completedMilestones.map((milestone) => `- ${milestone.name} (${milestone.date})`).join('\n') || '- No milestones completed this quarter'}

**Percent Complete:** ${project.milestones
  ? ((completedMilestones.length / project.milestones.length) * 100).toFixed(0)
  : 'N/A'}%`;
    }
    case 'challenges_risks':
      return `**Current Challenges:**
${(project.challenges || ['No significant challenges reported']).map((challenge) => `- ${challenge}`).join('\n')}

**Mitigation Strategies:**
- Regular stakeholder communication
- Contingency budget allocation
- Alternative supplier identification`;
    case 'next_quarter_plans':
      return `**Planned Activities:**
${(project.next_quarter_plans || ['Continue project development']).map((plan) => `- ${plan}`).join('\n')}

**Key Milestones:**
${(project.milestones || []).filter((milestone) => !milestone.completed).slice(0, 3).map((milestone) => `- ${milestone.name} (Target: ${milestone.date})`).join('\n') || '- To be determined'}`;
    default:
      return 'Section content to be added.';
  }
}

export function parseImportedProjects(filename: string, text: string): FunderProjectData[] {
  if (filename.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text);
    const projects = Array.isArray(parsed) ? parsed : parsed.projects;
    if (!Array.isArray(projects)) {
      throw new Error('JSON import must contain an array of projects or a { projects: [] } object.');
    }
    return projects.map((project, index) => normalizeImportedProject(project, index));
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV import requires a header row and at least one project row.');
  }

  const headers = lines[0].split(',').map((header) => header.trim());
  return lines.slice(1).map((line, index) => {
    const cells = line.split(',').map((cell) => cell.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      row[header] = cells[cellIndex] || '';
    });
    return normalizeImportedProject(row, index);
  });
}

function normalizeImportedProject(project: Record<string, any>, index: number): FunderProjectData {
  return {
    id: project.id || `uploaded-${index + 1}`,
    name: project.name || `Uploaded Project ${index + 1}`,
    community: project.community || '',
    territory_name: project.territory_name || project.territory || '',
    energy_type: project.energy_type || 'renewable',
    capacity_kw: Number(project.capacity_kw || 0) || undefined,
    project_status: project.project_status || project.status || 'planning',
    start_date: project.start_date || undefined,
    operational_date: project.operational_date || undefined,
    total_budget: Number(project.total_budget || 0) || undefined,
    actual_cost: Number(project.actual_cost || 0) || undefined,
    funding_sources: Array.isArray(project.funding_sources) ? project.funding_sources : undefined,
    fpic_status: project.fpic_status || 'owner_supplied',
    jobs_created: Number(project.jobs_created || 0) || undefined,
    emissions_avoided_tonnes_co2: Number(project.emissions_avoided_tonnes_co2 || 0) || undefined,
    households_served: Number(project.households_served || 0) || undefined,
    milestones: Array.isArray(project.milestones) ? project.milestones : undefined,
    challenges: Array.isArray(project.challenges) ? project.challenges : project.challenges ? String(project.challenges).split('|').map((item) => item.trim()) : undefined,
    next_quarter_plans: Array.isArray(project.next_quarter_plans) ? project.next_quarter_plans : project.next_quarter_plans ? String(project.next_quarter_plans).split('|').map((item) => item.trim()) : undefined,
  };
}
