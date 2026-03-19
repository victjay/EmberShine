'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import type { AICategoryRecommendationItem, CategorizeOutput } from '@/types'
import { getCategoryRecommendation, applyAndPublish, deleteDraft } from './actions'

interface DraftInfo {
  id: string
  section: string
  title: string
  created_at: string
}

interface Props {
  post: DraftInfo
  existingCategories: string[]
  initialRecommendation: CategorizeOutput | null
}

type SelType = 'existing' | 'suggested' | 'custom'

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

function isSimilar(newName: string, existing: string): boolean {
  const a = newName.toLowerCase().trim()
  const b = existing.toLowerCase().trim()
  if (a === b) return true
  if (a.length > 2 && b.includes(a)) return true
  if (b.length > 2 && a.includes(b)) return true
  if (Math.abs(a.length - b.length) <= 2) return levenshtein(a, b) <= 2
  return false
}

export default function CategorizeCard({ post, existingCategories, initialRecommendation }: Props) {
  const [rec, setRec]             = useState<CategorizeOutput | null>(initialRecommendation)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selType, setSelType]     = useState<SelType | null>(null)
  const [selName, setSelName]     = useState<string | null>(null)
  const [selReason, setSelReason] = useState('')
  const [customText, setCustomText] = useState('')

  const [showModal, setShowModal]       = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  const [, startAnalyze]  = useTransition()
  const [, startPublish]  = useTransition()
  const [, startDelete]   = useTransition()

  useEffect(() => {
    if (!initialRecommendation) triggerAnalysis(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function triggerAnalysis(force: boolean) {
    setLoadError(null)
    setIsLoading(true)
    startAnalyze(async () => {
      const result = await getCategoryRecommendation(post.id, force)
      setIsLoading(false)
      if ('error' in result) {
        setLoadError(result.error)
      } else {
        setRec(result)
        if (force) { setSelType(null); setSelName(null); setSelReason('') }
      }
    })
  }

  function selectItem(type: 'existing' | 'suggested', item: AICategoryRecommendationItem) {
    setSelType(type)
    setSelName(item.name)
    setSelReason(item.reason)
  }

  function handlePublishClick() {
    if (!selName) return
    if (selType === 'existing') {
      doPublish(selName, false)
    } else {
      setShowModal(true)
    }
  }

  function doPublish(categoryName: string, isNew: boolean) {
    setPublishError(null)
    startPublish(async () => {
      const result = await applyAndPublish(post.id, categoryName, isNew)
      if (result?.error) {
        setPublishError(result.error)
        setShowModal(false)
      }
      // success → redirect() server-side
    })
  }

  function handleDelete() {
    if (!confirm('이 임시저장 글을 삭제하시겠습니까?')) return
    startDelete(async () => {
      const result = await deleteDraft(post.id)
      if (result?.error) alert(result.error)
    })
  }

  const publishReady = !!selName && (selType !== 'custom' || customText.trim().length > 0)
  const isNew        = selType === 'suggested' || selType === 'custom'
  const similarCat   = isNew && selName
    ? existingCategories.find((c) => isSimilar(selName, c)) ?? null
    : null

  const publishLabel = selName ? `${selName}으로 발행` : '발행하기'

  return (
    <>
      <div className="border border-yellow-200 rounded-xl bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-medium text-slate-800 text-sm truncate">
              {post.title || '(제목 없음)'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <time className="text-xs text-slate-400 font-mono">{post.created_at.slice(0, 10)}</time>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs text-slate-400">{post.section}</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 shrink-0">
            카테고리 지정 필요
          </span>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
              <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              AI 카테고리 분석 중…
            </div>
          )}

          {loadError && !isLoading && (
            <p className="text-sm text-red-500 py-2">{loadError}</p>
          )}

          {rec && !isLoading && (
            <div className="space-y-4">
              {/* Existing categories */}
              {rec.existing_top3.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    📂 기존 유지 — 기존 카테고리 top 3
                  </p>
                  <RadioGroup
                    items={rec.existing_top3}
                    groupKey={post.id + '-existing'}
                    selectedName={selType === 'existing' ? selName : null}
                    onSelect={(item) => selectItem('existing', item)}
                  />
                  {selType === 'existing' && selReason && (
                    <p className="mt-2 text-xs text-slate-400 italic">💬 &ldquo;{selReason}&rdquo;</p>
                  )}
                </div>
              )}

              {rec.existing_top3.length > 0 && rec.suggested_top3.length > 0 && (
                <hr className="border-slate-100" />
              )}

              {/* Suggested categories */}
              {rec.suggested_top3.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    ✨ 새로운 흐름 — AI 신규 제안 top 3
                  </p>
                  <RadioGroup
                    items={rec.suggested_top3}
                    groupKey={post.id + '-suggested'}
                    selectedName={selType === 'suggested' ? selName : null}
                    onSelect={(item) => selectItem('suggested', item)}
                  />
                  {selType === 'suggested' && selReason && (
                    <p className="mt-2 text-xs text-slate-400 italic">💬 &ldquo;{selReason}&rdquo;</p>
                  )}
                </div>
              )}

              <hr className="border-slate-100" />

              {/* Direct input */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`cat-${post.id}`}
                    checked={selType === 'custom'}
                    onChange={() => { setSelType('custom'); setSelName(customText.trim() || null) }}
                    className="accent-slate-700"
                  />
                  <span className="text-sm text-slate-500">직접 입력…</span>
                </label>
                {selType === 'custom' && (
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => { setCustomText(e.target.value); setSelName(e.target.value.trim() || null) }}
                    placeholder="카테고리 이름"
                    autoFocus
                    className="mt-2 ml-6 w-48 text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          {publishError && (
            <span className="text-xs text-red-500 w-full mb-1">{publishError}</span>
          )}
          <button
            onClick={() => triggerAnalysis(true)}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs border border-slate-200 text-slate-600 rounded-lg hover:border-slate-400 transition-colors disabled:opacity-40"
          >
            AI 재분석
          </button>

          <button
            onClick={handlePublishClick}
            disabled={!publishReady || isLoading}
            className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40"
          >
            {publishLabel}
          </button>

          <Link
            href={`/private/inbox/draft/${post.id}`}
            className="px-3 py-1.5 text-xs border border-slate-200 text-slate-600 rounded-lg hover:border-slate-400 transition-colors"
          >
            편집
          </Link>

          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-xs border border-red-100 text-red-500 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors ml-auto"
          >
            삭제
          </button>
        </div>
      </div>

      {/* New category confirmation modal */}
      {showModal && selName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-slate-900">새 카테고리 확인</h2>
            <p className="text-sm text-slate-600">
              <span className="font-medium">&lsquo;{selName}&rsquo;</span> 카테고리를 새로 만들고 이 글을 발행합니다.
            </p>
            {similarCat && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ 기존 &lsquo;<strong>{similarCat}</strong>&rsquo;과 유사합니다. 그래도 생성하시겠습니까?
              </div>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => doPublish(selName, true)}
                className="px-4 py-1.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                확인 후 발행
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function RadioGroup({
  items, groupKey, selectedName, onSelect,
}: {
  items: AICategoryRecommendationItem[]
  groupKey: string
  selectedName: string | null
  onSelect: (item: AICategoryRecommendationItem) => void
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <label key={item.name} className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={groupKey}
            checked={selectedName === item.name}
            onChange={() => onSelect(item)}
            className="accent-slate-700"
          />
          <span className="text-sm text-slate-700">{item.name}</span>
        </label>
      ))}
    </div>
  )
}
