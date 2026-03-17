'use client'

import { useEffect } from 'react'
import { LangProvider, useLang } from '@/lib/i18n/context'

function HtmlLangSync() {
  const { lang } = useLang()
  useEffect(() => {
    document.documentElement.lang = lang === 'KO' ? 'ko' : 'en'
  }, [lang])
  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <HtmlLangSync />
      {children}
    </LangProvider>
  )
}
