/**
 * slug 정책 단일 진실원천.
 * Telegram/Workspace 모든 경로에서 이 함수 사용.
 * 날짜 정책: UTC 고정 (created_at ISO string 기준)
 * 불변 원칙: 최초 publish 이후 재계산 금지
 */
export function resolvePublicSlug(draft: {
  id: string
  frontmatter?: Record<string, unknown> | null
  created_at: string  // ISO 8601 UTC string
}): string {
  const custom = (draft.frontmatter?.custom_slug as string | undefined)?.trim()
  if (custom && isValidCustomSlug(custom)) {
    return custom
  }
  // UTC 날짜 prefix + UUID 앞 8자리
  const datePrefix = draft.created_at.split('T')[0]
  return `${datePrefix}-${draft.id.slice(0, 8)}`
}

function isValidCustomSlug(slug: string): boolean {
  // 영문 소문자, 숫자, 하이픈만 허용 (길이 2 이상)
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)
}
