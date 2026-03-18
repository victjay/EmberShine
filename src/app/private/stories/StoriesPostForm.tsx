'use client'

import { useState } from 'react'
import Link from 'next/link'
import SubmitButton from '@/components/SubmitButton'

interface DefaultValues {
  postId?:       string
  title?:        string
  date?:         string
  tags?:         string[]
  description?:  string
  location?:     string
  shootingDate?: string
  body?:         string
}

interface Props {
  action:        (formData: FormData) => Promise<{ error: string } | undefined>
  defaultValues?: DefaultValues
  submitLabel?:  string
  pageLabel:     string
}

export default function StoriesPostForm({
  action,
  defaultValues = {},
  submitLabel = 'Save as Draft',
  pageLabel,
}: Props) {
  const [error, setError]     = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const today   = new Date().toISOString().split('T')[0]
  const tagsStr = defaultValues.tags?.join(', ') ?? ''

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    const result = await action(formData)
    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
  }

  return (
    <main>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/stories"
          className="text-sm text-slate-400 hover:text-slate-700 font-mono transition-colors"
        >
          ← Stories
        </Link>
        <span className="text-slate-200">/</span>
        <span className="text-sm text-slate-500">{pageLabel}</span>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="flex flex-col gap-5">
        {defaultValues.postId && (
          <input type="hidden" name="postId" value={defaultValues.postId} />
        )}

        <input
          name="title"
          type="text"
          placeholder="Title"
          required
          defaultValue={defaultValues.title ?? ''}
          className="text-2xl font-bold text-slate-800 placeholder-slate-300 border-none outline-none bg-transparent w-full"
        />

        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-slate-400">Date</label>
            <input
              name="date"
              type="date"
              required
              defaultValue={defaultValues.date ?? today}
              className="text-sm border border-slate-200 rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-mono text-slate-400">Tags (comma-separated)</label>
            <input
              name="tags"
              type="text"
              placeholder="travel, daily, ..."
              defaultValue={tagsStr}
              className="text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-mono text-slate-400">Location (optional)</label>
            <input
              name="location"
              type="text"
              placeholder="Seoul, Korea"
              defaultValue={defaultValues.location ?? ''}
              className="text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-slate-400">Shooting date (optional)</label>
            <input
              name="shooting_date"
              type="date"
              defaultValue={defaultValues.shootingDate ?? ''}
              className="text-sm border border-slate-200 rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-slate-400">Description (optional)</label>
          <input
            name="description"
            type="text"
            placeholder="Short summary..."
            defaultValue={defaultValues.description ?? ''}
            className="text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-slate-400">Content — Markdown supported</label>
          <textarea
            name="body"
            required
            rows={20}
            placeholder="Write here…"
            defaultValue={defaultValues.body ?? ''}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 leading-relaxed font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3">
          <SubmitButton
            label="Save as Draft"
            loadingLabel="저장 중..."
            className="px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          />
          <Link
            href="/stories"
            className="px-5 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
