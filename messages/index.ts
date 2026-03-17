import 'server-only'
import type { Messages } from './ko'

export type { Messages }

export async function getDictionary(lang: 'ko' | 'en'): Promise<Messages> {
  if (lang === 'en') {
    return (await import('./en')).en
  }
  return (await import('./ko')).ko
}
