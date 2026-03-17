import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/content/markdown'
import { createServiceClient } from '@/lib/supabase/server'
import PortfolioPostForm from '../../PortfolioPostForm'
import { updateProject } from '../../actions'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditProjectPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug('portfolio', slug)

  if (post) {
    return (
      <PortfolioPostForm
        action={updateProject}
        pageLabel="Edit project"
        submitLabel="Update"
        defaultValues={{
          postId:      post.slug,
          title:       post.title,
          date:        post.date,
          tags:        post.tags,
          description: post.description,
          status:      post.status != null ? String(post.status) : 'Shipped',
          body:        post.content,
        }}
      />
    )
  }

  // 1순위: github_path 정확히 일치하는 draft 조회
  const supabase = createServiceClient()
  let draft = null

  const { data: byPath } = await supabase
    .from('draft_posts')
    .select('title, body_markdown, frontmatter')
    .eq('github_path', `content/portfolio/${slug}.md`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (byPath) {
    draft = byPath
  } else {
    // 2순위: github_path가 null인 portfolio 섹션 최신 draft
    const { data: bySection } = await supabase
      .from('draft_posts')
      .select('title, body_markdown, frontmatter')
      .eq('section', 'portfolio')
      .is('github_path', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    draft = bySection ?? null
  }

  if (!draft) notFound()

  const fm = (draft.frontmatter ?? {}) as Record<string, unknown>
  const today = new Date().toISOString().slice(0, 10)

  return (
    <PortfolioPostForm
      action={updateProject}
      pageLabel="Edit project"
      submitLabel="Update"
      defaultValues={{
        postId:      slug,
        title:       String(draft.title ?? ''),
        date:        String(fm.date ?? today),
        tags:        Array.isArray(fm.ai_tags) ? (fm.ai_tags as string[]) : [],
        description: String(fm.ai_meta_description ?? fm.ai_summary ?? ''),
        status:      fm.status != null ? String(fm.status) : 'Shipped',
        body:        String(draft.body_markdown ?? ''),
      }}
    />
  )
}
