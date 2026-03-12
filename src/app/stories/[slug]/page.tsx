import type { Metadata } from 'next'
import { getPostBySlug, getPostSlugs } from '@/lib/content/markdown'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Comments from '@/components/Comments'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getPostSlugs('stories').map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug('stories', slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/stories/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/stories/${slug}`,
      type: 'article',
      publishedTime: post.date,
    },
  }
}

export default async function StoryPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug('stories', slug)
  if (!post) notFound()

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <Link
        href="/stories"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-blue-600 transition-colors font-mono mb-8"
      >
        ← Stories
      </Link>

      <header className="mb-10 pb-8 border-b border-slate-100">
        {/* Location + shooting date */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {post.location != null && (
            <span className="flex items-center gap-1 text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
              </svg>
              {String(post.location)}
            </span>
          )}
          {post.shooting_date != null && (
            <time className="text-xs font-mono text-slate-400">
              Shot {String(post.shooting_date)}
            </time>
          )}
          <time className="text-xs font-mono text-slate-400">{post.date}</time>
        </div>

        <h1 className="text-4xl font-bold text-navy-900 leading-tight mb-3">
          {post.title}
        </h1>

        {post.description && (
          <p className="text-lg text-slate-500 leading-relaxed">
            {post.description}
          </p>
        )}
      </header>

      <article className="prose prose-slate max-w-none
        prose-headings:font-bold prose-headings:text-navy-900
        prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
        prose-p:leading-relaxed prose-p:text-slate-700
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
      ">
        <MDXRemote source={post.content} />
      </article>

      <Comments />
    </main>
  )
}
