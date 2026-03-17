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
  const newFrontmatter: Record<string, unknown> = {
    ...originalFrontmatter,
    title: translation.title,
    ...(translation.description ? { description: translation.description } : {}),
    locale: 'en',
    translation_source: 'gemini',
  }

  return matter.stringify(translation.body, newFrontmatter)
}
