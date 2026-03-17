import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/content/markdown'
import PostSearch from '@/components/PostSearch'
import PageHeading from '@/components/PageHeading'
import SectionControls from '@/components/SectionControls'

export const metadata: Metadata = {
  title: 'Stories',
  description: 'Travel, daily life, and things worth remembering.',
  alternates: { canonical: '/stories' },
  openGraph: { title: 'Stories · EmberShine', url: '/stories' },
}

export default function StoriesPage() {
  const posts = getAllPosts('stories')

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <PageHeading page="stories" />
        <SectionControls newHref="/private/stories/new" />
      </div>

      <PostSearch posts={posts} layout="grid" />
    </main>
  )
}
