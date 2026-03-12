import { getPostBySlug, getPostSlugs } from '@/lib/content/markdown'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getPostSlugs('portfolio').map((slug) => ({ slug }))
}

export default async function PortfolioPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug('portfolio', slug)
  if (!post) notFound()

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
      <article className="prose prose-gray max-w-none mt-8">
        <MDXRemote source={post.content} />
      </article>
    </main>
  )
}
