'use strict'
// Job 5 — Draft Reminder (fully automatic)
// Finds inbox items that have been pending for more than 7 days
// and sends a Telegram reminder to Shine.

const { createClient } = require('@supabase/supabase-js')
const { sendTelegramMessage, runJob } = require('./_utils')

const STALE_DAYS = 7

runJob('Draft Reminder', async () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[reminder] Supabase env vars not set — skipping')
    return
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('inbox_messages')
    .select('id, message_type, text_content, telegram_date, target_section')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .order('telegram_date', { ascending: true })
    .limit(10)

  if (error) throw new Error(`inbox query: ${error.message}`)

  if (!data || data.length === 0) {
    console.log('[reminder] No stale pending items')
    return
  }

  const lines = [
    `⏰ [미검토 알림] ${STALE_DAYS}일 이상 대기 중인 항목이 ${data.length}개 있습니다:`,
    '',
  ]

  for (const row of data) {
    const date    = row.telegram_date ? row.telegram_date.slice(0, 10) : '날짜 불명'
    const section = row.target_section ? ` [${row.target_section}]` : ''
    const preview = row.text_content
      ? row.text_content.slice(0, 50).replace(/\n/g, ' ')
      : `(${row.message_type})`
    lines.push(`• ${date}${section}: ${preview}`)
    lines.push(`  ID: ${row.id}`)
  }

  await sendTelegramMessage(lines.join('\n'))
  console.log(`[reminder] Sent reminder for ${data.length} stale items`)
})
