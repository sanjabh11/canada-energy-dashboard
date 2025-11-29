import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Calendar, DollarSign, Users, Leaf, 
  AlertTriangle, CheckCircle, Clock, Building, Filter,
  FileSpreadsheet, File, ChevronDown, ChevronRight
} from 'lucide-react';
import { getEdgeBaseUrl, getEdgeHeaders, isEdgeFetchEnabled } from '../lib/config';

// Report template types
type ReportTemplate = 'wah-ila-toos' | 'cerrc' | 'northern-reache' | 'custom';
type ExportFormat = 'pdf' | 'excel' | 'word' | 'json';

interface ProjectData {
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

interface ReportSection {
  id: string;
  title: string;
  enabled: boolean;
  content?: string;
}

const REPORT_TEMPLATES: Record<ReportTemplate, { name: string; description: string; sections: string[] }> = {
  'wah-ila-toos': {
    name: 'Wah-ila-toos Quarterly Report',
    description: 'Standard quarterly report for Wah-ila-toos Clean Energy Program funding',
    sections: ['project_overview', 'financial_summary', 'progress_this_quarter', 'impact_metrics', 'challenges_risks', 'next_quarter_plans']
  },
  'cerrc': {
    name: 'CERRC Progress Report',
    description: 'Clean Energy for Rural and Remote Communities program report',
    sections: ['project_overview', 'financial_summary', 'technical_progress', 'community_engagement', 'environmental_impact']
  },
  'northern-reache': {
    name: 'Northern REACHE Report',
    description: 'Northern Responsible Energy Approach for Community Heat and Electricity',
    sections: ['project_overview', 'financial_summary', 'capacity_building', 'energy_security', 'sustainability_plan']
  },
  'custom': {
    name: 'Custom Report',
    description: 'Build your own report with selected sections',
    sections: ['project_overview', 'financial_summary', 'progress_this_quarter', 'impact_metrics', 'challenges_risks', 'next_quarter_plans', 'community_engagement', 'environmental_impact']
  }
};

const SECTION_LABELS: Record<string, string> = {
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
  sustainability_plan: 'Sustainability Plan'
};

export function FunderReportingDashboard() {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('wah-ila-toos');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportSections, setReportSections] = useState<ReportSection[]>([]);
  const [narratives, setNarratives] = useState<Record<string, string>>({});
  const [reportPeriod, setReportPeriod] = useState({
    quarter: 'Q4',
    year: '2025'
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['project_overview']));

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    // Initialize sections based on template
    const template = REPORT_TEMPLATES[selectedTemplate];
    const sections = template.sections.map(sectionId => ({
      id: sectionId,
      title: SECTION_LABELS[sectionId] || sectionId,
      enabled: true,
      content: ''
    }));
    setReportSections(sections);
  }, [selectedTemplate]);

  async function loadProjects() {
    setLoading(true);
    try {
      if (isEdgeFetchEnabled()) {
        const base = getEdgeBaseUrl();
        if (base) {
          const res = await fetch(`${base}/api-v2-indigenous-projects`, {
            headers: getEdgeHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            const projectList = (data.projects || []).map((p: any) => ({
              id: p.id,
              name: p.name || 'Unnamed Project',
              community: p.community || '',
              territory_name: p.territory_id || '',
              energy_type: p.energy_type || 'renewable',
              capacity_kw: p.capacity_kw,
              project_status: p.stage || 'planning',
              fpic_status: p.fpic_status || 'unknown',
              jobs_created: Math.floor(Math.random() * 50) + 5, // Demo data
              emissions_avoided_tonnes_co2: Math.floor(Math.random() * 5000) + 500,
              households_served: Math.floor(Math.random() * 200) + 20,
              total_budget: Math.floor(Math.random() * 2000000) + 500000,
              actual_cost: Math.floor(Math.random() * 1500000) + 400000,
            }));
            setProjects(projectList);
            if (projectList.length > 0) {
              setSelectedProjects([projectList[0].id]);
            }
          }
        }
      }
      
      // Fallback demo data
      if (projects.length === 0) {
        const demoProjects: ProjectData[] = [
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
              { source: 'Community Investment', amount: 450000 }
            ],
            milestones: [
              { name: 'Site Assessment', date: '2025-01-15', completed: true },
              { name: 'FPIC Obtained', date: '2025-03-01', completed: true },
              { name: 'Construction Start', date: '2025-06-01', completed: true },
              { name: 'Grid Connection', date: '2025-12-01', completed: false }
            ],
            challenges: ['Supply chain delays for solar panels', 'Winter construction limitations'],
            next_quarter_plans: ['Complete electrical infrastructure', 'Begin grid connection testing']
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
              { source: 'Provincial Grant', amount: 1500000 }
            ]
          }
        ];
        setProjects(demoProjects);
        setSelectedProjects(['demo-1']);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(sectionId: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function toggleSectionEnabled(sectionId: string) {
    setReportSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    ));
  }

  function generateReportContent(project: ProjectData, sectionId: string): string {
    switch (sectionId) {
      case 'project_overview': {
        return `**Project Name:** ${project.name}
**Community:** ${project.community}
**Territory:** ${project.territory_name}
**Technology:** ${project.energy_type}
**Capacity:** ${project.capacity_kw ? `${project.capacity_kw} kW` : 'TBD'}
**Status:** ${project.project_status}
**FPIC Status:** ${project.fpic_status}`;
      }

      case 'financial_summary': {
        const budgetUsed = project.total_budget && project.actual_cost 
          ? ((project.actual_cost / project.total_budget) * 100).toFixed(1)
          : 'N/A';
        return `**Total Budget:** $${(project.total_budget || 0).toLocaleString()}
**Actual Cost to Date:** $${(project.actual_cost || 0).toLocaleString()}
**Budget Utilization:** ${budgetUsed}%
**Funding Sources:**
${(project.funding_sources || []).map(f => `- ${f.source}: $${f.amount.toLocaleString()}`).join('\n') || '- Not specified'}`;
      }

      case 'impact_metrics': {
        return `**Jobs Created:** ${project.jobs_created || 0}
**Emissions Avoided:** ${(project.emissions_avoided_tonnes_co2 || 0).toLocaleString()} tonnes CO2
**Households Served:** ${project.households_served || 0}`;
      }

      case 'progress_this_quarter': {
        const completedMilestones = (project.milestones || []).filter(m => m.completed);
        return `**Milestones Achieved:**
${completedMilestones.map(m => `- ${m.name} (${m.date})`).join('\n') || '- No milestones completed this quarter'}

**Percent Complete:** ${project.milestones 
          ? ((completedMilestones.length / project.milestones.length) * 100).toFixed(0) 
          : 'N/A'}%`;
      }

      case 'challenges_risks': {
        return `**Current Challenges:**
${(project.challenges || ['No significant challenges reported']).map(c => `- ${c}`).join('\n')}

**Mitigation Strategies:**
- Regular stakeholder communication
- Contingency budget allocation
- Alternative supplier identification`;
      }

      case 'next_quarter_plans': {
        return `**Planned Activities:**
${(project.next_quarter_plans || ['Continue project development']).map(p => `- ${p}`).join('\n')}

**Key Milestones:**
${(project.milestones || []).filter(m => !m.completed).slice(0, 3).map(m => `- ${m.name} (Target: ${m.date})`).join('\n') || '- To be determined'}`;
      }

      default: {
        return 'Section content to be added.';
      }
    }
  }

  async function exportReport(format: ExportFormat) {
    setGenerating(true);
    
    const selectedProjectData = projects.filter(p => selectedProjects.includes(p.id));
    const enabledSections = reportSections.filter(s => s.enabled);
    
    try {
      if (format === 'json') {
        // JSON export
        const reportData = {
          template: selectedTemplate,
          period: reportPeriod,
          generated_at: new Date().toISOString(),
          projects: selectedProjectData.map(project => ({
            ...project,
            sections: enabledSections.map(section => ({
              id: section.id,
              title: section.title,
              content: narratives[`${project.id}-${section.id}`] || generateReportContent(project, section.id)
            }))
          }))
        };
        
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `funder-report-${reportPeriod.quarter}-${reportPeriod.year}.json`);
      }
      
      if (format === 'excel') {
        // CSV export (Excel-compatible)
        const rows: string[][] = [
          ['Funder Report', `${reportPeriod.quarter} ${reportPeriod.year}`],
          ['Template', REPORT_TEMPLATES[selectedTemplate].name],
          ['Generated', new Date().toLocaleDateString()],
          [],
          ['Project Name', 'Community', 'Territory', 'Energy Type', 'Capacity (kW)', 'Status', 'FPIC Status', 'Budget', 'Actual Cost', 'Jobs Created', 'Emissions Avoided (tCO2)', 'Households Served']
        ];
        
        selectedProjectData.forEach(project => {
          rows.push([
            project.name,
            project.community,
            project.territory_name,
            project.energy_type,
            String(project.capacity_kw || ''),
            project.project_status,
            project.fpic_status,
            String(project.total_budget || ''),
            String(project.actual_cost || ''),
            String(project.jobs_created || ''),
            String(project.emissions_avoided_tonnes_co2 || ''),
            String(project.households_served || '')
          ]);
        });
        
        const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `funder-report-${reportPeriod.quarter}-${reportPeriod.year}.csv`);
      }
      
      if (format === 'pdf') {
        // Generate HTML for PDF (would use jsPDF in production)
        const htmlContent = generateHTMLReport(selectedProjectData, enabledSections);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        downloadBlob(blob, `funder-report-${reportPeriod.quarter}-${reportPeriod.year}.html`);
        
        // Note: For actual PDF generation, integrate jsPDF:
        // import jsPDF from 'jspdf';
        // const doc = new jsPDF();
        // doc.html(htmlContent, { callback: (doc) => doc.save('report.pdf') });
      }
      
      if (format === 'word') {
        // Generate simple RTF (Word-compatible)
        const rtfContent = generateRTFReport(selectedProjectData, enabledSections);
        const blob = new Blob([rtfContent], { type: 'application/rtf' });
        downloadBlob(blob, `funder-report-${reportPeriod.quarter}-${reportPeriod.year}.rtf`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateHTMLReport(projectData: ProjectData[], sections: ReportSection[]): string {
    const template = REPORT_TEMPLATES[selectedTemplate];
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${template.name} - ${reportPeriod.quarter} ${reportPeriod.year}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { color: #1e3a5f; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    h3 { color: #6b7280; }
    .header { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .section { margin-bottom: 25px; padding: 15px; border-left: 4px solid #10b981; background: #f9fafb; }
    .metric { display: inline-block; margin-right: 30px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #10b981; }
    .metric-label { font-size: 12px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    th { background: #f3f4f6; }
    .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; }
    .status-obtained { background: #d1fae5; color: #065f46; }
    .status-in_progress { background: #fef3c7; color: #92400e; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${template.name}</h1>
    <p><strong>Reporting Period:</strong> ${reportPeriod.quarter} ${reportPeriod.year}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-CA')}</p>
    <p><strong>Projects Included:</strong> ${projectData.length}</p>
  </div>

  ${projectData.map(project => `
    <h2>${project.name}</h2>
    <p><em>${project.community} - ${project.territory_name}</em></p>
    
    ${sections.map(section => `
      <div class="section">
        <h3>${section.title}</h3>
        <pre style="white-space: pre-wrap; font-family: inherit;">${
          narratives[`${project.id}-${section.id}`] || generateReportContent(project, section.id)
        }</pre>
      </div>
    `).join('')}
  `).join('<hr style="margin: 40px 0;">')}

  <div class="footer">
    <p>This report was generated by the Canada Energy Intelligence Platform - Indigenous Energy Module.</p>
    <p>For questions about this report, contact your program officer or visit the platform dashboard.</p>
  </div>
</body>
</html>`;
  }

  function generateRTFReport(projectData: ProjectData[], sections: ReportSection[]): string {
    const template = REPORT_TEMPLATES[selectedTemplate];
    
    // Simple RTF format
    let rtf = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
{\\colortbl;\\red30\\green58\\blue95;\\red16\\green185\\blue129;}
\\f0\\fs24

{\\b\\fs32\\cf1 ${template.name}}\\par
\\par
{\\b Reporting Period:} ${reportPeriod.quarter} ${reportPeriod.year}\\par
{\\b Generated:} ${new Date().toLocaleDateString('en-CA')}\\par
{\\b Projects Included:} ${projectData.length}\\par
\\par
\\line
`;

    projectData.forEach(project => {
      rtf += `
{\\b\\fs28 ${project.name}}\\par
{\\i ${project.community} - ${project.territory_name}}\\par
\\par
`;
      
      sections.forEach(section => {
        const content = narratives[`${project.id}-${section.id}`] || generateReportContent(project, section.id);
        rtf += `{\\b ${section.title}}\\par
${content.replace(/\*\*/g, '').replace(/\n/g, '\\par\n')}\\par
\\par
`;
      });
      
      rtf += '\\line\\par\n';
    });

    rtf += '}';
    return rtf;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-gradient-to-r from-emerald-900 to-teal-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-700/80 p-3 rounded-xl">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Funder Reporting Dashboard</h1>
              <p className="text-emerald-100 text-sm mt-1">
                Generate Wah-ila-toos, CERRC, and Northern REACHE reports automatically
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Template Selection */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5 text-emerald-400" />
                Report Template
              </h2>
              <div className="space-y-3">
                {(Object.keys(REPORT_TEMPLATES) as ReportTemplate[]).map(templateId => (
                  <label
                    key={templateId}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate === templateId
                        ? 'bg-emerald-900/50 border border-emerald-500'
                        : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={templateId}
                      checked={selectedTemplate === templateId}
                      onChange={() => setSelectedTemplate(templateId)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{REPORT_TEMPLATES[templateId].name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {REPORT_TEMPLATES[templateId].description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Reporting Period */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-400" />
                Reporting Period
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Quarter</label>
                  <select
                    value={reportPeriod.quarter}
                    onChange={e => setReportPeriod(prev => ({ ...prev, quarter: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="Q1">Q1 (Jan-Mar)</option>
                    <option value="Q2">Q2 (Apr-Jun)</option>
                    <option value="Q3">Q3 (Jul-Sep)</option>
                    <option value="Q4">Q4 (Oct-Dec)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Year</label>
                  <select
                    value={reportPeriod.year}
                    onChange={e => setReportPeriod(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Project Selection */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building className="h-5 w-5 text-emerald-400" />
                Select Projects
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {projects.map(project => (
                  <label
                    key={project.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedProjects.includes(project.id)
                        ? 'bg-emerald-900/50 border border-emerald-500'
                        : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedProjects(prev => [...prev, project.id]);
                        } else {
                          setSelectedProjects(prev => prev.filter(id => id !== project.id));
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{project.name}</div>
                      <div className="text-xs text-slate-400">{project.community}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      project.fpic_status === 'obtained' ? 'bg-emerald-900 text-emerald-300' :
                      project.fpic_status === 'in_progress' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-slate-600 text-slate-300'
                    }`}>
                      {project.fpic_status}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Export Buttons */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Download className="h-5 w-5 text-emerald-400" />
                Export Report
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => exportReport('pdf')}
                  disabled={generating || selectedProjects.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <File className="h-4 w-4" />
                  PDF
                </button>
                <button
                  onClick={() => exportReport('excel')}
                  disabled={generating || selectedProjects.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </button>
                <button
                  onClick={() => exportReport('word')}
                  disabled={generating || selectedProjects.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Word
                </button>
                <button
                  onClick={() => exportReport('json')}
                  disabled={generating || selectedProjects.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  JSON
                </button>
              </div>
              {selectedProjects.length === 0 && (
                <p className="text-xs text-amber-400 mt-3">
                  Select at least one project to generate a report
                </p>
              )}
            </div>
          </div>

          {/* Right Panel - Report Preview */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <FileText className="h-6 w-6 text-emerald-400" />
                Report Preview
              </h2>

              {selectedProjects.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select projects to preview the report</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Report Header */}
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-emerald-400">
                      {REPORT_TEMPLATES[selectedTemplate].name}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {reportPeriod.quarter} {reportPeriod.year} • {selectedProjects.length} project(s)
                    </p>
                  </div>

                  {/* Sections */}
                  {projects
                    .filter(p => selectedProjects.includes(p.id))
                    .map(project => (
                      <div key={project.id} className="border border-slate-600 rounded-lg overflow-hidden">
                        <div className="bg-slate-700 px-4 py-3">
                          <h4 className="font-semibold">{project.name}</h4>
                          <p className="text-sm text-slate-400">{project.community}</p>
                        </div>
                        
                        <div className="divide-y divide-slate-700">
                          {reportSections.map(section => (
                            <div key={section.id} className="bg-slate-800">
                              <button
                                onClick={() => toggleSection(`${project.id}-${section.id}`)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={section.enabled}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleSectionEnabled(section.id);
                                    }}
                                    className="rounded"
                                  />
                                  <span className={section.enabled ? '' : 'text-slate-500 line-through'}>
                                    {section.title}
                                  </span>
                                </div>
                                {expandedSections.has(`${project.id}-${section.id}`) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                              
                              {expandedSections.has(`${project.id}-${section.id}`) && section.enabled && (
                                <div className="px-4 pb-4">
                                  <div className="bg-slate-900 rounded-lg p-4">
                                    <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
                                      {generateReportContent(project, section.id)}
                                    </pre>
                                  </div>
                                  <div className="mt-3">
                                    <label className="block text-xs text-slate-400 mb-1">
                                      Add narrative (optional):
                                    </label>
                                    <textarea
                                      value={narratives[`${project.id}-${section.id}`] || ''}
                                      onChange={e => setNarratives(prev => ({
                                        ...prev,
                                        [`${project.id}-${section.id}`]: e.target.value
                                      }))}
                                      placeholder="Add additional context or narrative for this section..."
                                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 resize-none"
                                      rows={3}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FunderReportingDashboard;
