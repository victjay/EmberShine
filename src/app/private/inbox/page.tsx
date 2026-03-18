import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DeleteButton from './DeleteButton'
import SubmitButton from '@/components/SubmitButton'
import { executeDeletePost, cancelDeletePost } from './actions'

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ saved?: string; commit?: string }> }) {
  const { saved, commit: commitSha } = await searchParams
  const supabase = createServiceClient()

  // commit_sha 기준으로 해당 배포만 조회 (방금 저장한 글의 배포 상태만 표시)
  let deployment = null
  if (commitSha) {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase
      .from('deployments')
      .select('status, triggered_at, completed_at')
      .eq('commit_sha', commitSha)
      .maybeSingle()
    deployment = data
  }

  // 삭제 대기 중인 admin_jobs 조회
  const adminSupabaseForJobs = createAdminClient()
  const { data: deleteJobs } = await adminSupabaseForJobs
    .from('admin_jobs')
    .select('id, target_section, target_slug, requested_by, created_at')
    .eq('type', 'delete_post')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

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
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm border ${
          !deployment || deployment.status === 'building'
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
            : deployment.status === 'ready'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {!deployment || deployment.status === 'building'
            ? '🔄 배포 진행 중... (보통 1~3분 소요)'
            : deployment.status === 'ready'
            ? '✅ 배포 완료! 라이브 사이트에 반영됐습니다.'
            : deployment.status === 'canceled'
            ? '⚠️ 배포가 취소됐습니다. Vercel 대시보드를 확인해주세요.'
            : '❌ 배포 실패. Vercel 대시보드를 확인해주세요.'
          }
        </div>
      )}
      {deleteJobs && deleteJobs.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            삭제 대기 ({deleteJobs.length})
          </h2>
          <ul className="space-y-3">
            {deleteJobs.map((job) => {
              // bind 패턴으로 jobId 전달 — form action과 Server Action 연결
              const deleteAction = executeDeletePost.bind(null, job.id) as unknown as (formData: FormData) => Promise<void>
              return (
                <li key={job.id} className="border border-red-200 rounded-lg p-4 text-sm bg-red-50 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-gray-400 mb-1">{job.id.slice(0, 8)}…</p>
                    <a
                      href={`/ko/${job.target_section}/${job.target_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      {job.target_section} / {job.target_slug}
                    </a>
                    {job.requested_by && (
                      <p className="text-xs text-gray-400 mt-1">요청: {job.requested_by}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <form action={deleteAction}>
                      <SubmitButton
                        label="최종 삭제 확인"
                        loadingLabel="삭제 중..."
                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      />
                    </form>
                    <form action={cancelDeletePost.bind(null, job.id) as unknown as (formData: FormData) => Promise<void>}>
                      <SubmitButton
                        label="되살리기"
                        loadingLabel="취소 중..."
                        className="px-3 py-1.5 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                      />
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
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
