import Link from 'next/link'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import WorkspaceNav, { WorkspaceTab, WorkspaceCounts } from './WorkspaceNav'
import NewPostModal from './NewPostModal'
import CategorizeCard from './CategorizeCard'
import MessagesTab from './MessagesTab'
import SubmitButton from '@/components/SubmitButton'
import { executeDeletePost, cancelDeletePost, deleteDraft } from './actions'
import type { CategorizeOutput, SystemNotification } from '@/types'

type SearchParams = Promise<{ tab?: string; saved?: string; commit?: string }>

const VALID_TABS: WorkspaceTab[] = ['all', 'writing', 'categorizing', 'ready', 'delete', 'messages']
function toTab(v: string | undefined): WorkspaceTab {
  return VALID_TABS.includes(v as WorkspaceTab) ? (v as WorkspaceTab) : 'all'
}

export default async function WorkspacePage({ searchParams }: { searchParams: SearchParams }) {
  const { tab, saved, commit: commitSha } = await searchParams
  const activeTab = toTab(tab)

  const adminSupabase = createAdminClient()
  const supabase = createServiceClient()

  // Deployment banner
  let deployment = null
  if (commitSha) {
    const { data } = await adminSupabase
      .from('deployments')
      .select('status, triggered_at, completed_at')
      .eq('commit_sha', commitSha)
      .maybeSingle()
    deployment = data
  }

  // draft_posts (status=draft) — body_markdown + frontmatter included for categorize hash
  const { data: drafts } = await supabase
    .from('draft_posts')
    .select('id, section, title, body_markdown, frontmatter, draft_stage, created_at')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })

  const writing      = (drafts ?? []).filter((d) => d.draft_stage === 'writing')
  const categorizing = (drafts ?? []).filter((d) => d.draft_stage === 'categorizing')
  const ready        = (drafts ?? []).filter((d) => d.draft_stage === 'ready')

  // Categories (for CategorizeCard + hash computation)
  const { data: allCategories } = await supabase
    .from('categories')
    .select('name, section, deleted_at')

  const categoriesMap: Record<string, string[]> = {}
  const excludedMap:   Record<string, string[]> = {}
  for (const cat of allCategories ?? []) {
    categoriesMap[cat.section] ??= []
    excludedMap[cat.section]   ??= []
    if (cat.deleted_at === null) categoriesMap[cat.section].push(cat.name)
    else                         excludedMap[cat.section].push(cat.name)
  }

  // Cache check for categorizing drafts
  function sha(s: string) {
    return createHash('sha256').update(s).digest('hex').slice(0, 16)
  }
  const cachedRecsMap: Record<string, CategorizeOutput> = {}
  for (const d of categorizing) {
    const existing = categoriesMap[d.section] ?? []
    const excluded = excludedMap[d.section]   ?? []
    const desc     = ((d.frontmatter as Record<string, unknown>)?.description as string) ?? ''
    const cHash = sha(d.title + (d.body_markdown ?? '').slice(0, 500) + desc)
    const vHash = sha([...existing].sort().join(','))
    const eHash = sha([...excluded].sort().join(','))

    const { data: cached } = await adminSupabase
      .from('ai_category_recommendations')
      .select('existing_top3, suggested_top3')
      .eq('post_id', d.id)
      .eq('content_hash', cHash)
      .eq('categories_version', vHash)
      .eq('excluded_version', eHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached) {
      cachedRecsMap[d.id] = {
        existing_top3:  cached.existing_top3  as CategorizeOutput['existing_top3'],
        suggested_top3: cached.suggested_top3 as CategorizeOutput['suggested_top3'],
      }
    }
  }

  // admin_jobs delete queue
  const { data: deleteJobs } = await adminSupabase
    .from('admin_jobs')
    .select('id, target_section, target_slug, requested_by, created_at')
    .eq('type', 'delete_post')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // inbox_messages
  const { data: messages } = await supabase
    .from('inbox_messages')
    .select('id, message_type, text_content, status, telegram_date, parsed_tags, target_section, draft_generated_at')
    .order('telegram_date', { ascending: false })
    .limit(50)

  const pendingMessages = (messages ?? []).filter((m) => m.status === 'pending')

  // system_notifications
  const { data: notifications } = await adminSupabase
    .from('system_notifications')
    .select('id, type, source, message, action_required, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const unreadActionRequired = (notifications ?? []).filter(
    (n) => n.action_required && !n.read_at,
  )

  const counts: WorkspaceCounts = {
    writing:      writing.length,
    categorizing: categorizing.length,
    ready:        ready.length,
    deleteQueue:  (deleteJobs ?? []).length,
    messages:     pendingMessages.length + unreadActionRequired.length,
  }

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

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Workspace</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/private/categories"
            className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:border-slate-400 hover:text-slate-700 transition-colors"
          >
            카테고리 관리
          </Link>
          <NewPostModal />
        </div>
      </div>

      <WorkspaceNav activeTab={activeTab} counts={counts} />

      {activeTab === 'all' && (
        <AllTab
          categorizing={categorizing}
          ready={ready}
          writing={writing}
          deleteJobs={deleteJobs ?? []}
          pendingMessages={pendingMessages}
          unreadActionRequired={unreadActionRequired.length}
        />
      )}
      {activeTab === 'writing' && (
        <DraftList items={writing} emptyText="작성 중인 글이 없습니다." />
      )}
      {activeTab === 'categorizing' && (
        categorizing.length === 0
          ? <p className="text-sm text-slate-400">카테고리 지정이 필요한 글이 없습니다.</p>
          : <div className="space-y-4">
              {categorizing.map((d) => (
                <CategorizeCard
                  key={d.id}
                  post={{ id: d.id, section: d.section, title: d.title, created_at: d.created_at }}
                  existingCategories={categoriesMap[d.section] ?? []}
                  initialRecommendation={cachedRecsMap[d.id] ?? null}
                />
              ))}
            </div>
      )}
      {activeTab === 'ready' && (
        <DraftList items={ready} emptyText="발행 준비된 글이 없습니다." />
      )}
      {activeTab === 'delete' && (
        <DeleteQueueTab deleteJobs={deleteJobs ?? []} />
      )}
      {activeTab === 'messages' && (
        <MessagesTab
          telegramMessages={messages ?? []}
          notifications={(notifications ?? []) as SystemNotification[]}
        />
      )}
    </main>
  )
}

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface DraftRow {
  id: string
  section: string
  title: string
  draft_stage: string | null
  created_at: string
}

interface DeleteJobRow {
  id: string
  target_section: string
  target_slug: string
  requested_by: string | null
  created_at: string
}

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

// ────────────────────────────────────────────────────────────────
// AllTab
// ────────────────────────────────────────────────────────────────

function AllTab({
  categorizing, ready, writing, deleteJobs, pendingMessages, unreadActionRequired,
}: {
  categorizing: DraftRow[]
  ready: DraftRow[]
  writing: DraftRow[]
  deleteJobs: DeleteJobRow[]
  pendingMessages: MessageRow[]
  unreadActionRequired: number
}) {
  const totalDrafts  = categorizing.length + ready.length + writing.length
  const messagesTotal = pendingMessages.length + unreadActionRequired
  const totalItems   = totalDrafts + deleteJobs.length + messagesTotal

  if (totalItems === 0) {
    return <p className="text-gray-400 text-sm">항목이 없습니다.</p>
  }

  return (
    <div className="space-y-8">
      {categorizing.length > 0 && (
        <DraftGroup
          title="카테고리 지정 필요"
          items={categorizing}
          badgeColor="yellow"
          href="?tab=categorizing"
        />
      )}
      {ready.length > 0 && (
        <DraftGroup title="발행 준비 완료" items={ready} badgeColor="green" href="?tab=ready" />
      )}
      {writing.length > 0 && (
        <DraftGroup title="작성 중" items={writing} badgeColor="gray" href="?tab=writing" />
      )}
      {deleteJobs.length > 0 && (
        <section>
          <SectionHeader title="삭제 대기" count={deleteJobs.length} href="?tab=delete" dotColor="bg-red-500" />
          <p className="text-sm text-slate-500">
            <Link href="?tab=delete" className="underline underline-offset-2">삭제 대기 탭</Link>에서 확인하세요.
          </p>
        </section>
      )}
      {messagesTotal > 0 && (
        <section>
          <SectionHeader title="메시지" count={messagesTotal} href="?tab=messages" dotColor="bg-red-400" />
          <p className="text-sm text-slate-500">
            <Link href="?tab=messages" className="underline underline-offset-2">메시지 탭</Link>에서 확인하세요.
          </p>
        </section>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// DraftGroup (AllTab 내부 섹션)
// ────────────────────────────────────────────────────────────────

function DraftGroup({
  title, items, badgeColor, href,
}: {
  title: string
  items: DraftRow[]
  badgeColor: 'gray' | 'yellow' | 'green'
  href: string
}) {
  const dotCls: Record<string, string> = {
    gray:   'bg-gray-400',
    yellow: 'bg-yellow-400',
    green:  'bg-green-500',
  }
  return (
    <section>
      <SectionHeader title={title} count={items.length} href={href} dotColor={dotCls[badgeColor]} />
      <DraftList items={items} emptyText="" />
    </section>
  )
}

function SectionHeader({ title, count, href, dotColor }: { title: string; count: number; href: string; dotColor: string }) {
  return (
    <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
      <Link href={href} className="hover:underline underline-offset-2">{title}</Link>
      <span className="text-sm font-normal text-slate-400">({count})</span>
    </h2>
  )
}

// ────────────────────────────────────────────────────────────────
// DraftList
// ────────────────────────────────────────────────────────────────

function DraftList({ items, emptyText }: { items: DraftRow[]; emptyText: string }) {
  if (items.length === 0 && emptyText) {
    return <p className="text-sm text-slate-400">{emptyText}</p>
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const deleteAction = deleteDraft.bind(null, item.id) as unknown as (formData: FormData) => Promise<void>
        return (
          <li key={item.id} className="flex items-center rounded-lg border border-slate-200 hover:border-slate-400 hover:shadow-sm transition-all">
            <Link
              href={`/private/inbox/draft/${item.id}`}
              className="flex items-center gap-3 p-3 flex-1 min-w-0 text-sm"
            >
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 shrink-0">
                {item.section}
              </span>
              <span className="flex-1 min-w-0 truncate text-slate-800">
                {item.title || '(제목 없음)'}
              </span>
              <time className="font-mono text-xs text-slate-400 shrink-0">
                {item.created_at.slice(0, 10)}
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
      })}
    </ul>
  )
}

// ────────────────────────────────────────────────────────────────
// DeleteQueueTab
// ────────────────────────────────────────────────────────────────

function DeleteQueueTab({ deleteJobs }: { deleteJobs: DeleteJobRow[] }) {
  if (deleteJobs.length === 0) {
    return <p className="text-sm text-slate-400">삭제 대기 중인 항목이 없습니다.</p>
  }
  return (
    <ul className="space-y-3">
      {deleteJobs.map((job) => {
        const deleteAction = executeDeletePost.bind(null, job.id) as unknown as (formData: FormData) => Promise<void>
        const cancelAction = cancelDeletePost.bind(null, job.id) as unknown as (formData: FormData) => Promise<void>
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
              <form action={cancelAction}>
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
  )
}

