'use strict'

// Shared utilities for batch scripts.
// Uses native fetch (Node.js 20+).

async function sendTelegramMessage(text) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('[batch] Telegram env vars not set — skipping notification')
    return
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    if (!res.ok) console.warn('[batch] Telegram send failed:', res.status)
  } catch (err) {
    console.warn('[batch] Telegram send error:', err.message)
  }
}

// Wraps a job function with error handling + Telegram failure alert.
// Exits with code 1 on failure so the workflow step is marked failed
// (continue-on-error on the step means the workflow still continues).
async function runJob(name, fn) {
  console.log(`\n[batch] ── ${name} ──────────────────────`)
  try {
    await fn()
    console.log(`[batch] ${name}: done`)
  } catch (err) {
    console.error(`[batch] ${name}: FAILED —`, err)
    await sendTelegramMessage(`❌ [배치 실패] ${name}\n${err.message ?? String(err)}`)
    process.exit(1)
  }
}

module.exports = { sendTelegramMessage, runJob }
