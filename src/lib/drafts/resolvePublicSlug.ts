/**
 * Published post ID (slug) 결정 함수.
 * seed: draft.created_at (UTC ISO) + draft.id (UUID)
 *
 * 불변 원칙:
 * - 최초 생성 후 재계산 금지
 * - 현재 시각/파일명 역산 등 다른 seed 혼합 금지
 */
export function resolvePublicSlug(draft: { id: string; created_at: string }): string {
  const date    = draft.created_at.split('T')[0]   // YYYY-MM-DD (UTC)
  const shortId = draft.id.slice(0, 8)             // UUID 앞 8자
  return `${date}-${shortId}`
}
