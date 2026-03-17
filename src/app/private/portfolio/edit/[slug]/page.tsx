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

  // Fallback: GitHub file not yet created — check draft_posts
  const supabase = createServiceClient()
  const { data: draft } = await supabase
    .from('draft_posts')
    .select('title, body_markdown, frontmatter')
    .eq('github_path', `content/portfolio/${slug}.md`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

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
        tags:        Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
        description: String(fm.description ?? fm.ai_summary ?? ''),
        status:      fm.status != null ? String(fm.status) : 'Shipped',
        body:        String(draft.body_markdown ?? ''),
      }}
    />
  )
}
