import 'server-only'
import { GoogleGenAI } from '@google/genai'
import type { AICategoryRecommendationItem } from '@/types'

export interface CategorizeInput {
  title: string
  body: string
  description?: string | null
  section: string
  existingCategories: string[]
  excludedCategories: string[]
}

export interface CategorizeOutput {
  existing_top3: AICategoryRecommendationItem[]
  suggested_top3: AICategoryRecommendationItem[]
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! })

export async function runCategorizeAI(input: CategorizeInput): Promise<CategorizeOutput> {
  const { title, body, description, section, existingCategories, excludedCategories } = input

  const existingList  = existingCategories.length > 0 ? existingCategories.join(', ') : '(없음)'
  const excludedList  = excludedCategories.length  > 0 ? excludedCategories.join(', ')  : '(없음)'

  const prompt = `블로그 카테고리를 추천하는 AI입니다.

섹션: ${section}
제목: ${title}${description ? `\n설명: ${description}` : ''}
본문 (첫 500자):
${body.slice(0, 500)}

기존 카테고리: ${existingList}
제외 카테고리 (삭제됨, 재제안 금지): ${excludedList}

지침:
- existing_top3: 기존 카테고리 목록에서 가장 잘 맞는 top 3 (없으면 빈 배열)
- suggested_top3: 새로 만들 카테고리 top 3 (제외 목록 제외, 기존 목록과 겹치지 않게)
- 각 항목: name(카테고리명), reason(추천 근거 한 줄)`

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'object',
        properties: {
          existing_top3: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name:   { type: 'string' },
                reason: { type: 'string' },
              },
              required: ['name', 'reason'],
            },
          },
          suggested_top3: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name:   { type: 'string' },
                reason: { type: 'string' },
              },
              required: ['name', 'reason'],
            },
          },
        },
        required: ['existing_top3', 'suggested_top3'],
      },
    },
  })

  return JSON.parse(response.text ?? '{}') as CategorizeOutput
}
