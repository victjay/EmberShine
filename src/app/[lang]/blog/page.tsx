import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n/locale'
import { getDictionary } from '../../../../messages'
import { getAllPosts } from '@/lib/content'
import PostSearch from '@/components/PostSearch'
import PageHeading from '@/components/PageHeading'
import SectionControls from '@/components/SectionControls'
import { requestDeletePost } from '@/app/private/blog/actions'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params

  if (!isValidLocale(lang)) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://embershine.vercel.app'

  return {
    title: 'Blog',
    description: 'Tech notes, guides, and experiments.',
    alternates: {
      canonical: `/${lang}/blog`,
      languages: {
        ko: `/ko/blog`,
        en: `/en/blog`,
      },
    },
    openGraph: {
      title: 'Blog · EmberShine',
      url: `${siteUrl}/${lang}/blog`,
    },
  }
}

export default async function BlogPage({ params }: Props) {
  const { lang } = await params

  if (!isValidLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const posts = await getAllPosts('blog', lang)

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <PageHeading page="blog" />
        <SectionControls newHref="/private/blog/new" />
      </div>

      <PostSearch posts={posts} layout="list" requestDeleteAction={requestDeletePost} />
    </main>
  )
}
