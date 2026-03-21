'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { saveDraft, deleteDraft } from '../../actions'

const STAGE_BADGE = {
  writing:      { label: '작성 중',           cls: 'bg-gray-100 text-gray-600' },
  categorizing: { label: '카테고리 지정 필요', cls: 'bg-yellow-100 text-yellow-700' },
  ready:        { label: '발행 준비 완료',     cls: 'bg-green-100 text-green-700' },
} as const

const STAGE_CTA: Partial<Record<string, { label: string; href: string }>> = {
  ready:        { label: '발행 준비 완료 탭으로 이동 →', href: '/private/inbox?tab=ready' },
  categorizing: { label: '카테고리 지정 필요 탭으로 이동 →', href: '/private/inbox?tab=categorizing' },
}

type SaveStatus = 'idle' | 'saved' | 'error'

interface Props {
  id: string
  initialTitle: string
  initialBody: string
  draftStage: string
  section: string
  initialDescription: string
  initialTags: string
}

export default function DraftEditor({ id, initialTitle, initialBody, draftStage, section, initialDescription, initialTags }: Props) {
  const router = useRouter()

  const [title, setTitle]               = useState(initialTitle)
  const [body, setBody]                 = useState(initialBody)
  const [description, setDescription]   = useState(initialDescription)
  const [tags, setTags]                 = useState(initialTags)
  const [currentStage, setCurrentStage] = useState(draftStage)
  const [saveStatus, setSaveStatus]     = useState<SaveStatus>('idle')
  const [saveError, setSaveError]       = useState<string | null>(null)
  const [savedStage, setSavedStage]     = useState<string | null>(null)
  const [deleteError, setDeleteError]   = useState<string | null>(null)

  const [isSaving,  startSave]   = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const badge = STAGE_BADGE[currentStage as keyof typeof STAGE_BADGE] ?? STAGE_BADGE.writing
  const cta   = savedStage ? STAGE_CTA[savedStage] : null

  function clearSaveResult() {
    setSaveStatus('idle')
    setSaveError(null)
    setSavedStage(null)
  }

  function handleDelete() {
    if (!confirm('이 임시저장 글을 삭제하시겠습니까?')) return
    setDeleteError(null)
    startDelete(async () => {
      const result = await deleteDraft(id)
      if (result?.error) {
        setDeleteError(result.error)
        return
      }
      router.push('/private/inbox')
    })
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    clearSaveResult()
    startSave(async () => {
      const formData = new FormData()
      formData.set('id', id)
      formData.set('title', title)
      formData.set('body', body)
      formData.set('description', description)
      formData.set('tags', tags)
      const result = await saveDraft(formData)

      if ('error' in result) {
        setSaveStatus('error')
        setSaveError(result.error)
        return
      }

      setSaveStatus('saved')
      setCurrentStage(result.newStage)
      setSavedStage(result.newStage)
    })
  }

  const saveLabel = isSaving
    ? '저장 중...'
    : saveStatus === 'saved'
    ? '저장됨 ✓'
    : saveStatus === 'error'
    ? '저장 실패 — 다시 시도'
    : '임시저장'

  const saveBtnCls = saveStatus === 'error'
    ? 'border-red-200 text-red-600 hover:border-red-400'
    : saveStatus === 'saved'
    ? 'border-green-200 text-green-700'
    : 'border-slate-200 text-slate-700 hover:border-slate-400'

  return (
    <div>
      {/* Breadcrumb */}
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

      {deleteError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {deleteError}
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); clearSaveResult() }}
          placeholder="제목"
          className="text-2xl font-bold text-slate-800 placeholder-slate-300 border-none outline-none bg-transparent w-full"
        />

        <input
          type="text"
          value={tags}
          onChange={(e) => { setTags(e.target.value); clearSaveResult() }}
          placeholder="태그 (쉼표 구분, 예: Next.js, React)"
          className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); clearSaveResult() }}
          rows={2}
          placeholder="설명 (선택사항)"
          className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); clearSaveResult() }}
          rows={24}
          placeholder="본문을 입력하세요… (Markdown 지원)"
          className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 leading-relaxed font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* 저장 실패 에러 메시지 */}
        {saveStatus === 'error' && saveError && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {saveError}
          </div>
        )}

        {/* CTA: ready/categorizing 전환 시 탭 이동 안내 */}
        {cta && saveStatus === 'saved' && (
          <Link
            href={cta.href}
            className="px-4 py-2.5 text-sm font-medium bg-slate-50 border border-slate-200 text-slate-700 rounded-lg hover:border-slate-400 hover:bg-slate-100 transition-colors"
          >
            {cta.label}
          </Link>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {/* 임시저장 */}
          <button
            type="submit"
            disabled={isSaving}
            className={`px-5 py-2 text-sm font-medium border rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 ${saveBtnCls}`}
          >
            {isSaving && (
              <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saveLabel}
          </button>

          {/* 읽기 전용 날짜 안내 */}
          <span className="text-xs text-slate-400">발행일은 발행 시 자동 생성됩니다</span>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="px-5 py-2 text-sm font-medium border border-red-100 text-red-500 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1.5 ml-auto"
          >
            {isDeleting && (
              <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isDeleting ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </form>
    </div>
  )
}
