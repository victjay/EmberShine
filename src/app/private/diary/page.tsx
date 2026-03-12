import { createClient } from '@/lib/supabase/server'
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
        <h1 className="text-3xl font-bold mb-8">Diary</h1>
        <p className="text-red-500">Failed to load entries.</p>
      </main>
    )
  }

  return (
    <main>
      <h1 className="text-3xl font-bold mb-8">Diary</h1>
      {entries && entries.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {entries.map((entry: DiaryEntry) => (
            <li key={entry.id}>
              <a
                href={`/private/diary/${entry.id}`}
                className="block border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-400 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">
                    {entry.title ?? entry.entry_date}
                  </span>
                  <span className="text-xs text-gray-400">{entry.entry_date}</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{entry.body}</p>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No entries yet.</p>
      )}
    </main>
  )
}
