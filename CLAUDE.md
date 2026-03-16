# MyBlog — Project Reference

## Environment Variables Required
```
GITHUB_REPO_URL          GitHub repo URL for markdown push
GITHUB_TOKEN             GitHub PAT (Actions + API push)

NEXT_PUBLIC_SUPABASE_URL      Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY     Supabase service role (server only, never client)
SUPABASE_DB_PASSWORD          Direct DB access (migrations only)

CLOUDFLARE_ACCOUNT_ID    R2 account ID
R2_ACCESS_KEY_ID         R2 key (server only)
R2_SECRET_ACCESS_KEY     R2 secret (server only)
R2_BUCKET_NAME           R2 bucket name
R2_PUBLIC_URL            Public base URL for R2 assets (e.g. https://pub-xxxx.r2.dev)

TELEGRAM_BOT_TOKEN        Bot token
TELEGRAM_CHAT_ID          Allowed chat ID
TELEGRAM_ALLOWED_USER_IDS Comma-separated allowed Telegram user IDs
TELEGRAM_WEBHOOK_SECRET   Random hex secret — forms the webhook URL path

GOOGLE_GENERATIVE_AI_API_KEY  Gemini API key (server only, draft generation)

NEXT_PUBLIC_SITE_URL     Production URL (e.g. https://embershine.vercel.app)

ADMIN_EMAIL              Admin email for server-side auth check (server only)
NEXT_PUBLIC_ADMIN_EMAIL  Admin email for client-side session check (public)
```

## Restart Checklist
- [ ] `npm run dev` starts without error
- [ ] Supabase connection alive (`NEXT_PUBLIC_SUPABASE_URL` set)
- [ ] `.env.local` exists with all keys populated
- [ ] R2 keys NOT in any client-side code
- [ ] Telegram webhook URL registered: `https://<domain>/api/telegram/<TELEGRAM_WEBHOOK_SECRET>`
  Run: `bash scripts/register-webhook.sh`

## CRITICAL — Never Change
- Next.js 16 uses `src/proxy.ts` with `export default async function proxy()`.
  This is the correct convention for Next.js 16.
  Do NOT use `middleware.ts` — it is deprecated in Next.js 16. Never change this.

## Git Policy
After each Phase is fully complete and all completion criteria verified:
1. git add . (never include .env.local or any secret files)
2. git commit -m "Phase [N] complete: [Phase name]"
   Examples:
   - "Phase 1 complete: Utility functions"
   - "Phase 5 complete: Blog CRUD"
3. git push origin main

Phase number and name must match the Phase prompt header exactly.

Never push if:
- Build has errors
- .env.local or secret files are staged
- Phase completion criteria are not fully met

## Hard Rules
- NEVER commit `.env.local` or any file containing secrets
- NEVER expose R2 credentials to client
- NEVER default failed Telegram parse to public — always `status = pending`
- NEVER publish without Shine's explicit approval
  Exception: /private/blog, /private/stories, /private/portfolio actions.ts
  — Shine is the admin author, pushToGitHub IS the approval action.
  These Server Actions are the approval mechanism itself.
- Private content = Supabase only, zero Git involvement
  (Exception above applies only to blog/stories/portfolio public content)

## Content Architecture
- Public content (blog, stories, portfolio): file-based
  - Path: `content/{section}/{postId}.md`
  - postId format: `{YYYY-MM-DD}-{slug}`  e.g. `2026-03-16-my-post`
  - postId = filename stem = URL slug = edit identifier (세 가지 통일)
  - postId is IMMUTABLE after creation — title changes do NOT rename the file
  - On edit: update frontmatter only, add `updatedAt` field
  - YAML serialization: always use `matter.stringify()` from gray-matter
    NEVER build frontmatter with template strings
- Private content (diary, inbox): Supabase only — zero Git involvement

## Public Page Performance Rules
- blog/page.tsx, stories/page.tsx, portfolio/page.tsx MUST remain static
- NEVER call createClient() or getUser() in these page components
- New/Edit buttons use SectionControls (Client Component) only
  → checks session client-side after hydration
  → server render returns null (no auth overhead on public pages)

## Admin Auth Pattern

### Server Actions (actions.ts)
- Import `assertAdmin` from `@/lib/auth/admin.ts`
- Call `await assertAdmin()` as the very first line
- Compares `user.email === process.env.ADMIN_EMAIL`
- Redirects to `/login` if not authorized

### Client Components (SectionControls.tsx)
- Check `session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL`
- Return `null` if not admin (prevents flash on server render)

## Server Action Pattern
```ts
export async function myAction(formData: FormData) {
  await assertAdmin()                     // 1. auth — always first
  // validate → return { error } on fail  // 2. validate (return, NOT throw)
  try {
    await pushToGitHub(...)               // 3. side effect in try
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
  redirect('/private/inbox?saved=1')     // 5. redirect OUTSIDE try/catch
}
```

## Slug & PostId Rules
- `safeSlug(title)`: lowercase, keep 가-힣/a-z/0-9, replace others with `-`
  collapse consecutive `-`, trim leading/trailing `-`, return `'untitled'` if empty
- `ensureUniquePostId(section, baseId)`: check GitHub for existing file,
  append `-2`, `-3`... if conflict, max 10 attempts
- Both utilities live in `src/lib/content/slug-utils.ts`

## Phase 5 (Future — Do Not Touch)

### AI Pipeline Architecture (planned)
- `src/lib/ai/context.ts` — trend/context collection (Google Trends, HN, Reddit)
- `src/lib/ai/analyzer.ts` — input classification (tech/daily/photo-essay/review)
- `src/lib/ai/generator.ts` — category-specific prompt generation
- `src/lib/ai/validator.ts` — quality auto-validation (SEO, readability, tone, originality scores)
- `src/lib/ai/pipeline.ts` — full orchestration
- Feedback loop: rejection reason collection → prompt improvement over time

Current `src/lib/ai/draft.ts` uses Gemini 2.5 Flash (`GOOGLE_GENERATIVE_AI_API_KEY`).
**Do NOT refactor until Phase 5.**

## Tech Stack
- Next.js 16 App Router + TypeScript
- Tailwind CSS v4
- Supabase Auth + RLS
- Cloudflare R2 (Sharp for image processing)
- Vercel Hobby (deployment)
- Telegram Bot (webhook)
- GitHub Actions (batch automation)
- gray-matter (frontmatter parsing + serialization)
