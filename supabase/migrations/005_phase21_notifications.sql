-- =============================================================
-- Phase 21 Step 7 — system_notifications 테이블
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================================

CREATE TABLE IF NOT EXISTS system_notifications (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  type            text        NOT NULL CHECK (type IN ('info', 'warning', 'error')),
  source          text        NOT NULL CHECK (source IN ('deploy', 'thumbnail', 'category', 'github')),
  message         text        NOT NULL,
  action_required boolean     NOT NULL DEFAULT false,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
-- No policies = service role only (createAdminClient)
