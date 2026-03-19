'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { saveDraft } from '../../actions'

const STAGE_BADGE = {
  writing:      { label: '작성 중',           cls: 'bg-gray-100 text-gray-600' },
  categorizing: { label: '카테고리 지정 필요', cls: 'bg-yellow-100 text-yellow-700' },
  ready:        { label: '발행 준비 완료',     cls: 'bg-green-100 text-green-700' },
} as const

interface Props {
  id: string
  initialTitle: string
  initialBody: string
  draftStage: string
  section: string
}

export default function DraftEditor({ id, initialTitle, initialBody, draftStage, section }: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody]   = useState(initialBody)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const badge = STAGE_BADGE[draftStage as keyof typeof STAGE_BADGE] ?? STAGE_BADGE.writing

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', id)
      formData.set('title', title)
      formData.set('body', body)
      const result = await saveDraft(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 2000)
      }
    })
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/private/inbox"
          className="text-sm text-slate-400 hover:text-slate-700 font-mono transition-colors"
        >
          ← Workspace
        </Link>
        <span className="text-slate-200">/</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
          {badge.label}
        </span>
        <span className="text-xs text-slate-400">{section}</span>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="text-2xl font-bold text-slate-800 placeholder-slate-300 border-none outline-none bg-transparent w-full"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={24}
          placeholder="본문을 입력하세요… (Markdown 지원)"
          className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 leading-relaxed font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isPending && (
              <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            임시저장
          </button>
          {savedFlash && (
            <span className="text-sm text-green-600 font-medium">저장됨 ✓</span>
          )}
        </div>
      </form>
    </div>
  )
}
