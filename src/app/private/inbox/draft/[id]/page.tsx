import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import DraftEditor from './DraftEditor'

export default async function DraftEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: draft } = await supabase
    .from('draft_posts')
    .select('id, section, title, body_markdown, draft_stage, status')
    .eq('id', id)
    .single()

  if (!draft || draft.status !== 'draft') notFound()

  return (
    <main className="max-w-3xl mx-auto py-10 px-4">
      <DraftEditor
        id={draft.id}
        initialTitle={draft.title ?? ''}
        initialBody={draft.body_markdown ?? ''}
        draftStage={draft.draft_stage ?? 'writing'}
        section={draft.section}
      />
    </main>
  )
}
