-- =============================================================
-- Phase 23 Fix-2 — draft_stage NULL 보정
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================================

-- 1) title/body/frontmatter.category 있으면 ready
UPDATE draft_posts SET draft_stage = 'ready'
WHERE draft_stage IS NULL AND status = 'draft'
  AND title IS NOT NULL AND btrim(title) != ''
  AND body_markdown IS NOT NULL AND btrim(body_markdown) != ''
  AND frontmatter IS NOT NULL
  AND jsonb_typeof(frontmatter) = 'object'
  AND btrim(frontmatter->>'category') != '';

-- 2) title/body 있고 category 없으면 categorizing
UPDATE draft_posts SET draft_stage = 'categorizing'
WHERE draft_stage IS NULL AND status = 'draft'
  AND title IS NOT NULL AND btrim(title) != ''
  AND body_markdown IS NOT NULL AND btrim(body_markdown) != ''
  AND (
    frontmatter IS NULL
    OR jsonb_typeof(frontmatter) != 'object'
    OR frontmatter->>'category' IS NULL
    OR btrim(frontmatter->>'category') = ''
  );

-- 3) 나머지 writing
UPDATE draft_posts SET draft_stage = 'writing'
WHERE draft_stage IS NULL AND status = 'draft';
