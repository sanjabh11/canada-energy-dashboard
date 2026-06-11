-- =============================================================================
-- B08 – Hybrid Search & Retrieval V2
-- Migration: 20260610003_hybrid_search.sql
-- =============================================================================
-- Enables Supabase full-text (tsvector) + pgvector cosine similarity search
-- over the energy knowledge base.
-- Requires: pgvector extension (available on Supabase ≥ 2023.09)
-- =============================================================================

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ── knowledge_base table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_base (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  jurisdiction    TEXT,                               -- ISO-3166-2 or "CA"
  published_at    TIMESTAMPTZ,
  trust_tier      SMALLINT NOT NULL DEFAULT 3 CHECK (trust_tier BETWEEN 1 AND 4),
  source_url      TEXT,
  connector_id    TEXT,                               -- which connector ingested this
  lineage_id      TEXT,                               -- run_id from connector_lineage
  -- Full-text search vector (auto-maintained by trigger below)
  fts_vector      TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B')
  ) STORED,
  -- 1536-dim embedding (OpenAI text-embedding-3-small)
  embedding       vector(1536),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
-- GIN for full-text search
CREATE INDEX IF NOT EXISTS idx_knowledge_base_fts
  ON knowledge_base USING GIN (fts_vector);

-- IVFFlat for approximate nearest-neighbour vector search
-- lists = sqrt(row_count) — tune after loading data
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding
  ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_jurisdiction
  ON knowledge_base (jurisdiction);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_trust_tier
  ON knowledge_base (trust_tier);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_published_at
  ON knowledge_base (published_at DESC);

COMMENT ON TABLE knowledge_base IS
  'B08: Energy knowledge base for hybrid full-text + vector search. '
  'One row per document/chunk. Embeddings pre-computed by ingestion pipeline.';

-- ── Sparse search function ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_knowledge_base_sparse(
  query_text        TEXT,
  limit_count       INT DEFAULT 20,
  jurisdiction_filter TEXT[] DEFAULT NULL,
  trust_tier_max    SMALLINT DEFAULT 4
)
RETURNS TABLE (
  id            UUID,
  title         TEXT,
  body          TEXT,
  metadata      JSONB,
  jurisdiction  TEXT,
  published_at  TIMESTAMPTZ,
  trust_tier    SMALLINT,
  source_url    TEXT,
  rank          REAL
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
    ts_rank_cd(kb.fts_vector, websearch_to_tsquery('english', query_text)) AS rank
  FROM knowledge_base kb
  WHERE
    kb.fts_vector @@ websearch_to_tsquery('english', query_text)
    AND kb.trust_tier <= trust_tier_max
    AND (
      jurisdiction_filter IS NULL
      OR kb.jurisdiction = ANY(jurisdiction_filter)
      OR kb.jurisdiction IS NULL
    )
  ORDER BY rank DESC
  LIMIT limit_count;
END;
$$;

COMMENT ON FUNCTION search_knowledge_base_sparse IS
  'B08: BM25-style full-text search using tsvector + ts_rank_cd. '
  'Called by HybridSearcher.sparseSearch().';

-- ── Dense search function ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_knowledge_base_dense(
  query_embedding   vector(1536),
  limit_count       INT DEFAULT 20,
  jurisdiction_filter TEXT[] DEFAULT NULL,
  trust_tier_max    SMALLINT DEFAULT 4
)
RETURNS TABLE (
  id              UUID,
  title           TEXT,
  body            TEXT,
  metadata        JSONB,
  jurisdiction    TEXT,
  published_at    TIMESTAMPTZ,
  trust_tier      SMALLINT,
  source_url      TEXT,
  similarity      REAL
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
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
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

COMMENT ON FUNCTION search_knowledge_base_dense IS
  'B08: pgvector cosine similarity search using IVFFlat ANN index. '
  'Called by HybridSearcher.denseSearch().';

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_base_public_read"
  ON knowledge_base FOR SELECT USING (true);

CREATE POLICY "knowledge_base_service_write"
  ON knowledge_base FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "knowledge_base_service_update"
  ON knowledge_base FOR UPDATE
  USING (auth.role() = 'service_role');

-- ── Updated_at trigger ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_base_updated_at();
