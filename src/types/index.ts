export type MessageStatus = 'pending' | 'approved' | 'rejected' | 'private'
export type MessageType = 'text' | 'photo' | 'video' | 'document' | 'unknown'
export type TargetSection = 'blog' | 'stories' | 'portfolio' | 'diary'
// Phase 21: 'approved' 제거 — draft_posts에서 실제 미사용 확인됨
export type DraftStatus = 'draft' | 'published'
// Phase 21: draft 하위 단계
export type DraftStage = 'writing' | 'categorizing' | 'ready'

export interface InboxMessage {
  id: string
  telegram_update_id: number
  raw_payload: Record<string, unknown>
  status: MessageStatus
  message_type: MessageType
  text_content: string | null
  media_r2_url: string | null
  media_mime_type: string | null
  telegram_date: string | null
  parsed_tags: string[] | null
  target_section: TargetSection | null
  draft_generated_at: string | null
  published_at: string | null
  created_at: string
}

export interface DiaryEntry {
  id: string
  owner_id: string
  inbox_id: string | null
  title: string | null
  body: string
  mood: string | null
  media_urls: string[] | null
  entry_date: string
  created_at: string
}

export interface DraftPost {
  id: string
  inbox_id: string | null
  section: 'blog' | 'stories' | 'portfolio'
  title: string
  body_markdown: string
  frontmatter: Record<string, unknown> | null
  github_path: string | null
  status: DraftStatus
  draft_stage?: DraftStage  // status='draft'일 때만 유효
  created_at: string
}

export interface Profile {
  id: string
  username: string
  role: 'owner'
  created_at: string
}

// Phase 21: 카테고리 (섹션별 독립 관리, soft-delete tombstone)
export interface Category {
  id: string
  name: string
  section: 'blog' | 'stories' | 'portfolio'
  deleted_at: string | null  // null = 활성, 값 있음 = soft-deleted
  created_at: string
}

// Phase 21: AI 카테고리 추천 캐시
export interface AICategoryRecommendationItem {
  name: string
  reason: string
}

// Phase 21: CategorizeCard / server action 공유 타입
export interface CategorizeOutput {
  existing_top3: AICategoryRecommendationItem[]
  suggested_top3: AICategoryRecommendationItem[]
}

// Phase 21 Step 7: 시스템 알림
export interface SystemNotification {
  id: string
  type: 'info' | 'warning' | 'error'
  source: 'deploy' | 'thumbnail' | 'category' | 'github'
  message: string
  action_required: boolean
  read_at: string | null
  created_at: string
}

export interface AICategoryRecommendation {
  id: string
  post_id: string
  content_hash: string
  categories_version: string   // 카테고리 목록 hash
  excluded_version: string     // excluded_categories hash
  existing_top3: AICategoryRecommendationItem[]
  suggested_top3: AICategoryRecommendationItem[]
  created_at: string
}
