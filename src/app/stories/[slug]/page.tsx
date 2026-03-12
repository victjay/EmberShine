import { getPostBySlug, getPostSlugs } from '@/lib/content/markdown'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getPostSlugs('stories').map((slug) => ({ slug }))
}

export default async function StoryPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug('stories', slug)
  if (!post) notFound()

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-8">{post.date}</p>
      <article className="prose prose-gray max-w-none">
        <MDXRemote source={post.content} />
      </article>
    </main>
  )
}
