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

## Phase 21 UX 버그 수정 (Fix-1~7, Fix-9)
`38aa861` / `87a4ada`

> Fix-8 (UI 라벨)은 inbox 관련 라벨이 없어 적용 제외.

---

### Fix-1. `saveDraft` category 조건 버그

**파일:** `src/app/private/inbox/actions.ts`

- `saveDraft`: 기존에는 FormData(`id`, `title`, `body`)만 수신하고 DB 조회 없이 `computeDraftStage`를 호출 → `category`가 항상 `null`로 처리되는 버그.
  - `draft_posts.frontmatter`를 DB에서 조회하도록 변경
  - `frontmatter.category` 추출 후 `computeDraftStage(rawTitle, body, category)` 적용
  - frontmatter null → category `null`로 간주
  - frontmatter가 객체가 아닌 예외 타입(array/scalar 등) → 에러 반환 (임의 진행 금지)
  - 반환값에 `newStage` 포함

- `saveDraftCategory` 신규 Server Action 추가:
  - 카테고리 선택 시 `frontmatter.category`를 먼저 저장하는 전용 액션
  - 기존 frontmatter 필드 spread 후 `category` merge (다른 필드 덮어쓰기 없음)
  - `computeDraftStage(title, body, categoryName)` 재계산 → `draft_stage` 동시 업데이트
  - 반환: `{ newStage }` or `{ error }`

---

### Fix-2. Telegram webhook `draft_stage` NULL 버그

**파일:** `src/app/api/telegram/draft/route.ts`

- `draft_posts` insert 시 `draft_stage` 필드 들여쓰기가 2칸으로 잘못 되어 있어 실제로 저장되지 않던 버그 → 4칸으로 수정하여 정상 동작
- insert 시 값: `computeDraftStage(draft.titles[0], draft.body_markdown, null)`
  - Telegram 초안 생성 시점에는 category 없음 → `'categorizing'` 반환

**Supabase NULL 보정 SQL (실행 완료):**

```sql
-- 반드시 이 순서로 실행

-- 1) title/body/frontmatter.category 모두 있으면 → ready
UPDATE draft_posts SET draft_stage = 'ready'
WHERE draft_stage IS NULL AND status = 'draft'
  AND title IS NOT NULL AND btrim(title) != ''
  AND body_markdown IS NOT NULL AND btrim(body_markdown) != ''
  AND frontmatter IS NOT NULL
  AND jsonb_typeof(frontmatter) = 'object'
  AND btrim(frontmatter->>'category') != '';

-- 2) title/body 있고 frontmatter.category 없으면 → categorizing
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

-- 3) 나머지 전부 → writing
UPDATE draft_posts SET draft_stage = 'writing'
WHERE draft_stage IS NULL AND status = 'draft';
```

---

### Fix-3. 메시지 탭 삭제 후 404

**파일:** `src/app/private/inbox/actions.ts` — `deleteInboxMessage`

- `createServiceClient()` → `createAdminClient()` 교체 (RLS 우회 필요)
- 에러 처리 강화: `if (error) { return }` → `if (error) { throw error }`
- 삭제 성공 후 `redirect('/private/inbox?tab=messages')` 추가 (try-catch 바깥, `revalidatePath` 다음)
- FK 정리 순서 유지: `draft_posts` 삭제 → `inbox_messages` 삭제

---

### Fix-4. 편집 화면 발행하기 버튼 제거

**파일:** `src/app/private/inbox/draft/[id]/DraftEditor.tsx`

편집 화면에서 발행하기 버튼 제거. 발행은 categorizing 탭 `CategorizeCard`에서만 수행.

제거 항목 (발행 버튼 전용, 다른 UI에서 미사용 확인 후 제거):
- `publishDraft` import
- `isPublishing`, `startPublish` (useTransition)
- `publishError` state
- `handlePublish` 함수
- `isContentReady` 함수 / `ready` 변수
- `toast` state / `shownToastRef` (useRef) / useEffect 2개 (toast 전용)
- `useRef`, `useEffect` import
- 발행하기 버튼 JSX / publishError 표시 JSX / Toast 블록 전체

유지 항목: 임시저장 버튼, `savedFlash`, `saveError`, `currentStage`, `isSaving`

---

### Fix-5. 편집 화면 Tags / Description 필드 추가

**저장 구조:** 새 컬럼 추가 없음. 기존 `frontmatter` JSONB 컬럼에 저장.
`date` 필드는 draft에 저장하지 않으므로 편집 화면에서 제외.

**파일:** `src/app/private/inbox/draft/[id]/page.tsx`
- `frontmatter` 추가 select
- `frontmatter.description`, `frontmatter.tags` 추출 → `DraftEditor` props로 전달

**파일:** `src/app/private/inbox/draft/[id]/DraftEditor.tsx`
- `initialDescription: string`, `initialTags: string` props 추가
- `description`, `tags` state 추가 (초기값: frontmatter에서 로딩)
- UI 필드 순서: Title → Tags (text input, 쉼표 구분) → Description (textarea, optional) → Content
- FormData에 `description`, `tags` 포함하여 `saveDraft`에 전송

**파일:** `src/app/private/inbox/actions.ts` — `saveDraft`
- FormData에서 `description`, `tags` 수신
- `tags`: 쉼표 분리 후 trim/filter → `string[]`
- 기존 frontmatter spread 후 `description`, `tags` merge 저장
- `frontmatter: updatedFm` update에 포함 (category 등 기존 필드 보존)
- frontmatter 예외 타입 시 에러 반환

---

### Fix-6. 삭제 버튼 추가

**DraftList** (`src/app/private/inbox/page.tsx`)
- `deleteDraft` import 추가
- 각 row: `<Link>` 단독 → `<li>` + `<Link>` + 삭제 `<form>` 분리
- 삭제: `deleteDraft.bind(null, item.id)` + `SubmitButton` (form action 패턴)
- AllTab → DraftGroup → DraftList 재사용 구조이므로 all/writing/ready 탭 전체 자동 반영

**TelegramCard** (`src/app/private/inbox/MessagesTab.tsx`)
- `deleteInboxMessage` import 추가
- `<Link>` 단일 래퍼 → `<div>` + `<Link>` + 삭제 버튼 분리
- 삭제 버튼 onClick: `e.preventDefault()` + `e.stopPropagation()` → `useTransition` 패턴
- FormData 직접 생성 후 `deleteInboxMessage(formData)` 호출

**DraftEditor** (`src/app/private/inbox/draft/[id]/DraftEditor.tsx`)
- `deleteDraft` import, `useRouter` import 추가
- `isDeleting`, `startDelete` (useTransition) 추가
- `handleDelete`: confirm → `deleteDraft(id)` → 성공 시 `router.push('/private/inbox')`
- `deleteError` state 추가 (에러 표시)
- 삭제 버튼: `isSaving || isDeleting` 시 비활성

---

### Fix-7. 버튼 로딩 상태 통일

시각적 통일. 구조에 맞는 패턴 유지 (form action → SubmitButton, onClick → useTransition).

| 컴포넌트 | 버튼 | 패턴 | 변경 내용 |
|---|---|---|---|
| `DraftList` | 삭제 | `<form>` + `SubmitButton` | Fix-6과 함께 적용 |
| `TelegramCard` | 삭제 | `useTransition` | spinner + `isDeleting` disabled |
| `DraftEditor` | 삭제 | `useTransition` | spinner + `isDeleting` disabled |
| `NotificationCard` | 읽음 처리 | `useTransition` | 기존 텍스트 "처리 중…"에 spinner 추가 |
| `CategorizeCard` | 삭제 | — | 이미 존재(`handleDelete`), 미변경 |

---

### Fix-9. `NewPostModal` cursor-pointer 누락

**파일:** `src/app/private/inbox/NewPostModal.tsx`

- 트리거 `<button>` (HTML 요소 확인)에 `cursor-pointer` 클래스 추가
