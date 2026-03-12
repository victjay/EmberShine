// Server-only — SNS draft generation via Gemini 2.5 Flash.
// Called after post approval; results sent to Telegram for manual posting.
// Auto-posting is disabled by default (SNS_AUTO_POST_ENABLED env var).

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface SNSDraft {
  twitter:  string  // ≤ 280 chars
  linkedin: string  // longer format
}

export async function generateSNSDraft(input: {
  title:       string
  description: string
  url:         string
  tags:        string[]
}): Promise<SNSDraft> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const tagStr = input.tags.map((t) => `#${t}`).join(' ')

  const prompt = `블로그 포스트가 발행되었습니다. SNS용 초안을 작성해주세요.

[포스트 정보]
제목: ${input.title}
설명: ${input.description}
URL: ${input.url}
태그: ${tagStr}

[생성 규칙]
1. X/Twitter: 최대 280자. 핵심 내용 + URL + 주요 해시태그 2~3개. 클릭을 유도하는 문장으로.
2. LinkedIn: 3~5문장. 전문적이고 통찰력 있는 톤. 배운 점/가치 강조. 해시태그 3~5개.
   두 언어(한국어 + English) 모두 작성.

아래 JSON 형식으로만 응답 (마크다운 코드블록 없이):
{
  "twitter": "...",
  "linkedin": "..."
}`

  const result = await model.generateContent(prompt)
  const raw    = result.response.text().trim()
  const json   = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  return JSON.parse(json) as SNSDraft
}
