'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export type WorkspaceTab = 'all' | 'writing' | 'categorizing' | 'ready' | 'delete' | 'messages'

export interface WorkspaceCounts {
  writing: number
  categorizing: number
  ready: number
  deleteQueue: number
  messages: number  // pending 기준 (action required proxy)
}

interface Props {
  activeTab: WorkspaceTab
  counts: WorkspaceCounts
}

type BadgeColor = 'gray' | 'yellow' | 'green' | 'red'

const BADGE_CLS: Record<BadgeColor, string> = {
  gray:   'bg-gray-100 text-gray-600',
  yellow: 'bg-yellow-100 text-yellow-700',
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-600',
}

interface TabDef {
  id: WorkspaceTab
  label: string
  count: number | null
  color?: BadgeColor
}

export default function WorkspaceNav({ activeTab, counts }: Props) {
  // document.title: categorizing 개수가 있으면 (N) 접두사 표시
  useEffect(() => {
    const base = 'Workspace — EmberShine'
    document.title = counts.categorizing > 0
      ? `(${counts.categorizing}) ${base}`
      : base
  }, [counts.categorizing])

  const tabs: TabDef[] = [
    { id: 'all',          label: '전체',             count: null },
    { id: 'writing',      label: '작성 중',           count: counts.writing,     color: 'gray'   },
    { id: 'categorizing', label: '카테고리 지정 필요', count: counts.categorizing, color: 'yellow' },
    { id: 'ready',        label: '발행 준비 완료',     count: counts.ready,       color: 'green'  },
    { id: 'delete',       label: '삭제 대기',          count: counts.deleteQueue, color: 'red'    },
    { id: 'messages',     label: '메시지',             count: counts.messages,    color: 'red'    },
  ]

  return (
    <nav className="flex gap-0 flex-wrap border-b border-slate-200 mb-6">
      {tabs.map((tab) => {
        const href = tab.id === 'all'
          ? '/private/inbox'
          : `/private/inbox?tab=${tab.id}`
        const isActive = activeTab === tab.id

        return (
          <Link
            key={tab.id}
            href={href}
            className={`px-3 py-2 text-sm flex items-center gap-1.5 border-b-2 -mb-px transition-colors whitespace-nowrap ${
              isActive
                ? 'border-slate-900 text-slate-900 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && tab.color && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${BADGE_CLS[tab.color]}`}>
                {tab.count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
