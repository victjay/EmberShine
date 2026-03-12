import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isAllowedUser } from '@/lib/telegram/verify'
import { detectMessageType, parseTags, parseTargetSection } from '@/lib/telegram/parser'

// ─── Telegram types ────────────────────────────────────────────────────────

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

// ─── Handler ───────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params

  // 1. Secret path validation — return 404 to avoid revealing route structure
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

  // 2. Only handle message updates (ignore edited_message, channel_post, etc.)
  if (!message || !message.from) {
    return NextResponse.json({ ok: true })
  }

  // 3. Whitelist check — unknown senders: log and ignore silently
  if (!isAllowedUser(message.from.id)) {
    console.warn(`[telegram] Ignored update from unknown user id=${message.from.id}`)
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  // 4. Idempotency — duplicate update_id → 200 no-op
  const { data: existing } = await supabase
    .from('inbox_messages')
    .select('id')
    .eq('telegram_update_id', updateId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true })
  }

  // 5. Parse message content
  const textContent = message.text ?? message.caption ?? null
  const tags = textContent ? parseTags(textContent) : []
  const targetSection = textContent ? parseTargetSection(textContent) : null
  const messageType = detectMessageType(message as unknown as Record<string, unknown>)
  const telegramDate = new Date(message.date * 1000).toISOString()

  let mediaMimeType: string | null = null
  if (message.photo) mediaMimeType = 'image/jpeg'
  else if (message.video?.mime_type) mediaMimeType = message.video.mime_type
  else if (message.document?.mime_type) mediaMimeType = message.document.mime_type

  // 6. Insert — status is ALWAYS 'pending' (hard rule: never default to public)
  const { error } = await supabase.from('inbox_messages').insert({
    telegram_update_id: updateId,
    raw_payload: body as unknown as Record<string, unknown>,
    status: 'pending',
    message_type: messageType,
    text_content: textContent,
    media_r2_url: null,       // populated later after R2 upload + EXIF strip
    media_mime_type: mediaMimeType,
    telegram_date: telegramDate,
    parsed_tags: tags.length > 0 ? tags : null,
    target_section: targetSection,
  })

  if (error) {
    console.error('[telegram] Failed to insert inbox message:', error.message)
    // Still return 200 — Telegram will retry on non-2xx responses
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
