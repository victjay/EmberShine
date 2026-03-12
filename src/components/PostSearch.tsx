'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Post {
  slug: string
  section: string
  title: string
  date: string
  description?: string
  tags?: string[]
  location?: unknown
  shooting_date?: unknown
  [key: string]: unknown
}

interface Props {
  posts: Post[]
  layout: 'list' | 'grid'
}

export default function PostSearch({ posts, layout }: Props) {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? posts.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      )
    : posts

  return (
    <>
      {/* Search input */}
      <div className="relative mb-8">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목, 태그, 설명으로 검색…"
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent font-mono"
        />
        {q && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {filtered.length}개
          </span>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-slate-400 text-sm">검색 결과가 없습니다.</p>
      ) : layout === 'list' ? (
        <ListLayout posts={filtered} />
      ) : (
        <GridLayout posts={filtered} />
      )}
    </>
  )
}

function ListLayout({ posts }: { posts: Post[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link href={`/${post.section}/${post.slug}`} className="group block">
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
                        <span key={tag}
                          className="inline-block px-2 py-0.5 text-xs font-mono bg-blue-50 text-blue-600 border border-blue-100 rounded">
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
  )
}

function GridLayout({ posts }: { posts: Post[] }) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link href={`/${post.section}/${post.slug}`} className="group block h-full">
            <article className="h-full border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all bg-white flex flex-col">
              <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                </svg>
              </div>
              <div className="p-5 flex flex-col gap-2 flex-1">
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
  )
}
