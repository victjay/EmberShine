import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

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

  // 2. 연결된 draft_posts 조회
  const { data: draft } = await supabase
    .from('draft_posts')
    .select('github_path, section')
    .eq('inbox_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const section = draft?.section ?? inbox.target_section

  // target_section이 없으면 inbox 목록으로
  if (!section) redirect('/private/inbox')

  // 3. github_path가 있으면 편집 페이지로, 없으면 새 글 작성으로
  if (draft?.github_path) {
    // content/blog/2026-03-16-my-post.md → 2026-03-16-my-post
    const slug = draft.github_path.split('/').pop()?.replace(/\.md$/, '')
    if (slug) {
      if (section === 'blog')      redirect(`/private/blog/edit/${slug}`)
      if (section === 'stories')   redirect(`/private/stories/edit/${slug}`)
      if (section === 'portfolio') redirect(`/private/portfolio/edit/${slug}`)
    }
  }

  // fallback: draft 없거나 slug 추출 실패 → 새 글 작성 페이지
  if (section === 'blog')      redirect('/private/blog/new')
  if (section === 'stories')   redirect('/private/stories/new')
  if (section === 'portfolio') redirect('/private/portfolio/new')

  notFound()
}
