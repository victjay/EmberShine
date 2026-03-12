// Server-only — Claude API draft generation.
// Called after an inbox message is stored; result is inserted into draft_posts.

import Anthropic from '@anthropic-ai/sdk'

export interface AIDraft {
  titles: [string, string, string]
  body_markdown: string
  summary: string
  tags: string[]
  meta_description: string
  translation: string
}

export async function generateDraft(input: {
  text: string
  section: string | null
  existingTags: string[]
  hasPhoto: boolean
}): Promise<AIDraft> {
  const client = new Anthropic()

  const sectionHint = input.section
    ? `섹션: ${input.section}`
    : '섹션: 미정 (blog 기본값 사용)'

  const photoHint = input.hasPhoto
    ? '사진이 첨부된 메시지입니다.'
    : '텍스트 메시지입니다.'

  const tagHint =
    input.existingTags.length > 0
      ? `기존 태그: ${input.existingTags.join(', ')}`
      : ''

  const prompt = `당신은 개인 블로그 "EmberShine"의 글쓰기 도우미입니다.
Shine이 Telegram으로 보낸 메시지를 바탕으로 블로그 초안을 작성해주세요.

[입력 정보]
${sectionHint}
${photoHint}
${tagHint}

[메시지 내용]
${input.text}

[생성 규칙]
- 제목 후보 3개: 한국어, 짧고 매력적, 클릭하고 싶은 제목
- 본문: 한국어 마크다운 500~1000자 (자연스럽고 개인적인 톤)
- 요약: 2~3문장, 독자가 글을 읽기 전에 핵심을 파악할 수 있게
- 태그: 5~7개, 기존 태그 포함 + 추가 제안
- SEO 메타 설명: 150자 이내 한국어
- 영어 번역: 요약의 영어 번역 (글로벌 독자용)

아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "titles": ["제목1", "제목2", "제목3"],
  "body_markdown": "마크다운 본문...",
  "summary": "요약 문장...",
  "tags": ["태그1", "태그2"],
  "meta_description": "SEO 설명...",
  "translation": "English summary..."
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0]
  if (raw.type !== 'text') throw new Error('Unexpected response type from Claude')

  // Strip markdown code fences if the model wraps output anyway
  const json = raw.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')

  const parsed = JSON.parse(json) as AIDraft

  // Validate shape — guarantee [title1, title2, title3]
  if (!Array.isArray(parsed.titles) || parsed.titles.length < 3) {
    parsed.titles = [
      parsed.titles?.[0] ?? '제목 없음',
      parsed.titles?.[1] ?? '제목 후보 2',
      parsed.titles?.[2] ?? '제목 후보 3',
    ] as [string, string, string]
  }

  return parsed
}
