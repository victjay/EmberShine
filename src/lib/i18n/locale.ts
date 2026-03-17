export type Locale = 'ko' | 'en'
export const defaultLocale: Locale = 'ko'
export const locales: Locale[] = ['ko', 'en']

// 인자 타입을 unknown으로 받아 런타임에서도 안전하게 검증
export function isValidLocale(value: unknown): value is Locale {
  return typeof value === 'string' && locales.includes(value as Locale)
}
