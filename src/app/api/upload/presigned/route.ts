// Server-side only — R2 credentials never leave this handler
// Client receives a presigned PUT URL; R2 keys are never exposed
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateKey, generatePresignedPutUrl } from '@/lib/r2/upload'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { filename?: string; contentType?: string }
  const { filename, contentType } = body

  if (!filename || !contentType) {
    return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 })
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin'
  const slug = filename.replace(/\.[^.]+$/, '')
  const key = generateKey(slug, ext)

  const { presignedUrl, publicUrl } = await generatePresignedPutUrl(key, contentType)

  // R2 credentials are not included — only the temporary signed URL
  return NextResponse.json({ presignedUrl, publicUrl, key })
}
