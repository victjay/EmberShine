export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateDraft } from '@/lib/ai/draft'
import { sendTelegramMessage } from '@/lib/telegram/sender'
import { sendDraftPreview } from '@/lib/telegram/preview'
import { computeDraftStage } from '@/lib/drafts/computeDraftStage'

interface DraftRouteBody {
  inboxId: string
  text: string
  section: string | null
  tags: string[]
  hasPhoto: boolean
}

export async function POST(request: NextRequest) {
  console.log('[draft-route] POST handler entered')

  let input: DraftRouteBody
  try {
    input = await request.json() as DraftRouteBody
  } catch {
    console.error('[draft-route] Invalid JSON body')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { inboxId, text, section, tags, hasPhoto } = input
  console.log(`[draft-route] Generating draft for inboxId=${inboxId}`)

  if (!text) {
    await sendTelegramMessage('텍스트가 없어 AI 초안을 생성할 수 없습니다. inbox에 보관되었습니다.')
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  // 2-A: 진입 즉시 processing 상태로 변경
  await supabase
    .from('inbox_messages')
    .update({ status: 'processing' })
    .eq('id', inboxId)

  let draft
  try {
    draft = await generateDraft({ text, section, existingTags: tags, hasPhoto })
    console.log(`[draft-route] Draft generated for inboxId=${inboxId}`)
  } catch (err) {
    console.error('[draft-route] generateDraft failed:', err)
    // 2-C: 실패 시 pending 복원 + Telegram 알림
    await supabase
      .from('inbox_messages')
      .update({ status: 'pending' })
      .eq('id', inboxId)
    await sendTelegramMessage(
      `⚠️ AI 초안 생성 실패\n인박스 ID: ${inboxId}\n오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
    )
    return NextResponse.json({ ok: true })
  }

  const derivedSection = deriveSection(tags, section)

  const { error: insertError } = await supabase.from('draft_posts').insert({
    inbox_id:      inboxId,
    section:       derivedSection,
    title:         draft.titles[0],
    body_markdown: draft.body_markdown,
    // github_path는 publish 시 resolvePublicSlug로 확정 — 여기서 미리 설정하지 않음
    github_path:   null,
    frontmatter: {
      ai_titles:           draft.titles,
      ai_summary:          draft.summary,
      ai_tags:             draft.tags,
      ai_meta_description: draft.meta_description,
      ai_translation:      draft.translation,
    },
    status:      'draft',
    draft_stage: computeDraftStage(draft.titles[0], draft.body_markdown, null),
  })

  if (insertError) {
    console.error('[draft-route] draft_posts insert failed:', insertError.message)
    // 2-C: 저장 실패 시 pending 복원 + Telegram 알림
    await supabase
      .from('inbox_messages')
      .update({ status: 'pending' })
      .eq('id', inboxId)
    await sendTelegramMessage(
      `⚠️ 초안 저장 실패\n인박스 ID: ${inboxId}\n오류: ${insertError.message}`,
    )
    return NextResponse.json({ ok: true })
  }

  // 2-B: 성공 시 pending 복원 + draft_generated_at 기록
  await supabase
    .from('inbox_messages')
    .update({
      draft_generated_at: new Date().toISOString(),
      status: 'pending',
    })
    .eq('id', inboxId)

  await sendDraftPreview(inboxId, draft)
  console.log(`[draft-route] Preview sent for inboxId=${inboxId}`)

  return NextResponse.json({ ok: true })
}

function deriveSection(tags: string[], section: string | null): 'blog' | 'stories' | 'portfolio' {
  if (section === 'stories' || section === 'portfolio') return section
  const lower = tags.map((t) => t.toLowerCase())
  if (lower.includes('#story') || lower.includes('#stories')) return 'stories'
  if (lower.includes('#portfolio')) return 'portfolio'
  return 'blog'
}
