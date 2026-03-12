'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DiaryEntry } from '@/types'

export default function DiarySearch({ entries }: { entries: DiaryEntry[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? entries.filter((e) => {
        const q = query.toLowerCase()
        return (
          e.title?.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q)
        )
      })
    : entries

  return (
    <>
      <div className="relative mb-6">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entries…"
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-400 text-sm">
          {query ? 'No entries match your search.' : 'No entries yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/private/diary/${entry.id}`}
                className="group flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                    {entry.title ?? '(untitled)'}
                  </p>
                  <p className="text-sm text-slate-400 line-clamp-1 mt-0.5">
                    {entry.body}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <time className="font-mono text-xs text-slate-400">{entry.entry_date}</time>
                  {entry.mood && (
                    <p className="text-xs text-slate-400 mt-0.5">{entry.mood}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
