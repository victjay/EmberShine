# P23-6: media_group 버퍼 아키텍처 설계

> 상태: 설계 완료 / 구현 보류 (pg_cron 가용성 미확인, quiet_period 미결정)

---

## 문제

Telegram media_group(앨범)은 동일한 `media_group_id`를 가진 다수의 Update로 분리 전송된다.
현재 구현(P23-Hotfix)은 caption 없는 secondary 사진을 early-exit으로 차단하나,
**첫 번째 메시지에 caption이 있고 나머지에는 없는 경우**에 한해 정상 동작한다.

미처리 케이스:
- caption이 첫 번째가 아닌 메시지에 붙는 경우 (드물지만 가능)
- 미래 요구사항: media_group의 모든 사진을 하나의 draft에 묶어 생성

---

## 제안 아키텍처

### 핵심 아이디어
`inbox_messages`에 `media_group_id`별로 버퍼 레코드를 모으고,
마지막 메시지 수신 후 일정 시간(`quiet_period`) 경과 시 하나의 draft 생성.

### 필요 스키마

```sql
-- media_group_buffer 테이블 (신규)
CREATE TABLE media_group_buffer (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_group_id   text NOT NULL,
  chat_id          text NOT NULL,
  messages         jsonb NOT NULL DEFAULT '[]',   -- array of raw Telegram message objects
  caption          text,                           -- 첫 발견된 caption
  target_section   text,
  parsed_tags      text[],
  last_received_at timestamptz NOT NULL DEFAULT now(),
  processed        boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ON media_group_buffer (media_group_id, chat_id) WHERE NOT processed;
```

### Webhook 핸들러 변경 (`[secret]/route.ts`)

```
media_group_id 있음 + caption 있음:
  → UPSERT media_group_buffer (caption, section, tags, last_received_at 갱신)
  → NextResponse.json({ ok: true })

media_group_id 있음 + caption 없음:
  → UPSERT media_group_buffer (messages 배열에 push, last_received_at 갱신)
  → NextResponse.json({ ok: true })

(기존 photo_post/pending/default 경로는 media_group_id 없는 경우만 진입)
```

### Flush 트리거 (2가지 옵션)

#### 옵션 A: pg_cron (권장, Supabase Pro/Team 이상)

```sql
SELECT cron.schedule(
  'flush-media-group-buffer',
  '*/1 * * * *',  -- 1분마다
  $$
    SELECT flush_media_group_buffers();
  $$
);
```

`flush_media_group_buffers()` 함수:
1. `last_received_at < now() - interval '{quiet_period}'` AND `processed = false` 조회
2. 각 row → `/api/telegram/draft` POST (caption + 모든 사진 URL 포함)
3. `processed = true` 업데이트
4. 오래된 처리 완료 레코드 정리 (7일 이상)

#### 옵션 B: Vercel Cron Job (현재 플랜 가능)

```yaml
# vercel.json
{
  "crons": [
    { "path": "/api/cron/flush-media-group", "schedule": "* * * * *" }
  ]
}
```

`/api/cron/flush-media-group/route.ts`:
- 동일 flush 로직 구현
- Vercel Cron 인증 헤더 검증 필요

---

## quiet_period 결정 기준

Telegram media_group의 마지막 update가 도착하는 시간:
- 실측 필요 (네트워크 환경, 사진 수에 따라 다름)
- 초안 추천값: **3~5초**
- 보수적 추천값: **10초**

**결정 전 실측 절차:**
1. Telegram에서 10장 앨범 전송
2. `inbox_messages.telegram_date` 기준 첫 번째 ~ 마지막 메시지 도착 시간 차이 측정
3. 해당 값 + 2초 마진 = quiet_period

---

## 구현 선행 조건

| 조건 | 확인 방법 |
|------|-----------|
| Supabase pg_cron 활성화 여부 | Supabase Dashboard → Database → Extensions → pg_cron |
| quiet_period 실측 | 위 절차 수행 |
| Vercel Cron 대안 선택 여부 | 플랜 확인 (Hobby는 1/day 제한) |

---

## 현재 상태 (P23-Hotfix 이후)

- caption 없는 secondary 사진 → early-exit (solo draft 방지)
- caption 있는 첫 사진 → 기존 flow 정상 동작 (단일 사진으로 처리)
- media_group 묶음 처리는 미구현

P23-6은 위 선행 조건 확인 후 별도 Phase로 구현 예정.
