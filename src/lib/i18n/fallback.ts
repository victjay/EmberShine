import type { Locale } from '@/lib/i18n/locale'

export function needsFallbackBadge(
  post: { hasTranslation?: boolean },
  locale: Locale
): boolean {
  // EN 요청인데 번역 파일이 없을 때 true
  return locale === 'en' && post.hasTranslation !== true
}
