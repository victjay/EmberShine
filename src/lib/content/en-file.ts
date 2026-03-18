import matter from 'gray-matter'

interface TranslationResult {
  title: string
  description?: string
  body: string
}

export function buildEnMarkdown(
  originalFrontmatter: Record<string, unknown>,
  translation: TranslationResult,
): string {
  const today = new Date().toISOString().split('T')[0]

  const newFrontmatter: Record<string, unknown> = {
    ...originalFrontmatter,
    title: translation.title,
    ...(translation.description ? { description: translation.description } : {}),
    locale: 'en',
    translation_source: 'gemini',
    // 외부에서 주입된 값 우선, 없으면 오늘 날짜
    translated_from_updated_at:
      (originalFrontmatter.translated_from_updated_at as string) ?? today,
  }

  return matter.stringify(translation.body, newFrontmatter)
}
