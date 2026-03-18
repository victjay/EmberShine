import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeHighlight from 'rehype-highlight'
import { isValidLocale } from '@/lib/i18n/locale'
import { getPostBySlug, getAllPosts, getPostSlugs } from '@/lib/content/markdown'
import { needsFallbackBadge } from '@/lib/i18n/fallback'
import SectionControls from '@/components/SectionControls'
import Comments from '@/components/Comments'
import RelatedPosts from '@/components/RelatedPosts'

interface Props {
  params: Promise<{ lang: string; slug: string }>
}

// slug만 생성 (lang은 부모 layout이 제공)
export async function generateStaticParams() {
  const posts = await getAllPosts('blog')
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params

  if (!isValidLocale(lang)) return {}

  const post = await getPostBySlug('blog', slug, lang)
  if (!post) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://embershine.vercel.app'

  return {
    title: post.title,
    description: post.description ?? '',
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: `/${lang}/blog/${slug}`,
      languages: {
        ko: `/ko/blog/${slug}`,
        en: `/en/blog/${slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.description ?? '',
      locale: lang === 'ko' ? 'ko_KR' : 'en_US',
      alternateLocale: lang === 'ko' ? ['en_US'] : ['ko_KR'],
      url: `${siteUrl}/${lang}/blog/${slug}`,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { lang, slug } = await params

  if (!isValidLocale(lang)) notFound()

  const post = await getPostBySlug('blog', slug, lang)
  if (!post) notFound()

  const showFallback = needsFallbackBadge(post, lang)

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <Link
        href={`/${lang}/blog`}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-blue-600 transition-colors font-mono mb-8"
      >
        ← Blog
      </Link>

      <header className="mb-10">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-3xl font-bold text-navy-900 leading-tight">
            {post.title}
          </h1>
          <SectionControls
            newHref={`/${lang}/private/blog/new`}
            editHref={`/${lang}/private/blog/edit/${slug}`}
          />
        </div>
        {showFallback && (
          <span className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-0.5 mb-3 inline-block">
            원문 (한국어)
          </span>
        )}
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
