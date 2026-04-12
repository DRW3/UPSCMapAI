-- scripts/v2-schema.sql
-- Drop-in replacement table for upsc_pyqs, fed by the UnlockIAS harvest.
-- Schema is column-compatible with everything app/api/journey/pyqs/route.ts
-- and components/journey/PracticeSheet.tsx read.
--
-- Run via Supabase dashboard SQL editor:
--   https://supabase.com/dashboard/project/kvfclhqgqnlcdluyczrs/sql/new
-- Paste this whole file, click Run.

CREATE TABLE IF NOT EXISTS upsc_pyqs_v2 (
  id                    BIGSERIAL PRIMARY KEY,
  year                  INT  NOT NULL CHECK (year BETWEEN 1995 AND 2030),
  exam_type             TEXT NOT NULL DEFAULT 'prelims',
  paper                 TEXT NOT NULL,
  question_no           INT  NOT NULL,
  question              TEXT NOT NULL,
  options               JSONB NOT NULL,
  answer                TEXT NOT NULL CHECK (answer IN ('a','b','c','d')),
  explanation           TEXT,
  subject               TEXT NOT NULL,
  topic                 TEXT NOT NULL,
  difficulty            TEXT,
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  source                TEXT NOT NULL DEFAULT 'unlockias',
  source_url            TEXT,
  question_id_external  TEXT UNIQUE,
  sub_topic_raw         TEXT,
  confidence            JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pyqs_v2_year     ON upsc_pyqs_v2 (year);
CREATE INDEX IF NOT EXISTS idx_pyqs_v2_subject  ON upsc_pyqs_v2 (subject);
CREATE INDEX IF NOT EXISTS idx_pyqs_v2_paper    ON upsc_pyqs_v2 (paper);
CREATE INDEX IF NOT EXISTS idx_pyqs_v2_tags     ON upsc_pyqs_v2 USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_pyqs_v2_question_fts ON upsc_pyqs_v2
  USING GIN (to_tsvector('english', question));

-- set_updated_at() is already defined in scripts/schema.sql.
-- If this trigger creation errors with "function set_updated_at() does not exist",
-- run the CREATE FUNCTION block from scripts/schema.sql first, then re-run.
DROP TRIGGER IF EXISTS trg_pyqs_v2_updated_at ON upsc_pyqs_v2;
CREATE TRIGGER trg_pyqs_v2_updated_at
  BEFORE UPDATE ON upsc_pyqs_v2
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
