import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/content/markdown'
import { createServiceClient } from '@/lib/supabase/server'
import StoriesPostForm from '../../StoriesPostForm'
import { updateStory } from '../../actions'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditStoryPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug('stories', slug)

  if (post) {
    return (
      <StoriesPostForm
        action={updateStory}
        pageLabel="Edit story"
        submitLabel="Update"
        defaultValues={{
          postId:       post.slug,
          title:        post.title,
          date:         post.date,
          tags:         post.tags,
          description:  post.description,
          location:     post.location != null ? String(post.location) : undefined,
          shootingDate: post.shooting_date != null ? String(post.shooting_date) : undefined,
          body:         post.content,
        }}
      />
    )
  }

  // Fallback: GitHub file not yet created — check draft_posts
  const supabase = createServiceClient()
  const { data: draft } = await supabase
    .from('draft_posts')
    .select('title, body_markdown, frontmatter')
    .eq('github_path', `content/stories/${slug}.md`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!draft) notFound()

  const fm = (draft.frontmatter ?? {}) as Record<string, unknown>
  const today = new Date().toISOString().slice(0, 10)

  return (
    <StoriesPostForm
      action={updateStory}
      pageLabel="Edit story"
      submitLabel="Update"
      defaultValues={{
        postId:       slug,
        title:        String(draft.title ?? ''),
        date:         String(fm.date ?? today),
        tags:         Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
        description:  String(fm.description ?? fm.ai_summary ?? ''),
        location:     fm.location != null ? String(fm.location) : undefined,
        shootingDate: fm.shooting_date != null ? String(fm.shooting_date) : undefined,
        body:         String(draft.body_markdown ?? ''),
      }}
    />
  )
}
