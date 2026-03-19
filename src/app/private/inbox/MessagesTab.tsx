'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { markNotificationRead } from './actions'
import type { SystemNotification } from '@/types'

type SubFilter = 'all' | 'telegram' | 'system' | 'action'

export interface TelegramMessageRow {
  id: string
  message_type: string
  text_content: string | null
  status: string
  telegram_date: string | null
  parsed_tags: string[] | null
  target_section: string | null
  draft_generated_at: string | null
}

interface Props {
  telegramMessages: TelegramMessageRow[]
  notifications: SystemNotification[]
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:    { label: '대기 중',  cls: 'bg-yellow-100 text-yellow-700' },
  approved:   { label: '승인됨',   cls: 'bg-green-100 text-green-700' },
  rejected:   { label: '거절됨',   cls: 'bg-red-100 text-red-600' },
  private:    { label: '비공개',   cls: 'bg-blue-100 text-blue-700' },
  done:       { label: '완료',     cls: 'bg-slate-100 text-slate-500' },
  failed:     { label: '실패',     cls: 'bg-red-100 text-red-600' },
  processing: { label: '처리 중',  cls: 'bg-purple-100 text-purple-700' },
}

const TYPE_LABEL: Record<string, string> = {
  info:    '정보',
  warning: '경고',
  error:   '오류',
}

const TYPE_BADGE_CLS: Record<string, string> = {
  info:    'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  error:   'bg-red-100 text-red-600',
}

const SOURCE_LABEL: Record<string, string> = {
  deploy:    '배포',
  thumbnail: '썸네일',
  category:  '카테고리',
  github:    'GitHub',
}

export default function MessagesTab({ telegramMessages, notifications }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<SubFilter>('all')

  const unreadAction = notifications.filter((n) => n.action_required && !n.read_at)

  const counts: Record<SubFilter, number> = {
    all:      telegramMessages.length + notifications.length,
    telegram: telegramMessages.length,
    system:   notifications.length,
    action:   unreadAction.length,
  }

  const filteredNotifications: SystemNotification[] = (() => {
    if (filter === 'telegram') return []
    if (filter === 'action')   return unreadAction
    // 'all' or 'system': pin unread action_required at top, then sort by date desc
    return [...notifications].sort((a, b) => {
      const aPin = a.action_required && !a.read_at ? 0 : 1
      const bPin = b.action_required && !b.read_at ? 0 : 1
      if (aPin !== bPin) return aPin - bPin
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  })()

  const filteredTelegram: TelegramMessageRow[] =
    filter === 'system' || filter === 'action' ? [] : telegramMessages

  const isEmpty = filteredNotifications.length === 0 && filteredTelegram.length === 0

  const subFilters: { id: SubFilter; label: string }[] = [
    { id: 'all',      label: '전체' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'system',   label: '시스템 알림' },
    { id: 'action',   label: '조치 필요' },
  ]

  function handleMarkRead(id: string) {
    markNotificationRead(id).then(() => router.refresh())
  }

  return (
    <div>
      {/* Sub-filter tabs */}
      <div className="flex gap-0 flex-wrap border-b border-slate-200 mb-5">
        {subFilters.map((sf) => {
          const count = counts[sf.id]
          return (
            <button
              key={sf.id}
              onClick={() => setFilter(sf.id)}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 border-b-2 -mb-px transition-colors whitespace-nowrap ${
                filter === sf.id
                  ? 'border-slate-900 text-slate-900 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {sf.label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  sf.id === 'action' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {isEmpty ? (
        <p className="text-sm text-slate-400">
          {filter === 'action' ? '조치가 필요한 항목이 없습니다.' : '메시지가 없습니다.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <NotificationCard key={n.id} notification={n} onMarkRead={handleMarkRead} />
          ))}
          {filteredTelegram.map((m) => (
            <TelegramCard key={m.id} message={m} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── NotificationCard ────────────────────────────────────────────

function NotificationCard({
  notification: n,
  onMarkRead,
}: {
  notification: SystemNotification
  onMarkRead: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const isUnreadAction = n.action_required && !n.read_at

  const borderCls = isUnreadAction
    ? 'border-amber-200 bg-amber-50'
    : n.read_at
    ? 'border-slate-100 bg-white opacity-60'
    : 'border-slate-200 bg-white'

  return (
    <div className={`border rounded-lg p-4 text-sm transition-all ${borderCls}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE_CLS[n.type] ?? 'bg-slate-100 text-slate-600'}`}>
              {TYPE_LABEL[n.type] ?? n.type}
            </span>
            <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500">
              {SOURCE_LABEL[n.source] ?? n.source}
            </span>
            {isUnreadAction && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
                ⚠️ 조치 필요
              </span>
            )}
          </div>
          <p className="text-slate-700 leading-relaxed">{n.message}</p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <time className="font-mono text-xs text-slate-400">
            {n.created_at.slice(0, 16).replace('T', ' ')}
          </time>
          {isUnreadAction && (
            <button
              onClick={() => startTransition(() => { onMarkRead(n.id) })}
              disabled={isPending}
              className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2 disabled:opacity-50"
            >
              {isPending ? '처리 중…' : '읽음 처리'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TelegramCard ────────────────────────────────────────────────

function TelegramCard({ message: m }: { message: TelegramMessageRow }) {
  const badge = STATUS_BADGE[m.status] ?? { label: m.status, cls: 'bg-slate-100 text-slate-600' }

  return (
    <Link
      href={`/private/inbox/${m.id}`}
      className="block border border-slate-200 rounded-lg p-4 text-sm hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500">Telegram</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
            {m.target_section && (
              <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                {m.target_section}
              </span>
            )}
            {m.draft_generated_at && (
              <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                AI 초안
              </span>
            )}
          </div>
          <p className="text-slate-700 line-clamp-2">
            {m.text_content ?? `(${m.message_type})`}
          </p>
          {m.parsed_tags && m.parsed_tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {m.parsed_tags.map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <time className="font-mono text-xs text-slate-400 shrink-0">
          {m.telegram_date ? m.telegram_date.slice(0, 16).replace('T', ' ') : ''}
        </time>
      </div>
    </Link>
  )
}
