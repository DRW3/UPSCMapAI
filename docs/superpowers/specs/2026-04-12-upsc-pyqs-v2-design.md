# UnlockIAS PYQ Table v2 + Journey Cutover — Design

**Date:** 2026-04-12
**Status:** Approved for planning
**Author:** Brainstormed with Claude (superpowers:brainstorming)

## Goal

Replace the existing `upsc_pyqs` table (3,108 rows, ~50% malformed) as the journey UI's source of truth with a fresh table built from the 3,886 clean UnlockIAS Prelims questions already harvested into `data/pyqs/unlockias/`. Cutover must be reversible via a single environment variable so the old table stays intact as a rollback target.

## Non-goals

- **Not** merging into the existing `upsc_pyqs` table (clean break, not a repair).
- **Not** generating embeddings on day one. The `search_pyqs` RPC is unused by the app per the inventory; embeddings can be backfilled later via the existing `embed-pyqs.ts` script.
- **Not** harvesting Mains questions. Different schema, different display flow, separate plan.
- **Not** introducing a feature flag / A-B rollout. One env var, one-line API change, instant rollback.
- **Not** rewriting `topic-keyword-map.ts`. Tagging happens at the row level via the `tags` array.
- **Not** repairing the existing malformed rows. They stay in `upsc_pyqs` untouched as the rollback fallback. They can be deleted once v2 is proven in production.

## Inventory of app dependencies (what the new table MUST satisfy)

From the Explore agent's audit — the only consumers of PYQ data are:

1. **`app/api/journey/pyqs/route.ts`** — primary topic-filtered fetch (line 387-392) and wrong-question replay (line 612-617). Both `.select(...)` exactly:
   `id, year, question, options, answer, explanation, subject, topic, difficulty, source, tags`
   Both apply `.not('options', 'is', null)` and `.not('answer', 'is', null)`.
   Topic filter is `.contains('tags', ['topic:{topicId}'])`.

2. **`app/api/journey/pyq-counts/route.ts`** — counts per topic for journey progress display. Selects `id, tags, year` (line 18-22) with the same null filters.

3. **`components/journey/PracticeSheet.tsx`** — the *only* component that renders PYQs. Reads `current.year`, `current.question`, `current.options.{a,b,c,d}`, `current.answer`, `current.difficulty`, `current.explanation`, `current.id`. Interface defined at line 15-26.

4. **`components/LearningJourney.tsx`** — legacy fallback, same interface (line 9-20). Uses the same API route.

5. **No RPC functions** — the `search_pyqs` RPC defined in `scripts/schema.sql:84` is unused by the app code.

**Critical hard constraints derived from this:**

- `tags` must be a `TEXT[]` containing entries like `topic:vedic-age`. This is the *only* topic filter mechanism the API uses.
- `options` must be a JSONB object with keys `a`, `b`, `c`, `d` (string values). The `correct?` key is optional.
- `answer` must be a single lowercase letter (`a` | `b` | `c` | `d`).
- `id` must be a stable integer — `PracticeSheet` uses it as the key in `seenQuestionIds` localStorage.
- `year`, `question`, `subject`, `topic`, `source` must be NOT NULL (the inventory shows the API never null-guards these on the read side).
- `options` and `answer` may be NULL in principle, but the API filters them out, so any row with NULLs is invisible to the practice flow.

**Safe-to-drop columns** from the v1 schema (per inventory: never read or written by app code): `subtopic`, `map_type`, `region`, `appearances`, `embedding`. They can be added later if needed.

## Architecture

```
data/pyqs/unlockias/{year}.json   (3886 rows, already harvested)
        │
        ▼
scripts/load-v2.mjs               (normalize subjects, write to upsc_pyqs_v2)
        │
        ▼
upsc_pyqs_v2 in Supabase          (tags = [], otherwise complete)
        │
        ▼
scripts/tag-v2-with-groq.mjs      (Groq llama-3.3-70b, batches of 5)
        │                          (subject pre-filter narrows candidates 524 → 20-40)
        ▼
upsc_pyqs_v2.tags populated       ('topic:{id}' entries, 1-3 per row)
        │
        ▼
scripts/audit-tagging.mjs         (50 random samples, manual spot-check, ≥90% gate)
        │
        ▼
ENV PYQ_TABLE=upsc_pyqs_v2        (one-line API change)
        │
        ▼
PracticeSheet renders new corpus  (no component changes)
```

Three commits, end-to-end runnable in one session, fully reversible (`unset PYQ_TABLE`).

## Schema for `upsc_pyqs_v2`

Drop-in compatible with the columns the API selects, plus four new fields for the richer UnlockIAS data we should not throw away.

```sql
CREATE TABLE upsc_pyqs_v2 (
  id                    BIGSERIAL PRIMARY KEY,
  year                  INT  NOT NULL CHECK (year BETWEEN 1995 AND 2030),
  exam_type             TEXT NOT NULL DEFAULT 'prelims',
  paper                 TEXT NOT NULL,                  -- 'gs1' for 2011+, 'general' for pre-2011
  question_no           INT  NOT NULL,                  -- populated from UnlockIAS, unlike v1
  question              TEXT NOT NULL,
  options               JSONB NOT NULL,                 -- {a,b,c,d}
  answer                TEXT NOT NULL CHECK (answer IN ('a','b','c','d')),
  explanation           TEXT,
  subject               TEXT NOT NULL,                  -- normalized, e.g. 'polity'
  topic                 TEXT NOT NULL,                  -- normalized sub_topic
  difficulty            TEXT,                           -- easy | moderate | hard
  tags                  TEXT[] NOT NULL DEFAULT '{}',   -- 'topic:{id}' entries — drives journey filter
  source                TEXT NOT NULL DEFAULT 'unlockias',
  source_url            TEXT,
  question_id_external  TEXT UNIQUE,                    -- e.g. 'UPSC_2024_GS1_Q63', uniqueness key for re-runs
  sub_topic_raw         TEXT,                           -- raw UnlockIAS sub-topic for analysis
  confidence            JSONB,                          -- {tagging_method, score, model}
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pyqs_v2_year      ON upsc_pyqs_v2 (year);
CREATE INDEX idx_pyqs_v2_subject   ON upsc_pyqs_v2 (subject);
CREATE INDEX idx_pyqs_v2_paper     ON upsc_pyqs_v2 (paper);
CREATE INDEX idx_pyqs_v2_tags      ON upsc_pyqs_v2 USING GIN (tags);
CREATE INDEX idx_pyqs_v2_question  ON upsc_pyqs_v2 USING GIN (to_tsvector('english', question));

CREATE TRIGGER trg_pyqs_v2_updated_at
  BEFORE UPDATE ON upsc_pyqs_v2
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**Subject normalization map** (UnlockIAS → canonical):

```js
const SUBJECT_MAP = {
  'indian polity': 'polity',
  'polity': 'polity',
  'governance': 'polity',
  'indian economy': 'economy',
  'economy': 'economy',
  'geography': 'geography',
  'physical geography': 'geography',
  'environment & ecology': 'environment',
  'environment and ecology': 'environment',
  'ancient history': 'history',
  'medieval history': 'history',
  'modern history': 'history',
  'history': 'history',
  'art & culture': 'art_culture',
  'science & technology': 'science',
  'science and technology': 'science',
  'general science': 'science',
  'international relations': 'ir',
  'current affairs': 'current_affairs',
  'sports': 'current_affairs',
};
```

**Paper mapping:** `year >= 2011 ? 'gs1' : 'general'`. This matches the historical UPSC Prelims structure (CSAT was introduced in 2011, splitting Paper I from Paper II).

## Groq tagging pipeline

**Script:** `scripts/tag-v2-with-groq.mjs`

**Model:** `llama-3.3-70b-versatile` via Groq (already in use by `repair-malformed-pyqs.mjs`).

**Batch size:** 5 questions per request — keeps the prompt under Groq's TPM cap and gives the model enough context window to disambiguate.

**Concurrency:** 4 with the same 429 retry/backoff logic from `repair-malformed-pyqs.mjs` (parses `try again in Xs` from Groq error messages).

**Subject pre-filter:** for each batch, look up the questions' UnlockIAS subjects and assemble the candidate topic list by intersecting with `topic-keyword-map.ts`'s `dbSubjects` field. This narrows 524 syllabus topics down to ~20-40 plausible candidates before Groq sees the prompt — dramatically improves accuracy and shrinks the prompt.

**Prompt template (one batch):**

```
You are a UPSC Civil Services syllabus classifier. For each question below,
return the 1 to 3 most relevant topic IDs from the candidate list. Only use
IDs that appear in the candidates — never invent new ones.

CANDIDATE TOPICS (only these are valid):
- vedic-age — Vedic civilization, Rig Veda, varna system, sabha samiti
- mauryan-empire — Chandragupta, Ashoka, Arthashastra, Kalinga war
- ... (filtered to ~20-40 entries by subject pre-filter)

QUESTIONS:
[1] {question text}
    (a) {opt a}
    (b) {opt b}
    (c) {opt c}
    (d) {opt d}
[2] ...

Respond with strict JSON, no commentary:
{
  "results": [
    {"q": 1, "topics": ["vedic-age"], "confidence": 0.9},
    {"q": 2, "topics": ["mauryan-empire", "ashoka-edicts"], "confidence": 0.85}
  ]
}
```

**Validation:** every returned `topic` must exist in `data/syllabus.ts`. Invalid IDs are dropped. If a question ends up with zero valid tags, retry once with a fresh prompt; if still zero, log it to `data/v2-tagging-failures.jsonl` and leave its `tags` empty. Empty-tag rows are still queryable by year/text but won't appear under any journey topic.

**Throughput estimate:** 3886 ÷ 5 = 778 batches. At Groq's free-tier sustained rate (~30 req/min after backoff), expect **~25-30 minutes** for the full corpus.

**Quality gate:** `scripts/audit-tagging.mjs` selects 50 random tagged rows, prints `{question, assigned_tags, syllabus_titles}`, and waits for the user to mark each correct/incorrect. Aim for ≥90% accuracy on the audit. If below, refine the prompt and re-run on the failed-confidence rows only.

## Cutover

**Code change** in `app/api/journey/pyqs/route.ts` (and identical change in `pyq-counts/route.ts`):

```ts
const PYQ_TABLE = process.env.PYQ_TABLE || 'upsc_pyqs';
// later:
.from(PYQ_TABLE)
```

**Production cutover:**
1. Set `PYQ_TABLE=upsc_pyqs_v2` on Vercel (env vars).
2. Redeploy.
3. Smoke-test 3 topics in the live journey UI.

**Rollback:** delete `PYQ_TABLE` from Vercel (or set to `upsc_pyqs`), redeploy. ~30 seconds end-to-end.

## What's NOT in scope (YAGNI)

- Vector embeddings + the `search_pyqs` RPC — not used by the app today.
- Mains questions — different display flow, separate plan.
- Topic-coverage heatmap UI — out of scope, but the audit script will print a per-topic count so we know where the gaps are.
- Per-question difficulty calibration based on user performance — future feature.
- Migrating user-progress data (`seenQuestionIds`) — the question IDs change between v1 and v2, so cutover effectively resets each user's "seen" set. Acceptable for v1 since the new corpus is dramatically larger and the seen-set was mostly tracking malformed rows anyway.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Groq tagging accuracy < 90% on audit | Refine prompt, re-run only on low-confidence rows. If still < 90%, fall back to keyword-overlap as a backup tagger before cutover. |
| Topic with zero tagged questions (gap) | The audit script outputs per-topic counts. For any topic with 0 hits, the API's existing AI fallback (Groq generation in `pyqs/route.ts:476-556`) still serves users — they never see "no questions". |
| Schema drift from v1 silently breaks the API | Cutover script runs `SELECT id, year, question, options, answer, explanation, subject, topic, difficulty, source, tags FROM upsc_pyqs_v2 LIMIT 1` and aborts if any column is missing. |
| Env var typo on Vercel | Step 6 prints the row count from whichever table the env var points to before cutover; mismatch with expected ~3886 → abort. |
| User progress reset (seenQuestionIds) | Acceptable. Document in changelog. Old v1 IDs were tracking mostly malformed rows so the loss is small. |
| `subject` normalization map misses an UnlockIAS variant | Loader logs every unmapped subject during the load step; iterate before tagging. |
| Pre-2011 questions have 150 per year (not 100) — heavier load on tagging | Just ~16 extra batches per year, no real cost. |

## Success criteria

1. `upsc_pyqs_v2` exists in Supabase with 3886 rows (within ±20 of the harvest count after dedupe by `question_id_external`).
2. ≥90% of rows have at least one `topic:*` tag.
3. Audit script shows ≥90% accuracy on a 50-row manual spot-check.
4. With `PYQ_TABLE=upsc_pyqs_v2`, navigating to a previously-broken topic in the journey UI returns clean, well-formed questions with correct answers and explanations visible.
5. Practice flow loads, answer reveal works, explanation displays.
6. Rollback (`unset PYQ_TABLE`) returns the UI to its pre-cutover state without code changes.

## Open questions

None — design is locked. Hand off to writing-plans.
