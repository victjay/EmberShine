// Telegram webhook request verification
// Placeholder — full implementation in Task 4 (Telegram webhook)

export function getAllowedUserIds(): number[] {
  const raw = process.env.TELEGRAM_ALLOWED_USER_IDS ?? ''
  return raw
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id))
}

export function isAllowedUser(userId: number): boolean {
  return getAllowedUserIds().includes(userId)
}
