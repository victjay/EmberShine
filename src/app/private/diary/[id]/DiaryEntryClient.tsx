'use client'

import { useState, useTransition } from 'react'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import type { DiaryEntry } from '@/types'

interface Props {
  entry: DiaryEntry
  updateAction: (formData: FormData) => Promise<void>
  deleteAction: () => Promise<void>
}

export default function DiaryEntryClient({ entry, updateAction, deleteAction }: Props) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    startTransition(() => deleteAction())
  }

  if (editing) {
    return (
      <form action={updateAction} className="flex flex-col gap-5">
        <input
          name="title"
          type="text"
          defaultValue={entry.title ?? ''}
          placeholder="Title (optional)"
          className="text-2xl font-bold text-slate-800 placeholder-slate-300 border-none outline-none bg-transparent w-full"
        />

        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-slate-400">Date</label>
            <input
              name="entry_date"
              type="date"
              defaultValue={entry.entry_date}
              required
              className="text-sm border border-slate-200 rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-slate-400">Mood</label>
            <input
              name="mood"
              type="text"
              defaultValue={entry.mood ?? ''}
              placeholder="e.g. calm, tired"
              className="text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <textarea
          name="body"
          required
          rows={20}
          defaultValue={entry.body}
          className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 leading-relaxed font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-5 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <>
      {/* Header */}
      <header className="mb-8 pb-6 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-2xl font-bold text-slate-800">
            {entry.title ?? '(untitled)'}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-600 rounded hover:border-slate-400 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium border border-red-100 text-red-500 rounded hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <time className="font-mono text-sm text-slate-400">{entry.entry_date}</time>
          {entry.mood && (
            <span className="text-sm text-slate-400">· {entry.mood}</span>
          )}
        </div>
      </header>

      {/* Body */}
      <article className="prose prose-slate max-w-none
        prose-p:leading-relaxed prose-p:text-slate-700
        prose-headings:text-slate-800
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        prose-code:font-mono prose-code:text-blue-700 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded
      ">
        <ReactMarkdown>{entry.body}</ReactMarkdown>
      </article>
    </>
  )
}
