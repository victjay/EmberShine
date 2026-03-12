import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/content/markdown'
import PostSearch from '@/components/PostSearch'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Tech notes, guides, and experiments.',
  alternates: { canonical: '/blog' },
  openGraph: { title: 'Blog · EmberShine', url: '/blog' },
}

export default function BlogPage() {
  const posts = getAllPosts('blog')

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-navy-900 mb-1">Blog</h1>
        <p className="text-slate-500 text-sm">Tech notes, guides, and experiments.</p>
      </div>

      <PostSearch posts={posts} layout="list" />
    </main>
  )
}
