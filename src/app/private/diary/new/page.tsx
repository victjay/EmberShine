import Link from 'next/link'
import { createDiaryEntry } from '../actions'

export default function NewDiaryEntryPage() {
  const today = new Date().toISOString().split('T')[0]

  return (
    <main>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/private/diary"
          className="text-sm text-slate-400 hover:text-slate-700 font-mono transition-colors"
        >
          ← Diary
        </Link>
        <span className="text-slate-200">/</span>
        <span className="text-sm text-slate-500">New entry</span>
      </div>

      <form action={createDiaryEntry} className="flex flex-col gap-5">
        {/* Title */}
        <input
          name="title"
          type="text"
          placeholder="Title (optional)"
          className="text-2xl font-bold text-slate-800 placeholder-slate-300 border-none outline-none bg-transparent w-full"
        />

        {/* Date + mood row */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-slate-400">Date</label>
            <input
              name="entry_date"
              type="date"
              defaultValue={today}
              required
              className="text-sm border border-slate-200 rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-slate-400">Mood (optional)</label>
            <input
              name="mood"
              type="text"
              placeholder="e.g. calm, tired, happy"
              className="text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-slate-400">Content — Markdown supported</label>
          <textarea
            name="body"
            required
            rows={20}
            placeholder="Write here…"
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 leading-relaxed font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-5 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Save
          </button>
          <Link
            href="/private/diary"
            className="px-5 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
