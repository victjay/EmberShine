import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/content/markdown'
import PostSearch from '@/components/PostSearch'
import PageHeading from '@/components/PageHeading'

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
      <PageHeading page="blog" />

      <PostSearch posts={posts} layout="list" />
    </main>
  )
}
