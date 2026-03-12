// Send a message back to Shine via the Telegram Bot API.
// Server-only — never import in client code.

export async function sendTelegramMessage(text: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('[telegram] sendMessage skipped: missing token or chat_id')
    return
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      },
    )
    if (!res.ok) {
      const body = await res.text()
      console.error('[telegram] sendMessage failed:', res.status, body)
    }
  } catch (err) {
    console.error('[telegram] sendMessage error:', err)
  }
}
