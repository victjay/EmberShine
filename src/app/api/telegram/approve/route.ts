export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { runApprovalPipeline } from '@/lib/telegram/approve'

export async function POST(request: NextRequest) {
  console.log('[approve-route] POST handler entered')

  let inboxId: string
  try {
    const body = await request.json() as { inboxId?: string }
    inboxId = body.inboxId ?? ''
  } catch {
    console.error('[approve-route] Invalid JSON body')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!inboxId) {
    console.error('[approve-route] Missing inboxId')
    return NextResponse.json({ error: 'Missing inboxId' }, { status: 400 })
  }

  console.log(`[approve-route] Starting pipeline for inboxId=${inboxId}`)
  try {
    await runApprovalPipeline(inboxId)
    console.log(`[approve-route] Pipeline complete for inboxId=${inboxId}`)
  } catch (err) {
    console.error(`[approve-route] Pipeline failed for inboxId=${inboxId}:`, err)
  }

  return NextResponse.json({ ok: true })
}
