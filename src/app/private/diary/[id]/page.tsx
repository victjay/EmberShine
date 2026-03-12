// Placeholder — full implementation in Task 2 (private diary)
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DiaryEntryPage({ params }: Props) {
  const { id } = await params
  if (!id) notFound()

  return (
    <main>
      <p className="text-gray-500">Diary entry view — coming in Task 2.</p>
    </main>
  )
}
