import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/content/markdown'
import PostSearch from '@/components/PostSearch'

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
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-navy-900 mb-1">Stories</h1>
        <p className="text-slate-500 text-sm">Travel, daily life, and things worth remembering.</p>
      </div>

      <PostSearch posts={posts} layout="grid" />
    </main>
  )
}
