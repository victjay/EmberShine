'use strict'
// Job 2 — AI Suggestions (proposal only, never auto-applied)
// Reads all content files, asks Gemini for tag + related-post improvements,
// and sends the suggestions via Telegram for Shine to review.

const fs     = require('fs')
const path   = require('path')
const matter = require('gray-matter')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { sendTelegramMessage, runJob } = require('./_utils')

const CONTENT_DIR = path.join(__dirname, '../../content')

runJob('AI Suggestions', async () => {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.log('[suggestions] GOOGLE_GENERATIVE_AI_API_KEY not set — skipping')
    return
  }

  // Collect all posts
  const posts = []
  for (const section of ['blog', 'stories', 'portfolio']) {
    const dir = path.join(CONTENT_DIR, section)
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8')
      const { data, content } = matter(raw)
      posts.push({
        slug:    `${section}/${file.replace('.md', '')}`,
        section,
        title:   data.title   ?? '(제목 없음)',
        tags:    data.tags    ?? [],
        excerpt: content.slice(0, 200).replace(/\n+/g, ' '),
      })
    }
  }

  if (posts.length === 0) {
    await sendTelegramMessage('📝 [AI 제안] 분석할 게시물이 없습니다.')
    return
  }

  const postList = posts.map((p, i) =>
    `${i + 1}. [${p.section}] ${p.title} (태그: ${p.tags.join(', ') || '없음'})`
  ).join('\n')

  const prompt = `다음은 개인 블로그 "EmberShine"의 게시물 목록입니다:

${postList}

각 게시물에 대해:
1. 태그 개선 제안 (추가하면 좋을 태그 1-3개)
2. 관련 게시물 연결 제안 (서로 연결하면 좋을 게시물 쌍)
3. 전체적인 콘텐츠 갭 (없으면 좋을 주제)

간결하게 한국어로 답변하세요. 총 5개 이내의 핵심 제안만 제시하세요.`

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  const model  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(prompt)
  const text   = result.response.text().slice(0, 3800) // Telegram limit

  await sendTelegramMessage(`💡 [AI 제안이 준비되었습니다]\n총 ${posts.length}개 게시물 분석\n\n${text}`)
  console.log('[suggestions] Suggestions sent via Telegram')
})
