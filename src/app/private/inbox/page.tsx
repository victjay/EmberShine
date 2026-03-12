import { createClient } from '@/lib/supabase/server'

export default async function InboxPage() {
  const supabase = await createClient()

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
          <li key={m.id} className="border border-gray-200 rounded-lg p-4 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs text-gray-400">{m.id.slice(0, 8)}…</span>
              <span className="text-xs text-gray-400">
                {m.telegram_date ? m.telegram_date.slice(0, 16).replace('T', ' ') : ''}
              </span>
            </div>
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
