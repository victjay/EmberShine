# CHANGELOG

Phase/Task 키워드가 포함된 커밋을 기준으로 정리한 구현 이력입니다.
Phase 21, 22 상세 내용은 CLAUDE.md 기준.

---

## Task 2 — Supabase Auth + RLS
`ffac2dc`

상세 내용 미확인

---

## Task 3 — Public Pages UI
`300e6cc`

상세 내용 미확인

---

## Task 4 — Private Diary Page
`06aed5c`

상세 내용 미확인

---

## Task 5 — Cloudflare R2 Integration
`5947c17`

상세 내용 미확인

---

## Task 6 — SEO Foundation + Vercel Deployment
`f7c16e8`

상세 내용 미확인

---

## Task 7 — Telegram Webhook Server
`58e7590`

상세 내용 미확인

---

## Task 8 — Inbox Storage + Command Parser
`a903141`

상세 내용 미확인

---

## Task 9 — AI Draft Generation (Claude API)
`d6dcdbf`

상세 내용 미확인

---

## Task 10 — Approval Flow + GitHub Push
`21627f7`

상세 내용 미확인

---

## Task 11 — GitHub Actions Batch Automation
`41cc9cf`

상세 내용 미확인

---

## Task 12 — Search, Comments, Analytics, RSS
`469d000`

상세 내용 미확인

---

## Task 13 — SNS Draft, Weekly Report, Backup, Related Posts
`1cecb5c`

상세 내용 미확인

---

## Task 14 — Final Documentation
`da4b436`

상세 내용 미확인

---

## Phase 13 — i18n routing + remove legacy pages
`aeb8681`

상세 내용 미확인

---

## Phase 15 — Submit button loading state
`1363ddc`

상세 내용 미확인

---

## Phase 16 — Post date sorting
`4f51619`

상세 내용 미확인

---

## Phase 17 — Stale translation tracking
`e9fd009`

상세 내용 미확인

---

## Phase 18 — Atomic KO+EN commit + Telegram translation
`d616310`

상세 내용 미확인

---

## Phase 19 — Deployment tracking + GitHub Actions
`6fd4408`

상세 내용 미확인

---

## Phase 20 — Admin post deletion with admin_jobs
`94c708f`

상세 내용 미확인

---

## Phase 21 — 콘텐츠 상태 모델 + Workspace + AI 카테고리 추천
`42e3adc` / `5850b31`

- 상태 모델: `status = draft | published`, `draft_stage = writing | categorizing | ready`
- `unassigned` 별도 상태 제거 → `draft_stage`로 흡수
- Inbox → Workspace로 재정의 (탭: 전체/작성중/카테고리지정필요/발행준비완료/삭제대기/메시지)
- AI 카테고리 이중 추천 (기존 top3 + 신규 top3), content_hash 기반 캐시 무효화
- 카테고리 관리 UI (`/private/categories`): 추가/삭제, soft-delete tombstone
- 카테고리 삭제 트랜잭션: GitHub 삭제 → Supabase draft 복원 (순서 엄수)
- 메시지 탭: Telegram + 시스템 알림 통합, 서브필터 (전체/Telegram/시스템 알림/조치 필요)
- `system_notifications` 테이블: type/source/action_required/read_at
- Supabase migrations: `004_phase21_schema.sql`, `005_phase21_notifications.sql`

---

## Phase 22 — 썸네일 자동화 1차
`8ac3d8d`

- GitHub Actions 기반 자동 썸네일 지정 (`.github/workflows/auto-thumbnail.yml`)
- 3단계 롤아웃 중 1차 구현 (첫 번째 유효 이미지 / 섹션별 기본 썸네일)
- 루프 방지 4중 방어:
  1. `github.actor != 'github-actions[bot]'`
  2. `concurrency: cancel-in-progress: true`
  3. 커밋 메시지에 `[skip ci]` 포함
  4. `thumbnail` 필드 존재 시 / `thumbnail_locked: true` → early exit
- `thumbnail_locked` / `thumbnail_source` 메타데이터
- R2 경로: `thumbnails/{section}/{slug}.jpg?v={YYYYMMDDTHHmmss}`
- 기본 썸네일: `thumbnails/defaults/default_{section}.jpg`
- R2 실패 시 Telegram 알림 (slug당 1시간 중복 suppress)
- 롤아웃 계획: 1차(현재) → 2차(Gemini Vision 최적 선택) → 3차(Imagen 생성)

---

## fix: Phase 21 UX 버그 수정
`38aa861`

**수정 파일 및 내용:**

- `src/app/private/inbox/actions.ts`
  - **Fix-1** `saveDraft`: `frontmatter` DB 조회 후 `category` 추출 → `computeDraftStage(rawTitle, body, category)` 반영. frontmatter null/비객체 예외 처리 추가. 반환값에 `newStage` 포함.
  - **Fix-1** `saveDraftCategory` 신규 추가: category 선택 시 `frontmatter.category` merge 저장 + `draft_stage` 동시 업데이트. 기존 frontmatter 필드 보존.
  - **Fix-3** `deleteInboxMessage`: `createServiceClient()` → `createAdminClient()` 교체. 에러 시 `return` → `throw error`. 성공 후 `redirect('/private/inbox?tab=messages')` 추가.
  - **Fix-5** `saveDraft`: FormData에서 `description`, `tags` 수신 → 기존 frontmatter에 merge 저장.

- `src/app/api/telegram/draft/route.ts`
  - **Fix-2**: `draft_posts` insert 시 `draft_stage` 필드 들여쓰기 오류 수정 (2칸 → 4칸, 동작 정상화).

- `src/app/private/inbox/draft/[id]/DraftEditor.tsx`
  - **Fix-4**: 발행하기 버튼 + 관련 상태(`isPublishing`, `publishError`, `toast`, `shownToastRef`, `useRef`, `useEffect` 2개, `handlePublish`, `isContentReady`, `ready`) 전부 제거. 임시저장 버튼만 유지.
  - **Fix-5**: `description`, `tags` 필드 추가 (UI + state + FormData 전송). 편집 화면 진입 시 frontmatter에서 초기값 로딩.
  - **Fix-6**: 삭제 버튼 추가 (`deleteDraft` + `router.push('/private/inbox')`). `useRouter` import 추가.
  - **Fix-7**: 삭제 버튼 로딩 상태 (`isDeleting`, spinner) 추가.

- `src/app/private/inbox/draft/[id]/page.tsx`
  - **Fix-5**: `frontmatter` 추가 select → `description`, `tags` 추출 → `DraftEditor` props 전달.

- `src/app/private/inbox/page.tsx`
  - **Fix-6**: `DraftList` 각 row에 삭제 form 추가 (`deleteDraft.bind` + `SubmitButton`). AllTab/writing/ready 탭 자동 반영.
  - **Fix-7**: `SubmitButton` (spinner 포함) 사용으로 로딩 상태 통일.

- `src/app/private/inbox/MessagesTab.tsx`
  - **Fix-6**: `TelegramCard` `<Link>` 단일 래퍼 → `<div>` + `<Link>` + 삭제 버튼 분리. `deleteInboxMessage` import 추가. `e.preventDefault()` + `e.stopPropagation()` 처리.
  - **Fix-7**: TelegramCard 삭제 버튼 spinner 추가. NotificationCard 읽음 처리 버튼 spinner 추가.

- `src/app/private/inbox/NewPostModal.tsx`
  - **Fix-9**: 트리거 `<button>` (HTML 요소)에 `cursor-pointer` 클래스 추가.

**Supabase 실행 필요 (Fix-2 NULL 보정):**
```sql
-- 1) ready
UPDATE draft_posts SET draft_stage = 'ready'
WHERE draft_stage IS NULL AND status = 'draft'
  AND title IS NOT NULL AND btrim(title) != ''
  AND body_markdown IS NOT NULL AND btrim(body_markdown) != ''
  AND frontmatter IS NOT NULL AND jsonb_typeof(frontmatter) = 'object'
  AND btrim(frontmatter->>'category') != '';
-- 2) categorizing
UPDATE draft_posts SET draft_stage = 'categorizing'
WHERE draft_stage IS NULL AND status = 'draft'
  AND title IS NOT NULL AND btrim(title) != ''
  AND body_markdown IS NOT NULL AND btrim(body_markdown) != ''
  AND (frontmatter IS NULL OR jsonb_typeof(frontmatter) != 'object'
    OR frontmatter->>'category' IS NULL OR btrim(frontmatter->>'category') = '');
-- 3) writing (나머지)
UPDATE draft_posts SET draft_stage = 'writing'
WHERE draft_stage IS NULL AND status = 'draft';
```
