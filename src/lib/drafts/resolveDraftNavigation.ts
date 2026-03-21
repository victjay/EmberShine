import type { DraftStage } from '@/types'

export type DraftRouteDecision = {
  href: string
  tab?: 'categorizing' | 'ready'
  shouldAutoRecommendCategory?: boolean  // 소비: CategorizeCard.useEffect가 자동 처리
  entryMode: 'edit' | 'categorize' | 'review' | 'fallback'
  debugLabel: string  // 로깅 체계 없음 — 반환값에만 포함, console 출력 사용 안 함
}

export function resolveDraftNavigation(draft: {
  id: string
  draft_stage: DraftStage | null
} | null): DraftRouteDecision {
  if (!draft) {
    return {
      href: '/private/inbox?tab=messages',
      entryMode: 'fallback',
      debugLabel: 'draft_not_found',
    }
  }

  switch (draft.draft_stage) {
    case 'categorizing':
      return {
        href: '/private/inbox?tab=categorizing',
        tab: 'categorizing',
        shouldAutoRecommendCategory: true,
        entryMode: 'categorize',
        debugLabel: 'route_to_categorizing',
      }
    case 'ready':
      return {
        href: '/private/inbox?tab=ready',
        tab: 'ready',
        entryMode: 'review',
        debugLabel: 'route_to_ready',
      }
    case 'writing':
    default:
      return {
        href: `/private/inbox/draft/${draft.id}`,
        entryMode: 'edit',
        debugLabel: draft.draft_stage !== 'writing' && draft.draft_stage !== null
          ? `unexpected_stage_${draft.draft_stage}`
          : 'route_to_edit',
      }
  }
}
