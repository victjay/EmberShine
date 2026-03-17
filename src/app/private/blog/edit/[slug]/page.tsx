import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/content/markdown'
import BlogPostForm from '../../BlogPostForm'
import { updateBlogPost } from '../../actions'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditBlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug('blog', slug)
  if (!post) notFound()

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
