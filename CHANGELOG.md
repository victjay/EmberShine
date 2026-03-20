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
