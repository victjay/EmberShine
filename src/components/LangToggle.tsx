'use client'

import { usePathname, useRouter } from 'next/navigation'
import { isValidLocale, locales, type Locale } from '@/lib/i18n/locale'

interface Props {
  lang: string
}

export default function LangToggle({ lang }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const isLockedPath =
    pathname.startsWith('/private') || pathname.startsWith('/login')

  const handleToggle = (newLang: Locale) => {
    const segments = pathname.split('/')

    if (isValidLocale(segments[1])) {
      // /ko/... 또는 /en/... 형태 → prefix 교체
      segments[1] = newLang
      router.push(segments.join('/') || `/${newLang}`)
    } else {
      // locale prefix 없는 경로 (방어 처리)
      router.push(`/${newLang}${pathname}`)
    }
  }

  return (
    <div className="flex items-center gap-1 text-xs font-mono border border-slate-200 rounded px-1 py-0.5">
      <button
        onClick={() => handleToggle('ko')}
        disabled={isLockedPath}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          lang === 'ko'
            ? 'bg-navy-900 text-white'
            : isLockedPath
            ? 'text-slate-300 cursor-not-allowed'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        KO
      </button>
      <span className="text-slate-300">|</span>
      <button
        onClick={() => handleToggle('en')}
        disabled={isLockedPath}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          lang === 'en'
            ? 'bg-navy-900 text-white'
            : isLockedPath
            ? 'text-slate-300 cursor-not-allowed'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        EN
      </button>
    </div>
  )
}
