export type AiceiSourceMode = 'starter_portfolio' | 'constructed_commercial_scenario' | 'uploaded_portfolio';

export interface AiceiProjectRecord {
  id: string;
  name: string;
  reportingPeriod: string;
  community: string;
  technology: string;
  generationKwh: number;
  baselineGhgTonnes: number;
  actualGhgTonnes: number;
  capacityBuildingActivities: string[];
  participantsCount: number;
  participantsHours: number;
  communityApprovalStatus: 'approved' | 'pending' | 'owner_supplied' | 'not_started';
  ownerSuppliedNotes?: string;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/[$,%\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function splitCsvRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (character === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }
  cells.push(current.trim());
  return cells;
}

export function buildStarterAiceiProjects(): AiceiProjectRecord[] {
  return [
    {
      id: 'aicei-1',
      name: 'Treaty 8 Solar Microgrid',
      reportingPeriod: 'Q1 2026',
      community: 'Mikisew Cree First Nation',
      technology: 'solar-storage',
      generationKwh: 57500,
      baselineGhgTonnes: 42,
      actualGhgTonnes: 31,
      capacityBuildingActivities: ['Solar installation training', 'Energy management workshop'],
      participantsCount: 30,
      participantsHours: 32,
      communityApprovalStatus: 'approved',
      ownerSuppliedNotes: 'Starter portfolio for Alberta AICEI reporting motion.',
    },
    {
      id: 'aicei-2',
      name: 'Northern Wind Heat Displacement',
      reportingPeriod: 'Q1 2026',
      community: 'Peerless Trout First Nation',
      technology: 'wind-storage',
      generationKwh: 70200,
      baselineGhgTonnes: 48,
      actualGhgTonnes: 28,
      capacityBuildingActivities: ['Youth STEM energy camp'],
      participantsCount: 35,
      participantsHours: 40,
      communityApprovalStatus: 'pending',
      ownerSuppliedNotes: 'Chief and Council signature pending.',
    },
    {
      id: 'aicei-3',
      name: 'Treaty 8 Solar Microgrid',
      reportingPeriod: 'Q4 2025',
      community: 'Mikisew Cree First Nation',
      technology: 'solar-storage',
      generationKwh: 83100,
      baselineGhgTonnes: 55,
      actualGhgTonnes: 22,
      capacityBuildingActivities: ['Operations refresher', 'Local procurement session'],
      participantsCount: 18,
      participantsHours: 20,
      communityApprovalStatus: 'approved',
    },
  ];
}

export function buildAiceiSourceLabel(sourceMode: AiceiSourceMode): string {
  if (sourceMode === 'uploaded_portfolio') return 'Uploaded AICEI portfolio';
  if (sourceMode === 'constructed_commercial_scenario') return 'Constructed AICEI portfolio';
  return 'Starter AICEI portfolio';
}

function normalizeProject(record: Record<string, unknown>, index: number): AiceiProjectRecord {
  return {
    id: String(record.id ?? `aicei-${index + 1}`),
    name: String(record.name ?? `Uploaded project ${index + 1}`),
    reportingPeriod: String(record.reporting_period ?? record.reportingPeriod ?? 'Q1 2026'),
    community: String(record.community ?? ''),
    technology: String(record.technology ?? 'renewable'),
    generationKwh: toNumber(record.generation_kwh ?? record.generationKwh),
    baselineGhgTonnes: toNumber(record.baseline_ghg ?? record.baselineGhgTonnes),
    actualGhgTonnes: toNumber(record.actual_ghg ?? record.actualGhgTonnes),
    capacityBuildingActivities: Array.isArray(record.capacity_building_activities)
      ? record.capacity_building_activities.map((item) => String(item))
      : String(record.capacity_building_activities ?? record.capacityBuildingActivities ?? '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean),
    participantsCount: toNumber(record.participants_count ?? record.participantsCount),
    participantsHours: toNumber(record.participants_hours ?? record.participantsHours),
    communityApprovalStatus: String(record.community_approval_status ?? record.communityApprovalStatus ?? 'owner_supplied') as AiceiProjectRecord['communityApprovalStatus'],
    ownerSuppliedNotes: String(record.owner_supplied_notes ?? record.ownerSuppliedNotes ?? ''),
  };
}

export function parseAiceiProjects(filename: string, text: string): AiceiProjectRecord[] {
  if (filename.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.projects;
    if (!Array.isArray(rows)) {
      throw new Error('AICEI JSON import must be an array of projects or a { projects: [] } object.');
    }
    return rows.map((row, index) => normalizeProject(row, index));
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('AICEI CSV import requires a header row and at least one project row.');
  }

  const headers = splitCsvRow(lines[0]);
  return lines.slice(1).map((line, index) => {
    const row: Record<string, string> = {};
    splitCsvRow(line).forEach((cell, cellIndex) => {
      row[headers[cellIndex] ?? `col_${cellIndex}`] = cell;
    });
    return normalizeProject(row, index);
  });
}

export function listAiceiReportingPeriods(records: AiceiProjectRecord[]): string[] {
  return Array.from(new Set(records.map((record) => record.reportingPeriod)));
}

export function buildAiceiMetricsCsv(records: AiceiProjectRecord[]): string {
  return [
    '# AICEI quarterly metrics export',
    `# Generated: ${new Date().toISOString()}`,
    'project_id,project_name,reporting_period,community,technology,generation_kwh,baseline_ghg,actual_ghg,ghg_reduction,participants_count,participants_hours,community_approval_status',
    ...records.map((record) => [
      record.id,
      `"${record.name}"`,
      record.reportingPeriod,
      `"${record.community}"`,
      record.technology,
      record.generationKwh,
      record.baselineGhgTonnes,
      record.actualGhgTonnes,
      Math.max(record.baselineGhgTonnes - record.actualGhgTonnes, 0),
      record.participantsCount,
      record.participantsHours,
      record.communityApprovalStatus,
    ].join(',')),
  ].join('\n');
}

export function buildAiceiChecklist(records: AiceiProjectRecord[]): string[] {
  const checklist: string[] = [];
  records.forEach((record) => {
    if (record.communityApprovalStatus !== 'approved') {
      checklist.push(`${record.name}: community approval status is ${record.communityApprovalStatus}`);
    }
    if (record.capacityBuildingActivities.length === 0) {
      checklist.push(`${record.name}: add at least one capacity-building activity`);
    }
  });
  return checklist.length > 0 ? checklist : ['No missing approvals or reporting gaps flagged in the current portfolio.'];
}
