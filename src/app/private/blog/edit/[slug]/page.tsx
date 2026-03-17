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
  const post = getPostBySlug('blog', slug)

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

  // Fallback: GitHub file not yet created — check draft_posts
  const supabase = createServiceClient()
  const { data: draft } = await supabase
    .from('draft_posts')
    .select('title, body_markdown, frontmatter')
    .eq('github_path', `content/blog/${slug}.md`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

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
        tags:        Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
        description: String(fm.description ?? fm.ai_summary ?? ''),
        body:        String(draft.body_markdown ?? ''),
      }}
    />
  )
}
