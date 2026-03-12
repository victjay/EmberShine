-- =============================================================
-- Task 8 — add from_id to inbox_messages for direct querying
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================================

ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS from_id BIGINT;
