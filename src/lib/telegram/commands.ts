// Command detection for Telegram messages.
// CRITICAL: ambiguous / unrecognised input → type: 'pending' (never 'public')

export type CommandType =
  | 'private'   // 비공개: [text]  → diary_entries only, no Git
  | 'draft'     // 초안: [text]    → draft_posts
  | 'schedule'  // 예약: DATETIME  → inbox, scheduled publish (Phase 4)
  | 'edit'      // 수정: [post_id] → inbox, edit request (Phase 4)
  | 'inbox'     // inbox           → list pending
  | 'draftlist' // 초안목록        → list drafts
  | 'stats'     // 통계            → message counts
  | 'backup'    // 백업            → manual backup trigger (Phase 4)
  | 'link'      // /link           → reply with private diary URL
  | 'photo_post'// photo (± text)  → public post candidate
  | 'pending'   // fallback for everything else

export interface ParsedCommand {
  type: CommandType
  content: string | null   // text after stripping the command prefix
  postId: string | null    // for 수정:
  datetime: string | null  // for 예약:
}

const RE_PRIVATE  = /^비공개:\s*/
const RE_DRAFT    = /^초안:\s*/
const RE_SCHEDULE = /^예약:\s*/
const RE_EDIT     = /^수정:\s*/

export function parseCommand(
  text: string | null,
  hasPhoto: boolean,
): ParsedCommand {
  // No text at all — photo-only or truly empty
  if (!text) {
    return { type: hasPhoto ? 'photo_post' : 'pending', content: null, postId: null, datetime: null }
  }

  const t = text.trim()
  const lower = t.toLowerCase()

  // ── Prefix commands ───────────────────────────────────────────────────────
  if (RE_PRIVATE.test(t)) {
    const content = t.replace(RE_PRIVATE, '').trim()
    if (!content) return pending()
    return { type: 'private', content, postId: null, datetime: null }
  }

  if (RE_DRAFT.test(t)) {
    const content = t.replace(RE_DRAFT, '').trim()
    if (!content) return pending()
    return { type: 'draft', content, postId: null, datetime: null }
  }

  if (RE_SCHEDULE.test(t)) {
    const datetime = t.replace(RE_SCHEDULE, '').trim()
    if (!datetime) return pending()
    return { type: 'schedule', content: null, postId: null, datetime }
  }

  if (RE_EDIT.test(t)) {
    const postId = t.replace(RE_EDIT, '').trim()
    if (!postId) return pending()
    return { type: 'edit', content: null, postId, datetime: null }
  }

  // ── Exact keyword commands ─────────────────────────────────────────────────
  if (lower === 'inbox')          return { type: 'inbox',     content: null, postId: null, datetime: null }
  if (lower === '초안목록')        return { type: 'draftlist', content: null, postId: null, datetime: null }
  if (lower === '통계')            return { type: 'stats',     content: null, postId: null, datetime: null }
  if (lower === '백업')            return { type: 'backup',    content: null, postId: null, datetime: null }
  if (lower === '/link' || lower === 'link') return { type: 'link', content: null, postId: null, datetime: null }

  // ── Photo with text → public post candidate ───────────────────────────────
  if (hasPhoto) return { type: 'photo_post', content: t, postId: null, datetime: null }

  // ── Fallback — always pending, never public ───────────────────────────────
  return { type: 'pending', content: t, postId: null, datetime: null }
}

function pending(): ParsedCommand {
  return { type: 'pending', content: null, postId: null, datetime: null }
}
