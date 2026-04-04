/**
 * NL2SQL Edge Function - Natural Language to SQL Query Generator
 * 
 * Converts natural language questions into safe, executable SQL queries
 * using LLM-powered generation with schema-aware context.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit, getClientId, logApiUsage } from "../_shared/rateLimit.ts";
import { introspectSchema, formatSchemaForLLM, type SchemaCatalog } from "./schema_discovery.ts";
import { validateAndSanitizeSQL, type SQLValidationResult } from "./sql_validator.ts";
import { getDemoDataForQuery } from "./demo_data.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";

// Validate critical environment variables early
const MISSING_ENV_VARS: string[] = [];
if (!SUPABASE_URL) MISSING_ENV_VARS.push("SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) MISSING_ENV_VARS.push("SUPABASE_SERVICE_ROLE_KEY");
if (!GEMINI_API_KEY) MISSING_ENV_VARS.push("GEMINI_API_KEY");

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Cache schema for 1 hour to avoid repeated introspection
let cachedSchema: SchemaCatalog | null = null;
let schemaCacheTime = 0;
const SCHEMA_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const MAX_QUERY_LENGTH = 500;
const MAX_RESULTS = 1000;
const QUERY_TIMEOUT_MS = 30000;

// Demo data mode - enabled via environment variable
const ENABLE_DEMO_DATA = Deno.env.get("ENABLE_DEMO_DATA") === "true";

interface NL2SQLRequest {
  query: string;
  maxResults?: number;
  includeExplanation?: boolean;
  format?: 'json' | 'markdown' | 'chart';
}

interface NL2SQLResponse {
  naturalQuery: string;
  generatedSQL: string;
  results: unknown[];
  explanation?: string;
  meta: {
    executionTimeMs: number;
    rowCount: number;
    truncated: boolean;
    cacheHit: boolean;
    schemaVersion: string;
    isDemoData: boolean;
  };
}

function jsonResponse(req: Request, status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...createCorsHeaders(req),
      ...extraHeaders,
    },
  });
}

/**
 * Get schema with caching
 */
async function getSchema(): Promise<SchemaCatalog> {
  const now = Date.now();
  if (cachedSchema && (now - schemaCacheTime) < SCHEMA_CACHE_TTL) {
    return cachedSchema;
  }

  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  cachedSchema = await introspectSchema(supabase);
  schemaCacheTime = now;
  return cachedSchema;
}

/**
 * Generate SQL using Gemini LLM
 */
async function generateSQLWithLLM(
  naturalQuery: string,
  schemaContext: string
): Promise<{ sql: string; explanation?: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const prompt = buildNL2SQLPrompt(naturalQuery, schemaContext);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Extract SQL from the response (it should be in ```sql blocks)
  const sqlMatch = generatedText.match(/```sql\s*([\s\S]*?)\s*```/);
  const sql = sqlMatch ? sqlMatch[1].trim() : generatedText.trim();

  // Extract explanation if present
  const explanationMatch = generatedText.match(/<!--\s*explanation:\s*([\s\S]*?)\s*-->/);
  const explanation = explanationMatch ? explanationMatch[1].trim() : undefined;

  return { sql, explanation };
}

/**
 * Build the NL2SQL prompt with schema context and few-shot examples
 */
function buildNL2SQLPrompt(naturalQuery: string, schemaContext: string): string {
  return `You are an expert SQL generator for a Canadian energy data platform (CEIP).

Your task is to convert natural language questions into safe, efficient PostgreSQL queries.

## Database Schema

${schemaContext}

## Query Requirements

1. Generate ONLY SELECT statements (no INSERT, UPDATE, DELETE, DROP, etc.)
2. Always include a LIMIT clause (max 1000 rows)
3. Use table aliases for readability
4. Prefer specific column selection over SELECT *
5. Use appropriate WHERE clauses to filter data
6. Include ORDER BY when returning time-series data
7. Use appropriate aggregations (AVG, SUM, COUNT) when asked for summaries

## Few-Shot Examples

User: "Show me Alberta pool prices from yesterday"
SQL:
\`\`\`sql
SELECT timestamp, pool_price 
FROM alberta_grid_prices 
WHERE timestamp >= CURRENT_DATE - INTERVAL '1 day'
  AND timestamp < CURRENT_DATE
ORDER BY timestamp DESC
LIMIT 100
\`\`\`
<!-- explanation: Retrieves Alberta pool prices for the previous 24 hours -->

User: "What's the average Ontario demand last week?"
SQL:
\`\`\`sql
SELECT AVG(demand_mw) as avg_demand,
       MIN(demand_mw) as min_demand,
       MAX(demand_mw) as max_demand
FROM grid_snapshots
WHERE province = 'ON'
  AND timestamp >= NOW() - INTERVAL '7 days'
LIMIT 1
\`\`\`
<!-- explanation: Calculates demand statistics for Ontario over the past week -->

User: "Show me carbon emissions by province"
SQL:
\`\`\`sql
SELECT province,
       SUM(emissions_tons) as total_emissions,
       AVG(emissions_tons) as avg_emissions,
       COUNT(*) as measurement_count
FROM carbon_emissions
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY province
ORDER BY total_emissions DESC
LIMIT 50
\`\`\`
<!-- explanation: Aggregates carbon emissions by province for the last 30 days -->

User: "Find recent curtailment events in Alberta"
SQL:
\`\`\`sql
SELECT timestamp,
       renewable_type,
       curtailed_mwh,
       reason,
       facility_name
FROM curtailment_events
WHERE province = 'AB'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC
LIMIT 25
\`\`\`
<!-- explanation: Lists recent renewable curtailment events in Alberta -->

## Your Task

Convert this natural language question into SQL:
"${naturalQuery}"

Respond with ONLY the SQL query wrapped in \`\`\`sql blocks. Optionally include an HTML comment with a brief explanation.
`;
}

/**
 * Execute the generated SQL query safely
 */
async function executeQuery(sql: string, maxResults: number): Promise<{ results: unknown[]; truncated: boolean; isDemoData: boolean }> {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  // Add LIMIT if not present
  let safeSQL = sql;
  if (!/\bLIMIT\s+\d+/i.test(sql)) {
    safeSQL = `${sql} LIMIT ${maxResults}`;
  } else {
    // Ensure existing LIMIT doesn't exceed max
    safeSQL = sql.replace(/\bLIMIT\s+(\d+)/i, (match, num) => {
      const n = parseInt(num, 10);
      return `LIMIT ${Math.min(n, maxResults)}`;
    });
  }

  // Execute with timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    // Use rpc for raw SQL execution (requires appropriate permissions)
    const { data, error } = await supabase.rpc('execute_readonly_sql', {
      sql: safeSQL,
    });

    clearTimeout(timeoutId);

    if (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }

    let results = Array.isArray(data) ? data : [];
    let isDemoData = false;

    // If no results and demo mode enabled, try to return demo data
    if (results.length === 0 && ENABLE_DEMO_DATA) {
      const demoResults = getDemoDataForQuery(sql, maxResults);
      if (demoResults.length > 0) {
        results = demoResults;
        isDemoData = true;
      }
    }

    const truncated = results.length >= maxResults;

    return { results: results.slice(0, maxResults), truncated, isDemoData };
  } catch (e) {
    clearTimeout(timeoutId);
    
    // If execute_readonly_sql doesn't exist, try demo data if enabled
    if (ENABLE_DEMO_DATA) {
      const demoResults = getDemoDataForQuery(sql, maxResults);
      if (demoResults.length > 0) {
        return { results: demoResults.slice(0, maxResults), truncated: false, isDemoData: true };
      }
    }
    
    console.warn('execute_readonly_sql RPC not available, query execution limited');
    return { results: [], truncated: false, isDemoData: false };
  }
}

/**
 * Format results for output
 */
function formatResults(results: unknown[], format: string): unknown[] | string {
  if (format === 'json') {
    return results;
  }

  if (format === 'markdown' && results.length > 0) {
    const firstRow = results[0] as Record<string, unknown>;
    const columns = Object.keys(firstRow);
    
    // Build markdown table
    const lines: string[] = [
      '| ' + columns.join(' | ') + ' |',
      '| ' + columns.map(() => '---').join(' | ') + ' |',
    ];

    for (const row of results.slice(0, 100)) {
      const rowData = row as Record<string, unknown>;
      const values = columns.map(col => {
        const val = rowData[col];
        if (val === null) return 'NULL';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      });
      lines.push('| ' + values.join(' | ') + ' |');
    }

    if (results.length > 100) {
      lines.push(`\n*... ${results.length - 100} more rows*\n`);
    }

    return lines.join('\n');
  }

  return results;
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // Handle CORS preflight FIRST - before any processing
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = createCorsHeaders(req);
  
  // Return early error if environment variables are missing
  // This ensures CORS headers are included even for config errors
  if (MISSING_ENV_VARS.length > 0) {
    return new Response(
      JSON.stringify({
        error: 'Server configuration error',
        message: `Missing required environment variables: ${MISSING_ENV_VARS.join(', ')}`,
        hint: 'Please set GEMINI_API_KEY in Supabase Edge Function secrets'
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  const rl = applyRateLimit(req, 'nl2sql');
  if (rl.response) return rl.response;

  if (req.method !== 'POST') {
    return jsonResponse(req, 405, { error: 'Method not allowed' }, { ...corsHeaders, ...rl.headers });
  }

  const startedAt = Date.now();
  const clientId = getClientId(req);
  const apiKey = clientId.startsWith('key:') ? clientId.slice(4) : null;
  const ipAddress = clientId.startsWith('ip:') ? clientId.slice(3) : null;

  try {
    // Parse request
    const body = await req.json().catch(() => ({}));
    const request: NL2SQLRequest = {
      query: typeof body?.query === 'string' ? body.query.trim() : '',
      maxResults: Math.min(MAX_RESULTS, Math.max(1, Number(body?.maxResults) || 100)),
      includeExplanation: body?.includeExplanation !== false,
      format: ['json', 'markdown', 'chart'].includes(body?.format) ? body.format : 'json',
    };

    if (!request.query || request.query.length > MAX_QUERY_LENGTH) {
      return jsonResponse(
        req,
        400,
        { error: 'Query must be a non-empty string up to 500 characters' },
        { ...corsHeaders, ...rl.headers }
      );
    }

    // Check if schema is cached
    const schemaStartTime = Date.now();
    const schema = await getSchema();
    const cacheHit = (Date.now() - schemaStartTime) < 100; // If fast, likely cached

    // Generate SQL
    const schemaContext = formatSchemaForLLM(schema);
    const { sql, explanation } = await generateSQLWithLLM(request.query, schemaContext);

    // Validate and sanitize SQL
    const validation: SQLValidationResult = validateAndSanitizeSQL(sql);
    if (!validation.isValid) {
      await logApiUsage({
        endpoint: 'nl2sql',
        method: req.method,
        statusCode: 400,
        apiKey,
        ipAddress,
        responseTimeMs: Date.now() - startedAt,
        extra: { queryLength: request.query.length, error: validation.error },
      });

      return jsonResponse(
        req,
        400,
        {
          error: 'Generated SQL failed validation',
          details: validation.error,
          generatedSQL: sql,
        },
        { ...corsHeaders, ...rl.headers }
      );
    }

    // Execute query
    const execStart = Date.now();
    const { results, truncated, isDemoData } = await executeQuery(validation.sanitizedSQL, request.maxResults);
    const executionTimeMs = Date.now() - execStart;

    // Format response
    const formattedResults = formatResults(results, request.format);

    const response: NL2SQLResponse = {
      naturalQuery: request.query,
      generatedSQL: validation.sanitizedSQL,
      results: request.format === 'markdown' ? [] : formattedResults as unknown[],
      explanation: request.includeExplanation ? explanation : undefined,
      meta: {
        executionTimeMs,
        rowCount: results.length,
        truncated,
        cacheHit,
        schemaVersion: schema.version,
        isDemoData,
      },
    };

    // Include markdown as string if requested
    if (request.format === 'markdown') {
      (response as any).markdownTable = formattedResults;
    }

    await logApiUsage({
      endpoint: 'nl2sql',
      method: req.method,
      statusCode: 200,
      apiKey,
      ipAddress,
      responseTimeMs: Date.now() - startedAt,
      extra: {
        queryLength: request.query.length,
        generatedSQLLength: sql.length,
        rowCount: results.length,
        executionTimeMs,
        cacheHit,
      },
    });

    return jsonResponse(req, 200, response, { ...corsHeaders, ...rl.headers });

  } catch (error) {
    console.error('NL2SQL error:', error);

    await logApiUsage({
      endpoint: 'nl2sql',
      method: req.method,
      statusCode: 500,
      apiKey,
      ipAddress,
      responseTimeMs: Date.now() - startedAt,
      extra: { error: String(error) },
    });

    return jsonResponse(
      req,
      500,
      { error: 'NL2SQL processing failed', message: String(error) },
      { ...corsHeaders, ...rl.headers }
    );
  }
});
