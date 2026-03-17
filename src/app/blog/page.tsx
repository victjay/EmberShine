import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/content/markdown'
import PostSearch from '@/components/PostSearch'
import PageHeading from '@/components/PageHeading'
import SectionControls from '@/components/SectionControls'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Tech notes, guides, and experiments.',
  alternates: { canonical: '/blog' },
  openGraph: { title: 'Blog · EmberShine', url: '/blog' },
}

export default async function BlogPage() {
  const posts = await getAllPosts('blog')

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <PageHeading page="blog" />
        <SectionControls newHref="/private/blog/new" />
      </div>

      <PostSearch posts={posts} layout="list" />
    </main>
  )
}
