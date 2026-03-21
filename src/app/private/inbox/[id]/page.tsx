import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveDraftNavigation } from '@/lib/drafts/resolveDraftNavigation'
import type { DraftStage } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function InboxDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  // 1. inbox_messages 조회
  const { data: inbox } = await supabase
    .from('inbox_messages')
    .select('id, target_section')
    .eq('id', id)
    .single()

  if (!inbox) notFound()

  // 2. 연결된 draft_posts 조회 (draft_stage 포함)
  const { data: draft } = await supabase
    .from('draft_posts')
    .select('id, draft_stage, status')
    .eq('inbox_id', id)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 3. draft_stage 기반 스마트 라우팅
  const decision = resolveDraftNavigation(
    draft ? { id: draft.id, draft_stage: draft.draft_stage as DraftStage | null } : null
  )

  redirect(decision.href)
}
