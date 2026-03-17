import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/content/markdown'
import StoriesPostForm from '../../StoriesPostForm'
import { updateStory } from '../../actions'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditStoryPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug('stories', slug)
  if (!post) notFound()

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
