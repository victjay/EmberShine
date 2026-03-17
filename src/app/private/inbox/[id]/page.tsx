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

  if (!draft?.github_path) notFound()

  // 3. github_path에서 slug 추출
  // 예: content/blog/2026-03-16-my-post.md → 2026-03-16-my-post
  const slug = draft.github_path.split('/').pop()?.replace(/\.md$/, '')
  if (!slug) notFound()

  // 4. section에 따라 편집 페이지로 redirect
  const section = draft.section ?? inbox.target_section

  if (section === 'blog')      redirect(`/private/blog/edit/${slug}`)
  if (section === 'stories')   redirect(`/private/stories/edit/${slug}`)
  if (section === 'portfolio') redirect(`/private/portfolio/edit/${slug}`)

  notFound()
}
