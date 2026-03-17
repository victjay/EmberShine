import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/content/markdown'
import { createServiceClient } from '@/lib/supabase/server'
import BlogPostForm from '../../BlogPostForm'
import { updateBlogPost } from '../../actions'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditBlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug('blog', slug)

  if (post) {
    return (
      <BlogPostForm
        action={updateBlogPost}
        pageLabel="Edit post"
        submitLabel="Update"
        defaultValues={{
          postId:      post.slug,
          title:       post.title,
          date:        post.date,
          tags:        post.tags,
          description: post.description,
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
    .eq('github_path', `content/blog/${slug}.md`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (byPath) {
    draft = byPath
  } else {
    // 2순위: github_path가 null인 blog 섹션 최신 draft
    const { data: bySection } = await supabase
      .from('draft_posts')
      .select('title, body_markdown, frontmatter')
      .eq('section', 'blog')
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
    <BlogPostForm
      action={updateBlogPost}
      pageLabel="Edit post"
      submitLabel="Update"
      defaultValues={{
        postId:      slug,
        title:       String(draft.title ?? ''),
        date:        String(fm.date ?? today),
        tags:        Array.isArray(fm.ai_tags) ? (fm.ai_tags as string[]) : [],
        description: String(fm.ai_meta_description ?? fm.ai_summary ?? ''),
        body:        String(draft.body_markdown ?? ''),
      }}
    />
  )
}
