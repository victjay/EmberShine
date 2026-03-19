'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createDraftPost } from './actions'

const LAST_SECTION_KEY = 'embershine_last_section'
type Section = 'blog' | 'stories' | 'portfolio'

const SECTIONS: { id: Section; label: string; desc: string }[] = [
  { id: 'blog',      label: 'Blog',      desc: '기술·일상 글' },
  { id: 'stories',   label: 'Stories',   desc: '포토에세이·스토리' },
  { id: 'portfolio', label: 'Portfolio', desc: '작업물·프로젝트' },
]

export default function NewPostModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<Section>('blog')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const saved = localStorage.getItem(LAST_SECTION_KEY) as Section | null
    if (saved && SECTIONS.some((s) => s.id === saved)) {
      setSection(saved)
    }
  }, [])

  function handleOpen() { setOpen(true) }

  function handleClose() {
    if (!isPending) setOpen(false)
  }

  function handleSelect(s: Section) {
    setSection(s)
    localStorage.setItem(LAST_SECTION_KEY, s)
  }

  function handleConfirm() {
    localStorage.setItem(LAST_SECTION_KEY, section)
    startTransition(async () => {
      const result = await createDraftPost(section)
      if ('error' in result) {
        alert(result.error)
        return
      }
      setOpen(false)
      router.push(`/private/inbox/draft/${result.id}`)
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
      >
        + 새 글 작성
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-slate-900">어느 섹션에 작성할까요?</h2>

            <div className="flex flex-col gap-2">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s.id)}
                  className={`px-4 py-3 rounded-lg text-sm border transition-colors text-left ${
                    section === s.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span className="font-medium">{s.label}</span>
                  <span className={`ml-2 text-xs ${section === s.id ? 'text-slate-300' : 'text-slate-400'}`}>
                    {s.desc}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={handleClose}
                disabled={isPending}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="px-4 py-1.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending && (
                  <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                작성 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
