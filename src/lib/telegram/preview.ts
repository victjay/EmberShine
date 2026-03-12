// Send AI draft previews and handle callback utilities.
// Server-only — never import in client code.

import type { AIDraft } from '@/lib/ai/draft'

const BASE = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const CHAT  = () => process.env.TELEGRAM_CHAT_ID!

// ── Preview with inline keyboard ──────────────────────────────────────────

export async function sendDraftPreview(
  inboxId: string,
  draft: AIDraft,
): Promise<void> {
  const preview = [
    `📝 <b>AI 초안이 생성되었습니다</b>`,
    ``,
    `<b>제목 후보:</b>`,
    `1️⃣ ${escapeHtml(draft.titles[0])}`,
    `2️⃣ ${escapeHtml(draft.titles[1])}`,
    `3️⃣ ${escapeHtml(draft.titles[2])}`,
    ``,
    `<b>미리보기:</b>`,
    escapeHtml(draft.summary),
    ``,
    `<b>태그:</b> ${draft.tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ')}`,
    ``,
    `<b>SEO:</b> <i>${escapeHtml(draft.meta_description)}</i>`,
  ].join('\n')

  const reply_markup = {
    inline_keyboard: [
      [
        { text: '✅ 승인', callback_data: `approve:${inboxId}` },
        { text: '✏️ 수정', callback_data: `edit:${inboxId}` },
        { text: '❌ 거절', callback_data: `reject:${inboxId}` },
      ],
      [
        { text: '🔍 전문 보기', callback_data: `view_full:${inboxId}` },
        { text: '🌐 영어 번역 확인', callback_data: `view_translation:${inboxId}` },
      ],
    ],
  }

  await telegramPost('sendMessage', {
    chat_id: CHAT(),
    text: preview,
    parse_mode: 'HTML',
    reply_markup,
  })
}

// ── Callback acknowledgment ────────────────────────────────────────────────

export async function answerCallbackQuery(
  callbackQueryId: string,
  text = '',
): Promise<void> {
  await telegramPost('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function telegramPost(method: string, body: Record<string, unknown>): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    const res = await fetch(`${BASE()}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error(`[telegram] ${method} failed:`, res.status, await res.text())
    }
  } catch (err) {
    console.error(`[telegram] ${method} error:`, err)
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
