/**
 * Database Schema Introspection for NL2SQL
 * 
 * Discovers table schemas, relationships, and common query patterns
 * to provide context for LLM-powered SQL generation.
 */

export interface TableColumn {
  name: string;
  type: string;
  isNullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface TableSchema {
  name: string;
  description?: string;
  columns: TableColumn[];
  primaryKeys: string[];
  foreignKeys: Array<{
    column: string;
    referencesTable: string;
    referencesColumn: string;
  }>;
  rowCount?: number;
  lastUpdated?: string;
  sampleQueries?: string[];
}

export interface SchemaCatalog {
  tables: TableSchema[];
  version: string;
  generatedAt: string;
  energyDomainHints: Record<string, string[]>;
}

// Key tables for energy domain queries
const ENERGY_DOMAIN_TABLES = [
  'grid_snapshots',
  'alberta_grid_prices',
  'ontario_hoep_prices',
  'generation_mix',
  'carbon_emissions',
  'demand_forecasts',
  'renewable_forecasts',
  'storage_dispatch_actions',
  'curtailment_events',
  'aeso_queue',
  'ieso_queue',
  'document_embeddings',
  'ops_health',
  'observations',
];

// Common query patterns for energy domain
const SAMPLE_QUERIES: Record<string, string[]> = {
  grid_snapshots: [
    'SELECT * FROM grid_snapshots WHERE province = \'AB\' ORDER BY timestamp DESC LIMIT 10',
    'SELECT AVG(demand_mw) FROM grid_snapshots WHERE province = \'ON\' AND timestamp > NOW() - INTERVAL \'7 days\'',
  ],
  alberta_grid_prices: [
    'SELECT * FROM alberta_grid_prices ORDER BY timestamp DESC LIMIT 24',
    'SELECT AVG(pool_price) FROM alberta_grid_prices WHERE timestamp > NOW() - INTERVAL \'1 day\'',
  ],
  ontario_hoep_prices: [
    'SELECT * FROM ontario_hoep_prices ORDER BY timestamp DESC LIMIT 24',
    'SELECT AVG(hoep) FROM ontario_hoep_prices WHERE date >= CURRENT_DATE - INTERVAL \'7 days\'',
  ],
  carbon_emissions: [
    'SELECT * FROM carbon_emissions WHERE province = \'AB\' ORDER BY timestamp DESC LIMIT 10',
    'SELECT SUM(emissions_tons) FROM carbon_emissions WHERE timestamp > NOW() - INTERVAL \'30 days\'',
  ],
  demand_forecasts: [
    'SELECT * FROM demand_forecasts WHERE province = \'ON\' ORDER BY forecast_time DESC LIMIT 10',
    'SELECT AVG(forecast_value) FROM demand_forecasts WHERE province = \'AB\' AND forecast_time > NOW()',
  ],
  curtailment_events: [
    "SELECT * FROM curtailment_events WHERE province = 'AB' ORDER BY occurred_at DESC LIMIT 25",
    "SELECT SUM(total_energy_curtailed_mwh) FROM curtailment_events WHERE occurred_at > NOW() - INTERVAL '7 days'",
    "SELECT province, source_type, curtailed_mw, reason, occurred_at FROM curtailment_events WHERE province = 'AB' AND occurred_at >= NOW() - INTERVAL '7 days' ORDER BY occurred_at DESC LIMIT 25",
  ],
  document_embeddings: [
    "SELECT * FROM document_embeddings WHERE source_type = 'energy_corpus' LIMIT 5",
  ],
};

const FALLBACK_SCHEMA_TABLES: TableSchema[] = [
  {
    name: 'grid_snapshots',
    description: getTableDescription('grid_snapshots'),
    columns: [
      { name: 'id', type: 'uuid', isNullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: 'province', type: 'text', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'timestamp', type: 'timestamptz', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'demand_mw', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'supply_mw', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'imports_mw', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'exports_mw', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
    ],
    primaryKeys: ['id'],
    foreignKeys: [],
    sampleQueries: SAMPLE_QUERIES.grid_snapshots,
  },
  {
    name: 'alberta_grid_prices',
    description: getTableDescription('alberta_grid_prices'),
    columns: [
      { name: 'id', type: 'uuid', isNullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: 'timestamp', type: 'timestamptz', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'pool_price', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'rolling_30d_avg', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
    ],
    primaryKeys: ['id'],
    foreignKeys: [],
    sampleQueries: SAMPLE_QUERIES.alberta_grid_prices,
  },
  {
    name: 'ontario_hoep_prices',
    description: getTableDescription('ontario_hoep_prices'),
    columns: [
      { name: 'id', type: 'uuid', isNullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: 'date', type: 'date', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'hour', type: 'integer', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'hoep', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
    ],
    primaryKeys: ['id'],
    foreignKeys: [],
    sampleQueries: SAMPLE_QUERIES.ontario_hoep_prices,
  },
  {
    name: 'carbon_emissions',
    description: getTableDescription('carbon_emissions'),
    columns: [
      { name: 'id', type: 'uuid', isNullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: 'province', type: 'text', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'timestamp', type: 'timestamptz', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'emissions_tons', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
    ],
    primaryKeys: ['id'],
    foreignKeys: [],
    sampleQueries: SAMPLE_QUERIES.carbon_emissions,
  },
  {
    name: 'curtailment_events',
    description: getTableDescription('curtailment_events'),
    columns: [
      { name: 'id', type: 'uuid', isNullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: 'province', type: 'text', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'source_type', type: 'text', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'curtailed_mw', type: 'numeric', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'available_capacity_mw', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'curtailment_percent', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'duration_hours', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'total_energy_curtailed_mwh', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'reason', type: 'text', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'reason_detail', type: 'text', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'market_price_cad_per_mwh', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'opportunity_cost_cad', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'grid_demand_mw', type: 'numeric', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'mitigation_actions', type: 'jsonb', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'mitigation_effective', type: 'boolean', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'occurred_at', type: 'timestamptz', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'ended_at', type: 'timestamptz', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'detected_at', type: 'timestamptz', isNullable: false, defaultValue: 'now()', isPrimaryKey: false, isForeignKey: false },
      { name: 'data_source', type: 'text', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'notes', type: 'text', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
    ],
    primaryKeys: ['id'],
    foreignKeys: [],
    sampleQueries: SAMPLE_QUERIES.curtailment_events,
  },
  {
    name: 'document_embeddings',
    description: getTableDescription('document_embeddings'),
    columns: [
      { name: 'id', type: 'uuid', isNullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: 'source_type', type: 'text', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'source_id', type: 'text', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'chunk_index', type: 'integer', isNullable: false, defaultValue: '0', isPrimaryKey: false, isForeignKey: false },
      { name: 'title', type: 'text', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'content', type: 'text', isNullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'source_url', type: 'text', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'source_updated_at', type: 'timestamptz', isNullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: 'metadata', type: 'jsonb', isNullable: false, defaultValue: "'{}'::jsonb", isPrimaryKey: false, isForeignKey: false },
    ],
    primaryKeys: ['id'],
    foreignKeys: [],
    sampleQueries: SAMPLE_QUERIES.document_embeddings,
  },
];

function buildFallbackCatalog(): SchemaCatalog {
  return {
    tables: FALLBACK_SCHEMA_TABLES,
    version: 'fallback-1.0.0',
    generatedAt: new Date().toISOString(),
    energyDomainHints: buildEnergyDomainHints(FALLBACK_SCHEMA_TABLES),
  };
}

/**
 * Query the database information schema to build table metadata
 */
export async function introspectSchema(supabase: any): Promise<SchemaCatalog> {
  const tables: TableSchema[] = [];

  // Get all tables in the public schema
  const { data: tableData, error: tableError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE');

  if (tableError) {
    console.warn(`Failed to introspect tables, using fallback schema catalog: ${tableError.message}`);
    return buildFallbackCatalog();
  }

  const tableNames = tableData
    ?.map((t: any) => t.table_name)
    .filter((name: string) => !name.startsWith('_')) || [];

  // Introspect each table
  for (const tableName of tableNames) {
    try {
      const tableSchema = await introspectTable(supabase, tableName);
      tables.push(tableSchema);
    } catch (e) {
      console.warn(`Failed to introspect table ${tableName}:`, e);
    }
  }

  return {
    tables,
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    energyDomainHints: buildEnergyDomainHints(tables),
  };
}

/**
 * Introspect a single table's schema
 */
async function introspectTable(supabase: any, tableName: string): Promise<TableSchema> {
  // Get columns
  const { data: columnData, error: columnError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .order('ordinal_position');

  if (columnError) {
    throw new Error(`Failed to get columns for ${tableName}: ${columnError.message}`);
  }

  // Get primary keys
  const { data: pkData, error: pkError } = await supabase.rpc('get_primary_keys', {
    p_table_name: tableName,
  }).catch(() => ({ data: null, error: null }));

  // Get foreign keys
  const { data: fkData, error: fkError } = await supabase
    .from('information_schema.key_column_usage')
    .select('column_name, constraint_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .not('position_in_unique_constraint', 'is', null);

  // Build column definitions
  const columns: TableColumn[] = (columnData || []).map((col: any) => ({
    name: col.column_name,
    type: col.data_type,
    isNullable: col.is_nullable === 'YES',
    defaultValue: col.column_default,
    isPrimaryKey: pkData?.some((pk: any) => pk.column_name === col.column_name) || false,
    isForeignKey: fkData?.some((fk: any) => fk.column_name === col.column_name) || false,
  }));

  // Get approximate row count (fast estimate)
  const { data: countData } = await supabase
    .from(tableName)
    .select('*', { count: 'estimated', head: true })
    .catch(() => ({ count: null }));

  // Get last updated timestamp if exists
  let lastUpdated: string | undefined;
  const hasTimestamp = columns.some(c => c.name === 'updated_at' || c.name === 'timestamp' || c.name === 'created_at');
  if (hasTimestamp) {
    const timeCol = columns.find(c => c.name === 'updated_at') || 
                    columns.find(c => c.name === 'timestamp') ||
                    columns.find(c => c.name === 'created_at');
    if (timeCol) {
      const { data: latestData } = await supabase
        .from(tableName)
        .select(timeCol.name)
        .order(timeCol.name, { ascending: false })
        .limit(1)
        .single()
        .catch(() => ({ data: null }));
      if (latestData) {
        lastUpdated = latestData[timeCol.name];
      }
    }
  }

  return {
    name: tableName,
    description: getTableDescription(tableName),
    columns,
    primaryKeys: columns.filter(c => c.isPrimaryKey).map(c => c.name),
    foreignKeys: [], // Simplified for now
    rowCount: countData?.count || undefined,
    lastUpdated,
    sampleQueries: SAMPLE_QUERIES[tableName] || [],
  };
}

/**
 * Build hints for common energy domain queries
 */
function buildEnergyDomainHints(tables: TableSchema[]): Record<string, string[]> {
  const hints: Record<string, string[]> = {
    'Alberta prices': ['alberta_grid_prices', 'pool_price', 'timestamp'],
    'Ontario prices': ['ontario_hoep_prices', 'hoep', 'hour'],
    'Carbon emissions': ['carbon_emissions', 'emissions_tons', 'province'],
    'Demand': ['grid_snapshots', 'demand_mw', 'province'],
    'Generation': ['generation_mix', 'fuel_type', 'output_mw'],
    'Forecasts': ['demand_forecasts', 'renewable_forecasts', 'forecast_time'],
    'Storage': ['storage_dispatch_actions', 'action', 'target_mw'],
    'Curtailment': ['curtailment_events', 'source_type', 'curtailed_mw', 'occurred_at', 'reason', 'province'],
    'Queue': ['aeso_queue', 'ieso_queue', 'project_name', 'capacity_mw'],
  };

  return hints;
}

/**
 * Get human-readable description for common tables
 */
function getTableDescription(tableName: string): string | undefined {
  const descriptions: Record<string, string> = {
    grid_snapshots: 'Real-time grid status by province (demand, supply, imports/exports)',
    alberta_grid_prices: 'AESO pool price data for Alberta',
    ontario_hoep_prices: 'IESO hourly Ontario energy price (HOEP)',
    carbon_emissions: 'Provincial carbon emissions tracking',
    demand_forecasts: 'AI-powered demand forecasts by province',
    renewable_forecasts: 'Solar and wind generation forecasts',
    storage_dispatch_actions: 'Battery storage charge/discharge decisions',
    curtailment_events: 'Renewable energy curtailment incidents',
    aeso_queue: 'Alberta AESO interconnection queue projects',
    ieso_queue: 'Ontario IESO interconnection queue projects',
    document_embeddings: 'RAG corpus for energy domain knowledge',
    ops_health: 'System operational health metrics',
    observations: 'Raw sensor/SCADA observations',
  };

  return descriptions[tableName];
}

/**
 * Format schema catalog for LLM prompt context
 */
export function formatSchemaForLLM(catalog: SchemaCatalog): string {
  const lines: string[] = [
    '# Database Schema',
    '',
    `Generated: ${catalog.generatedAt}`,
    `Tables: ${catalog.tables.length}`,
    '',
  ];

  // Include energy domain tables first
  const priorityTables = catalog.tables.filter(t => ENERGY_DOMAIN_TABLES.includes(t.name));
  const otherTables = catalog.tables.filter(t => !ENERGY_DOMAIN_TABLES.includes(t.name));

  for (const table of [...priorityTables, ...otherTables].slice(0, 30)) {
    lines.push(`## ${table.name}`);
    if (table.description) {
      lines.push(`Description: ${table.description}`);
    }
    if (table.rowCount !== undefined) {
      lines.push(`Rows: ~${table.rowCount.toLocaleString()}`);
    }
    lines.push('');

    // Columns
    lines.push('Columns:');
    for (const col of table.columns) {
      const flags: string[] = [];
      if (col.isPrimaryKey) flags.push('PK');
      if (col.isForeignKey) flags.push('FK');
      if (!col.isNullable) flags.push('NOT NULL');
      
      const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
      lines.push(`  - ${col.name}: ${col.type}${flagStr}`);
    }
    lines.push('');

    // Sample queries if available
    if (table.sampleQueries && table.sampleQueries.length > 0) {
      lines.push('Example queries:');
      for (const query of table.sampleQueries.slice(0, 2)) {
        lines.push(`  ${query}`);
      }
      lines.push('');
    }
  }

  // Domain hints
  lines.push('## Energy Domain Query Patterns');
  lines.push('');
  for (const [concept, tables] of Object.entries(catalog.energyDomainHints)) {
    lines.push(`- ${concept}: related tables/columns include ${tables.join(', ')}`);
  }

  return lines.join('\n');
}
