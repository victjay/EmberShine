'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { saveDraft, publishDraft } from '../../actions'

const STAGE_BADGE = {
  writing:      { label: '작성 중',           cls: 'bg-gray-100 text-gray-600' },
  categorizing: { label: '카테고리 지정 필요', cls: 'bg-yellow-100 text-yellow-700' },
  ready:        { label: '발행 준비 완료',     cls: 'bg-green-100 text-green-700' },
} as const

// 발행 버튼 활성화 조건 — draft_stage=ready 판단과 100% 동일
function isContentReady(title: string, body: string): boolean {
  return title.trim().length > 0 && body.trim().length > 0
}

interface Props {
  id: string
  initialTitle: string
  initialBody: string
  draftStage: string
  section: string
}

export default function DraftEditor({ id, initialTitle, initialBody, draftStage, section }: Props) {
  const [title, setTitle]               = useState(initialTitle)
  const [body, setBody]                 = useState(initialBody)
  const [currentStage, setCurrentStage] = useState(draftStage)
  const [savedFlash, setSavedFlash]     = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [toast, setToast]               = useState<string | null>(null)

  const shownToastRef = useRef<Set<string>>(new Set())
  const [isSaving,    startSave]    = useTransition()
  const [isPublishing, startPublish] = useTransition()

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  // ready → 다른 stage로 내려가면 토스트 키 제거 (재전환 시 재표시 가능)
  useEffect(() => {
    if (currentStage !== 'ready') {
      shownToastRef.current.delete(`${id}:ready`)
    }
  }, [currentStage, id])

  const badge  = STAGE_BADGE[currentStage as keyof typeof STAGE_BADGE] ?? STAGE_BADGE.writing
  const ready  = isContentReady(title, body)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)
    startSave(async () => {
      const formData = new FormData()
      formData.set('id', id)
      formData.set('title', title)
      formData.set('body', body)
      const result = await saveDraft(formData)

      if ('error' in result) {
        setSaveError(result.error)
        return
      }

      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)

      const prevStage = currentStage
      setCurrentStage(result.newStage)

      // ready 전환 시 토스트 (중복 방지)
      const toastKey = `${id}:ready`
      if (
        result.newStage === 'ready' &&
        prevStage !== 'ready' &&
        !shownToastRef.current.has(toastKey)
      ) {
        shownToastRef.current.add(toastKey)
        setToast('이제 바로 발행할 수 있습니다.')
      }
    })
  }

  function handlePublish() {
    setPublishError(null)
    startPublish(async () => {
      const result = await publishDraft(id)
      if (result?.error) {
        setPublishError(result.error)
      }
      // success → redirect() server-side (categorizing tab)
    })
  }

  return (
    <>
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

        {saveError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {saveError}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-5">
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

          <div className="flex items-center gap-3 flex-wrap">
            {/* 임시저장 */}
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-sm font-medium border border-slate-200 text-slate-700 rounded-lg hover:border-slate-400 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving && (
                <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              임시저장
            </button>

            {/* 발행하기 */}
            <button
              type="button"
              onClick={handlePublish}
              disabled={!ready || isPublishing || isSaving}
              className="px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {isPublishing && (
                <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              발행하기
            </button>

            {savedFlash && (
              <span className="text-sm text-green-600 font-medium">저장됨 ✓</span>
            )}
            {publishError && (
              <span className="text-sm text-red-500">{publishError}</span>
            )}
          </div>
        </form>
      </div>

      {/* Toast: draft_stage → ready 전환 시 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg max-w-xs">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">✅ &ldquo;{title}&rdquo; 발행 준비 완료</p>
              <p className="text-xs text-slate-300 mt-0.5">{toast}</p>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="mt-2 text-xs text-green-400 hover:text-green-300 underline disabled:opacity-50"
              >
                지금 발행하기
              </button>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white text-lg leading-none shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}
