'use strict'
// Job 1 — SEO Check
// Scans all markdown content files for missing or thin metadata.
// Reports findings via Telegram. Never fails the workflow on findings alone.

const fs     = require('fs')
const path   = require('path')
const matter = require('gray-matter')
const { sendTelegramMessage, runJob } = require('./_utils')

const CONTENT_DIR  = path.join(__dirname, '../../content')
const MIN_DESC_LEN = 50

runJob('SEO Check', async () => {
  const sections = ['blog', 'stories', 'portfolio']
  const issues   = []
  let   total    = 0

  for (const section of sections) {
    const dir = path.join(CONTENT_DIR, section)
    if (!fs.existsSync(dir)) continue

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))
    for (const file of files) {
      total++
      const raw  = fs.readFileSync(path.join(dir, file), 'utf8')
      const { data } = matter(raw)
      const slug = `${section}/${file}`

      if (!data.title)                             issues.push(`${slug}: title 누락`)
      if (!data.date)                              issues.push(`${slug}: date 누락`)
      if (!data.description && !data.summary)      issues.push(`${slug}: description 누락`)
      else if ((data.description ?? data.summary ?? '').length < MIN_DESC_LEN)
                                                   issues.push(`${slug}: description 너무 짧음 (${(data.description ?? data.summary ?? '').length}자)`)
      if (!data.tags || data.tags.length === 0)    issues.push(`${slug}: tags 누락`)
    }
  }

  console.log(`[seo] ${total}개 파일 검사, ${issues.length}개 이슈 발견`)

  if (issues.length === 0) {
    await sendTelegramMessage(`✅ [SEO 검사 완료] 총 ${total}개 파일 — 이슈 없음`)
    return
  }

  const lines = [
    `⚠️ [SEO 검사 완료] ${total}개 파일 중 ${issues.length}개 이슈 발견`,
    '',
    ...issues.slice(0, 20),   // cap at 20 to avoid Telegram message length limit
    ...(issues.length > 20 ? [`... 외 ${issues.length - 20}개`] : []),
  ]
  await sendTelegramMessage(lines.join('\n'))
})
