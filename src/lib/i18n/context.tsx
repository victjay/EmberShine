'use client'

import { createContext, useContext, useEffect, useState } from 'react'
type Lang = 'ko' | 'en'

interface LangCtx {
  lang:    Lang
  setLang: (l: Lang) => void
}

const LangContext = createContext<LangCtx>({ lang: 'ko', setLang: () => {} })

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko')

  useEffect(() => {
    const stored = localStorage.getItem('lang')
    if (stored === 'ko' || stored === 'en') setLangState(stored)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }


  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
