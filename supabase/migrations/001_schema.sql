-- =============================================================
-- MyBlog — Task 2 Schema + RLS
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================================

-- ── profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'owner' CHECK (role = 'owner'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Owner updates own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── inbox_messages ────────────────────────────────────────────
-- raw_payload is append-only (no UPDATE policy) — telegram_update_id is UNIQUE
CREATE TABLE IF NOT EXISTS inbox_messages (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_update_id  BIGINT      UNIQUE NOT NULL,
  raw_payload         JSONB       NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','approved','rejected','private')),
  message_type        TEXT        NOT NULL DEFAULT 'unknown'
                                  CHECK (message_type IN ('text','photo','video','document','unknown')),
  text_content        TEXT,
  media_r2_url        TEXT,
  media_mime_type     TEXT,
  telegram_date       TIMESTAMPTZ,
  parsed_tags         TEXT[],
  target_section      TEXT        CHECK (target_section IN ('blog','stories','portfolio','diary')),
  draft_generated_at  TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policies — service_role bypasses RLS entirely.
-- Regular authenticated users have zero access to inbox_messages.

-- ── diary_entries ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diary_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inbox_id    UUID        REFERENCES inbox_messages(id) ON DELETE SET NULL,
  title       TEXT,
  body        TEXT        NOT NULL,
  mood        TEXT,
  media_urls  TEXT[],
  entry_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own diary"
  ON diary_entries FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner inserts own diary"
  ON diary_entries FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner updates own diary"
  ON diary_entries FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner deletes own diary"
  ON diary_entries FOR DELETE
  USING (auth.uid() = owner_id);

-- ── draft_posts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS draft_posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_id      UUID        REFERENCES inbox_messages(id) ON DELETE SET NULL,
  section       TEXT        NOT NULL CHECK (section IN ('blog','stories','portfolio')),
  title         TEXT        NOT NULL,
  body_markdown TEXT        NOT NULL,
  frontmatter   JSONB,
  github_path   TEXT,
  status        TEXT        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','approved','published')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE draft_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads drafts"
  ON draft_posts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner inserts drafts"
  ON draft_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner updates drafts"
  ON draft_posts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ── auto-create profile on signup ────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'owner'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
