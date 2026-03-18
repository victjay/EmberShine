import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { isValidLocale } from '@/lib/i18n/locale'
import { getDictionary } from '../../../../../messages'
import { getPostBySlug, getAllPosts } from '@/lib/content'
import { needsFallbackBadge } from '@/lib/i18n/fallback'
import SectionControls from '@/components/SectionControls'
import DeleteButton from '@/components/DeleteButton'
import { requestDeletePost } from '@/app/private/portfolio/actions'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ lang: string; slug: string }>
}

export async function generateStaticParams() {
  const posts = await getAllPosts('portfolio')
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params

  if (!isValidLocale(lang)) return {}

  const post = await getPostBySlug('portfolio', slug, lang)
  if (!post) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://embershine.vercel.app'

  return {
    title: post.title,
    description: post.description ?? '',
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: `/${lang}/portfolio/${slug}`,
      languages: {
        ko: `/ko/portfolio/${slug}`,
        en: `/en/portfolio/${slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.description ?? '',
      locale: lang === 'ko' ? 'ko_KR' : 'en_US',
      alternateLocale: lang === 'ko' ? ['en_US'] : ['ko_KR'],
      url: `${siteUrl}/${lang}/portfolio/${slug}`,
      type: 'article',
    },
  }
}

export default async function PortfolioPostPage({ params }: Props) {
  const { lang, slug } = await params

  if (!isValidLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const post = await getPostBySlug('portfolio', slug, lang)
  if (!post) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === process.env.ADMIN_EMAIL

  if (post.pending_delete === true && !isAdmin) notFound()

  const showFallback = needsFallbackBadge(post, lang)

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <Link
        href={`/${lang}/portfolio`}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-blue-600 transition-colors font-mono mb-8"
      >
        ← Portfolio
      </Link>

      <header className="mb-10">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-3xl font-bold text-navy-900">{post.title}</h1>
          <SectionControls
            newHref="/private/portfolio/new"
            editHref={`/private/portfolio/edit/${slug}`}
          />
          <DeleteButton
            postId={slug}
            section="portfolio"
            requestDeleteAction={requestDeletePost}
          />
        </div>

        {post.pending_delete === true && (
          <span className="text-xs text-amber-700 border border-amber-300 bg-amber-50 rounded px-2 py-0.5 mb-3 inline-block">
            ⚠️ 삭제 대기 중
          </span>
        )}
        {showFallback && (
          <span className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-0.5 mb-3 inline-block">
            원문 (한국어)
          </span>
        )}
        {post.translationStatus === 'stale' && lang === 'en' && (
          <span className="text-xs text-amber-600 border border-amber-300 bg-amber-50 rounded px-2 py-0.5 mb-4 inline-block">
            번역이 오래됐습니다 (원문이 수정됐습니다)
          </span>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-3">
          {post.status != null && (
            <span className={`text-xs font-mono px-2 py-1 rounded border ${
              post.status === 'In Progress'
                ? 'bg-blue-50 text-blue-600 border-blue-100'
                : 'bg-green-50 text-green-700 border-green-100'
            }`}>
              {String(post.status)}
            </span>
          )}
        </div>

        {post.description && (
          <p className="text-lg text-slate-500 leading-relaxed mb-4">{post.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {post.github != null && (
            <a
              href={String(post.github)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-600 hover:underline"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </a>
          )}
        </div>
      </header>

      <article className="prose prose-slate max-w-none
        prose-headings:font-bold prose-headings:text-navy-900
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        prose-code:font-mono prose-code:text-blue-700 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded
        prose-pre:bg-slate-900 prose-pre:text-slate-100
        prose-table:text-sm
      ">
        <MDXRemote source={post.content} />
      </article>
    </main>
  )
}
