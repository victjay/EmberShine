import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isAllowedUser } from '@/lib/telegram/verify'
import { detectMessageType, parseTags, parseTargetSection } from '@/lib/telegram/parser'
import { parseCommand } from '@/lib/telegram/commands'
import { sendTelegramMessage } from '@/lib/telegram/sender'
import {
  handlePrivate,
  handleDraft,
  handleInboxQuery,
  handleDraftList,
  handleStats,
} from '@/lib/telegram/handlers'

// ─── Telegram types ─────────────────────────────────────────────────────────

interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
}

interface TelegramPhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

interface TelegramDocument {
  file_id: string
  file_unique_id: string
  file_name?: string
  mime_type?: string
}

interface TelegramVideo {
  file_id: string
  file_unique_id: string
  mime_type?: string
}

interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: { id: number; type: string }
  date: number
  text?: string
  caption?: string
  photo?: TelegramPhotoSize[]
  document?: TelegramDocument
  video?: TelegramVideo
  media_group_id?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
  channel_post?: TelegramMessage
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params

  // 1. Secret path validation — 404 avoids revealing route structure
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: TelegramUpdate
  try {
    body = await request.json() as TelegramUpdate
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { update_id: updateId, message } = body

  // 2. Only handle message updates
  if (!message || !message.from) {
    return NextResponse.json({ ok: true })
  }

  // 3. Whitelist check
  if (!isAllowedUser(message.from.id)) {
    console.warn(`[telegram] Ignored update from unknown user id=${message.from.id}`)
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  // 4. Idempotency — duplicate update_id → no-op
  const { data: existing } = await supabase
    .from('inbox_messages')
    .select('id')
    .eq('telegram_update_id', updateId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true })
  }

  // 5. Parse message content
  const textContent   = message.text ?? message.caption ?? null
  const tags          = textContent ? parseTags(textContent) : []
  const targetSection = textContent ? parseTargetSection(textContent) : null
  const messageType   = detectMessageType(message as unknown as Record<string, unknown>)
  const telegramDate  = new Date(message.date * 1000).toISOString()
  const hasPhoto      = Boolean(message.photo?.length)

  let mediaMimeType: string | null = null
  if (message.photo) mediaMimeType = 'image/jpeg'
  else if (message.video?.mime_type) mediaMimeType = message.video.mime_type
  else if (message.document?.mime_type) mediaMimeType = message.document.mime_type

  // 6. Parse command — MUST happen before insert so we can short-circuit query commands
  const command = parseCommand(textContent, hasPhoto)

  // 7. Query commands do not need an inbox row — handle and return early
  if (command.type === 'inbox') {
    await handleInboxQuery(supabase)
    return NextResponse.json({ ok: true })
  }
  if (command.type === 'draftlist') {
    await handleDraftList(supabase)
    return NextResponse.json({ ok: true })
  }
  if (command.type === 'stats') {
    await handleStats(supabase)
    return NextResponse.json({ ok: true })
  }
  if (command.type === 'backup') {
    await sendTelegramMessage('백업 기능은 준비 중입니다. (Phase 4)')
    return NextResponse.json({ ok: true })
  }

  // 8. Insert to inbox — status is ALWAYS 'pending' (hard rule: never default to public)
  const { data: inboxRow, error: insertError } = await supabase
    .from('inbox_messages')
    .insert({
      telegram_update_id: updateId,
      from_id:            message.from.id,
      raw_payload:        body as unknown as Record<string, unknown>,
      status:             'pending',
      message_type:       messageType,
      text_content:       textContent,
      media_r2_url:       null,        // populated in Phase 4 (R2 pipeline)
      media_mime_type:    mediaMimeType,
      telegram_date:      telegramDate,
      parsed_tags:        tags.length > 0 ? tags : null,
      target_section:     targetSection,
    })
    .select('id')
    .single()

  if (insertError || !inboxRow) {
    console.error('[telegram] Failed to insert inbox message:', insertError?.message)
    // Still 200 — Telegram retries on non-2xx
    return NextResponse.json({ ok: true })
  }

  const inboxId = inboxRow.id

  // 9. Command dispatch — runs after the inbox row exists
  switch (command.type) {
    case 'private':
      await handlePrivate(supabase, inboxId, command.content!, telegramDate)
      break

    case 'draft':
      await handleDraft(supabase, inboxId, command.content!, tags.length > 0 ? tags : null)
      break

    case 'schedule':
      await sendTelegramMessage(
        `예약이 inbox에 저장되었습니다. (예약 시각: ${command.datetime})\n자동 발행 기능은 Phase 4에서 구현됩니다.`,
      )
      break

    case 'edit':
      await sendTelegramMessage(
        `수정 요청이 inbox에 저장되었습니다. (대상 ID: ${command.postId})\n수정 파이프라인은 Phase 4에서 구현됩니다.`,
      )
      break

    case 'photo_post':
    case 'pending':
    default:
      await sendTelegramMessage('메시지를 받았습니다. inbox에 보관되었습니다.')
      break
  }

  return NextResponse.json({ ok: true })
}
