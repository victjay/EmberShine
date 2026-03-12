'use client'

import { useState } from 'react'

export default function LangToggle() {
  const [lang, setLang] = useState<'KO' | 'EN'>('KO')

  return (
    <div className="flex items-center gap-1 text-xs font-mono border border-slate-200 rounded px-1 py-0.5">
      <button
        onClick={() => setLang('KO')}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          lang === 'KO'
            ? 'bg-navy-900 text-white'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        KO
      </button>
      <span className="text-slate-300">|</span>
      <button
        onClick={() => setLang('EN')}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          lang === 'EN'
            ? 'bg-navy-900 text-white'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        EN
      </button>
    </div>
  )
}
