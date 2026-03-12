-- =============================================================
-- Task 10 — extend inbox_messages status to include processing + published
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================================

ALTER TABLE inbox_messages DROP CONSTRAINT IF EXISTS inbox_messages_status_check;

ALTER TABLE inbox_messages
  ADD CONSTRAINT inbox_messages_status_check
  CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'private', 'published'));
