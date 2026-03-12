import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/content/markdown'
import Link from 'next/link'

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

      {/* Search bar — placeholder, functionality in Phase 4 */}
      <div className="mb-8">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search posts… (coming soon)"
            disabled
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-not-allowed font-mono"
          />
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="text-slate-500 text-sm">No posts yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group block">
                <article className="border border-slate-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-sm transition-all bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-navy-900 group-hover:text-blue-600 transition-colors leading-snug mb-1.5">
                        {post.title}
                      </h2>
                      {post.description && (
                        <p className="text-sm text-slate-500 leading-relaxed mb-3">
                          {post.description}
                        </p>
                      )}
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
                    <time className="shrink-0 font-mono text-xs text-slate-400 pt-0.5">
                      {post.date}
                    </time>
                  </div>
                </article>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
