'use client'

import { useState, useTransition } from 'react'
import { addCategory, deleteCategory } from './actions'

interface Category {
  id: string
  name: string
  section: string
}

interface Props {
  categories: Category[]
  countMap: Record<string, number>  // key: `${section}:${name}`
}

type Section = 'blog' | 'stories' | 'portfolio'

const SECTION_LABELS: Record<Section, string> = {
  blog:      'Blog',
  stories:   'Stories',
  portfolio: 'Portfolio',
}

export default function CategoryManager({ categories, countMap }: Props) {
  return (
    <div className="space-y-10">
      {(['blog', 'stories', 'portfolio'] as Section[]).map((section) => (
        <SectionBlock
          key={section}
          section={section}
          categories={categories.filter((c) => c.section === section)}
          countMap={countMap}
        />
      ))}
    </div>
  )
}

function SectionBlock({
  section, categories, countMap,
}: {
  section: Section
  categories: Category[]
  countMap: Record<string, number>
}) {
  const [newName,   setNewName]   = useState('')
  const [addError,  setAddError]  = useState<string | null>(null)
  const [isAdding,  startAdd]     = useTransition()

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleteError,  setDeleteError]  = useState<string | null>(null)
  const [isDeleting,   startDelete]     = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAddError(null)
    startAdd(async () => {
      const result = await addCategory(section, newName)
      if (result?.error) {
        setAddError(result.error)
      } else {
        setNewName('')
      }
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteError(null)
    startDelete(async () => {
      const result = await deleteCategory(deleteTarget.id, section, deleteTarget.name)
      if (result?.error) {
        setDeleteError(result.error)
      } else {
        setDeleteTarget(null)
      }
    })
  }

  const deleteCount = deleteTarget
    ? (countMap[`${section}:${deleteTarget.name}`] ?? 0)
    : 0

  return (
    <>
      <section>
        <h2 className="text-lg font-semibold mb-4">{SECTION_LABELS[section]}</h2>

        {/* 추가 폼 */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새 카테고리 이름"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isAdding || !newName.trim()}
            className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {isAdding ? '추가 중…' : '추가'}
          </button>
        </form>
        {addError && <p className="text-sm text-red-500 mb-3">{addError}</p>}

        {/* 카테고리 목록 */}
        {categories.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 카테고리가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {categories.map((cat) => {
              const count = countMap[`${section}:${cat.name}`] ?? 0
              return (
                <li
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                    <span className="ml-2 text-xs text-slate-400">{count}개 포스트</span>
                  </div>
                  <button
                    onClick={() => { setDeleteTarget(cat); setDeleteError(null) }}
                    className="px-2.5 py-1 text-xs border border-red-100 text-red-500 rounded hover:border-red-300 hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!isDeleting) setDeleteTarget(null) }}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-slate-900">카테고리 삭제 확인</h2>
            <p className="text-sm text-slate-600">
              <span className="font-medium">&lsquo;{deleteTarget.name}&rsquo;</span> 카테고리를 삭제합니다.
            </p>

            {deleteCount > 0 ? (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ 이 카테고리의 포스트{' '}
                <strong>{deleteCount}개</strong>가 비공개 처리됩니다.{' '}
                계속하시겠습니까?
              </div>
            ) : (
              <p className="text-sm text-slate-400">영향받는 포스트가 없습니다.</p>
            )}

            {isDeleting && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                GitHub 파일 삭제 중… (포스트 수에 따라 시간이 걸릴 수 있습니다)
              </div>
            )}

            {deleteError && (
              <p className="text-sm text-red-500">{deleteError}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting && (
                  <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                삭제 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
