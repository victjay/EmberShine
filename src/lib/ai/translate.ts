import 'server-only'
import { GoogleGenAI } from '@google/genai'

interface TranslationInput {
  title: string
  description?: string
  body: string
  fromLocale: 'ko'
  toLocale: 'en'
}

interface TranslationResult {
  title: string
  description?: string
  body: string
}

type TranslationResponse =
  | { success: true; data: TranslationResult }
  | { success: false; error: string }

export async function translatePost(
  input: TranslationInput,
): Promise<TranslationResponse> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })

    const prompt = `Translate the following Korean blog post to English.
Preserve ALL Markdown syntax exactly: code blocks, links, images, tables, headings, bold, italic.
Do NOT translate content inside code blocks (\`\`\` or \`).
Do NOT translate URLs, file paths, or code variable names.
If description is empty or not provided, return an empty string for description.
Return JSON matching the schema: { title, description, body }

Title: ${input.title}
Description: ${input.description ?? ''}
Body:
${input.body}`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            title:       { type: 'string' },
            description: { type: 'string' },
            body:        { type: 'string' },
          },
          required: ['title', 'body'],
        },
      },
    })

    const raw = response.text ?? ''

    let parsed: TranslationResult
    try {
      parsed = JSON.parse(raw) as TranslationResult
    } catch (e) {
      return {
        success: false,
        error: `JSON parse failed: ${e instanceof Error ? e.message : String(e)}`,
      }
    }

    return { success: true, data: parsed }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
