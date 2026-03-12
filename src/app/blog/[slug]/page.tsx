import type { Metadata } from 'next'
import { getPostBySlug, getPostSlugs } from '@/lib/content/markdown'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import rehypeHighlight from 'rehype-highlight'
import Comments from '@/components/Comments'
import RelatedPosts from '@/components/RelatedPosts'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getPostSlugs('blog').map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug('blog', slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${slug}`,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug('blog', slug)
  if (!post) notFound()

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-blue-600 transition-colors font-mono mb-8"
      >
        ← Blog
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl font-bold text-navy-900 leading-tight mb-3">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <time className="font-mono text-sm text-slate-400">{post.date}</time>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-2 py-0.5 text-xs font-mono bg-blue-50 text-blue-600 border border-blue-100 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <article className="prose prose-slate max-w-none
        prose-headings:font-bold prose-headings:text-navy-900
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        prose-code:font-mono prose-code:text-blue-700 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded
        prose-pre:bg-slate-900 prose-pre:text-slate-100
      ">
        <MDXRemote
          source={post.content}
          options={{ mdxOptions: { rehypePlugins: [rehypeHighlight] } }}
        />
      </article>

      <RelatedPosts slug={slug} section="blog" />
      <Comments />
    </main>
  )
}
