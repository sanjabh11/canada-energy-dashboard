-- Keep the declared REAL result contract aligned with pgvector's
-- double-precision cosine-distance expression.
CREATE OR REPLACE FUNCTION public.search_knowledge_base_dense(
  query_embedding vector(1536),
  limit_count integer DEFAULT 20,
  jurisdiction_filter text[] DEFAULT NULL,
  trust_tier_max smallint DEFAULT 4
)
RETURNS TABLE (
  id uuid,
  title text,
  body text,
  metadata jsonb,
  jurisdiction text,
  published_at timestamptz,
  trust_tier smallint,
  source_url text,
  similarity real
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.body,
    kb.metadata,
    kb.jurisdiction,
    kb.published_at,
    kb.trust_tier,
    kb.source_url,
    (1 - (kb.embedding <=> query_embedding))::real AS similarity
  FROM public.knowledge_base kb
  WHERE
    kb.embedding IS NOT NULL
    AND kb.trust_tier <= trust_tier_max
    AND (
      jurisdiction_filter IS NULL
      OR kb.jurisdiction = ANY(jurisdiction_filter)
      OR kb.jurisdiction IS NULL
    )
  ORDER BY kb.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$;
