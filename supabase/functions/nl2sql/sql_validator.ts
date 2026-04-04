/**
 * SQL Validation and Sanitization for NL2SQL
 * 
 * Ensures generated SQL is safe to execute:
 * - Only SELECT statements allowed
 * - No destructive operations
 * - Mandatory LIMIT clause
 * - Query complexity limits
 */

export interface SQLValidationResult {
  isValid: boolean;
  sanitizedSQL: string;
  originalSQL: string;
  error?: string;
  warnings?: string[];
  queryComplexity: {
    estimatedCost: 'low' | 'medium' | 'high';
    hasJoins: boolean;
    hasAggregations: boolean;
    hasSubqueries: boolean;
    tableCount: number;
  };
}

// Dangerous keywords that are never allowed
const FORBIDDEN_KEYWORDS = [
  'DELETE',
  'INSERT',
  'UPDATE',
  'DROP',
  'TRUNCATE',
  'ALTER',
  'CREATE',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
  'MERGE',
  'UPSERT',
  'REPLACE',
];

// Potentially dangerous patterns
const DANGEROUS_PATTERNS = [
  /;\s*DROP/i,
  /;\s*DELETE/i,
  /;\s*INSERT/i,
  /;\s*UPDATE/i,
  /UNION\s+SELECT/i,
  /INTO\s+OUTFILE/i,
  /INTO\s+DUMPFILE/i,
  /LOAD_FILE/i,
  /BENCHMARK\s*\(/i,
  /SLEEP\s*\(/i,
  /PG_SLEEP/i,
  /WAITFOR\s+DELAY/i,
];

// Allowed statement types (must start with these)
const ALLOWED_PREFIXES = [
  'SELECT',
  'WITH', // CTEs are allowed if they contain only SELECTs
];

/**
 * Validate and sanitize SQL query
 */
export function validateAndSanitizeSQL(sql: string): SQLValidationResult {
  const originalSQL = sql.trim();
  const warnings: string[] = [];

  // Check for empty query
  if (!originalSQL) {
    return {
      isValid: false,
      sanitizedSQL: '',
      originalSQL,
      error: 'Empty SQL query',
      queryComplexity: { estimatedCost: 'low', hasJoins: false, hasAggregations: false, hasSubqueries: false, tableCount: 0 },
    };
  }

  // Normalize for checking (uppercase, single spaces)
  const normalizedSQL = originalSQL.replace(/\s+/g, ' ').toUpperCase();

  // Check for forbidden keywords
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(originalSQL)) {
      return {
        isValid: false,
        sanitizedSQL: '',
        originalSQL,
        error: `Forbidden keyword detected: ${keyword}. Only SELECT queries are allowed.`,
        queryComplexity: { estimatedCost: 'low', hasJoins: false, hasAggregations: false, hasSubqueries: false, tableCount: 0 },
      };
    }
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(originalSQL)) {
      return {
        isValid: false,
        sanitizedSQL: '',
        originalSQL,
        error: `Potentially dangerous SQL pattern detected: ${pattern.source}`,
        queryComplexity: { estimatedCost: 'low', hasJoins: false, hasAggregations: false, hasSubqueries: false, tableCount: 0 },
      };
    }
  }

  // Check statement type
  const firstWord = normalizedSQL.split(' ')[0];
  if (!ALLOWED_PREFIXES.includes(firstWord)) {
    return {
      isValid: false,
      sanitizedSQL: '',
      originalSQL,
      error: `Query must start with SELECT or WITH. Found: ${firstWord}`,
      queryComplexity: { estimatedCost: 'low', hasJoins: false, hasAggregations: false, hasSubqueries: false, tableCount: 0 },
    };
  }

  // For WITH statements, verify they only contain SELECTs
  if (firstWord === 'WITH') {
    const afterWith = normalizedSQL.replace(/^WITH\s+/, '');
    // Check if there's a non-SELECT statement after CTE definitions
    const cteEndMatch = afterWith.match(/\)\s*SELECT\s/i);
    if (!cteEndMatch) {
      return {
        isValid: false,
        sanitizedSQL: '',
        originalSQL,
        error: 'WITH clause must be followed by SELECT statement',
        queryComplexity: { estimatedCost: 'low', hasJoins: false, hasAggregations: false, hasSubqueries: false, tableCount: 0 },
      };
    }
  }

  // Analyze complexity
  const complexity = analyzeComplexity(originalSQL);

  // Add LIMIT if missing (and not a COUNT query)
  let sanitizedSQL = originalSQL;
  const hasLimit = /\bLIMIT\s+\d+/i.test(originalSQL);
  const isCountQuery = /SELECT\s+COUNT\s*\(/i.test(originalSQL);
  
  if (!hasLimit && !isCountQuery) {
    sanitizedSQL = `${originalSQL} LIMIT 1000`;
    warnings.push('Added LIMIT 1000 clause for safety');
  }

  // Warn about high complexity
  if (complexity.estimatedCost === 'high') {
    warnings.push('Query has high estimated complexity - may timeout');
  }

  return {
    isValid: true,
    sanitizedSQL,
    originalSQL,
    warnings: warnings.length > 0 ? warnings : undefined,
    queryComplexity: complexity,
  };
}

/**
 * Analyze query complexity
 */
function analyzeComplexity(sql: string): SQLValidationResult['queryComplexity'] {
  const normalized = sql.toUpperCase();
  
  // Count JOINs
  const joinMatches = normalized.match(/\bJOIN\b/g);
  const hasJoins = !!joinMatches && joinMatches.length > 0;
  const joinCount = joinMatches?.length || 0;

  // Count aggregations
  const aggMatches = normalized.match(/\b(COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT)\s*\(/gi);
  const hasAggregations = !!aggMatches && aggMatches.length > 0;

  // Check for subqueries
  const hasSubqueries = /\(\s*SELECT\s+/i.test(sql);

  // Estimate tables (FROM + JOIN clauses)
  const fromMatches = normalized.match(/\bFROM\s+(\w+)/gi);
  const tableCount = (fromMatches?.length || 0) + joinCount;

  // Determine cost
  let estimatedCost: 'low' | 'medium' | 'high' = 'low';
  
  if (hasSubqueries || joinCount > 2 || tableCount > 3) {
    estimatedCost = 'high';
  } else if (hasJoins || hasAggregations) {
    estimatedCost = 'medium';
  }

  // Check for full table scans (no WHERE clause on large tables)
  if (!/\bWHERE\b/i.test(sql) && tableCount > 0) {
    estimatedCost = 'high';
  }

  return {
    estimatedCost,
    hasJoins,
    hasAggregations,
    hasSubqueries,
    tableCount,
  };
}

/**
 * Get human-readable explanation of complexity
 */
export function explainComplexity(complexity: SQLValidationResult['queryComplexity']): string {
  const parts: string[] = [];
  
  if (complexity.tableCount > 0) {
    parts.push(`${complexity.tableCount} table${complexity.tableCount > 1 ? 's' : ''}`);
  }
  
  if (complexity.hasJoins) {
    parts.push('with JOINs');
  }
  
  if (complexity.hasAggregations) {
    parts.push('with aggregations');
  }
  
  if (complexity.hasSubqueries) {
    parts.push('with subqueries');
  }

  const description = parts.length > 0 ? parts.join(', ') : 'simple query';
  return `${complexity.estimatedCost.toUpperCase()} complexity: ${description}`;
}
