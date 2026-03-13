'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Lang } from './strings'

interface LangCtx {
  lang:    Lang
  setLang: (l: Lang) => void
}

const LangContext = createContext<LangCtx>({ lang: 'KO', setLang: () => {} })

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('KO')

  useEffect(() => {
    const stored = localStorage.getItem('lang')
    if (stored === 'KO' || stored === 'EN') setLangState(stored)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
