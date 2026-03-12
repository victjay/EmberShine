'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createDiaryEntry(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = (formData.get('title') as string).trim() || null
  const body = (formData.get('body') as string).trim()
  const entry_date = formData.get('entry_date') as string
  const mood = (formData.get('mood') as string).trim() || null

  if (!body) return

  const { data, error } = await supabase
    .from('diary_entries')
    .insert({ owner_id: user.id, title, body, entry_date, mood })
    .select('id')
    .single()

  if (error || !data) throw new Error('Failed to create diary entry')
  redirect(`/private/diary/${data.id}`)
}

export async function updateDiaryEntry(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = (formData.get('title') as string).trim() || null
  const body = (formData.get('body') as string).trim()
  const entry_date = formData.get('entry_date') as string
  const mood = (formData.get('mood') as string).trim() || null

  await supabase
    .from('diary_entries')
    .update({ title, body, entry_date, mood })
    .eq('id', id)
    .eq('owner_id', user.id)

  redirect(`/private/diary/${id}`)
}

export async function deleteDiaryEntry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('diary_entries')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)

  redirect('/private/diary')
}
