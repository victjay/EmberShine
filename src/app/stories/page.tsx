import { getAllPosts } from '@/lib/content/markdown'
import Link from 'next/link'

export default function StoriesPage() {
  const posts = getAllPosts('stories')

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-navy-900 mb-1">Stories</h1>
        <p className="text-slate-500 text-sm">Travel, daily life, and things worth remembering.</p>
      </div>

      {posts.length === 0 ? (
        <p className="text-slate-500 text-sm">No stories yet.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/stories/${post.slug}`} className="group block h-full">
                <article className="h-full border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all bg-white flex flex-col">
                  {/* Photo placeholder */}
                  <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                    </svg>
                  </div>

                  <div className="p-5 flex flex-col gap-2 flex-1">
                    {/* Location + date meta */}
                    <div className="flex items-center justify-between">
                      {post.location != null && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                          </svg>
                          {String(post.location)}
                        </span>
                      )}
                      {post.shooting_date != null && (
                        <time className="text-xs font-mono text-slate-400">
                          {String(post.shooting_date)}
                        </time>
                      )}
                    </div>

                    <h2 className="text-base font-semibold text-navy-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {post.title}
                    </h2>

                    {post.description && (
                      <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                        {post.description}
                      </p>
                    )}
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
