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

GOOGLE_GENERATIVE_AI_API_KEY  Gemini API key (server only, draft + translation)

NEXT_PUBLIC_SITE_URL     Production URL (e.g. https://embershine.vercel.app)

ADMIN_EMAIL              Admin email for server-side auth check (server only)
NEXT_PUBLIC_ADMIN_EMAIL  Admin email for client-side session check (public)

VERCEL_TOKEN             Vercel personal access token (GitHub Actions용)
VERCEL_PROJECT_ID        Vercel project ID (GitHub Actions용)
```

## Restart Checklist
- [ ] `npm run dev` starts without error
- [ ] Supabase connection alive (`NEXT_PUBLIC_SUPABASE_URL` set)
- [ ] `.env.local` exists with all keys populated
- [ ] R2 keys NOT in any client-side code
- [ ] Telegram webhook URL registered: `https://<domain>/api/telegram/<TELEGRAM_WEBHOOK_SECRET>`
  Run: `bash scripts/register-webhook.sh`
- [ ] `localhost:3000/blog` redirects to `/ko/blog` (proxy locale redirect)
- [ ] `localhost:3000/en/blog` displays English UI

## CRITICAL — Never Change
- Next.js 16 uses `src/proxy.ts` with `export default async function proxy()`.
  This is the correct convention for Next.js 16.
  Do NOT use `middleware.ts` — it is deprecated in Next.js 16. Never change this.

- `src/proxy.ts` handles locale redirect. Rules (in order):
  1. Already `/ko/...` or `/en/...` → pass through
  2. `/private/...` → pass through (no locale prefix)
  3. `/api/...` → pass through
  4. `/login` → pass through (no locale prefix)
  5. `/_next/...`, static files → pass through
  6. `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` → pass through
  7. All other paths → redirect to `/ko/{path}` (defaultLocale)
  NEVER remove or reorder these rules.

- `app/[lang]/layout.tsx` is the root layout for all public pages.
  NEVER add `<html>` or `<body>` to any public page component.
  NEVER call `createClient()` or `getUser()` in public page components.

- `app/private/layout.tsx` and `app/login/layout.tsx` are independent root layouts.
  Each must include `<html>` and `<body>`.
  Navigation between public ↔ private/login causes full page reload — this is NORMAL.

- Telegram bot URLs MUST include locale prefix:
  `${siteUrl}/ko/${section}/${slug}` (NEVER `${siteUrl}/${section}/${slug}`)

## Git Policy
After each Phase is fully complete and all completion criteria verified:
1. git status (confirm .env.local is NOT staged)
2. git add .
3. git commit -m "Phase [N] complete: [Phase name]"
   Examples:
   - "Phase 15 complete: Submit button loading state"
   - "Phase 18 complete: Atomic KO+EN commit"
4. git log --oneline -3 (confirm commit appears)
5. git push origin main

Phase number and name must match the Phase prompt header exactly.

Never push if:
- Build has errors (run npm run build first)
- npx tsc --noEmit has errors
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
- NEVER use `middleware.ts` — use `proxy.ts` only
- NEVER fallback invalid locale to defaultLocale silently → call `notFound()`
- NEVER put `title_en`, `body_en` fields in frontmatter
  → EN translation is a complete separate document: `{slug}.en.md`
- NEVER call `createAdminClient()` from Client Components
- NEVER mix `createAdminClient()` with SSR auth client (`createClient()`)
- NEVER delete `.en.md` without checking existence first via `checkFileExists()`
- NEVER use `awk` to parse Vercel CLI output — use `--json | jq` instead
- NEVER leave `inbox_messages.status` as `'processing'` on failure
  → always update to `'failed'` in catch block
- Telegram approve: success → `'done'`, failure → `'failed'`
- If example code conflicts with actual code, NEVER implement the example blindly.
  First summarize the differences, then propose an adjusted implementation based on the real codebase.
- After each step, run `npx tsc --noEmit`, report the result, and do not proceed to the next step until confirmed.

## Content Architecture

### Public content (blog, stories, portfolio): file-based
- Path: `content/{section}/{postId}.md`
- postId format: `{YYYY-MM-DD}-{slug}`  e.g. `2026-03-16-my-post`
- postId = filename stem = URL slug = edit identifier (세 가지 통일)
- postId is IMMUTABLE after creation — title changes do NOT rename the file
- On edit: update frontmatter only, add `updatedAt` + `source_updated_at` fields
- YAML serialization: always use `matter.stringify()` from gray-matter
  NEVER build frontmatter with template strings

### EN Translation files
- Path: `content/{section}/{postId}.en.md`
- Auto-generated when a post is saved (web editor OR Telegram approval)
- Complete EN document (same frontmatter schema as KO, with locale: 'en' added)
- Additional frontmatter fields:
  `locale: 'en'`, `translation_source: 'gemini'`, `translated_from_updated_at: YYYY-MM-DD`
- `getAllPosts()` MUST exclude `.en.md` files
  → filter: `filename.endsWith('.en.md')` (never use `slug.includes('.en')`)
- `getPostBySlug(section, slug, 'en')`:
  → tries `{slug}.en.md` first → falls back to `{slug}.md` (sets `hasTranslation: false`)
- On update: existing `.en.md` stale status tracked via timestamp comparison
  → stale = `source_updated_at > translated_from_updated_at`
- `translation_locked: true` in EN frontmatter = skip stale check + skip auto-retranslation
- `buildEnMarkdown`은 외부에서 주입된 `translated_from_updated_at`을 우선 사용 (내부 자동 생성 금지)
- KO의 `source_updated_at`과 EN의 `translated_from_updated_at`은 반드시 동일한 today 기준값 사용

### Private content (diary, Workspace): Supabase only — zero Git involvement
※ inbox는 Phase 21부터 Workspace로 통합됨

### Content State Model (Phase 21~)

#### 최상위 상태
- `draft`     → Supabase only, 비공개
- `published` → GitHub markdown 단일 소스, 공개

#### draft_stage (draft 하위 단계)
- `writing`      → 본문 작성 중 (회색 배지)
- `categorizing` → 카테고리 미지정 (노란 배지)
- `ready`        → 발행 validation 전체 통과 (초록 배지)
- `draft_stage=ready` MUST be derived from exactly the same validation rules that enable the publish button.
  Never create a separate “ready” rule.

#### 단일 소스 원칙
- draft     → Supabase 단일 소스 (GitHub push 절대 없음)
- published → GitHub markdown frontmatter 단일 소스
- Supabase  → published 캐시/관리 보조용으로만 활용

#### draft_stage 자동 전환 조건
- 새 글 생성                 → `writing`
- 발행 시도 + category 없음  → `categorizing`
- 발행 validation 전체 통과  → `ready`
  (발행 버튼 활성화 조건과 100% 동일. 별도 기준 만들지 말 것)

#### 발행 흐름
```
카테고리 있을 때:
  draft → 발행 클릭 → category 있음 → GitHub push → published

카테고리 없을 때:
  draft → 발행 클릭 → category 없음 → AI 추천 실행
        → 선택하면 published
        → 선택 안 하면 draft 유지 (draft_stage=categorizing)
```

## Workspace (Phase 21~)

### 탭 구조
```
Workspace                                    [새 글 작성]
├─ 전체           (섹션형 목록, 우선순위 정렬)
├─ 작성 중        (draft_stage=writing)
├─ 카테고리 지정 필요 (draft_stage=categorizing)
├─ 발행 준비 완료 (draft_stage=ready)
├─ 삭제 대기      (Delete Queue)
└─ 메시지         (Telegram + 시스템 알림 통합)
```

### 전체 탭 정렬
그룹 헤더가 있는 섹션형 목록 (우선순위 순):
1. 카테고리 지정 필요 (가장 긴급)
2. 발행 준비 완료
3. 작성 중
4. 삭제 대기
5. 메시지
각 그룹 내부: 최신 수정순

### 새 글 작성 흐름
`[새 글 작성]` 클릭 → 섹션 선택 (Blog / Stories / Portfolio)
→ `status=draft`, `draft_stage=writing` → 편집 화면으로 이동

### 메시지 탭
서브필터: 전체 / Telegram / 시스템 알림 / 조치 필요
시스템 알림 타입:
- `info`    → 배포 완료 (파란색)
- `warning` → 카테고리 삭제 영향 (노란색)
- `error`   → R2 실패, push 실패 (빨간색)
- `action_required: true/false` — 조치 필요 핀 구분

## GitHub Push Architecture

### pushMultipleToGitHub (primary — Git Data API)
```ts
// src/lib/github/push.ts
export async function pushMultipleToGitHub({
  files,   // Array<{ path, content?, delete? }>
  message,
}): Promise<{ commitSha: string }>
```
- Single atomic commit for multiple files
- 5-step Git Data API flow (no blob creation step)
- Retry up to 3 times on 422 (race condition)
- Returns commitSha for deployment tracking

### pushToGitHub (wrapper — single file)
```ts
// Thin wrapper around pushMultipleToGitHub
export async function pushToGitHub({ path, content, message }): Promise<void>
```

### deleteFromGitHub (wrapper — single file delete)
```ts
// ALWAYS check existence first via checkFileExists()
export async function deleteFromGitHub(path: string): Promise<void>
```

### checkFileExists
```ts
// Returns true (200), false (404), throws on 403/500
export async function checkFileExists(path: string): Promise<boolean>
```

### Delete multiple files
Use pushMultipleToGitHub with `delete: true` entries.
ALWAYS check existence via checkFileExists() before adding delete entry.

## Translation Architecture

### Translate utility
```ts
// src/lib/ai/translate.ts — import 'server-only' at top
export async function translatePost(input): Promise<TranslationResponse>
// { success: true, data: { title, description, body } }
// { success: false, error: string }
// NEVER throws — always returns success/failure
```

### EN file builder
```ts
// src/lib/content/en-file.ts
export function buildEnMarkdown(originalFrontmatter, translation): string
// Uses matter.stringify — NEVER template strings
// Adds: locale: 'en', translation_source: 'gemini', translated_from_updated_at
// NEVER adds title_en/body_en fields
```

### Translation failure policy
- Save always succeeds regardless of translation result
- On failure: KO only commit, existing .en.md preserved (never deleted)
- Telegram notification: include "(한국어만 — 번역 오류 발생)" when translation fails

## Telegram Bot Architecture

### Webhook handler
- API Route Handler: `src/app/api/telegram/{TELEGRAM_WEBHOOK_SECRET}/route.ts`
- `export const maxDuration = 30` at top of file
- Pattern: "Response First, Work Second"
  → Validate immediately → return 200 OK
  → Use `waitUntil` from `@vercel/functions` for background work
  → Send completion/failure notification via separate Telegram message

### approve.ts
- Uses `createAdminClient()` (NO user session in webhook context)
- Translation: attempts EN translation, falls back to KO-only on failure
- URL format: `${siteUrl}/ko/${section}/${slug}` (NEVER without /ko/)
- Deployment tracking: inserts to `deployments` table after pushMultipleToGitHub

## Supabase Tables

### admin_jobs
```sql
-- Manages admin approval workflows (delete, retranslate, etc.)
-- Partial unique index prevents duplicate in-progress jobs
-- RLS enabled, NO policies → service role only via createAdminClient()
```
Status flow: `pending → approved → executing → done | failed`
Type values: `delete_post | retranslate_post | regenerate_thumbnail`

### deployments
```sql
-- Tracks GitHub push → Vercel deployment status
-- commit_sha is the primary matching key
```
Status values: `building | ready | error | canceled`

### system_notifications
```sql
-- Phase 21 Step 7: Telegram + 시스템 알림 통합
-- type: 'info' | 'warning' | 'error'
-- source: 'deploy' | 'thumbnail' | 'category' | 'github'
-- RLS enabled, NO policies → service role only via createAdminClient()
```
- `action_required=true` → 메시지 탭 배지 카운트에 포함 (미읽음 기준)
- `read_at IS NOT NULL` → 읽음 처리됨 (opacity-60, 조치 필요 서브필터에서 제외)
- 카테고리 삭제 시 영향받는 포스트 있으면 자동 삽입 (source='category', type='warning')
- NEVER mix Telegram inbound messages with system events in the same table.
  Telegram messages and `system_notifications` must remain separate persistence layers.

### createAdminClient()
```ts
// src/lib/supabase/admin.ts — server only
// Uses SUPABASE_SERVICE_ROLE_KEYj
// NEVER use for user-facing data — admin_jobs, deployments, system_notifications only
```


## i18n Architecture

### Locales
- Supported: `['ko', 'en']`, Default: `'ko'`
- `isValidLocale(value: unknown): value is Locale`
  NEVER use `defaultLocale` as fallback → call `notFound()`

### UI Dictionary
- `messages/ko.ts`, `messages/en.ts` — static dictionaries
- `messages/index.ts` — `getDictionary(lang)` with `import 'server-only'`

### Root Layout Structure
```
app/
  [lang]/layout.tsx     ← Public pages root layout (<html lang={locale}>)
  private/layout.tsx    ← Admin pages root layout (<html lang="ko">)
  login/layout.tsx      ← Login page root layout (<html lang="ko">)
  layout.tsx            ← DELETED
```

### generateStaticParams — top-down rule
- `[lang]/layout.tsx` → generates `[{ lang: 'ko' }, { lang: 'en' }]`
- `[lang]/{section}/[slug]/page.tsx` → generates `{ slug }` only
- NEVER generate `{ lang, slug }` combinations in `[slug]/page.tsx`

### LangToggle
- Uses `usePathname()` + `router.push()` for `/ko/` ↔ `/en/` prefix swap
- DISABLED on `/private/...` and `/login` paths

## Public Page Performance Rules
- `app/[lang]/blog/page.tsx`, `stories/page.tsx`, `portfolio/page.tsx` MUST remain static
- NEVER call `createClient()` or `getUser()` in these page components
- SectionControls href must use locale-aware paths: `/private/...` (NOT `/${lang}/private/...`)
- All Header/card navigation links must be locale-aware: `/${lang}/{section}/{slug}`

## Admin Auth Pattern

### Server Actions (actions.ts)
- Import `assertAdmin` from `@/lib/auth/admin.ts`
- Call `await assertAdmin()` as the very first line

### Client Components (SectionControls.tsx)
- Check `session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL`
- Return `null` if not admin

## Server Action Pattern

### Standard pattern
```ts
export async function myAction(formData: FormData) {
  await assertAdmin()
  try {
    const result = await pushMultipleToGitHub({ files, message })
    // deployment tracking (non-blocking)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
  redirect('/private/inbox?saved=1')
}
```

### Translation pattern (non-blocking)
```ts
// Translation is attempted BEFORE pushMultipleToGitHub
// Result determines files array content
// Translation failure NEVER causes save failure
// redirect() is ALWAYS outside try/catch
```

## Button State Management (Phase 21~)

모든 비동기 액션 버튼 공통 적용:
- 클릭 전: 활성
- 클릭 후: 비활성 + 스피너 (중복 클릭 방지)
- 성공:    비활성 + 체크 아이콘
- 실패:    활성 복귀 + 에러 토스트

적용 대상: 발행하기 / 임시저장 / 삭제 / 카테고리 수정

## Slug & PostId Rules
- `safeSlug(title)`: lowercase, `.` → remove, keep 가-힣/a-z/0-9, replace others with `-`
  e.g. `'Next.js 배포 가이드'` → `'nextjs-배포-가이드'`
- `ensureUniquePostId(section, baseId)`: check GitHub, append `-2`, `-3`... max 10 attempts

## Gemini / AI Rules
- SDK: `@google/genai` (NOT `@google/generative-ai`)
- Response access: `response.text` (property, NOT `response.text()` method)
- Structured output: always use BOTH `responseMimeType` AND `responseJsonSchema`
  Schema types: `'object'`, `'string'` string literals (NOT `Type.OBJECT`)
- `translate.ts`: MUST have `import 'server-only'` at top
- Translation NEVER throws — always returns `{ success, data/error }`

## AI Category Recommendation (Phase 21~)

### 트리거
- `draft_stage=categorizing` 탭 진입 시 백그라운드 자동 분석
- 캐시 결과 있으면 재사용 (`content_hash` 기반)

### 입력값
- 제목, 본문 첫 500자, description
- 섹션, 기존 카테고리 목록, `excluded_categories`

### 출력값
- 기존 유지: 기존 카테고리 top3 + 추천 근거 한 줄
- 새로운 흐름: AI 신규 제안 top3 + 추천 근거 한 줄
- 직접 입력 옵션

### 캐시 무효화
- `content_hash` 대상: 제목 + 본문 첫 500자 + description
- 별도 캐시 키: section 변경 / 카테고리 목록 변경 / `excluded_categories` 변경
- 수동 재분석: `[AI 재분석]` 버튼 제공

### 신규 카테고리 생성 모달
- 선택 항목이 신규 제안일 때 확인 모달 표시
- 기존 카테고리와 유사도 높으면 경고 메시지 포함

## Category Management (Phase 21~)

### 범위
- blog / stories / portfolio 섹션별 독립 관리
- 섹션 간 공유 없음

### 삭제 처리
카테고리 삭제 시:
1. 확인 모달: "포스트 N개가 비공개 처리됩니다"
2. 영향받는 published 포스트:
   - GitHub 원본 삭제 → Vercel 재배포 → 공개 URL 제거
   - Supabase에 draft 복원 (데이터 원천: 삭제 직전 GitHub markdown 파싱)
   - `status=draft`, `draft_stage=categorizing`
3. AI 재추천 자동 시작
4. soft-delete tombstone 보관
5. If GitHub original deletion fails, do NOT leave a duplicated recovered draft behind.
  Either rollback the restored Supabase draft, or finalize the draft only after GitHub deletion succeeds.

### soft-delete tombstone
- 삭제된 카테고리명 → `excluded_categories` 파라미터로 AI 재제안 차단
- 관리자 명시 허용 시에만 같은 이름 재생성 가능

## GitHub Actions

### notify-deploy.yml
- Trigger: `on: push, branches: [main], paths: ['content/**']`
- `timeout-minutes: 20`
- `if: github.actor != 'github-actions[bot]'`
- Vercel CLI: `vercel list --meta githubCommitSha=$SHA --json | jq -r '.[0].url'`
- NEVER use `awk` for parsing
- Updates `deployments` table via Supabase REST API

### cleanup-deployments.yml
- Trigger: `schedule: cron '*/15 * * * *'`
- Marks `building` older than 15 minutes as `error`

### thumbnail-automation.yml (Phase 22)
- Trigger: `on: push, branches: [main], paths: ['content/**/*.md']`
- `if: github.actor != 'github-actions[bot]'`
- `concurrency: cancel-in-progress: true`
- thumbnail frontmatter 없는 포스트만 처리 / `thumbnail_locked: true` → early exit

#### 처리 흐름
```
본문 이미지 URL 추출
→ 유효 이미지 필터 적용
→ 유효 이미지 있음: 첫 번째 유효 이미지 사용
→ 유효 이미지 없음: 섹션별 기본 썸네일
→ 외부 URL: 다운로드 후 R2 업로드 / R2 URL: 그대로 사용
→ frontmatter 업데이트 → GitHub push [skip ci]
```

#### 유효 이미지 필터
제외 대상: svg/gif, avatar/logo/icon URL, timeout(10s), 10MB 초과,
세로 비율 3:1 초과, 가로 비율 4:1 초과 (배너형)

#### R2 경로
- 썸네일: `thumbnails/{section}/{slug}.jpg?v={YYYYMMDDTHHmmss}`
- 기본값: `thumbnails/defaults/default_blog.jpg` / `default_stories.jpg` / `default_portfolio.jpg`

#### frontmatter 메타데이터
```yaml
thumbnail: thumbnails/{section}/{slug}.jpg?v={YYYYMMDDTHHmmss}
thumbnail_source: first_image | default | ai_selected | ai_generated
thumbnail_locked: false
thumbnail_generated_at: {ISO timestamp}
```

#### 루프 방지 (4중)
1. `github.actor != 'github-actions[bot]'`
2. `concurrency: cancel-in-progress: true`
3. 커밋 메시지에 `[skip ci]` 포함
4. thumbnail 이미 존재 / `thumbnail_locked: true` → early exit

#### R2 실패 정책
실패 → `thumbnail_source=default` + `thumbnail_generated_at` 기록 → workflow 성공 처리
→ Telegram error 알림 (같은 slug 1시간 내 중복 suppress)

#### 롤아웃 계획
- 1차 (현재): 첫 번째 유효 이미지 / 기본 썸네일
- 2차 (추후): Gemini Vision으로 최적 이미지 선택
- 3차 (추후): Imagen API로 썸네일 생성

## maxDuration Settings
- Private Server Actions: `maxDuration: 30` in `vercel.json`
- Telegram webhook API Route: `export const maxDuration = 30` at file top
- Vercel Fluid Compute: ACTIVE (confirmed)

## AI Pipeline (Phase 5 — Do Not Touch)
- Current `src/lib/ai/draft.ts` uses `@google/genai`.
  **Do NOT refactor until Phase 5.**

## Tech Stack
- Next.js 16 App Router + TypeScript
- Tailwind CSS v4
- Supabase Auth + RLS
- Cloudflare R2 (Sharp for image processing)
- Vercel Hobby + Fluid Compute (deployment)
- Telegram Bot (webhook, waitUntil pattern)
- GitHub Actions (batch automation + deployment tracking)
- gray-matter (frontmatter parsing + serialization)
- @google/genai (Gemini API — draft + EN translation)
- @vercel/functions (waitUntil for background tasks)
