import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n/locale'
import { getDictionary } from '../../../../messages'
import { getAllPosts } from '@/lib/content'
import PostSearch from '@/components/PostSearch'
import PageHeading from '@/components/PageHeading'
import SectionControls from '@/components/SectionControls'
import { requestDeletePost } from '@/app/private/stories/actions'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params

  if (!isValidLocale(lang)) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://embershine.vercel.app'

  return {
    title: 'Stories',
    description: 'Travel, daily life, and things worth remembering.',
    alternates: {
      canonical: `/${lang}/stories`,
      languages: {
        ko: `/ko/stories`,
        en: `/en/stories`,
      },
    },
    openGraph: {
      title: 'Stories · EmberShine',
      url: `${siteUrl}/${lang}/stories`,
    },
  }
}

export default async function StoriesPage({ params }: Props) {
  const { lang } = await params

  if (!isValidLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const posts = await getAllPosts('stories', lang)

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <PageHeading page="stories" />
        <SectionControls newHref="/private/stories/new" />
      </div>

      <PostSearch posts={posts} layout="grid" requestDeleteAction={requestDeletePost} />
    </main>
  )
}
