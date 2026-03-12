export type MessageStatus = 'pending' | 'approved' | 'rejected' | 'private'
export type MessageType = 'text' | 'photo' | 'video' | 'document' | 'unknown'
export type TargetSection = 'blog' | 'stories' | 'portfolio' | 'diary'
export type DraftStatus = 'draft' | 'approved' | 'published'

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
  created_at: string
}

export interface Profile {
  id: string
  username: string
  role: 'owner'
  created_at: string
}
