import { DraftStage } from '@/types'

export function computeDraftStage(
  title: string,
  body: string,
  category: string | null | undefined
): DraftStage {
  const hasContent =
    title.trim().length > 0 &&
    body.trim().length > 0
  if (!hasContent) return 'writing'
  if (!category || category.trim().length === 0) return 'categorizing'
  return 'ready'
}
