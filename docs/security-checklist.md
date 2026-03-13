# EmberShine — Security Checklist

Final verification before making the repository public and going live.

---

## Git History

- [x] **No `.env` files in Git history**
  ```bash
  git log --all --full-history -- .env*
  # Expected: no output
  ```

- [x] **No hardcoded secrets in committed files**
  ```bash
  git grep -i "service_role\|bot_token\|secret_access_key" $(git log --pretty=format:'%H') | head -20
  # Expected: only process.env.* references and ${{ secrets.* }} references — no literal values
  ```

- [x] **`.env.local` in `.gitignore`**
  ```bash
  grep ".env.local" .gitignore
  # Expected: .env.local
  ```

---

## Supabase RLS

- [ ] **All tables have Row Level Security enabled**

  Verify in Supabase Dashboard → Table Editor → each table → RLS badge shows **Enabled**:
  - `diary_entries` — RLS enabled; policy: `auth.uid() = user_id`
  - `inbox_messages` — RLS enabled; service role bypasses for server ops
  - `draft_posts` — RLS enabled; service role bypasses for server ops
  - `profiles` — RLS enabled; policy: `auth.uid() = id`

  Or verify via SQL:
  ```sql
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public';
  -- All tables should show rowsecurity = true
  ```

- [ ] **`SUPABASE_SERVICE_ROLE_KEY` is server-only**
  - No `NEXT_PUBLIC_` prefix ✓
  - Not imported in any `src/app/` page component or client component
  ```bash
  grep -r "SUPABASE_SERVICE_ROLE_KEY" src/ --include="*.tsx" --include="*.ts"
  # Expected: only in src/lib/supabase/server.ts
  ```

---

## Private Route Protection

- [ ] **`/private/*` blocked without auth**

  Test without a session:
  ```bash
  curl -I https://yoursite.com/private/diary
  # Expected: HTTP 302 redirect to /login
  ```

  This is enforced by `src/proxy.ts` (Next.js 16 proxy convention).

---

## R2 / Media Security

- [ ] **R2 credentials not in client bundle**
  ```bash
  grep -r "R2_ACCESS_KEY_ID\|R2_SECRET_ACCESS_KEY" src/ --include="*.ts" --include="*.tsx"
  # Expected: only src/lib/r2/client.ts (server-only, no 'use client' directive)
  ```

- [ ] **Presigned URLs working (no key exposed to browser)**

  Image uploads use presigned URLs via `/api/upload/presigned`.
  The browser receives a time-limited signed URL, never the R2 key.
  Test: check browser Network tab — R2 credentials must not appear in any response.

- [ ] **EXIF GPS stripped from all public images**

  The `scripts/batch/media-optimize.js` job runs nightly via GitHub Actions.
  It strips EXIF data using Sharp before storing the optimized WebP.

  Verify for a specific image:
  ```bash
  node -e "
  const exifr = require('exifr');
  exifr.gps('content/images/test.jpg').then(console.log);
  // Expected: null or undefined
  "
  ```

---

## Telegram Security

- [ ] **Telegram whitelist active**

  Only `TELEGRAM_ALLOWED_USER_IDS` can trigger the bot.
  Verify in `src/app/api/telegram/[secret]/route.ts`:
  ```typescript
  // Should reject any userId not in TELEGRAM_ALLOWED_USER_IDS
  ```

- [ ] **Webhook path is secret**

  The webhook URL is `https://yoursite.com/api/telegram/<TELEGRAM_WEBHOOK_SECRET>`.
  The secret is a random 32-byte hex string — not guessable.
  Verify it's set and non-trivial:
  ```bash
  echo $TELEGRAM_WEBHOOK_SECRET | wc -c
  # Expected: 65 (64 hex chars + newline)
  ```

- [ ] **`telegram_update_id` UNIQUE constraint active** (deduplication)

  Verify in Supabase → Table Editor → `inbox_messages` → Constraints tab:
  `telegram_update_id` should have a UNIQUE constraint.

  Or via SQL:
  ```sql
  SELECT constraint_name, constraint_type
  FROM information_schema.table_constraints
  WHERE table_name = 'inbox_messages';
  ```

---

## Deployment Security

- [ ] **Preview deployments protected** (Vercel Pro only)

  On Hobby tier, preview deployments are publicly accessible.
  Options:
  1. Upgrade to Vercel Pro → enable deployment protection
  2. Disable preview deployments in Vercel project settings
  3. Accept the risk (preview URLs are unguessable but not private)

- [ ] **No private content in preview deployments**

  Private diary content is in Supabase (RLS-protected), not in the Git repo.
  Preview deployments cannot access Supabase private data without auth. ✓

---

## Dependency Security

- [ ] **No known vulnerabilities**
  ```bash
  npm audit
  # Expected: 0 critical or high vulnerabilities
  ```

- [ ] **Dependencies up to date**
  ```bash
  npm outdated
  ```

---

## Final Pre-Launch Checklist

- [ ] All items above verified
- [ ] `npm run build` passes cleanly
- [ ] Test full Telegram → publish flow end-to-end
- [ ] `/private/diary` accessible after login, blocked without login
- [ ] RSS feeds returning valid XML: `/feed.xml`, `/blog/feed.xml`, `/stories/feed.xml`
- [ ] Giscus comments loading on a blog post
- [ ] Cloudflare Web Analytics beacon firing (check browser Network tab for `beacon.min.js`)
- [ ] GitHub Actions batch job runs successfully (trigger manually: `workflow_dispatch`)
- [ ] Backup workflow runs successfully (trigger manually)
- [ ] Repository set to **Public** on GitHub
