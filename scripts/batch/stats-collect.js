'use strict'
// Job 4 — Statistics Collection (fully automatic)
// Aggregates Supabase counts and sends a daily report.
// On Mondays, sends an extended weekly summary.

const { createClient } = require('@supabase/supabase-js')
const { sendTelegramMessage, runJob } = require('./_utils')

runJob('Statistics Collection', async () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[stats] Supabase env vars not set — skipping')
    return
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const [inboxRes, diaryRes, draftRes, publishedRes] = await Promise.all([
    supabase.from('inbox_messages').select('status'),
    supabase.from('diary_entries').select('id', { count: 'exact', head: true }),
    supabase.from('draft_posts').select('status'),
    supabase.from('inbox_messages').select('id', { count: 'exact', head: true })
      .eq('status', 'published'),
  ])

  if (inboxRes.error) throw new Error(`inbox query: ${inboxRes.error.message}`)

  const inbox = inboxRes.data ?? []
  const statusCount = inbox.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {})

  const drafts        = draftRes.data ?? []
  const draftStatuses = drafts.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {})

  const today     = new Date()
  const isMonday  = today.getUTCDay() === 1
  const dateStr   = today.toISOString().slice(0, 10)

  const lines = [
    `📊 [일일 통계] ${dateStr}`,
    ``,
    `📥 inbox 총 ${inbox.length}개`,
    `  대기: ${statusCount.pending ?? 0}  처리중: ${statusCount.processing ?? 0}`,
    `  승인: ${statusCount.approved ?? 0}  발행: ${statusCount.published ?? 0}`,
    `  거절: ${statusCount.rejected ?? 0}  비공개: ${statusCount.private ?? 0}`,
    ``,
    `📓 일기: ${diaryRes.count ?? 0}개`,
    `📝 초안: ${draftRes.data?.length ?? 0}개 (draft: ${draftStatuses.draft ?? 0} / 발행: ${draftStatuses.published ?? 0})`,
  ]

  if (isMonday) {
    lines.push(``, `🗓️ 주간 요약 (월요일)`)
    lines.push(`이번 주 발행 게시물: ${publishedRes.count ?? 0}개 누적`)
  }

  await sendTelegramMessage(lines.join('\n'))
  console.log('[stats] Report sent')
})
