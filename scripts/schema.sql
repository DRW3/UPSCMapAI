-- ═══════════════════════════════════════════════════════════════════════════
-- UPSCMapAI · Supabase Schema
-- Run this once in the Supabase SQL editor (Database → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;       -- pgvector (768-dim Gemini embeddings)
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- trigram index for fuzzy text search
CREATE EXTENSION IF NOT EXISTS unaccent;     -- accent-insensitive search

-- ── 1. Previous Year Questions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upsc_pyqs (
  id            BIGSERIAL PRIMARY KEY,

  -- Exam identity
  year          INT  NOT NULL,                          -- 2010 – 2024
  exam_type     TEXT NOT NULL
                  CHECK (exam_type IN ('prelims', 'mains', 'optional')),
  paper         TEXT NOT NULL
                  CHECK (paper IN ('gs1','gs2','gs3','gs4','csat','general')),
  question_no   INT,

  -- Content
  question      TEXT NOT NULL,
  options       JSONB,   -- {a:"...", b:"...", c:"...", d:"...", correct:"b"}
  answer        TEXT,    -- short form: "b" or full option text
  explanation   TEXT,    -- detailed explanation / rationale

  -- Classification (drives which map & notes to surface)
  subject       TEXT NOT NULL,
    -- geography | history | economy | polity | environment | science | current_affairs
  topic         TEXT NOT NULL,
    -- rivers | mountains | passes | ancient_kingdoms | battles | colonial | minerals | …
  subtopic      TEXT,
  map_type      TEXT,    -- mirrors MapType enum in types/index.ts
  region        TEXT,    -- specific state / district / country if applicable

  -- Discovery
  tags          TEXT[]   DEFAULT '{}',
  difficulty    TEXT     CHECK (difficulty IN ('easy', 'medium', 'hard')),
  appearances   INT      DEFAULT 1,    -- how many times this Q appeared in actual exams

  -- Semantic embedding (Gemini text-embedding-004 → 768 dims)
  embedding     VECTOR(3072),

  -- Provenance
  source        TEXT NOT NULL,    -- indiabix | gktoday | official_upsc | drishti | vision
  source_url    TEXT,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Knowledge Chunks (RAG context for map notes) ──────────────────────────
CREATE TABLE IF NOT EXISTS upsc_knowledge (
  id         BIGSERIAL PRIMARY KEY,
  content    TEXT  NOT NULL,
  embedding  VECTOR(3072),
  metadata   JSONB DEFAULT '{}',
    -- {type, region, map_type, pyq_count, era, state, source}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

-- PYQ lookup
CREATE INDEX IF NOT EXISTS idx_pyqs_year        ON upsc_pyqs (year);
CREATE INDEX IF NOT EXISTS idx_pyqs_exam_paper  ON upsc_pyqs (exam_type, paper);
CREATE INDEX IF NOT EXISTS idx_pyqs_subject     ON upsc_pyqs (subject, topic);
CREATE INDEX IF NOT EXISTS idx_pyqs_map_type    ON upsc_pyqs (map_type) WHERE map_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pyqs_tags        ON upsc_pyqs USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_pyqs_fts         ON upsc_pyqs
  USING GIN (to_tsvector('english', question));
CREATE INDEX IF NOT EXISTS idx_pyqs_question_trgm ON upsc_pyqs
  USING GIN (question gin_trgm_ops);

-- Vector similarity (IVFFlat — create AFTER inserting ≥ 1000 rows for best perf)
-- CREATE INDEX idx_pyqs_embedding ON upsc_pyqs
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_know_embedding ON upsc_knowledge
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── 4. RPC: Semantic PYQ search ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_pyqs(
  query_embedding  VECTOR(3072),
  match_threshold  FLOAT   DEFAULT 0.60,
  match_count      INT     DEFAULT 10,
  filter_subject   TEXT    DEFAULT NULL,
  filter_map_type  TEXT    DEFAULT NULL,
  filter_year_min  INT     DEFAULT NULL,
  filter_year_max  INT     DEFAULT NULL
)
RETURNS TABLE (
  id          BIGINT,
  year        INT,
  exam_type   TEXT,
  paper       TEXT,
  question    TEXT,
  options     JSONB,
  answer      TEXT,
  explanation TEXT,
  subject     TEXT,
  topic       TEXT,
  subtopic    TEXT,
  map_type    TEXT,
  region      TEXT,
  tags        TEXT[],
  difficulty  TEXT,
  appearances INT,
  source      TEXT,
  similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.year, p.exam_type, p.paper,
    p.question, p.options, p.answer, p.explanation,
    p.subject, p.topic, p.subtopic, p.map_type,
    p.region, p.tags, p.difficulty, p.appearances, p.source,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM upsc_pyqs p
  WHERE
    (filter_subject  IS NULL OR p.subject  = filter_subject)
    AND (filter_map_type IS NULL OR p.map_type = filter_map_type)
    AND (filter_year_min IS NULL OR p.year >= filter_year_min)
    AND (filter_year_max IS NULL OR p.year <= filter_year_max)
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── 5. RPC: Semantic knowledge-chunk search ───────────────────────────────────
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding  VECTOR(3072),
  match_threshold  FLOAT DEFAULT 0.60,
  match_count      INT   DEFAULT 5
)
RETURNS TABLE (
  id         BIGINT,
  content    TEXT,
  metadata   JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id, k.content, k.metadata,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM upsc_knowledge k
  WHERE
    k.embedding IS NOT NULL
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── 6. Helper: updated_at trigger ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pyqs_updated_at ON upsc_pyqs;
CREATE TRIGGER trg_pyqs_updated_at
  BEFORE UPDATE ON upsc_pyqs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
