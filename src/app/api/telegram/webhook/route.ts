// Static stub — prevents accidental discovery of this path.
// Real webhook is at /api/telegram/[secret] — register that URL with Telegram.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
