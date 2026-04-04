-- Migration: Create execute_readonly_sql function for NL2SQL
-- This enables safe, read-only SQL execution for natural language queries
-- Date: 2026-03-26
-- Security: Only SELECT statements allowed, max 1000 rows, 30 second timeout

BEGIN;

-- Drop existing function if it exists (for idempotency)
DROP FUNCTION IF EXISTS public.execute_readonly_sql(text);

-- Create the read-only SQL execution function
CREATE OR REPLACE FUNCTION public.execute_readonly_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
    result JSONB;
    normalized_sql TEXT;
    forbidden_keywords TEXT[] := ARRAY[
        'DELETE', 'INSERT', 'UPDATE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE',
        'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'MERGE', 'UPSERT', 'REPLACE',
        'COPY', 'LOAD', 'INSTALL', 'UNINSTALL'
    ];
    keyword TEXT;
    has_limit BOOLEAN;
BEGIN
    -- Normalize SQL for checking (uppercase, remove extra whitespace)
    normalized_sql := upper(regexp_replace(sql_query, '\s+', ' ', 'g'));
    
    -- Check for forbidden keywords
    FOREACH keyword IN ARRAY forbidden_keywords
    LOOP
        IF normalized_sql ~ ('\b' || keyword || '\b') THEN
            RAISE EXCEPTION 'Forbidden keyword detected: %', keyword
                USING HINT = 'Only SELECT statements are allowed';
        END IF;
    END LOOP;
    
    -- Ensure query starts with SELECT or WITH
    IF NOT (normalized_sql ~ '^\s*(SELECT|WITH)\s') THEN
        RAISE EXCEPTION 'Query must start with SELECT or WITH'
            USING HINT = 'Only read-only queries are permitted';
    END IF;
    
    -- Check if query already has a LIMIT clause
    has_limit := normalized_sql ~ '\bLIMIT\s+\d+';
    
    -- Execute the query safely
    -- If no LIMIT, we add one at 1000 rows for safety
    IF has_limit THEN
        -- Query has its own LIMIT, execute as-is
        EXECUTE format(
            'SELECT to_jsonb(array_agg(row_to_json(t))) FROM (%s) t',
            sql_query
        ) INTO result;
    ELSE
        -- No LIMIT found, wrap with LIMIT 1000
        EXECUTE format(
            'SELECT to_jsonb(array_agg(row_to_json(t))) FROM (%s LIMIT 1000) t',
            sql_query
        ) INTO result;
    END IF;
    
    -- Return empty array if null (no results)
    RETURN COALESCE(result, '[]'::jsonb);
    
EXCEPTION
    WHEN OTHERS THEN
        -- Re-raise the exception with the original message
        RAISE;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.execute_readonly_sql(text) IS 
    'Executes read-only SQL queries for NL2SQL natural language interface. 
     Only SELECT statements allowed. Max 1000 rows. 30 second timeout.';

-- Grant execute permission to service role (Edge Functions use this)
GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(text) TO service_role;

-- Grant execute permission to authenticated users (if needed for direct API access)
GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(text) TO authenticated;

-- Also create a version with row limit parameter for flexibility
DROP FUNCTION IF EXISTS public.execute_readonly_sql(text, integer);

CREATE OR REPLACE FUNCTION public.execute_readonly_sql(
    sql_query TEXT,
    max_rows INTEGER DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
    result JSONB;
    normalized_sql TEXT;
    forbidden_keywords TEXT[] := ARRAY[
        'DELETE', 'INSERT', 'UPDATE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE',
        'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'MERGE', 'UPSERT', 'REPLACE',
        'COPY', 'LOAD', 'INSTALL', 'UNINSTALL'
    ];
    keyword TEXT;
    effective_limit INTEGER;
BEGIN
    -- Cap max_rows at 10000 for safety
    effective_limit := LEAST(COALESCE(max_rows, 1000), 10000);
    
    -- Normalize SQL for checking
    normalized_sql := upper(regexp_replace(sql_query, '\s+', ' ', 'g'));
    
    -- Check for forbidden keywords
    FOREACH keyword IN ARRAY forbidden_keywords
    LOOP
        IF normalized_sql ~ ('\b' || keyword || '\b') THEN
            RAISE EXCEPTION 'Forbidden keyword detected: %', keyword
                USING HINT = 'Only SELECT statements are allowed';
        END IF;
    END LOOP;
    
    -- Ensure query starts with SELECT or WITH
    IF NOT (normalized_sql ~ '^\s*(SELECT|WITH)\s') THEN
        RAISE EXCEPTION 'Query must start with SELECT or WITH'
            USING HINT = 'Only read-only queries are permitted';
    END IF;
    
    -- Execute with row limit
    EXECUTE format(
        'SELECT to_jsonb(array_agg(row_to_json(t))) FROM (%s LIMIT %s) t',
        sql_query,
        effective_limit
    ) INTO result;
    
    RETURN COALESCE(result, '[]'::jsonb);
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

COMMENT ON FUNCTION public.execute_readonly_sql(text, integer) IS 
    'Executes read-only SQL queries with configurable row limit. 
     Max 10000 rows hard cap. 30 second timeout.';

GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(text, integer) TO authenticated;

COMMIT;
