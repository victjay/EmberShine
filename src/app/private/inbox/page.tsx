import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import DeleteButton from './DeleteButton'

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams
  const supabase = createServiceClient()

  const { data: messages } = await supabase
    .from('inbox_messages')
    .select('id, message_type, text_content, status, telegram_date, parsed_tags, target_section, draft_generated_at')
    .order('telegram_date', { ascending: false })
    .limit(50)

  const pending  = messages?.filter((m) => m.status === 'pending')  ?? []
  const approved = messages?.filter((m) => m.status === 'approved') ?? []
  const rejected = messages?.filter((m) => m.status === 'rejected') ?? []
  const private_ = messages?.filter((m) => m.status === 'private')  ?? []

  return (
    <main className="max-w-3xl mx-auto py-10 px-4">
      {saved === '1' && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          게시 요청 완료. Vercel 재빌드 완료 후 사이트에 반영됩니다.
        </div>
      )}
      <h1 className="text-3xl font-bold mb-2">Inbox</h1>
      <p className="text-sm text-gray-500 mb-8">
        총 {messages?.length ?? 0}개 — 대기 {pending.length} / 승인 {approved.length} / 거절 {rejected.length} / 비공개 {private_.length}
      </p>

      {pending.length > 0 && (
        <Section title="대기 중" items={pending} accent="yellow" />
      )}
      {approved.length > 0 && (
        <Section title="승인됨" items={approved} accent="green" />
      )}
      {rejected.length > 0 && (
        <Section title="거절됨" items={rejected} accent="red" />
      )}
      {private_.length > 0 && (
        <Section title="비공개" items={private_} accent="blue" />
      )}

      {!messages?.length && (
        <p className="text-gray-400">수신된 메시지가 없습니다.</p>
      )}
    </main>
  )
}

type Accent = 'yellow' | 'green' | 'red' | 'blue'

interface MessageRow {
  id: string
  message_type: string
  text_content: string | null
  status: string
  telegram_date: string | null
  parsed_tags: string[] | null
  target_section: string | null
  draft_generated_at: string | null
}

const ACCENT_DOT: Record<Accent, string> = {
  yellow: 'bg-yellow-400',
  green:  'bg-green-500',
  red:    'bg-red-400',
  blue:   'bg-blue-400',
}

function Section({ title, items, accent }: { title: string; items: MessageRow[]; accent: Accent }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${ACCENT_DOT[accent]}`} />
        {title} ({items.length})
      </h2>
      <ul className="space-y-3">
        {items.map((m) => (
          <li key={m.id} className="border border-gray-200 rounded-lg p-4 text-sm hover:border-blue-400 hover:shadow-sm transition-all flex items-start gap-3">
            <Link
              href={`/private/inbox/${m.id}`}
              className="flex-1 min-w-0 cursor-pointer"
            >
              <span className="font-mono text-xs text-gray-400 block mb-1">{m.id.slice(0, 8)}…</span>
              <p className="text-gray-700 line-clamp-2">
                {m.text_content ?? `(${m.message_type})`}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {m.target_section && (
                  <Tag label={m.target_section} />
                )}
                {m.parsed_tags?.map((t) => <Tag key={t} label={t} />)}
                {m.draft_generated_at && (
                  <Tag label="AI 초안 있음" className="bg-purple-100 text-purple-700" />
                )}
              </div>
            </Link>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <time className="font-mono text-xs text-gray-400">
                {m.telegram_date ? m.telegram_date.slice(0, 16).replace('T', ' ') : ''}
              </time>
              <DeleteButton id={m.id} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Tag({ label, className = 'bg-gray-100 text-gray-600' }: { label: string; className?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
