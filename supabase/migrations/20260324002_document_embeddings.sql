BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id text NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  title text,
  content text NOT NULL,
  source_url text,
  source_updated_at timestamptz,
  embedding vector(1536),
  embedding_model text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_embeddings_source_key UNIQUE (source_type, source_id, chunk_index),
  CONSTRAINT document_embeddings_chunk_index_check CHECK (chunk_index >= 0),
  CONSTRAINT document_embeddings_source_type_check CHECK (length(trim(source_type)) > 0),
  CONSTRAINT document_embeddings_source_id_check CHECK (length(trim(source_id)) > 0),
  CONSTRAINT document_embeddings_content_check CHECK (length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS document_embeddings_source_lookup_idx
  ON public.document_embeddings (source_type, source_id, chunk_index);

CREATE INDEX IF NOT EXISTS document_embeddings_updated_at_idx
  ON public.document_embeddings (source_updated_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS document_embeddings_lexical_idx
  ON public.document_embeddings
  USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));

CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx
  ON public.document_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage document embeddings" ON public.document_embeddings;
CREATE POLICY "Service role can manage document embeddings"
  ON public.document_embeddings FOR ALL
  USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.update_document_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_document_embeddings_updated_at ON public.document_embeddings;
CREATE TRIGGER trigger_update_document_embeddings_updated_at
  BEFORE UPDATE ON public.document_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_embeddings_updated_at();

CREATE OR REPLACE FUNCTION public.match_document_embeddings(
  query_embedding vector(1536),
  match_count integer DEFAULT 10,
  filter_source_types text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id text,
  chunk_index integer,
  title text,
  content text,
  source_url text,
  source_updated_at timestamptz,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    de.id,
    de.source_type,
    de.source_id,
    de.chunk_index,
    de.title,
    de.content,
    de.source_url,
    de.source_updated_at,
    de.metadata,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings AS de
  WHERE de.embedding IS NOT NULL
    AND (filter_source_types IS NULL OR de.source_type = ANY(filter_source_types))
  ORDER BY de.embedding <=> query_embedding
  LIMIT GREATEST(match_count, 1);
$$;

CREATE OR REPLACE FUNCTION public.search_document_embeddings_lexical(
  search_query text,
  match_count integer DEFAULT 10,
  filter_source_types text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id text,
  chunk_index integer,
  title text,
  content text,
  source_url text,
  source_updated_at timestamptz,
  metadata jsonb,
  rank double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    de.id,
    de.source_type,
    de.source_id,
    de.chunk_index,
    de.title,
    de.content,
    de.source_url,
    de.source_updated_at,
    de.metadata,
    ts_rank_cd(
      to_tsvector('english', coalesce(de.title, '') || ' ' || coalesce(de.content, '')),
      websearch_to_tsquery('english', search_query)
    )::double precision AS rank
  FROM public.document_embeddings AS de
  WHERE length(trim(search_query)) > 0
    AND (filter_source_types IS NULL OR de.source_type = ANY(filter_source_types))
    AND to_tsvector('english', coalesce(de.title, '') || ' ' || coalesce(de.content, '')) @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC, de.source_updated_at DESC NULLS LAST, de.updated_at DESC
  LIMIT GREATEST(match_count, 1);
$$;

INSERT INTO public.document_embeddings (
  source_type,
  source_id,
  chunk_index,
  title,
  content,
  source_url,
  source_updated_at,
  embedding,
  embedding_model,
  metadata
)
VALUES
  (
    'energy_corpus',
    'aeso-market-basics',
    0,
    'AESO Market Basics',
    'The Alberta Electric System Operator runs Alberta grid operations and wholesale market administration. CEIP uses AESO-oriented context for pool price, demand, generation mix, retail comparison, and grid optimization explanations. Alberta market responses should preserve operator identity, source freshness, and the distinction between live data, cached fallbacks, and modeled outputs.',
    'https://www.aeso.ca/market/',
    NOW(),
    NULL,
    NULL,
    '{"topic":"aeso","seeded_from":"docs/energy-corpus/aeso-market-basics.md"}'::jsonb
  ),
  (
    'energy_corpus',
    'ieso-market-basics',
    0,
    'IESO Market Basics',
    'The Independent Electricity System Operator operates Ontario bulk-system and market functions. Ontario demand, supply mix, imports, exports, and reliability context should be treated separately from Alberta pool-price logic. CEIP retrieval should preserve IESO identity and timestamp provenance for Ontario-facing analytics and transition commentary.',
    'https://www.ieso.ca/en/Power-Data',
    NOW(),
    NULL,
    NULL,
    '{"topic":"ieso","seeded_from":"docs/energy-corpus/ieso-market-basics.md"}'::jsonb
  ),
  (
    'energy_corpus',
    'alberta-tier-basics',
    0,
    'Alberta TIER Basics',
    'Alberta TIER context covers industrial emissions compliance, benchmark exposure, fund payment alternatives, emissions performance credits, and savings trade-offs. CEIP compliance and ROI responses should clearly separate official program rules, current pricing assumptions, and modeled economics while exposing freshness on time-sensitive figures.',
    'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
    NOW(),
    NULL,
    NULL,
    '{"topic":"alberta_tier","seeded_from":"docs/energy-corpus/alberta-tier-basics.md"}'::jsonb
  ),
  (
    'energy_corpus',
    'oeb-chapter-5-basics',
    0,
    'OEB Chapter 5 Basics',
    'OEB Chapter 5 guidance is relevant to utility planning, distribution-system-plan evidence, and regulatory filing support. CEIP filing and asset-health narratives should use traceable references and explicit assumptions instead of generic regulatory prose, especially when outputs are used in planning or filing workflows.',
    'https://www.oeb.ca/industry/applications-oeb/chapter-5-filing-requirements-electricity-transmission-and-distribution-applications',
    NOW(),
    NULL,
    NULL,
    '{"topic":"oeb_chapter_5","seeded_from":"docs/energy-corpus/oeb-chapter-5-basics.md"}'::jsonb
  )
ON CONFLICT (source_type, source_id, chunk_index) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  source_url = EXCLUDED.source_url,
  source_updated_at = EXCLUDED.source_updated_at,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

COMMENT ON TABLE public.document_embeddings IS 'Canonical chunk store for energy-domain retrieval and future RAG flows';
COMMENT ON FUNCTION public.match_document_embeddings(vector(1536), integer, text[]) IS 'Vector similarity search over document embeddings';
COMMENT ON FUNCTION public.search_document_embeddings_lexical(text, integer, text[]) IS 'Lexical fallback search over document embeddings';

COMMIT;
