import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DiarySearch from './DiarySearch'
import type { DiaryEntry } from '@/types'

export default async function DiaryPage() {
  const supabase = await createClient()
  const { data: entries, error } = await supabase
    .from('diary_entries')
    .select('*')
    .order('entry_date', { ascending: false })

  if (error) {
    return (
      <main>
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Diary</h1>
        <p className="text-red-500 text-sm">Failed to load entries.</p>
      </main>
    )
  }

  return (
    <main>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Diary</h1>
        <Link
          href="/private/diary/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <span>+</span> New entry
        </Link>
      </div>

      <DiarySearch entries={(entries ?? []) as DiaryEntry[]} />
    </main>
  )
}
