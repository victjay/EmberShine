'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SubmitButton from '@/components/SubmitButton'

const STAGE_CHIP: Partial<Record<string, { label: string; cls: string }>> = {
  categorizing: { label: '카테고리 지정 필요', cls: 'bg-yellow-100 text-yellow-700' },
  ready:        { label: '발행 준비 완료',     cls: 'bg-green-100 text-green-700' },
}

interface Props {
  id: string
  section: string
  title: string
  draft_stage: string | null
  created_at: string
  deleteAction: (formData: FormData) => Promise<void>
}

export default function DraftListRow({ id, section, title, draft_stage, created_at, deleteAction }: Props) {
  const stageKey = draft_stage ?? 'writing'

  const [isNew, setIsNew] = useState(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem(`seen_${id}_${stageKey}`)
  })

  useEffect(() => {
    sessionStorage.setItem(`seen_${id}_${stageKey}`, '1')
    setIsNew(false)
  }, [id, stageKey])

  const stageChip = STAGE_CHIP[stageKey]

  return (
    <li className="flex items-center rounded-lg border border-slate-200 hover:border-slate-400 hover:shadow-sm transition-all">
      <Link
        href={`/private/inbox/draft/${id}`}
        className="flex items-center gap-2 p-3 flex-1 min-w-0 text-sm"
      >
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 shrink-0">
          {section}
        </span>
        {isNew && (
          <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 shrink-0">
            NEW
          </span>
        )}
        {stageChip && (
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${stageChip.cls}`}>
            {stageChip.label}
          </span>
        )}
        <span className="flex-1 min-w-0 truncate text-slate-800">
          {title || '(제목 없음)'}
        </span>
        <time className="font-mono text-xs text-slate-400 shrink-0">
          {created_at.slice(0, 10)}
        </time>
      </Link>
      <form action={deleteAction} className="pr-2 shrink-0">
        <SubmitButton
          label="삭제"
          loadingLabel="삭제 중…"
          className="px-2.5 py-1 text-xs border border-red-100 text-red-500 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors cursor-pointer"
        />
      </form>
    </li>
  )
}
