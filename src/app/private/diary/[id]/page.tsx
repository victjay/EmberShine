import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DiaryEntryClient from './DiaryEntryClient'
import { updateDiaryEntry, deleteDiaryEntry } from '../actions'
import type { DiaryEntry } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DiaryEntryPage({ params }: Props) {
  const { id } = await params
  if (!id) notFound()

  const supabase = await createClient()
  const { data: entry, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !entry) notFound()

  const updateAction = updateDiaryEntry.bind(null, id)
  const deleteAction = deleteDiaryEntry.bind(null, id)

  return (
    <main>
      <Link
        href="/private/diary"
        className="inline-block text-sm text-slate-400 hover:text-slate-700 font-mono mb-8 transition-colors"
      >
        ← Diary
      </Link>

      <DiaryEntryClient
        entry={entry as DiaryEntry}
        updateAction={updateAction}
        deleteAction={deleteAction}
      />
    </main>
  )
}
