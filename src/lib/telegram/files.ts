// Download a file from Telegram's servers using a file_id.
// Telegram retains files for 24h after sending; photos are up to 10 MB.

export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  const token = process.env.TELEGRAM_BOT_TOKEN!

  // Step 1: Resolve file_id → file_path
  const infoRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
  )
  const info = await infoRes.json() as { ok: boolean; result?: { file_path: string } }

  if (!info.ok || !info.result?.file_path) {
    throw new Error(`[telegram/files] getFile failed for id=${fileId}: ${JSON.stringify(info)}`)
  }

  // Step 2: Download binary
  const fileRes = await fetch(
    `https://api.telegram.org/file/bot${token}/${info.result.file_path}`,
  )

  if (!fileRes.ok) {
    throw new Error(`[telegram/files] download failed: HTTP ${fileRes.status}`)
  }

  return Buffer.from(await fileRes.arrayBuffer())
}
