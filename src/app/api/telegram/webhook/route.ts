import { NextResponse } from 'next/server'

// Placeholder — full implementation in Task 4 (Telegram webhook)
// Hard rule: parse failure → status = 'pending' (NEVER default to public)
export async function POST() {
  return NextResponse.json({ ok: true, status: 'placeholder' })
}
