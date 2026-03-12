import type { MessageType, TargetSection } from '@/types'

// Hashtag → section routing (deterministic, no API cost)
const SECTION_TAGS: Record<string, TargetSection> = {
  '#blog': 'blog',
  '#story': 'stories',
  '#stories': 'stories',
  '#portfolio': 'portfolio',
  '#diary': 'diary',
  '#private': 'diary',
}

export function parseTargetSection(text: string): TargetSection | null {
  const lower = text.toLowerCase()
  for (const [tag, section] of Object.entries(SECTION_TAGS)) {
    if (lower.includes(tag)) return section
  }
  return null
}

export function parseTags(text: string): string[] {
  const matches = text.match(/#[\w가-힣]+/g)
  return matches ?? []
}

export function detectMessageType(message: Record<string, unknown>): MessageType {
  if (message.photo) return 'photo'
  if (message.video) return 'video'
  if (message.document) return 'document'
  if (message.text) return 'text'
  return 'unknown'
}
