-- =============================================================
-- Phase 21 — 콘텐츠 상태 모델 + 카테고리 관리 + AI 추천 캐시
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================================

-- ── draft_posts 스키마 변경 ────────────────────────────────────

-- draft_stage 컬럼 추가
ALTER TABLE draft_posts
  ADD COLUMN IF NOT EXISTS draft_stage TEXT
  CHECK (draft_stage IN ('writing', 'categorizing', 'ready'));

-- 기존 draft 행 → 'writing'으로 초기화
UPDATE draft_posts
  SET draft_stage = 'writing'
  WHERE status = 'draft' AND draft_stage IS NULL;

-- status 제약 변경: 'approved' 제거 (draft | published만 허용)
-- 기존 'approved' 행이 있으면 먼저 'draft'로 변환
UPDATE draft_posts SET status = 'draft' WHERE status = 'approved';

ALTER TABLE draft_posts
  DROP CONSTRAINT IF EXISTS draft_posts_status_check;

ALTER TABLE draft_posts
  ADD CONSTRAINT draft_posts_status_check
  CHECK (status IN ('draft', 'published'));

-- DELETE 정책 추가 (001_schema.sql에 누락)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'draft_posts' AND policyname = 'Owner deletes drafts'
  ) THEN
    EXECUTE 'CREATE POLICY "Owner deletes drafts"
      ON draft_posts FOR DELETE
      USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- ── categories 테이블 (신규) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  section    text        NOT NULL CHECK (section IN ('blog', 'stories', 'portfolio')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 활성 카테고리 내 (이름 + 섹션) 중복 방지
-- soft-deleted 항목은 중복 허용 (tombstone 보관용)
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_section_active_idx
  ON categories (name, section)
  WHERE deleted_at IS NULL;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- No policies = service role only (createAdminClient)

-- ── ai_category_recommendations 테이블 (신규) ──────────────────

CREATE TABLE IF NOT EXISTS ai_category_recommendations (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id            uuid        NOT NULL REFERENCES draft_posts(id) ON DELETE CASCADE,
  content_hash       text        NOT NULL,
  categories_version text        NOT NULL,
  excluded_version   text        NOT NULL,
  existing_top3      jsonb       NOT NULL,
  suggested_top3     jsonb       NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_category_recommendations ENABLE ROW LEVEL SECURITY;
-- No policies = service role only (createAdminClient)
