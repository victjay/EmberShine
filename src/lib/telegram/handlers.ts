// Command handlers called after the inbox_messages row is already inserted.
// All handlers reply to Shine via Telegram and return void.
// Failures must not throw — log and reply with an error message instead.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from './sender'
import type { ParsedCommand } from './commands'

// ── Private diary ──────────────────────────────────────────────────────────
// "비공개: [text]" → insert diary_entries, update inbox status to 'private'

export async function handlePrivate(
  supabase: SupabaseClient,
  inboxId: string,
  content: string,
  telegramDate: string,
): Promise<void> {
  // Resolve owner UUID (personal blog — one owner)
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'owner')
    .limit(1)
    .single()

  if (profileErr || !profile) {
    console.error('[telegram] handlePrivate: owner not found', profileErr?.message)
    await sendTelegramMessage('오류: 소유자 프로필을 찾을 수 없습니다. inbox에 보관됩니다.')
    return
  }

  // Extract title (first line) / body (rest)
  const [firstLine, ...rest] = content.split('\n')
  const title = firstLine?.trim() || null
  const body  = rest.length > 0 ? rest.join('\n').trim() || content : content

  const { error: diaryErr } = await supabase.from('diary_entries').insert({
    owner_id:   profile.id,
    inbox_id:   inboxId,
    title,
    body,
    entry_date: telegramDate.slice(0, 10), // YYYY-MM-DD
  })

  if (diaryErr) {
    console.error('[telegram] handlePrivate: diary insert failed', diaryErr.message)
    await sendTelegramMessage('오류: 일기 저장에 실패했습니다. inbox에 보관됩니다.')
    return
  }

  // Mark inbox row as 'private' so it doesn't appear in pending list
  await supabase
    .from('inbox_messages')
    .update({ status: 'private' })
    .eq('id', inboxId)

  await sendTelegramMessage('비공개로 저장되었습니다. ✓')
}

// ── Draft ──────────────────────────────────────────────────────────────────
// "초안: [text]" → insert draft_posts (section from hashtags, default 'blog')

export async function handleDraft(
  supabase: SupabaseClient,
  inboxId: string,
  content: string,
  parsedTags: string[] | null,
): Promise<void> {
  // Derive section from tags
  const section = deriveSection(parsedTags)

  const [firstLine, ...rest] = content.split('\n')
  const title        = firstLine?.trim() || `초안 ${new Date().toISOString().slice(0, 10)}`
  const bodyMarkdown = rest.length > 0 ? rest.join('\n').trim() || content : content

  const { error } = await supabase.from('draft_posts').insert({
    inbox_id:      inboxId,
    section,
    title,
    body_markdown: bodyMarkdown,
  })

  if (error) {
    console.error('[telegram] handleDraft: insert failed', error.message)
    await sendTelegramMessage('오류: 초안 저장에 실패했습니다. inbox에 보관됩니다.')
    return
  }

  await sendTelegramMessage(`초안으로 저장되었습니다. (섹션: ${section}) ✓`)
}

// ── Inbox query ────────────────────────────────────────────────────────────
// "inbox" → list pending messages

export async function handleInboxQuery(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase
    .from('inbox_messages')
    .select('id, message_type, text_content, telegram_date, target_section')
    .eq('status', 'pending')
    .order('telegram_date', { ascending: false })
    .limit(10)

  if (error) {
    console.error('[telegram] handleInboxQuery failed', error.message)
    await sendTelegramMessage('오류: inbox 조회에 실패했습니다.')
    return
  }

  if (!data || data.length === 0) {
    await sendTelegramMessage('대기 중인 항목이 없습니다.')
    return
  }

  const lines = data.map((row, i) => {
    const date    = row.telegram_date ? row.telegram_date.slice(0, 10) : '날짜 없음'
    const section = row.target_section ? ` [${row.target_section}]` : ''
    const preview = row.text_content
      ? row.text_content.slice(0, 40).replace(/\n/g, ' ')
      : `(${row.message_type})`
    return `${i + 1}. ${date}${section}\n   ${preview}\n   ID: ${row.id}`
  })

  await sendTelegramMessage(
    `📥 대기 중인 항목 (${data.length}개):\n\n` + lines.join('\n\n'),
  )
}

// ── Draft list ─────────────────────────────────────────────────────────────
// "초안목록" → list draft_posts

export async function handleDraftList(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase
    .from('draft_posts')
    .select('id, section, title, status, created_at')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('[telegram] handleDraftList failed', error.message)
    await sendTelegramMessage('오류: 초안 목록 조회에 실패했습니다.')
    return
  }

  if (!data || data.length === 0) {
    await sendTelegramMessage('저장된 초안이 없습니다.')
    return
  }

  const lines = data.map((row, i) => {
    const date = row.created_at ? row.created_at.slice(0, 10) : ''
    return `${i + 1}. [${row.section}] ${row.title}\n   ${date} | ID: ${row.id}`
  })

  await sendTelegramMessage(
    `📝 초안 목록 (${data.length}개):\n\n` + lines.join('\n\n'),
  )
}

// ── Stats ──────────────────────────────────────────────────────────────────
// "통계" → message counts by status + diary count

export async function handleStats(supabase: SupabaseClient): Promise<void> {
  const [inboxRes, diaryRes, draftRes] = await Promise.all([
    supabase.from('inbox_messages').select('status'),
    supabase.from('diary_entries').select('id', { count: 'exact', head: true }),
    supabase.from('draft_posts').select('id', { count: 'exact', head: true }),
  ])

  const inbox = inboxRes.data ?? []
  const counts: Record<string, number> = {}
  for (const row of inbox) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }

  const lines = [
    `📊 통계`,
    ``,
    `📥 inbox 총 ${inbox.length}개`,
    `  • 대기중: ${counts.pending ?? 0}`,
    `  • 승인됨: ${counts.approved ?? 0}`,
    `  • 비공개: ${counts.private ?? 0}`,
    `  • 거절됨: ${counts.rejected ?? 0}`,
    ``,
    `📓 일기: ${diaryRes.count ?? 0}개`,
    `📝 초안: ${draftRes.count ?? 0}개`,
  ]

  await sendTelegramMessage(lines.join('\n'))
}

// ── Helpers ────────────────────────────────────────────────────────────────

function deriveSection(tags: string[] | null): 'blog' | 'stories' | 'portfolio' {
  if (!tags) return 'blog'
  const lower = tags.map((t) => t.toLowerCase())
  if (lower.includes('#story') || lower.includes('#stories')) return 'stories'
  if (lower.includes('#portfolio')) return 'portfolio'
  return 'blog'
}
