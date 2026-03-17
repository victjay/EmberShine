import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/content/markdown'
import PortfolioPostForm from '../../PortfolioPostForm'
import { updateProject } from '../../actions'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EditProjectPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug('portfolio', slug)
  if (!post) notFound()

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
