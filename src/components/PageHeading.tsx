'use client'

import { useParams } from 'next/navigation'
import { t } from '@/lib/i18n/strings'

type Page = 'blog' | 'stories' | 'portfolio'

export default function PageHeading({ page }: { page: Page }) {
  const params = useParams()
  const lang = params.lang === 'en' ? 'en' : 'ko'

  const title = t[page].title[lang]
  const desc  = t[page].description[lang]

  return (
    <div className="mb-10">
      <h1 className="text-3xl font-bold text-navy-900 mb-1">{title}</h1>
      <p className="text-slate-500 text-sm">{desc}</p>
    </div>
  )
}
