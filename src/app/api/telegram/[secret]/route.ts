export const runtime = 'nodejs'

import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isAllowedUser } from '@/lib/telegram/verify'
import { detectMessageType, parseTags, parseTargetSection } from '@/lib/telegram/parser'
import { parseCommand } from '@/lib/telegram/commands'
import { sendTelegramMessage } from '@/lib/telegram/sender'
import { sendDraftPreview, answerCallbackQuery } from '@/lib/telegram/preview'
import { generateDraft } from '@/lib/ai/draft'
import { runApprovalPipeline } from '@/lib/telegram/approve'
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

interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
  channel_post?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params

  // 1. Secret path validation
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: TelegramUpdate
  try {
    body = await request.json() as TelegramUpdate
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Callback query (inline button press) ──────────────────────────────────
  if (body.callback_query) {
    const cq = body.callback_query

    if (!isAllowedUser(cq.from.id)) {
      return NextResponse.json({ ok: true })
    }

    await handleCallbackQuery(cq)
    return NextResponse.json({ ok: true })
  }

  // ── Regular message ────────────────────────────────────────────────────────
  const { update_id: updateId, message } = body

  if (!message || !message.from) {
    return NextResponse.json({ ok: true })
  }

  if (!isAllowedUser(message.from.id)) {
    console.warn(`[telegram] Ignored update from unknown user id=${message.from.id}`)
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  // Idempotency
  const { data: existing } = await supabase
    .from('inbox_messages')
    .select('id')
    .eq('telegram_update_id', updateId)
    .maybeSingle()

  if (existing) return NextResponse.json({ ok: true })

  // Parse content
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

  const command = parseCommand(textContent, hasPhoto)

  // Query commands don't need an inbox row
  if (command.type === 'inbox')     { await handleInboxQuery(supabase); return NextResponse.json({ ok: true }) }
  if (command.type === 'draftlist') { await handleDraftList(supabase);  return NextResponse.json({ ok: true }) }
  if (command.type === 'stats')     { await handleStats(supabase);      return NextResponse.json({ ok: true }) }
  if (command.type === 'backup') {
    await sendTelegramMessage('백업 기능은 준비 중입니다. (Phase 4)')
    return NextResponse.json({ ok: true })
  }

  // Insert to inbox — ALWAYS 'pending'
  const { data: inboxRow, error: insertError } = await supabase
    .from('inbox_messages')
    .insert({
      telegram_update_id: updateId,
      from_id:            message.from.id,
      raw_payload:        body as unknown as Record<string, unknown>,
      status:             'pending',
      message_type:       messageType,
      text_content:       textContent,
      media_r2_url:       null,
      media_mime_type:    mediaMimeType,
      telegram_date:      telegramDate,
      parsed_tags:        tags.length > 0 ? tags : null,
      target_section:     targetSection,
    })
    .select('id')
    .single()

  if (insertError || !inboxRow) {
    console.error('[telegram] Failed to insert inbox message:', insertError?.message)
    return NextResponse.json({ ok: true })
  }

  const inboxId = inboxRow.id

  // Command dispatch
  switch (command.type) {
    case 'private':
      await handlePrivate(supabase, inboxId, command.content!, telegramDate)
      return NextResponse.json({ ok: true })

    case 'draft':
      await handleDraft(supabase, inboxId, command.content!, tags.length > 0 ? tags : null)
      return NextResponse.json({ ok: true })

    case 'schedule':
      await sendTelegramMessage(
        `예약이 inbox에 저장되었습니다. (예약 시각: ${command.datetime})\n자동 발행 기능은 Phase 4에서 구현됩니다.`,
      )
      return NextResponse.json({ ok: true })

    case 'edit':
      await sendTelegramMessage(
        `수정 요청이 inbox에 저장되었습니다. (대상 ID: ${command.postId})\n수정 파이프라인은 Phase 4에서 구현됩니다.`,
      )
      return NextResponse.json({ ok: true })

    case 'photo_post':
    case 'pending':
    default: {
      // Respond to Telegram immediately, generate AI draft after response
      after(async () => {
        await runAIDraftPipeline({
          inboxId,
          text: textContent ?? '',
          section: targetSection,
          tags,
          hasPhoto,
        })
      })
      await sendTelegramMessage('메시지를 받았습니다. AI 초안을 생성 중입니다...')
      return NextResponse.json({ ok: true })
    }
  }
}

// ─── AI draft pipeline (runs after response via after()) ──────────────────

async function runAIDraftPipeline(input: {
  inboxId: string
  text: string
  section: string | null
  tags: string[]
  hasPhoto: boolean
}): Promise<void> {
  if (!input.text) {
    await sendTelegramMessage('텍스트가 없어 AI 초안을 생성할 수 없습니다. inbox에 보관되었습니다.')
    return
  }

  const supabase = createServiceClient()

  let draft
  try {
    draft = await generateDraft({
      text: input.text,
      section: input.section,
      existingTags: input.tags,
      hasPhoto: input.hasPhoto,
    })
  } catch (err) {
    console.error('[ai] Draft generation failed:', err)
    await sendTelegramMessage(`AI 초안 생성에 실패했습니다.\n수동으로 검토해주세요. (inbox ID: ${input.inboxId})`)
    return
  }

  // Insert into draft_posts
  const section = deriveSection(input.tags, input.section)
  const { error: draftError } = await supabase.from('draft_posts').insert({
    inbox_id:      input.inboxId,
    section,
    title:         draft.titles[0],
    body_markdown: draft.body_markdown,
    frontmatter: {
      ai_titles:          draft.titles,
      ai_summary:         draft.summary,
      ai_tags:            draft.tags,
      ai_meta_description: draft.meta_description,
      ai_translation:     draft.translation,
    },
    status: 'draft',
  })

  if (draftError) {
    console.error('[ai] Failed to save draft_post:', draftError.message)
    await sendTelegramMessage(`초안 저장에 실패했습니다. (inbox ID: ${input.inboxId})`)
    return
  }

  // Mark draft_generated_at on inbox row
  await supabase
    .from('inbox_messages')
    .update({ draft_generated_at: new Date().toISOString() })
    .eq('id', input.inboxId)

  // Send preview to Shine
  await sendDraftPreview(input.inboxId, draft)
}

// ─── Callback query dispatch ───────────────────────────────────────────────

async function handleCallbackQuery(cq: TelegramCallbackQuery): Promise<void> {
  const data = cq.data ?? ''
  const colonIdx = data.indexOf(':')
  const action   = colonIdx === -1 ? data : data.slice(0, colonIdx)
  const inboxId  = colonIdx === -1 ? '' : data.slice(colonIdx + 1)

  if (!inboxId) {
    await answerCallbackQuery(cq.id, '잘못된 요청입니다.')
    return
  }

  const supabase = createServiceClient()

  switch (action) {
    case 'approve': {
      await answerCallbackQuery(cq.id, '발행 파이프라인 시작...')
      await sendTelegramMessage('⏳ 발행 처리 시작 — 이미지 처리 및 GitHub 푸시 중입니다...')
      after(async () => {
        await runApprovalPipeline(inboxId)
      })
      break
    }

    case 'reject': {
      await answerCallbackQuery(cq.id, '거절 처리 중...')
      const { error } = await supabase
        .from('inbox_messages')
        .update({ status: 'rejected' })
        .eq('id', inboxId)
      if (error) {
        await sendTelegramMessage(`거절 실패: ${error.message}`)
      } else {
        await sendTelegramMessage(`❌ 거절되었습니다.`)
      }
      break
    }

    case 'edit': {
      await answerCallbackQuery(cq.id, '수정 페이지로 이동하세요')
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
      await sendTelegramMessage(
        `✏️ 웹 에디터에서 편집하세요:\n${siteUrl}/private/inbox`,
      )
      break
    }

    case 'view_full': {
      await answerCallbackQuery(cq.id, '전문 로드 중...')
      const { data: draft } = await supabase
        .from('draft_posts')
        .select('title, body_markdown')
        .eq('inbox_id', inboxId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (!draft) {
        await sendTelegramMessage('초안을 찾을 수 없습니다.')
      } else {
        // Telegram message limit is 4096 chars
        const body = draft.body_markdown.slice(0, 3800)
        await sendTelegramMessage(`📄 <b>${draft.title}</b>\n\n${body}`)
      }
      break
    }

    case 'view_translation': {
      await answerCallbackQuery(cq.id, '번역 로드 중...')
      const { data: draft } = await supabase
        .from('draft_posts')
        .select('frontmatter')
        .eq('inbox_id', inboxId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      const translation = (draft?.frontmatter as Record<string, unknown>)?.ai_translation
      if (!translation) {
        await sendTelegramMessage('영어 번역을 찾을 수 없습니다.')
      } else {
        await sendTelegramMessage(`🌐 <b>English translation:</b>\n\n${translation}`)
      }
      break
    }

    default:
      await answerCallbackQuery(cq.id, '알 수 없는 요청입니다.')
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function deriveSection(
  tags: string[],
  section: string | null,
): 'blog' | 'stories' | 'portfolio' {
  if (section === 'stories' || section === 'portfolio') return section
  const lower = tags.map((t) => t.toLowerCase())
  if (lower.includes('#story') || lower.includes('#stories')) return 'stories'
  if (lower.includes('#portfolio')) return 'portfolio'
  return 'blog'
}
